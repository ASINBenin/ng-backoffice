(function () {

    angular
        .module('BackofficeApp')
        .factory('AdminSubmissionService', [
            '$resource', '$http', '$mdDialog', 'toastr', 'gettextCatalog', 'DownloadService', AdminSubmissionService
        ]);

    function AdminSubmissionService($resource, $http, $mdDialog, toastr, gettextCatalog, DownloadService) {
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

        /**
         * The ASIN gives or corrects its appreciation (level and comment) of a version. It never blocks anything:
         * the campaign can be open or closed, or the report outside any campaign.
         */
        var showAppreciationDialog = function (submission, ev) {
            return $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'submission', AppreciationDialogCtrl],
                templateUrl: 'views/dialogs/appreciate.submission.admin.html',
                targetEvent: ev,
                locals: {submission: submission},
                clickOutsideToClose: false
            });
        };

        function AppreciationDialogCtrl($scope, $mdDialog, submission) {
            $scope.submission = submission;
            $scope.appreciation = {
                level: submission.appreciation ? submission.appreciation.level : null,
                comment: submission.appreciation ? submission.appreciation.comment : ''
            };
            $scope.isSaving = false;

            $scope.cancel = function () {
                $mdDialog.cancel();
            };

            $scope.save = function () {
                $scope.isSaving = true;
                appreciateSubmission(submission.id, $scope.appreciation).then(function () {
                    submission.appreciation = {
                        level: $scope.appreciation.level,
                        comment: $scope.appreciation.comment || null
                    };
                    toastr.success(gettextCatalog.getString('The appreciation has been saved.'));
                    $mdDialog.hide();
                }).finally(function () {
                    $scope.isSaving = false;
                });
            };
        }

        var formatSize = function (bytes) {
            return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.ceil(bytes / 1024) + ' KB';
        };

        return {
            getSubmissions: getSubmissions,
            downloadSubmission: downloadSubmission,
            showAppreciationDialog: showAppreciationDialog,
            formatSize: formatSize
        };
    }

})();
