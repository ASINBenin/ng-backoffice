(function () {

    angular
        .module('BackofficeApp')
        .controller('BackofficeAdminCampaignDetailCtrl', [
            '$scope', '$stateParams', 'AdminCampaignService', 'AdminSubmissionService', BackofficeAdminCampaignDetailCtrl
        ]);

    /**
     * One campaign: its information, the participation of each invited entity, and the reports they sent.
     */
    function BackofficeAdminCampaignDetailCtrl($scope, $stateParams, AdminCampaignService, AdminSubmissionService) {
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
                    status: participant.status,
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

})();
