(function () {

    angular
        .module('BackofficeApp')
        .controller('BackofficeAdminSubmissionsCtrl', ['$scope', 'AdminSubmissionService', BackofficeAdminSubmissionsCtrl]);

    /**
     * Reports submitted by the entities outside any campaign. The reports of a campaign are in its detail page.
     */
    function BackofficeAdminSubmissionsCtrl($scope, AdminSubmissionService) {
        $scope.search = '';
        $scope.submissions = [];
        $scope.isLoading = true;

        $scope.matchesSearch = function (submission) {
            var search = $scope.search.toLowerCase();

            return [submission.clientName, submission.analysisLabel, submission.submittedBy].some(function (value) {
                return (value || '').toLowerCase().indexOf(search) !== -1;
            });
        };

        $scope.download = AdminSubmissionService.downloadSubmission;
        $scope.appreciate = AdminSubmissionService.showAppreciationDialog;
        $scope.formatSize = AdminSubmissionService.formatSize;

        AdminSubmissionService.getSubmissions({}).then(function (data) {
            $scope.submissions = data.submissions.filter(function (submission) {
                return submission.campaignId === null;
            });
        }).finally(function () {
            $scope.isLoading = false;
        });
    }

})();
