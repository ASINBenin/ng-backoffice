(function () {

    angular
        .module('BackofficeApp')
        .controller('BackofficeAdminInterEntityStatisticsCtrl', [
            '$scope', '$q', '$document', 'gettextCatalog', 'AdminInterEntityStatisticsService',
            BackofficeAdminInterEntityStatisticsCtrl
        ]);

    /**
     * Comparison of the selected entities: share of risks by level, compliance with the common referentials,
     * threats and vulnerabilities of the common knowledge base found in their analyses.
     * An entity is the whole of its analyses, aggregated by the API.
     */
    function BackofficeAdminInterEntityStatisticsCtrl($scope, $q, $document, gettextCatalog, AdminInterEntityStatisticsService) {
        var COLORS = {green: '#43a047', orange: '#fb8c00', red: '#e53935', blue: '#1e88e5', grey: '#bdbdbd'};
        var TEXT_COLOR = 'rgba(0, 0, 0, 0.6)';
        var LEVELS = ['low', 'medium', 'high'];
        var RISK_STATES = ['current', 'residual'];
        var ENTITY_COLORS = ['#1e88e5', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#6d4c41', '#3949ab', '#c0ca33', '#d81b60'];

        $scope.risks = [];
        $scope.referentials = [];
        $scope.knowledgeBase = {threats: [], vulnerabilities: []};
        $scope.entityNames = [];
        $scope.evolution = null;
        $scope.filters = {
            entities: [], referentialUuid: null,
            riskChart: {orientation: 'horizontal', mode: 'stacked', unit: 'percent'},
            knowledgeBase: {threats: {displayBy: 'maxRisk', order: 'shared'}, vulnerabilities: {displayBy: 'maxRisk', order: 'shared'}},
            evolutionPeriod: '3m', evolutionIndicator: 'highCurrent', evolutionReferentialUuid: null
        };
        $scope.charts = {};
        $scope.isLoading = true;

        function isSelected(row) {
            return $scope.filters.entities.indexOf(row.entity) !== -1;
        }

        // Horizontal bars: the height follows the number of entities so that every label stays readable
        $scope.chartHeight = function (rowsCount) {
            return {height: Math.max(160, rowsCount * 28 + 70) + 'px'};
        };

        $scope.riskChartHeight = function () {
            return $scope.filters.riskChart.orientation === 'horizontal'
                ? $scope.chartHeight($scope.selectedRisks.length)
                : {height: '340px'};
        };

        // The canvas is transparent: drawn on white so that the image stays readable once pasted in a report
        $scope.exportChart = function (canvasId, fileName) {
            var canvas = $document[0].getElementById(canvasId);
            var image = $document[0].createElement('canvas');
            image.width = canvas.width;
            image.height = canvas.height;
            var context = image.getContext('2d');
            context.fillStyle = '#fff';
            context.fillRect(0, 0, image.width, image.height);
            context.drawImage(canvas, 0, 0);
            var link = $document[0].createElement('a');
            link.href = image.toDataURL('image/png');
            link.download = fileName + '.png';
            link.click();
        };

        // Shares rather than counts: an entity with more analyses is not more exposed for that
        function riskShares(levels) {
            var total = levels.low + levels.medium + levels.high;
            var shares = {total: total};
            LEVELS.forEach(function (level) {
                shares[level] = {count: levels[level], percent: total > 0 ? Math.round(levels[level] * 1000 / total) / 10 : 0};
            });

            return shares;
        }

        /**
         * Risks of one type and state by entity, with the display options chosen above the charts.
         */
        function riskSharesChart(rows, type, state) {
            var options = $scope.filters.riskChart;
            var isPercent = options.unit === 'percent';
            var isStacked = options.mode === 'stacked';
            var valueAxis = {
                stacked: isStacked,
                beginAtZero: true,
                max: isPercent ? 100 : undefined,
                ticks: {color: TEXT_COLOR, precision: 0, callback: function (value) { return isPercent ? value + ' %' : value; }}
            };
            var categoryAxis = {stacked: isStacked, ticks: {color: TEXT_COLOR}, grid: {display: false}};
            var levels = [
                {key: 'low', label: gettextCatalog.getString('Low risks'), color: COLORS.green},
                {key: 'medium', label: gettextCatalog.getString('Medium risks'), color: COLORS.orange},
                {key: 'high', label: gettextCatalog.getString('High risks'), color: COLORS.red}
            ];

            return {
                type: 'bar',
                data: {
                    labels: rows.map(function (row) { return row.entity; }),
                    datasets: levels.map(function (level) {
                        return {
                            label: level.label,
                            data: rows.map(function (row) {
                                var share = row.shares[state][type][level.key];
                                return isPercent ? share.percent : share.count;
                            }),
                            shares: rows.map(function (row) { return row.shares[state][type][level.key]; }),
                            backgroundColor: level.color,
                            maxBarThickness: isStacked ? 28 : 14
                        };
                    })
                },
                options: {
                    indexAxis: options.orientation === 'horizontal' ? 'y' : 'x',
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {position: 'bottom', labels: {boxWidth: 12, color: TEXT_COLOR}},
                        tooltip: {callbacks: {label: function (item) {
                            var share = item.dataset.shares[item.dataIndex];
                            return item.dataset.label + ' : ' + share.percent + ' % (' + share.count + ')';
                        }}}
                    },
                    scales: options.orientation === 'horizontal'
                        ? {x: valueAxis, y: categoryAxis}
                        : {x: categoryAxis, y: valueAxis}
                }
            };
        }

        $scope.updateRisks = function () {
            $scope.selectedRisks = $scope.risks.filter(isSelected).map(function (row) {
                var shares = {};
                RISK_STATES.forEach(function (state) {
                    shares[state] = {
                        informational: riskShares(row[state].informational),
                        operational: riskShares(row[state].operational)
                    };
                });

                return angular.extend({}, row, {shares: shares});
            });
            ['informational', 'operational'].forEach(function (type) {
                $scope.charts[type] = {
                    hasRisks: $scope.selectedRisks.some(function (row) { return row.shares.current[type].total > 0; }),
                    current: riskSharesChart($scope.selectedRisks, type, 'current'),
                    residual: riskSharesChart($scope.selectedRisks, type, 'residual')
                };
            });
        };

        /**
         * Ranking of the selected entities by current compliance, and their compliance by category of the referential.
         */
        $scope.updateCompliance = function () {
            var referential = $scope.referentials.find(function (item) {
                return item.uuid === $scope.filters.referentialUuid;
            });
            var rows = referential ? referential.rows.filter(isSelected) : [];
            $scope.compliance = null;
            if (rows.length === 0) {
                return;
            }

            var ranking = rows.slice().sort(function (a, b) { return b.current - a.current; });
            var labels = [];
            rows.forEach(function (row) {
                row.categories.forEach(function (category) {
                    if (labels.indexOf(category.label) === -1) {
                        labels.push(category.label);
                    }
                });
            });
            $scope.compliance = {
                ranking: ranking,
                rows: rows,
                // Each entity has its own copy of the referential: the categories are matched by label, not by order
                categories: labels.map(function (label) {
                    return {
                        label: label,
                        values: rows.map(function (row) {
                            return row.categories.find(function (category) { return category.label === label; }) || null;
                        })
                    };
                })
            };
            $scope.charts.compliance = {
                type: 'bar',
                data: {
                    labels: ranking.map(function (row) { return row.entity; }),
                    datasets: [{
                        label: gettextCatalog.getString('Current level'),
                        data: ranking.map(function (row) { return row.current; }),
                        backgroundColor: COLORS.blue,
                        barThickness: 10
                    }, {
                        label: gettextCatalog.getString('Target level'),
                        data: ranking.map(function (row) { return row.target; }),
                        backgroundColor: COLORS.grey,
                        barThickness: 10
                    }]
                },
                options: {
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {position: 'bottom', labels: {boxWidth: 12, color: TEXT_COLOR}},
                        tooltip: {callbacks: {label: function (item) { return item.dataset.label + ' : ' + item.raw + ' %'; }}}
                    },
                    scales: {
                        x: {beginAtZero: true, max: 100, ticks: {color: TEXT_COLOR, callback: function (value) { return value + ' %'; }}},
                        y: {ticks: {color: TEXT_COLOR}, grid: {display: false}}
                    }
                }
            };
        };

        var KNOWLEDGE_BASE_SORTS = {
            shared: function (a, b) { return b.entitiesCount - a.entitiesCount || a.label.localeCompare(b.label); },
            descending: function (a, b) { return b.maxValue - a.maxValue || a.label.localeCompare(b.label); },
            ascending: function (a, b) { return a.maxValue - b.maxValue || a.label.localeCompare(b.label); },
            label: function (a, b) { return a.label.localeCompare(b.label); }
        };

        /**
         * Threats or vulnerabilities found in the selected entities, with the chosen value of each entity
         * (maximum risk, number of risks or average rate) and in the chosen order.
         */
        function knowledgeBaseComparison(items, options) {
            var rows = items.map(function (item) {
                var values = $scope.filters.entities.map(function (entity) {
                    return item.entities[entity] ? item.entities[entity][options.displayBy] : null;
                });
                var foundValues = values.filter(function (value) { return value !== null; });

                return {
                    label: item.label,
                    values: values,
                    entitiesCount: foundValues.length,
                    maxValue: Math.max.apply(null, foundValues)
                };
            }).filter(function (row) {
                return row.entitiesCount > 0;
            }).sort(KNOWLEDGE_BASE_SORTS[options.order]);
            var top = rows.slice(0, 10);

            return {
                rows: rows,
                chart: {
                    type: 'bar',
                    data: {
                        labels: top.map(function (row) { return row.label; }),
                        datasets: $scope.filters.entities.map(function (entity, index) {
                            return {
                                label: entity,
                                data: top.map(function (row) { return row.values[index]; }),
                                backgroundColor: ENTITY_COLORS[index % ENTITY_COLORS.length],
                                maxBarThickness: 12
                            };
                        })
                    },
                    options: {
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        plugins: {legend: {position: 'bottom', labels: {boxWidth: 12, color: TEXT_COLOR}}},
                        scales: {
                            x: {beginAtZero: true, ticks: {precision: options.displayBy === 'averageRate' ? undefined : 0, color: TEXT_COLOR}},
                            // Long labels of the knowledge base are cut, the full label is in the tooltip
                            y: {ticks: {color: TEXT_COLOR, callback: function (value) {
                                var label = this.getLabelForValue(value);
                                return label.length > 45 ? label.slice(0, 44) + '…' : label;
                            }}, grid: {display: false}}
                        }
                    }
                }
            };
        }

        $scope.updateKnowledgeBase = function () {
            $scope.knowledgeBaseComparison = {
                threats: knowledgeBaseComparison($scope.knowledgeBase.threats, $scope.filters.knowledgeBase.threats),
                vulnerabilities: knowledgeBaseComparison(
                    $scope.knowledgeBase.vulnerabilities, $scope.filters.knowledgeBase.vulnerabilities
                )
            };
        };

        /**
         * One line per selected entity over the last weeks; a week without collection leaves a gap bridged by the line.
         */
        $scope.updateEvolution = function () {
            var evolution = $scope.evolution;
            if (!evolution) {
                return;
            }
            var entities = evolution.entities.filter(isSelected);
            $scope.charts.evolution = {
                type: 'line',
                data: {
                    labels: evolution.dates.map(function (date) { return date.split('-').reverse().join('/'); }),
                    datasets: entities.map(function (row, index) {
                        var color = ENTITY_COLORS[index % ENTITY_COLORS.length];
                        var values = $scope.filters.evolutionIndicator === 'compliance'
                            ? row.compliance[$scope.filters.evolutionReferentialUuid] || []
                            : row[$scope.filters.evolutionIndicator];

                        return {label: row.entity, data: values, borderColor: color, backgroundColor: color, spanGaps: true, tension: 0.2};
                    })
                },
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {position: 'bottom', labels: {boxWidth: 12, color: TEXT_COLOR}},
                        tooltip: {callbacks: {label: function (item) { return item.dataset.label + ' : ' + item.raw + ' %'; }}}
                    },
                    scales: {
                        x: {ticks: {color: TEXT_COLOR}, grid: {display: false}},
                        y: {beginAtZero: true, max: 100, ticks: {color: TEXT_COLOR, callback: function (value) { return value + ' %'; }}}
                    }
                }
            };
        };

        $scope.updateAll = function () {
            $scope.updateRisks();
            $scope.updateCompliance();
            $scope.updateKnowledgeBase();
            $scope.updateEvolution();
        };

        // History reads several collections: loaded apart so that the other tabs do not wait for it
        $scope.loadEvolution = function () {
            $scope.isEvolutionLoading = true;
            AdminInterEntityStatisticsService.getEvolution($scope.filters.evolutionPeriod).then(function (evolution) {
                var referentialUuids = evolution.referentials.map(function (referential) { return referential.uuid; });
                $scope.evolution = evolution;
                if (referentialUuids.indexOf($scope.filters.evolutionReferentialUuid) === -1) {
                    $scope.filters.evolutionReferentialUuid = referentialUuids.length > 0 ? referentialUuids[0] : null;
                }
                $scope.updateEvolution();
            }).finally(function () {
                $scope.isEvolutionLoading = false;
            });
        };
        $scope.loadEvolution();

        $q.all([
            AdminInterEntityStatisticsService.getRisks(),
            AdminInterEntityStatisticsService.getCompliance(),
            AdminInterEntityStatisticsService.getThreats(),
            AdminInterEntityStatisticsService.getVulnerabilities()
        ]).then(function (results) {
            $scope.risks = results[0];
            $scope.referentials = results[1];
            $scope.knowledgeBase = {threats: results[2], vulnerabilities: results[3]};
            $scope.filters.referentialUuid = $scope.referentials.length > 0 ? $scope.referentials[0].uuid : null;
            // Every entity with statistics, all compared by default
            $scope.entityNames = $scope.risks.map(function (row) { return row.entity; });
            $scope.filters.entities = $scope.entityNames.slice();
            $scope.updateAll();
        }).finally(function () {
            $scope.isLoading = false;
        });
    }

})();
