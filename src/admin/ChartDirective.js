(function () {

    angular
        .module('BackofficeApp')
        .directive('monarcChart', MonarcChartDirective);

    /**
     * Chart.js chart drawn from a configuration object: <canvas monarc-chart="config"></canvas>.
     * The chart is drawn again when the configuration is replaced.
     */
    function MonarcChartDirective() {
        // Canvas texts do not follow the CSS: same font as the rest of the BackOffice (style.css)
        Chart.defaults.font.family = 'Montserrat, sans-serif';

        return {
            restrict: 'A',
            scope: {config: '=monarcChart'},
            link: function (scope, element) {
                var chart = null;

                scope.$watch('config', function (config) {
                    if (chart) {
                        chart.destroy();
                        chart = null;
                    }
                    if (config) {
                        chart = new Chart(element[0], angular.copy(config));
                    }
                });

                scope.$on('$destroy', function () {
                    if (chart) {
                        chart.destroy();
                    }
                });
            }
        };
    }

})();
