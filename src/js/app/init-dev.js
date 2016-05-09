var app = angular.module('App', ['infinite-scroll', 'ngSanitize', 'ui.router', 'ipCookie', 'ngStorage', 'mwl.calendar']);
var backendUrl = "http://equity-file-api.elrok.com";
//var backendUrl = "http://localhost:9292";

app.constant('AUTH_EVENTS', {
  loginSuccess: 'auth-login-success',
  loginFailed: 'auth-login-failed',
  logoutSuccess: 'auth-logout-success',
  sessionTimeout: 'auth-session-timeout',
  notAuthenticated: 'auth-not-authenticated',
  notAuthorized: 'auth-not-authorized'
});

app.constant('USER_ROLES', {
  admin: 'admin',
  company: 'company',
  professionalInvestor: 'professionalInvestor',
  guest: 'guest'
})
.run(function ($rootScope, AUTH_EVENTS, authService, $state) {
  $rootScope.$on('$stateChangeStart', function (event, next) {
    if (next.data){
      var authorizedRoles = next.data.authorizedRoles
      if (!authService.isAuthorized(authorizedRoles)) {
        event.preventDefault();
        if (authService.isAuthenticated()) {
          // user is not allowed
          $rootScope.$broadcast(AUTH_EVENTS.notAuthorized);
          $state.go('login');
        } else {
          // user is not logged in
          $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
          $state.go('login');
        }
      }
    }
  });
})
