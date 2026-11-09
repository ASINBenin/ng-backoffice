(function () {

    angular
        .module('BackofficeApp')
        .controller('BackofficeAdminCampaignDetailCtrl', [
            '$scope', '$stateParams', '$mdDialog', 'toastr', 'gettextCatalog', 'AdminCampaignService',
            'AdminSubmissionService', BackofficeAdminCampaignDetailCtrl
        ]);

    /**
     * One campaign: its information, the participation of each invited entity, and the reports they sent.
     */
    function BackofficeAdminCampaignDetailCtrl($scope, $stateParams, $mdDialog, toastr, gettextCatalog,
                                               AdminCampaignService, AdminSubmissionService) {
        $scope.campaign = null;
        $scope.submissions = [];
        $scope.entities = [];
        $scope.search = '';
        $scope.isLoading = true;

        /**
         * One row per invited entity: its participation and, from its latest version, its report and appreciation.
         * The submissions come most recent first.
         */
        function updateEntities() {
            $scope.entities = $scope.campaign.participants.map(function (participant) {
                var submissions = $scope.submissions.filter(function (submission) {
                    return submission.clientId === participant.client.id;
                });

                return {
                    clientId: participant.client.id,
                    name: participant.client.name,
                    // Participation is mandatory: past the expected start date, an entity that has not started is late
                    status: participant.status === 'participating' ? 'participating'
                        : (AdminCampaignService.toDateString(new Date()) > $scope.campaign.responseDeadline ? 'late' : 'invited'),
                    reportsCount: submissions.length,
                    lastSubmission: submissions.length > 0 ? submissions[0] : null
                };
            });
        }

        $scope.matchesSearch = function (submission) {
            var search = $scope.search.toLowerCase();

            return [submission.clientName, submission.analysisLabel, submission.submittedBy].some(function (value) {
                return (value || '').toLowerCase().indexOf(search) !== -1;
            });
        };

        $scope.download = AdminSubmissionService.downloadSubmission;
        $scope.formatSize = AdminSubmissionService.formatSize;
        $scope.appreciate = function (submission, ev) {
            return AdminSubmissionService.showAppreciationDialog(submission, ev).then(updateEntities);
        };

        /**
         * Postpones the response deadline and the end date; after a refusal the dialog opens again with the input.
         */
        $scope.extendDates = function (ev, dates) {
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'dates', ExtendDatesDialogCtrl],
                templateUrl: 'views/dialogs/extend.campaign.dates.admin.html',
                targetEvent: ev,
                clickOutsideToClose: false,
                locals: {
                    dates: dates || {
                        responseDeadline: AdminCampaignService.toDate($scope.campaign.responseDeadline),
                        endDate: AdminCampaignService.toDate($scope.campaign.endDate),
                        minResponseDeadline: AdminCampaignService.toDate($scope.campaign.responseDeadline),
                        minEndDate: AdminCampaignService.toDate($scope.campaign.endDate)
                    }
                }
            }).then(function (newDates) {
                AdminCampaignService.extendCampaignDates($scope.campaign.id, newDates.responseDeadline, newDates.endDate,
                    function () {
                        $scope.campaign.responseDeadline = AdminCampaignService.toDateString(newDates.responseDeadline);
                        $scope.campaign.endDate = AdminCampaignService.toDateString(newDates.endDate);
                        updateEntities();
                        loadStatistics();
                        toastr.success(gettextCatalog.getString('The dates have been postponed and the entities informed.'));
                    },
                    function () {
                        $scope.extendDates(ev, newDates);
                    }
                );
            });
        };

        /**
         * Invites entities to the published campaign: they get the same dates as the others.
         */
        $scope.inviteEntities = function (ev, clients) {
            var invitedIds = $scope.campaign.participants.map(function (participant) {
                return participant.client.id;
            });
            $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'clients', InviteEntitiesDialogCtrl],
                templateUrl: 'views/dialogs/invite.campaign.entities.admin.html',
                targetEvent: ev,
                clickOutsideToClose: false,
                locals: {clients: clients || []}
            }).then(function (selected) {
                var clientIds = selected.map(function (client) {
                    return client.id;
                });
                AdminCampaignService.addCampaignParticipants($scope.campaign.id, clientIds,
                    function () {
                        toastr.success(gettextCatalog.getString('The entities have been invited.'));
                        loadCampaign();
                    },
                    function () {
                        $scope.inviteEntities(ev, selected);
                    }
                );
            });

            function InviteEntitiesDialogCtrl($scope, $mdDialog, clients) {
                $scope.clients = clients;
                $scope.searchClients = function (text) {
                    var excludedIds = invitedIds.concat($scope.clients.map(function (client) {
                        return client.id;
                    }));

                    return AdminCampaignService.getSelectableClients({filter: text}).then(function (data) {
                        return data.clients.filter(function (client) {
                            return excludedIds.indexOf(client.id) === -1;
                        });
                    });
                };
                $scope.cancel = function () {
                    $mdDialog.cancel();
                };
                $scope.invite = function () {
                    $mdDialog.hide($scope.clients);
                };
            }
        };

        function ExtendDatesDialogCtrl($scope, $mdDialog, dates) {
            $scope.dates = dates;
            $scope.cancel = function () {
                $mdDialog.cancel();
            };
            $scope.save = function () {
                $mdDialog.hide($scope.dates);
            };
        }

        var COLORS = {grey: '#9e9e9e', orange: '#fb8c00', red: '#e53935', blue: '#1e88e5', lightGreen: '#9ccc65', green: '#43a047'};
        var TEXT_COLOR = 'rgba(0, 0, 0, 0.6)';

        $scope.percent = function (count, total) {
            return total > 0 ? Math.round(count * 100 / total) : 0;
        };

        // Share of the entities that sent a report, written in the middle of the ring
        function centerTextPlugin(value, label) {
            return {
                id: 'centerText',
                afterDraw: function (chart) {
                    var area = chart.chartArea;
                    var x = (area.left + area.right) / 2;
                    var y = (area.top + area.bottom) / 2;
                    var ctx = chart.ctx;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.87)';
                    ctx.font = '500 26px Montserrat, sans-serif';
                    ctx.fillText(value, x, y + 4);
                    ctx.fillStyle = TEXT_COLOR;
                    ctx.font = '12px Montserrat, sans-serif';
                    ctx.fillText(label, x, y + 22);
                    ctx.restore();
                }
            };
        }

        // Count written at the end of each bar
        var barValuesPlugin = {
            id: 'barValues',
            afterDatasetsDraw: function (chart) {
                var ctx = chart.ctx;
                var dataset = chart.data.datasets[0];
                ctx.save();
                ctx.fillStyle = TEXT_COLOR;
                ctx.font = '500 12px Montserrat, sans-serif';
                ctx.textBaseline = 'middle';
                chart.getDatasetMeta(0).data.forEach(function (bar, index) {
                    ctx.fillText(dataset.data[index], bar.x + 6, bar.y);
                });
                ctx.restore();
            }
        };

        function withCounts(labels, counts) {
            return labels.map(function (label, index) {
                return label + ' (' + counts[index] + ')';
            });
        }

        /**
         * Figures and charts of the Statistics tab, built from the API figures.
         */
        function loadStatistics() {
            AdminCampaignService.getCampaignStatistics($stateParams.campaignId).then(function (stats) {
                var progress = stats.progress;
                var appreciations = stats.appreciations;
                var progressCounts = [progress.toStart, progress.late, progress.inProgress, progress.reported];
                var appreciationCounts = [appreciations.insufficient, appreciations.to_improve, appreciations.satisfactory,
                    appreciations.very_satisfactory, appreciations.none];
                $scope.stats = stats;
                $scope.stats.started = progress.inProgress + progress.reported;
                $scope.charts = {
                    progress: {
                        type: 'doughnut',
                        data: {
                            labels: withCounts([
                                gettextCatalog.getString('To start'),
                                gettextCatalog.getString('Late'),
                                gettextCatalog.getString('Analysis in progress'),
                                gettextCatalog.getString('Report sent')
                            ], progressCounts),
                            datasets: [{
                                data: progressCounts,
                                backgroundColor: [COLORS.grey, COLORS.orange, COLORS.blue, COLORS.green],
                                borderWidth: 2
                            }]
                        },
                        options: {
                            maintainAspectRatio: false,
                            cutout: '70%',
                            plugins: {legend: {position: 'bottom', labels: {boxWidth: 12, color: TEXT_COLOR}}}
                        },
                        plugins: [centerTextPlugin(
                            $scope.percent(progress.reported, stats.entitiesCount) + ' %',
                            gettextCatalog.getString('Report sent')
                        )]
                    },
                    appreciations: {
                        type: 'bar',
                        data: {
                            labels: [
                                gettextCatalog.getString('Insufficient'),
                                gettextCatalog.getString('To improve'),
                                gettextCatalog.getString('Satisfactory'),
                                gettextCatalog.getString('Very satisfactory'),
                                gettextCatalog.getString('Not appreciated')
                            ],
                            datasets: [{
                                data: appreciationCounts,
                                backgroundColor: [COLORS.red, COLORS.orange, COLORS.lightGreen, COLORS.green, COLORS.grey],
                                borderRadius: 4,
                                barThickness: 18
                            }]
                        },
                        options: {
                            indexAxis: 'y',
                            maintainAspectRatio: false,
                            layout: {padding: {right: 24}},
                            plugins: {legend: {display: false}},
                            scales: {
                                x: {beginAtZero: true, ticks: {precision: 0, color: TEXT_COLOR}, grid: {display: false}},
                                y: {ticks: {color: TEXT_COLOR}, grid: {display: false}}
                            }
                        },
                        plugins: [barValuesPlugin]
                    },
                    timeline: {
                        type: 'line',
                        data: {
                            labels: stats.timeline.map(function (day) {
                                return day.date.slice(8, 10) + '/' + day.date.slice(5, 7);
                            }),
                            datasets: [{
                                label: gettextCatalog.getString('Entities started'),
                                data: stats.timeline.map(function (day) { return day.started; }),
                                borderColor: COLORS.blue,
                                backgroundColor: 'rgba(30, 136, 229, 0.12)',
                                fill: true,
                                stepped: true,
                                pointRadius: 0
                            }, {
                                label: gettextCatalog.getString('Entities with a report'),
                                data: stats.timeline.map(function (day) { return day.reported; }),
                                borderColor: COLORS.green,
                                backgroundColor: 'rgba(67, 160, 71, 0.18)',
                                fill: true,
                                stepped: true,
                                pointRadius: 0
                            }]
                        },
                        options: {
                            maintainAspectRatio: false,
                            interaction: {mode: 'index', intersect: false},
                            plugins: {legend: {position: 'bottom', labels: {boxWidth: 12, color: TEXT_COLOR}}},
                            scales: {
                                x: {ticks: {maxTicksLimit: 8, color: TEXT_COLOR}, grid: {display: false}},
                                y: {beginAtZero: true, suggestedMax: stats.entitiesCount, ticks: {precision: 0, color: TEXT_COLOR}}
                            }
                        }
                    }
                };
            });
        }

        function loadCampaign() {
            loadStatistics();
            $scope.isLoading = true;
            AdminCampaignService.getCampaign($stateParams.campaignId).then(function (campaign) {
                $scope.campaign = campaign;

                return AdminSubmissionService.getSubmissions({campaignId: campaign.id});
            }).then(function (data) {
                $scope.submissions = data.submissions;
                updateEntities();
            }).finally(function () {
                $scope.isLoading = false;
            });
        }

        loadCampaign();
    }

})();
