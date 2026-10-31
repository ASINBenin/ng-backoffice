(function () {

    angular
        .module('BackofficeApp')
        .factory('AdminSubmissionService', ['$resource', '$http', 'DownloadService', AdminSubmissionService]);

    function AdminSubmissionService($resource, $http, DownloadService) {
        var submissionResource = $resource('api/entity-submissions', {}, {'query': {isArray: false}});

        /**
         * Reports sent by the entities, most recent first: { submissions: [] }.
         * params.campaignId and params.clientId narrow the list.
         */
        var getSubmissions = function (params) {
            return submissionResource.query(params).$promise;
        };

        var downloadSubmission = function (submission) {
            return $http.get('api/entity-submissions/' + submission.id, {responseType: 'arraybuffer'})
                .then(function (response) {
                    var disposition = response.headers('Content-Disposition');
                    var fileName = /filename="([^"]+)"/.exec(disposition);
                    DownloadService.downloadBlob(
                        response.data,
                        fileName === null ? 'report.pdf' : fileName[1],
                        response.headers('Content-Type')
                    );
                });
        };

        /**
         * Gives or corrects the appreciation of a report version: { level, comment }.
         */
        var appreciateSubmission = function (id, appreciation) {
            return $http.put('api/entity-submissions/' + id + '/appreciation', appreciation);
        };

        return {
            getSubmissions: getSubmissions,
            downloadSubmission: downloadSubmission,
            appreciateSubmission: appreciateSubmission
        };
    }

})();
