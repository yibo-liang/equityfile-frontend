app.config(function($stateProvider, $urlRouterProvider, USER_ROLES) {

  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'partials/homepage.html',
      controller: 'HomeController',
    })

    // route to show our login
    .state('login', {
      url: '/login',
      templateUrl: 'partials/homepage.html',
      controller: 'loginController'
    })

    // route to show our landing page (/companyDashboard)
    .state('list', {
      url: '/list',
      templateUrl: 'partials/companyListing.html',
      controller: 'companyListingController',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })

    .state('dashboard', {
      url: '/dashboard',
      templateUrl: 'partials/dashboard.html',
      controller: 'DashboardController',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })
    //Route to show site's administrator area
    .state('companiesAdministratorArea', {
      url: '/companiesAdministratorArea',
      templateUrl: 'partials/companiesAdministratorArea.html',
      controller: 'CompaniesAdministratorAreaController',
      data: {
        //**********************************************************************
        // Remember to remove company and professional investor when complete
        //**********************************************************************
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })
    //Route to show site's administrator area
    .state('usersAdministratorArea', {
      url: '/usersAdministratorArea',
      templateUrl: 'partials/usersAdministratorArea.html',
      controller: 'UsersAdministratorAreaController',
      data: {
        //**********************************************************************
        // Remember to remove company and professional investor when complete
        //**********************************************************************
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })
    .state('messages', {
      url: '/messages',
      templateUrl: 'partials/messages.html',
      controller: 'messagesController',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })

     // route to show our registration
    .state('registration', {
      url: '/registration',
      templateUrl: 'partials/registration.html',
      controller: 'registrationController'
    })

    //child state for registration
    .state('registration.portfolioManager', {
      templateUrl: 'partials/registration.portfolioManager.html',
      controller: 'registrationController'
    })

    .state('registration.analyst', {
      templateUrl: 'partials/registration.analyst.html',
      controller: 'registrationController'
    })

    .state('registration.teamAssistant', {
      templateUrl: 'partials/registration.teamAssistant.html',
      controller: 'registrationController'
    })

    .state('registrationSuccess', {
      url: '/registrationSuccess',
      templateUrl: 'partials/registrationSuccess.html'
    })

    .state('registrationFail', {
      url: '/registrationFail',
      templateUrl: 'partials/registrationFail.html'
    })

    .state('companyProfile', {
      url: '/companyProfile',
      templateUrl: 'partials/companyProfile.html',
      controller: 'companyProfileController',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })

    .state('addUser', {
      url: '/addUser',
      templateUrl: 'partials/addUser.html',
      controller: 'addUserController',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })

    .state('inviteNewMember', {
      url: '/inviteNewMember',
      templateUrl: 'partials/inviteNewMember.html',
      controller: 'inviteNewMemberController',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })

    .state('inviteSuccess', {
      url: '/inviteSuccess',
      templateUrl: 'partials/inviteSuccess.html',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })

    .state('changePassword', {
      url: '/changePassword',
      templateUrl: 'partials/changePassword.html',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })

    .state('passwordSuccess', {
      url: '/passwordSuccess',
      templateUrl: 'partials/passwordSuccess.html',
    })

    .state('registrationCompany', {
      url: '/registrationCompany',
      templateUrl: 'partials/registrationCompany.html',
      controller: 'registrationCompanyController'
    })

    .state('investorProfile', {
      url: '/investorProfile/:param1',
      templateUrl: 'partials/investorProfile.html',
      controller: 'investorProfileController',
      data: {
        authorizedRoles: [USER_ROLES.professionalInvestor, USER_ROLES.admin]
      }
    })

    .state('tagSearch', {
      url: '/tagSearch',
      templateUrl: 'partials/tagSearch.html',
      controller: 'tagSearchController',
      data: {
        authorizedRoles: [USER_ROLES.company, USER_ROLES.admin]
      }
    })

    .state('forgotPassword', {
      url: '/forgotPassword',
      templateUrl: 'partials/forgotPassword.html',
      controller: 'forgotPasswordController',
    })

  // catch all route
  // send users to the form page
 $urlRouterProvider
   .otherwise('/');
});
