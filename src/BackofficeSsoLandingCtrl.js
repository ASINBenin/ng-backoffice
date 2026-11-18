(function () {

  angular
  .module('BackofficeApp')
  .controller('BackofficeSsoLandingCtrl', [
    '$state', '$location', 'toastr', 'gettextCatalog', 'UserService',
    BackofficeSsoLandingCtrl
  ]);

  // Fin de la connexion SSO : le callback du backend renvoie un jeton ou une erreur
  function BackofficeSsoLandingCtrl($state, $location, toastr, gettextCatalog, UserService) {
    var search = $location.search();

    if (search.error) {
      toastr.error(search.error);
      $state.go('login');
      return;
    }

    UserService.authenticateWithToken(search.token, search.uid).then(function () {
      $state.go(UserService.isAllowed('dbadmin') ? 'main' : 'main.account');
    }, function () {
      toastr.error(gettextCatalog.getString('The SSO login could not be validated.'));
      $state.go('login');
    });
  }

})();
