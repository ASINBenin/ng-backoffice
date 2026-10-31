(function () {

    angular
        .module('BackofficeApp')
        .controller('BackofficeAdminSubmissionsCtrl', [
            '$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AdminCampaignService', 'AdminSubmissionService',
            BackofficeAdminSubmissionsCtrl
        ]);

    /**
     * Reports submitted by the entities, in a campaign or outside any campaign.
     */
    function BackofficeAdminSubmissionsCtrl($scope, $mdDialog, toastr, gettextCatalog, AdminCampaignService,
                                           AdminSubmissionService) {
        // 'all', 'none' (outside any campaign) or the id of a campaign
        $scope.selectedCampaign = 'all';
        $scope.search = '';
        $scope.campaigns = [];
        $scope.submissions = [];
        $scope.isLoading = true;

        $scope.updateSubmissions = function () {
            var params = typeof $scope.selectedCampaign === 'number' ? {campaignId: $scope.selectedCampaign} : {};
            $scope.isLoading = true;
            AdminSubmissionService.getSubmissions(params).then(function (data) {
                $scope.submissions = $scope.selectedCampaign === 'none'
                    ? data.submissions.filter(function (submission) {
                        return submission.campaignId === null;
                    })
                    : data.submissions;
            }).finally(function () {
                $scope.isLoading = false;
            });
        };

        $scope.matchesSearch = function (submission) {
            var search = $scope.search.toLowerCase();

            return [submission.clientName, submission.analysisLabel, submission.campaignLabel, submission.submittedBy]
                .some(function (value) {
                    return (value || '').toLowerCase().indexOf(search) !== -1;
                });
        };

        $scope.download = function (submission) {
            AdminSubmissionService.downloadSubmission(submission);
        };

        /**
         * The ASIN gives or corrects its appreciation (level and comment) of a version.
         * It never blocks anything: the campaign can be open or closed, or the report outside any campaign.
         */
        $scope.appreciate = function (submission, ev) {
            $mdDialog.show({
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
                AdminSubmissionService.appreciateSubmission(submission.id, $scope.appreciation).then(function () {
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

        $scope.formatSize = function (bytes) {
            return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.ceil(bytes / 1024) + ' KB';
        };

        AdminCampaignService.getCampaigns({order: 'label', limit: 100, page: 1, status: 'all'}).then(function (data) {
            $scope.campaigns = data.campaigns;
        });
        $scope.updateSubmissions();
    }

})();
