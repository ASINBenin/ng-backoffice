(function () {

    angular
        .module('BackofficeApp')
        .controller('BackofficeAdminCampaignsCtrl', [
            '$scope', 'toastr', '$mdDialog', '$mdMedia', 'gettextCatalog', 'AdminCampaignService',
            'TableHelperService', BackofficeAdminCampaignsCtrl
        ]);

    function BackofficeAdminCampaignsCtrl($scope, toastr, $mdDialog, $mdMedia, gettextCatalog, AdminCampaignService,
                                          TableHelperService) {
        TableHelperService.resetBookmarks();

        $scope.campaigns = TableHelperService.build('-createdAt', 20, 1, '');
        $scope.campaigns.query.status = 'all';

        $scope.updateCampaigns = function () {
            $scope.campaigns.promise = AdminCampaignService.getCampaigns($scope.campaigns.query);
            $scope.campaigns.promise.then(function (data) {
                $scope.campaigns.items = data;
            });
        };

        $scope.removeCampaignsFilter = function () {
            TableHelperService.removeFilter($scope.campaigns);
            $scope.campaigns.query.status = 'all';
        };

        $scope.$watch('campaigns.query.status', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                $scope.campaigns.query.page = 1;
                $scope.updateCampaigns();
            }
        });

        var showCampaignDialog = function (ev, campaign) {
            return $mdDialog.show({
                controller: ['$scope', '$mdDialog', 'AdminCampaignService', 'campaign', CreateCampaignDialogCtrl],
                templateUrl: 'views/dialogs/create.campaigns.admin.html',
                targetEvent: ev,
                scope: $scope.$dialogScope.$new(),
                preserveScope: false,
                clickOutsideToClose: false,
                fullscreen: $mdMedia('sm') || $mdMedia('xs'),
                locals: {
                    'campaign': campaign
                }
            });
        };

        $scope.createNewCampaign = function (ev, campaign) {
            showCampaignDialog(ev, campaign).then(function (form) {
                AdminCampaignService.createCampaign(toCampaignParams(form),
                    function () {
                        $scope.updateCampaigns();
                        toastr.success(gettextCatalog.getString('The campaign has been created successfully.'),
                            gettextCatalog.getString('Creation successful'));
                    },
                    function () {
                        $scope.createNewCampaign(ev, form);
                    }
                );
            }, $scope.handleRejectionDialog);
        };

        $scope.editCampaign = function (ev, campaign) {
            var openDialog = function (form) {
                showCampaignDialog(ev, form).then(function (editedForm) {
                    AdminCampaignService.updateCampaign(toCampaignParams(editedForm),
                        function () {
                            $scope.updateCampaigns();
                            toastr.success(gettextCatalog.getString('The campaign has been edited successfully.'),
                                gettextCatalog.getString('Edition successful'));
                        },
                        function () {
                            openDialog(editedForm);
                        }
                    );
                }, $scope.handleRejectionDialog);
            };

            AdminCampaignService.getCampaign(campaign.id).then(function (data) {
                openDialog(toCampaignForm(data));
            });
        };

        var confirmAndRun = function (ev, title, text, okLabel, action, successMessage) {
            var confirm = $mdDialog.confirm()
                .title(title)
                .textContent(text)
                .targetEvent(ev)
                .ok(okLabel)
                .cancel(gettextCatalog.getString('Cancel'));
            $mdDialog.show(confirm).then(function () {
                action(function () {
                    $scope.updateCampaigns();
                    toastr.success(successMessage);
                });
            }, function () {
            });
        };

        $scope.publishCampaign = function (ev, campaign) {
            confirmAndRun(ev,
                gettextCatalog.getString('Publish the campaign "{{label}}"?', {label: campaign.label}),
                gettextCatalog.getString('The invited entities will be able to participate. The campaign can no longer be modified and the scales of its model are frozen. This operation is irreversible.'),
                gettextCatalog.getString('Publish'),
                function (success) {
                    AdminCampaignService.publishCampaign(campaign.id, success);
                },
                gettextCatalog.getString('The campaign has been published.')
            );
        };

        $scope.closeCampaign = function (ev, campaign) {
            confirmAndRun(ev,
                gettextCatalog.getString('Close the campaign "{{label}}"?', {label: campaign.label}),
                gettextCatalog.getString('The entities will no longer be able to participate. This operation is irreversible.'),
                gettextCatalog.getString('Close campaign'),
                function (success) {
                    AdminCampaignService.closeCampaign(campaign.id, success);
                },
                gettextCatalog.getString('The campaign has been closed.')
            );
        };

        $scope.deleteCampaign = function (ev, campaign) {
            confirmAndRun(ev,
                gettextCatalog.getString('Delete the campaign "{{label}}"?', {label: campaign.label}),
                gettextCatalog.getString('This operation is irreversible.'),
                gettextCatalog.getString('Delete'),
                function (success) {
                    AdminCampaignService.deleteCampaign(campaign.id, success);
                },
                gettextCatalog.getString('The campaign has been deleted.')
            );
        };

        TableHelperService.watchSearch($scope, 'campaigns.query.filter', $scope.campaigns.query, $scope.updateCampaigns);
    }

    function toDate(value) {
        var parts = value.split('-');

        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function toDateString(date) {
        return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
    }

    function toCampaignForm(data) {
        return {
            id: data.id,
            label: data.label,
            description: data.description,
            model: data.model,
            startDate: toDate(data.startDate),
            responseDeadline: toDate(data.responseDeadline),
            endDate: toDate(data.endDate),
            isSignatureRequired: data.isSignatureRequired,
            clients: data.participants.map(function (participant) {
                return participant.client;
            })
        };
    }

    function toCampaignParams(form) {
        return {
            id: form.id,
            label: form.label,
            description: form.description,
            modelId: form.model.id,
            startDate: toDateString(form.startDate),
            responseDeadline: toDateString(form.responseDeadline),
            endDate: toDateString(form.endDate),
            isSignatureRequired: form.isSignatureRequired,
            clientIds: form.clients.map(function (client) {
                return client.id;
            })
        };
    }

    function CreateCampaignDialogCtrl($scope, $mdDialog, AdminCampaignService, campaign) {
        $scope.campaign = campaign || {
            label: '',
            description: '',
            model: null,
            startDate: null,
            responseDeadline: null,
            endDate: null,
            isSignatureRequired: false,
            clients: []
        };

        $scope.searchModels = function (text) {
            return AdminCampaignService.getSelectableModels({filter: text}).then(function (data) {
                return data.models;
            });
        };

        $scope.searchClients = function (text) {
            var selectedIds = $scope.campaign.clients.map(function (client) {
                return client.id;
            });

            return AdminCampaignService.getSelectableClients({filter: text}).then(function (data) {
                return data.clients.filter(function (client) {
                    return selectedIds.indexOf(client.id) === -1;
                });
            });
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.create = function () {
            $mdDialog.hide($scope.campaign);
        };
    }

})();
