(function () {

    angular
        .module('BackofficeApp')
        .factory('AdminCampaignService', [ '$resource', AdminCampaignService ]);

    function AdminCampaignService($resource) {
        var self = this;

        self.CampaignResource = $resource('api/campaigns/:campaignId', { campaignId: '@id' },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });
        self.CampaignStatusResource = $resource('api/campaigns/:campaignId/:action');
        self.CampaignClientResource = $resource('api/campaign-clients', {}, { 'query': { isArray: false } });
        self.CampaignModelResource = $resource('api/campaign-models', {}, { 'query': { isArray: false } });

        var getCampaigns = function (params) {
            return self.CampaignResource.query(params).$promise;
        };

        var getCampaign = function (id) {
            return self.CampaignResource.query({campaignId: id}).$promise;
        };

        var createCampaign = function (params, success, error) {
            new self.CampaignResource(params).$save(success, error);
        };

        var updateCampaign = function (params, success, error) {
            self.CampaignResource.update(params, success, error);
        };

        var deleteCampaign = function (id, success, error) {
            self.CampaignResource.delete({campaignId: id}, success, error);
        };

        var publishCampaign = function (id, success, error) {
            self.CampaignStatusResource.save({campaignId: id, action: 'publish'}, {}, success, error);
        };

        var closeCampaign = function (id, success, error) {
            self.CampaignStatusResource.save({campaignId: id, action: 'close'}, {}, success, error);
        };

        /**
         * New response deadline and end date of a published campaign: they can only be postponed.
         */
        var extendCampaignDates = function (id, responseDeadline, endDate, success, error) {
            self.CampaignStatusResource.save({campaignId: id, action: 'dates'}, {
                responseDeadline: toDateString(responseDeadline),
                endDate: toDateString(endDate)
            }, success, error);
        };

        self.StatisticsResource = $resource('api/campaign-statistics/:campaignId', {}, {
            'query': {isArray: false}
        });

        var getStatisticsOverview = function () {
            return self.StatisticsResource.query().$promise;
        };

        var getCampaignStatistics = function (id) {
            return self.StatisticsResource.query({campaignId: id}).$promise;
        };

        var addCampaignParticipants = function (id, clientIds, success, error) {
            self.CampaignStatusResource.save({campaignId: id, action: 'participants'}, {clientIds: clientIds},
                success, error);
        };

        var getSelectableClients = function (params) {
            return self.CampaignClientResource.query(params).$promise;
        };

        var getSelectableModels = function (params) {
            return self.CampaignModelResource.query(params).$promise;
        };

        // The API exchanges dates as YYYY-MM-DD, the date pickers as local dates
        function toDate(value) {
            var parts = value.split('-');

            return new Date(parts[0], parts[1] - 1, parts[2]);
        }

        function toDateString(date) {
            return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
        }

        return {
            getCampaigns: getCampaigns,
            getCampaign: getCampaign,
            createCampaign: createCampaign,
            updateCampaign: updateCampaign,
            deleteCampaign: deleteCampaign,
            publishCampaign: publishCampaign,
            closeCampaign: closeCampaign,
            extendCampaignDates: extendCampaignDates,
            addCampaignParticipants: addCampaignParticipants,
            getStatisticsOverview: getStatisticsOverview,
            getCampaignStatistics: getCampaignStatistics,
            getSelectableClients: getSelectableClients,
            getSelectableModels: getSelectableModels,
            toDate: toDate,
            toDateString: toDateString
        };
    }

})
();
