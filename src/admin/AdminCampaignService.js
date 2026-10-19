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

        var getSelectableClients = function (params) {
            return self.CampaignClientResource.query(params).$promise;
        };

        var getSelectableModels = function (params) {
            return self.CampaignModelResource.query(params).$promise;
        };

        return {
            getCampaigns: getCampaigns,
            getCampaign: getCampaign,
            createCampaign: createCampaign,
            updateCampaign: updateCampaign,
            deleteCampaign: deleteCampaign,
            publishCampaign: publishCampaign,
            closeCampaign: closeCampaign,
            getSelectableClients: getSelectableClients,
            getSelectableModels: getSelectableModels
        };
    }

})
();
