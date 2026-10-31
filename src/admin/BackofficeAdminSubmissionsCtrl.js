(function () {

    angular
        .module('BackofficeApp')
        .controller('BackofficeAdminSubmissionsCtrl', [
            '$scope', 'AdminCampaignService', 'AdminSubmissionService', BackofficeAdminSubmissionsCtrl
        ]);

    /**
     * Reports submitted by the entities, in a campaign or outside any campaign.
     */
    function BackofficeAdminSubmissionsCtrl($scope, AdminCampaignService, AdminSubmissionService) {
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

        $scope.formatSize = function (bytes) {
            return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.ceil(bytes / 1024) + ' KB';
        };

        AdminCampaignService.getCampaigns({order: 'label', limit: 100, page: 1, status: 'all'}).then(function (data) {
            $scope.campaigns = data.campaigns;
        });
        $scope.updateSubmissions();
    }

})();
