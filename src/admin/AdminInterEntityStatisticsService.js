(function () {

    angular
        .module('BackofficeApp')
        .factory('AdminInterEntityStatisticsService', ['$resource', AdminInterEntityStatisticsService]);

    /**
     * Latest statistics of the analyses of all the entities, collected each day from the FrontOffices.
     */
    function AdminInterEntityStatisticsService($resource) {
        var resource = $resource('api/inter-entity-statistics/:type');

        return {
            getRisks: function () {
                return resource.query({type: 'risks'}).$promise;
            },
            getCompliance: function () {
                return resource.query({type: 'compliance'}).$promise;
            },
            getThreats: function () {
                return resource.query({type: 'threats'}).$promise;
            },
            getVulnerabilities: function () {
                return resource.query({type: 'vulnerabilities'}).$promise;
            },
            getEvolution: function (period) {
                return resource.get({type: 'evolution', period: period}).$promise;
            }
        };
    }

})();
