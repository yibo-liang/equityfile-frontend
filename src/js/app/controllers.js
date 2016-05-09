app.controller('loginController', ['$scope', 'authService', '$state', '$rootScope', 'AUTH_EVENTS', function($scope, authService, $state, $rootScope, AUTH_EVENTS){
  $scope.login = function (user) {
    $scope.error = null;
    authService.login(user).then(function (res) {
      $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
      $scope.setCurrentUser(res);
      if(res.firstTime)
        if(res.investor)
          $state.go('investorProfile');
        else
          $state.go('companyProfile');
      else
        $state.go('dashboard');
      $scope.error = null;
    }, function (res) {
      $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
      $scope.error = "There was an error logging in, try again"
    });
  };
  
}]);

app.controller('applicationController', ['$scope', 'authService', 'USER_ROLES', 'AUTH_EVENTS', '$rootScope', 'Session', '$localStorage', '$state', function($scope, authService, USER_ROLES, AUTH_EVENTS, $rootScope, Session, $localStorage, $state){
  $scope.currentDate = new Date();
  $scope.currentUser = null;
  $scope.userRoles = USER_ROLES;
  $scope.isAuthorized = authService.isAuthorized;
  $rootScope.$storage = $localStorage;

  if($rootScope.$storage.userSesh) $scope.currentUser = $rootScope.$storage.userSesh;
  
  $rootScope.$on(AUTH_EVENTS.notAuthorized, function() {
    $scope.error = "Not Authorized, please log in again or contact an admin"
  });

  $rootScope.$on(AUTH_EVENTS.notAuthenticated, function() {
    $scope.error = "Not Authenticated, please log in."
  });
  $scope.navHide = function() {
    if(($state.current.name === 'home' || $state.current.name === 'login') && (!typeof $rootScope.$storage.userSesh.id === undefined || !$rootScope.$storage.userSesh.id === 'undefined'))
    {
      $state.go('dashboard');
      return true;
    }
    else if(($state.current.name === 'home' || $state.current.name === 'login'))
      return true
    else
      return false;
  };
  $scope.setCurrentUser = function (user) {
    user.userRole = "admin"
    if(user.accepted == 1 || user.accepted == "1")
    {
      Session.create(user);
      $scope.currentUser = $rootScope.$storage.userSesh;
    }
    else
    {
      $state.go("login");
    }
  };

  $scope.LogOut = function () {
    Session.destroy();
    $scope.currentUser = {};
    $state.go('home');
  };

  $scope.routeThis = function(events){
    $rootScope.$broadcast('routeRequest', events)

  };

}]);

app.controller('DashboardController', ['$scope', 'Invites', '$http', 'InvAppointments', 'Events', '$rootScope', 'CompanyAppointments', 'Matches', 'UserMeetingLocations', function($scope, Invites, $http, InvAppointments, Events, $rootScope, CompanyAppointments, Matches, UserMeetingLocations){
// ********************************************************************
// --------------------------------------------------------------------
// + Reformat the google maps stuff, its messy
// + Figure out issues regarding
//   + Failed to locate one waypoint
//   + Failed to route between two locations
//   + Error handling more than 23 markers (or 10)
// + Use places search for first destination
// + Add address validation
  // + Possibly validate by geocoding on registration (THIS MEANS GEOCODING IS AVAILABLE TO ANYONE NOT LOGGED IN)
  // + Possibly validate syntax at registration and validate properly via geocoding in admin panel? (MIGHT BE WAY MORE DIFFICULT THAN I'M THINKING DUE TO YOUR JQUERY STUFF)
  // + Possibly use places search for registration (THIS WILL REQUIRE REFORMATTING BOTH REGISTRATIONS AND PROFILES)
  // + Possibly store co-ords in database to cut down on requests more?
// --------------------------------------------------------------------
// ********************************************************************
  $scope.calendarView = 'month';
  $scope.calendarDay = new Date();
  $scope.buttonActive = true;
  $scope.hideSection = true;
  $scope.matchButtons = true;
  $scope.matchHideSection = true;

  $scope.newMap = function(){
    document.getElementById('panel').innerHTML = "";
    $scope.directionsService = new google.maps.DirectionsService();
    $scope.directionsDisplay = new google.maps.DirectionsRenderer();
    $scope.map = new google.maps.Map(document.getElementById('map'), {

       zoom:7,
       mapTypeId: google.maps.MapTypeId.ROADMAP
     });

     $scope.directionsDisplay.setMap($scope.map);
     $scope.directionsDisplay.setPanel(document.getElementById('panel'));
  }

  if ($scope.currentUser) {Events.fetchEvents($scope.currentUser.userId, $scope.currentUser.investor);}

  $rootScope.$on('eventsLoaded', function(){
    Events.parseEvents();
  });

  $rootScope.$on('eventsParsed', function(){
    $scope.events = Events.list();
    $scope.fetchLocation();
  });

  $rootScope.$on('routeRequest', function(event, date){
    $scope.updateDirections(date)
  });

  $scope.fetchLocation = function(){
    $scope.defaultLocationStatic = {};
    $scope.defaultLocation = {};
    UserMeetingLocations.fetchLocation()
    .then(function(response){
      $scope.defaultLocationStaticString = response.data.location
      $scope.defaultLocationStatic.lat = parseFloat(response.data.lat)
      $scope.defaultLocationStatic.lng = parseFloat(response.data.lng)
      $scope.defaultLocationString = response.data.location
      $scope.defaultLocation = $scope.defaultLocationStatic
      $scope.autocomplete = $scope.defaultLocation.location
      $scope.date = new Date();
      $scope.updateDirections($scope.date);
      });
  }

  $scope.init = function() {
      autocomplete = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocomplete')),
                    { types: ['geocode'] });
                google.maps.event.addListener(autocomplete, 'place_changed', function() {
                });
                autocomplete.addListener('place_changed', fillInAddress);

    }
    $scope.init();


    function fillInAddress() {
      // Get the place details from the autocomplete object.
      var place = autocomplete.getPlace();
      $("#defaultLocationDisplay").html("")
      $scope.defaultLocation = {};
      $scope.defaultLocation.lat = place.geometry.location.lat()
      $scope.defaultLocation.lng = place.geometry.location.lng()
      $scope.changeOrigin();
    }



    $scope.repositionSuggestions = function() {
      setTimeout(function(){var test = $('div.pac-container');
      $('div.pac-container').css('top', '');
      $('div.pac-container').css('left', '');
      $('#suggestions').html(test);},0.1);
    }


  $scope.clearEvents = function(){
    $scope.destinations = []
    $scope.changeOrigin();
    $scope.autocomplete = $scope.defaultLocationStatic.location;
  }

  $scope.changeOrigin = function(){
    $("#maperror").html("")
    if($scope.destinations.length > 0)
    {
      $scope.updateDirections($scope.destinationEvents);
    }
    else
    {
      $scope.updateDirections([]);
    }
  }


  $scope.updateDirections = function(events){
    $("#maperror").html("")
    $scope.newMap();
    $scope.destinations = [];
    $scope.destinationEvents = events
    if($scope.destinationEvents.length > 0)
    {
      $scope.destinationEvents.sort(function(a,b){
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() 
      });
      angular.forEach($scope.destinationEvents, function(value, key){
        locationEvent = value.postcode
        $scope.destinations.push({location: locationEvent, stopover: true})
      });
      var request = {
        destination: $scope.destinations[$scope.destinations.length-1].location,
        origin: $scope.defaultLocation, 
        travelMode: google.maps.DirectionsTravelMode.DRIVING
      };
      if ($scope.destinations.length > 0)
        request.waypoints = $scope.destinations.slice(0, $scope.destinations.length-1);

      $scope.directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          $scope.directionsDisplay.setDirections(response);
        }
        else
        {
          $("#maperror").html("Error: <pre>" + status + "</pre>")
        }
      });
    }
    else
    {
      geocoder = new google.maps.Geocoder();
      console.log($scope.defaultLocation)
      if($scope.defaultLocation.lat)
      {
          $scope.map.setCenter($scope.defaultLocation);
          var marker = new google.maps.Marker({
              map: $scope.map,
              position: $scope.defaultLocation
          });
      }
      else
      {
        console.log($scope.defaultLocation)
        geocoder.geocode( { 'address': $scope.defaultLocation}, function(results, status){
          if (status == google.maps.GeocoderStatus.OK) {
          $scope.map.setCenter(results[0].geometry.location);
          var marker = new google.maps.Marker({
              map: $scope.map,
              position: results[0].geometry.location
          });
        }
        else
          { 
            $("#maperror").html("Error: <pre>" + status + "</pre>")
          }
        });
      }

 
    }
  }

  $scope.letterTracker = function(v){
    if(v<23)
      return String.fromCharCode(v+66);
    else
      return "ERROR"

        }

  $scope.declineInvite = function(id){
    $http.post(backendUrl + '/declineInvite', {"invite": {"id": id}})
      .success(function(data, status){

      })
      .error(function(data, status){
        $scope.error = data.error;
      });
    $scope.fetchInvs();
  };

  $scope.sendAppointment = function(appointment){
    $scope.appointment = appointment;
    $scope.appointment.inviteId = $scope.inviteId;
    $http.post(backendUrl + '/appointment', appointment)
      .success(function(data, status){
        //
      })
      .error(function(data, status){
        //
      });
    $scope.hideSection = true;
    $scope.fetchInvs();
  };

  $scope.sendMatchAppointment = function(appointment){
    $scope.appointment = appointment;
    $scope.appointment.matchId = $scope.matchId;
    $http.post(backendUrl + '/appointment', appointment)
      .success(function(data, status){
        //
      })
      .error(function(data, status){
        //
      });
    $scope.matchHideSection = true;
    $scope.fetchDashboardMatches();
  };


  $scope.acceptAppointment = function(id){
    $http.post(backendUrl + '/accept_appointment', id)
      .success(function (data, status){
        //
      })
      .error(function(data, status){

      });
    $scope.fetchCompanyAppointments();
  };

  $scope.acceptInvite = function(id){
    $scope.inviteId = id;
    $scope.hideSection = false;
  };

  $scope.acceptMatch = function(id){
    $scope.matchId = id;
    $scope.matchHideSection = false;
  };

  $scope.fetchDashboardMatches = function(){
    Matches.fetchDashboardMatches({"company": {"id": $scope.currentUser.companyId}})
      .then(function(response){
        $scope.matches = response.data;
      });
  };
  $scope.fetchDashboardMatches();

  $scope.fetchInvs = function(){
    if ($scope.currentUser.investor){
      Invites.fetchInvestorInvites({"user": {"id": $scope.currentUser.userId}})
        .then(function(response){
          $scope.invites = response.data;
        });
    }else{
      Invites.fetchCompanyInvites({"user": {"id": $scope.currentUser.userId}})
        .then(function(response){
          $scope.invites = response.data;
          console.log(response.data);
        });
    }
  };
  $scope.fetchInvs();

  $scope.showInvites = function(){
    $scope.buttonActive = !$scope.buttonActive;
  };

  $scope.showMatches = function(){
    $scope.matchButtons = !$scope.matchButtons;
  };

  $scope.bookAppointment = function(appointment){
    console.log(appointment);
  };

  $scope.fetchInvAppointments = function(){
    InvAppointments.fetchAppointments({"user": {"id": $scope.currentUser.userId}})
      .then(function(response){
        $scope.appointments = response.data;
      });
  };
  $scope.fetchInvAppointments();

  $scope.fetchCompanyAppointments = function(){
    CompanyAppointments.fetchAppointments({"user": {"id": $scope.currentUser.userId}})
      .then(function(response){
        $scope.appointments = response.data;
      });
  };
  $scope.fetchCompanyAppointments();
}]);

app.controller('AdministratorDashboardController', ['$scope', 'CompanySearch', function($scope, CompanySearch){
  $scope.companies = [];
  $scope.searchTerm = "";

  $scope.setSomeStuff = function(pass_params){
    if (true) {
      console.log("In setSomeStuff");
    } else {
      console.log("Impossible");
    }
  };

  Invites.fetchInvites({"user": {"id": $scope.currentUser.userId}})
    .then(function(response){
      $scope.invites = response.data;
    });

}]);

app.controller('HomeController', ['$scope', function($scope){

  $scope.setSomeStuff = function(pass_params){
    if (true) {
      console.log("In setSomeStuff");
    } else {
      console.log("Impossible");
    }
  };

}]);

// app.controller('messagingController', ['$scope', function($scope){

//   $scope.setSomeStuff = function(pass_params){
//     if (true) {
//       console.log("In setSomeStuff")
//     } else {
//       console.log("Impossible")
//     }
//   };

// }]);
app.controller('CompaniesAdministratorAreaController', ['$scope', 'Countries', '$rootScope','CompanySearch', 'CompanyUpdate', function($scope, Countries, $rootScope, CompanySearch, CompanyUpdate){
  
  //--To-Dos--
  //1. Get the page to update companies
  //2. 

  $scope.companies = [];
  $scope.searchTerm = "";
  $scope.countries = Countries.fetchCountries();
  $scope.currentCompany = {};
  $scope.newCompany = {};
  $scope.companyCount = 0;
  $scope.noResults = true;
  $scope.acceptedCompanyCount = 0;
  $scope.offset = 1;
  var element = "";

  $scope.hideCompanyInfo = function(tag_id){
    if (tag_id !== undefined) {
      $(tag_id).animate({height: "0em"}, 300, function(){
        $(tag_id).fadeOut(300);
        $(tag_id).hide();
      });
      return false;
    } else {
      $(tag_id).animate({height: "0em"}, 300, function(){
          $("#currentCompany").fadeOut(300);
          $("#currentCompany").hide();
        });
      return false;
    }
  }; 
  $scope.searchCompanies = function(searchTerm){
    $scope.noResults = true;
    CompanySearch.searchCompany(searchTerm).success(function (companies) {
       $scope.companies = companies;
       $scope.companyCount = companies.length;
       $scope.countAccepted();
    });
    if($scope.companies.length > 0)
      $scope.noResults = false;
  };

  $scope.getCompany = function(companyid){
    var i = 0;
    if($scope.companies.length > 0)
    {
      $scope.companyCount = $scope.companies.length;
      while(i < $scope.companies.length)
      {
        if($scope.companies[i].id == companyid)
        {
          return $scope.companies[i];
        }
        i++;
      }
    }
    else
    {
      $scope.searchCompanies($scope.searchTerm);
      $scope.companyCount = $scope.companies.length;
      while(i < $scope.companies.length)
      {
        if($scope.companies[i].id == companyid)
        {
          return $scope.companies[i];
        }
        i++;
      }
    }
  };
  $scope.countAccepted = function(){
    var counter = 0;
    var i = 0;
    while(i < $scope.companies.length)
    {
      if($scope.companies[i].application_status == 1 || $scope.companies[i].application_status == '1')
        counter++;
      i++;
    }
    $scope.acceptedCompanyCount = counter;
  };


  $scope.newInit = function() {
      autocompleteNew = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocompleteNew')),
                    { types: ['address'] });
                google.maps.event.addListener(autocompleteNew, 'place_changed', function() {
                });
                autocompleteNew.addListener('place_changed', function() { fillInAddress(0)
                });
    }

  $scope.editInit = function() {
      autocompleteCurrent = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocompleteCurrent')),
                    { types: ['address'] });
                google.maps.event.addListener(autocompleteCurrent, 'place_changed', function() {
                });
                autocompleteCurrent.addListener('place_changed', function() { fillInAddress(1)
                });
    }


  function fillInAddress(index) {
      tempAddress = {}
      $scope.newCompanyLat = null;
      $scope.newCompanyLng = null;
      $scope.address = [];

      // Get the place details from the autocomplete object.
      if(index==0)
        var place = autocompleteNew.getPlace();
      else
        var place = autocompleteCurrent.getPlace();
      tempAddress.lat = place.geometry.location.lat()
      tempAddress.lng = place.geometry.location.lng()
      console.log(place.address_components)
      // Get each component of the address from the place details
      // and fill the corresponding field on the form.
      for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types;
          var val = place.address_components[i];
          if(addressType.indexOf("route")  != -1)
            {
              tempAddress.address_line_1 = val.long_name
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("street_number")  != -1)
            {
              tempAddress.address_line_1 = val.long_name + " " + place.address_components[++i].long_name;
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("locality")  != -1 || addressType.indexOf("postal_town")  != -1)
            {
            tempAddress.city = val.long_name
            $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("country") != -1)
            {
              tempAddress.country = $scope.countries.filter(function( obj ) {return obj.country == val.long_name;})[0];
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("postal_code") != -1 || addressType.indexOf("postal_code_prefix")  != -1)
            {
              tempAddress.postcode = val.long_name
              $scope.address.push(val.long_name)
            }
      }
      
      if(index==0)
      {
         $("#newCompanyAddress_line_1").val(tempAddress.address_line_1)
         $("#newCompanyCity").val(tempAddress.city)
         $("#newCompanyCountry").val(tempAddress.country.country)
         $("#newCompanyPostcode").val(tempAddress.postcode)
         $("#newCompanyLat").val(tempAddress.lat)
         $("#newCompanyLng").val(tempAddress.lng)
      }
      else
      {
         $("#currentCompanyAddress_line_1").val(tempAddress.address_line_1)
         $("#currentCompanyCity").val(tempAddress.city)
         $("#currentCompanyCountry").val(tempAddress.country.country)
         $("#currentCompanyPostcode").val(tempAddress.postcode)
         $("#currentCompanyLat").val(tempAddress.lat)
         $("#currentCompanyLng").val(tempAddress.lng)
      }

      $scope.$apply()
    }

  function repositionSuggestions(where){
      setTimeout(function(){
        var test = $('div.pac-container');
        $('div.pac-container').css('top', '');
        $('div.pac-container').css('left', '');
        $('#suggestions'+where).html(test);}
        ,0.1)
    }

    $scope.clearAddress = function(index) {

      if(index==0)
      {
         $("#newCompanyAddress_line_1").val("")
         $("#newCompanyCity").val("")
         $("#newCompanyCountry").val("")
         $("#newCompanyPostcode").val("")
         $("#newCompanyLat").val(0.0)
         $("#newCompanyLng").val(0.0)
      }
      else
      {
         $("#currentCompanyAddress_line_1").val("")
         $("#currentCompanyCity").val("")
         $("#currentCompanyCountry").val("")
         $("#currentCompanyPostcode").val("")
         $("#currentCompanyLat").val(0.0)
         $("#currentCompanyLng").val(0.0)
      }
    
  }

  $scope.newCompany = function(){
    $("#newCompany").fadeIn(350);
    $("#newCompany").animate({height: "40em"}, 350);
    $("#newCompany").html("<td class=\"newCompanyInformation\" colspan=\"5\"><div class=\"column wide\">" +
                                "<form class = \"ui error form\" ng-submit=\"updateCompany(company)\" novalidate>" +
                                  "<h3 class=\"ui top attached segment\">Company Info</h3>" +
                                  "<div class=\"ui attached segment form\">" +
                                    "<div class=\"inline field\">" +
                                      "<label>Name:</label>" +

                                      "<input class=\"ui small input\" type=\"text\" id=\"newCompanyName\" placeholder=\"Name\" ></input>" +
                                    "</div>" +
                                    "<div class=\"inline field\">" +
                                      "<label>Symbol:</label>" +
                                      "<input type=\"text\" id=\"newCompanySymbol\" placeholder=\"Stock Symbol\" ng-model=\"newCompany.symbol\" ng-readonly=\"!editing[0]\"></input>" +
                                    "</div>" +
                                    "<div ng-class=\"companyErrors[1] && 'error' || ''\" class=\"field\">" +
                                      "<label>Address:</label>" +
                                      "<input class=\"ui input\" id=\"autocompleteNew\" placeholder=\"Enter address\" type=\"text\" ng-model=\"autocompleteNew\"></input>" +
                                      "<div class=\"suggestionTest\" id=\"suggestions0\"></div>" + 
                                      "<div class=\"ui segment\">" + 
                                        "<input type=\"text\" readonly placeholder=\"Address Line 1\" id=\"newCompanyAddress_line_1\"></input>" +
                                        "<input type=\"text\" readonly placeholder=\"City\" id=\"newCompanyCity\"></input>" +
                                        "<input type=\"text\" readonly id=\"newCompanyPostcode\" placeholder=\"Postcode\" ng-model=\"newCompany.postcode\"></input>" +
                                        "<select disabled id=\"newCompanyCountry\">" +
                                          "<option selected=\"selected\">Country</option>" +
                                        "</select>" +
                                        "<div class=\"inline field\">" +
                                          "<label>Latitude:</label> <input type=\"text\" disabled placeholder=\"lat\" id=\"newCompanyLat\"></input>" +
                                        "</div>" +
                                        "<div class=\"inline field\">" +
                                          "<label>Longitude:</label> <input type=\"text\" disabled placeholder=\"lng\" id=\"newCompanyLng\"></input>" +
                                        "</div>" +
                                        "<div class=\"ui button tiny\" id=\"clearNew\">Clear Address</div>" + 
                                      "</div>" +
                                    "</div>" +

                                    "<select id=\"newCompanyType\">" +
                                      "<option value=\"true\">Investor</option>" +
                                      "<option value=\"false\">Company</option>" +
                                    "</select>" +
                                    "<select id=\"currentCompanyClassification\">" +
                                      "<option value=\"FTSE100\">FTSE 100</option>" +
                                      "<option value=\"FTSE250\">FTSE 250</option>" +
                                      "<option value=\"FTSE Smallcap\">FTSE SmallCap</option>" +
                                      "<option value=\"FTSE Fledgling\">FTSE Fledgling</option>" +
                                      "<option value=\"FTSE AIM All Share\">FTSE AIM All Share</option>" +
                                      "<option value=\"Uncategorised\">FTSE Uncategorised</option>" +
                                    "</select>" +
                                "</div>" +
                                "<br/>" +

                                "<div class=\"ui toggle checkbox\">" +
                                  "<input id=\"newCompanyApplicationStatus\" type=\"checkbox\"></input>" +
                                  "<label>Accept Subscription</label>" +
                                "</div><br/><br/>" +

                                "<button type=\"submit\" id=\"saveNewCompany\" class=\"ui green button\" ng-click=\"updateCompany(newCompany)\" ng-show=\"editing[0]\">" +
                                  "<i class=\"check icon\"></i>Save" +
                                "</button>" +
                                "<button id=\"closeNewCompany\" class=\"ui red button\" ng-show=\"editing[0]\" ng-click=\"hideCompanyInfo()\" >" +
                                  "<i class=\"x icon\"></i>Cancel" +
                                "</button>" +
                                "</form>" +
                              "</div></td>");
    $('.ui.checkbox').checkbox();
    $scope.newInit();
    $( "#currentCompanyCountry" ).append( "<option  value=\"\" selected=\"selected\"> Country </option>" );
    angular.forEach($scope.countries, function(value, key){
          $( "#newCompanyCountry" ).append( "<option value=\""+value.country+"\">" + value.country + "</option>" );
        })
    $("#autocompleteNew").keydown(function(){
      repositionSuggestions(0);
    })
    $("#autocompleteNew").on('click',function(){
      repositionSuggestions(0);
    })
    $("#clearNew").on('click',function(){
      $scope.clearAddress(0);
    })
    $("#closeNewCompany").on('click', function(){
      $scope.hideCompanyInfo("#newCompany");
      $scope.hideCompanyInfo();
    });
    $("#saveNewCompany").on('click', function(){
      $scope.newCompany.company_name = $("#newCompanyName").val();
      if($("#newCompanyApplicationStatus").prop('checked'))
        $scope.newCompany.application_status = 1;
      else
        $scope.newCompany.application_status = 0;
      $scope.newCompany.classification = $("#currentCompanyClassification").val();
      $scope.newCompany.companyType = $("#newCompanyType").val();
      $scope.newCompany.symbol = $("#newCompanySymbol").val();
      $scope.newCompany.city = $("#newCompanyCity").val();
      $scope.newCompany.country = $("#newCompanyCountry").val();
      $scope.newCompany.address_line_1 = $("#newCompanyAddress_line_1").val();
      $scope.newCompany.postcode = $("#newCompanyPostcode").val();
      $scope.newCompany.lat = $("#newCompanyLat").val();
      $scope.newCompany.lng = $("#newCompanyLng").val();
      CompanyUpdate.createCompany($scope.newCompany);
      $scope.hideCompanyInfo("#currentCompany");
      $scope.hideCompanyInfo();
      $scope.hideCompanyInfo("#newCompanyInformation");
      $("#newCompany").animate({height: "3em"}, 1000, function(){
        $("#newCompany").html("<div class=\"fluid ui teal button full\">Company has been successfully added...</div>");
        setTimeout(function(){
          $("#newCompany").empty();
          $scope.searchCompanies($scope.searchTerm, $(".company").first.id);
          $scope.countAccepted();
        }, 2000);
      });
    });
  };
  $scope.editCompany = function(companyid){
    $scope.currentCompany = {};
    $rootScope.setter = 1;
    $("#currentCompany").remove();

    $("#" + companyid).after("<tr id=\"currentCompany\" ></tr>");
    $("#currentCompany").css({height: '0em'});
    $("#currentCompany").animate({height: '40em'}, 350, function(){
      $(".currentCompanyInformation").fadeIn(350);
    });

    $("#currentCompany").html("<td class=\"currentCompanyInformation\" colspan=\"5\"><div class=\"column wide\">" +
                                "<form class = \"ui error form\" ng-submit=\"updateCompany(company)\" novalidate>" +
                                  "<h3 class=\"ui top attached segment\">Company Info</h3>" +
                                  "<div class=\"ui attached segment form\">" +
                                    "<div class=\"inline field\">" +
                                      "<label>Name:</label>" +

                                      "<input class=\"ui small input\" type=\"text\" id=\"currentCompanyName\" value=\""+ $scope.getCompany(companyid).name +"\" placeholder=\"Name\" readonly></input>" +
                                    "</div>" +
                                    "<div class=\"inline field\">" +
                                      "<label>Symbol:</label>" +
                                      "<input type=\"text\" id=\"currentCompanySymbol\" placeholder=\"Stock Symbol\" ng-model=\"currentCompany.symbol\" value=\""+ $scope.getCompany(companyid).symbol +"\" ng-readonly=\"!editing[0]\"></input>" +
                                    "</div>" +
                                    "<div ng-class=\"companyErrors[1] && 'error' || ''\" class=\"field\">" +
                                      "<label>Address:</label>" +
                                      "<input class=\"ui input\" id=\"autocompleteCurrent\" placeholder=\"Enter address\" type=\"text\" ng-model=\"autocompleteCurrent\"></input>" +
                                      "<div class=\"suggestionTest\" id=\"suggestions1\"></div>" +
                                      "<div class=\"ui segment\">" + 
                                        "<input type=\"text\" readonly placeholder=\"Address Line 1\" id=\"currentCompanyAddress_line_1\" value=\""+ $scope.getCompany(companyid).address_line_1 +"\" ></input>" +
                                        "<input type=\"text\" readonly placeholder=\"City\" id=\"currentCompanyCity\" value=\""+ $scope.getCompany(companyid).city +"\" ></input>" +
                                        "<input type=\"text\" readonly id=\"currentCompanyPostcode\" placeholder=\"Postcode\" ng-model=\"currentCompany.postcode\" value=\""+ $scope.getCompany(companyid).postcode +"\"></input>" +
                                        "<select disabled id=\"currentCompanyCountry\">" +
                                          "<option selected=\"selected\">Country</option>" +
                                        "</select>" +
                                        "<div class=\"inline field\">" +
                                          "<label>Latitude:</label> <input type=\"text\" disabled placeholder=\"lat\" id=\"currentCompanyLat\" value=\""+ $scope.getCompany(companyid).lat +"\" ></input>" +
                                        "</div>" +
                                        "<div class=\"inline field\">" +
                                          "<label>Longitude:</label> <input type=\"text\" disabled placeholder=\"lng\" id=\"currentCompanyLng\" value=\""+ $scope.getCompany(companyid).lng +"\" ></input>" +
                                        "</div>" +
                                        "<div class=\"ui button tiny\" id=\"clearCurrent\">Clear Address</div>" + 
                                      "</div>" +
                                    "</div>" +

                                    "<select id=\"currentCompanyType\">" +
                                      "<option id=\"companyTypeInvestor\" value=\"true\">Investor</option>" +
                                      "<option id=\"companyTypeCompany\" value=\"false\">Company</option>" +
                                    "</select>" +
            "<select id=\"currentCompanyClassification\">" +
                                      "<option id=\"FTSE100\" value=\"FTSE100\">FTSE 100</option>" +
                                      "<option id=\"FTSE250\" value=\"FTSE250\">FTSE 250</option>" +
              "<option id=\"FTSE-Smallcap\"value=\"FTSE Smallcap\">FTSE SmallCap</option>" +
                                      "<option value=\"FTSE Fledgling\">FTSE Fledgling</option>" +
              "<option id=\"FTSE-AIM-All-Share\" value=\"FTSE AIM All Share\">FTSE AIM All Share</option>" +
                                      "<option id=\"FTSE-Uncategorised\" value=\"Uncategorised\">FTSE Uncategorised</option>" +
                                    "</select>" +
                                "</div>" +
                                "<br/>" +

                                "<div class=\"ui toggle checkbox\">" +
                                  "<input id=\"currentCompanyApplicationStatus\" type=\"checkbox\"></input>" +
                                  "<label>Accept Subscription</label>" +
                                "</div><br/><br/>" +

                                "<button type=\"submit\" id=\"saveCurrentCompany\" class=\"ui green button\" ng-click=\"updateCompany(currentCompany)\" ng-show=\"editing[0]\">" +
                                  "<i class=\"check icon\"></i>Save" +
                                "</button>" +
                                "<button id=\"deleteCurrentCompany\" class=\"ui red button\" ng-click=\"hideCompanyInfo()\" >" +
                                  "<i class=\"x icon\"></i>Delete" +
                                "</button>" +
                                "<button id=\"closeCurrentCompany\" class=\"ui orange button\" ng-show=\"editing[0]\" ng-click=\"hideCompanyInfo()\" >" +
                                  "<i class=\"x icon\"></i>Cancel" +
                                "</button>" +
                                "</form>" +
                              "</div></td>");

    $scope.editInit();

    $( "#currentCompanyCountry" ).append( "<option  value=\"\" selected=\"selected\"> Country </option>" );
    angular.forEach($scope.countries, function(value, key){
          $( "#currentCompanyCountry" ).append( "<option value=\""+value.country+"\">" + value.country + "</option>" );
        })

    $("#autocompleteCurrent").keydown(function(){
      repositionSuggestions(1);
    })
    $("#autocompleteCurrent").on('click',function(){
      repositionSuggestions(1);
    })

    $("#clearCurrent").on('click',function(){
      $scope.clearAddress(1);
    })

    $("#currentCompanyCountry").val($scope.getCompany(companyid).country);

    if($scope.getCompany(companyid).application_status == 1)
      $('.ui.checkbox').checkbox('check');
    else
      $('.ui.checkbox').checkbox();
    if($scope.getCompany(companyid).investor == 'false' || $scope.getCompany(companyid).investor == false)
      $("#companyTypeCompany").prop('selected', true);

    $("#currentCompanyClassification").val($scope.getCompany(companyid).classification);

    $("#closeCurrentCompany").on('click', function(){
      $scope.hideCompanyInfo("#currentCompany");
      $scope.hideCompanyInfo();
    });
    $("#deleteCurrentCompany").on('click', function(){
      $scope.hideCompanyInfo("#currentCompany");
      $scope.hideCompanyInfo();
      CompanyUpdate.deleteCompany(companyid);
      $scope.searchCompanies($scope.searchTerm, $(".company").first.id);
    });
    $("#saveCurrentCompany").on('click', function(){
      console.log($scope.currentCompany);
      $scope.currentCompany.id = companyid;
      if($("#currentCompanyApplicationStatus").prop('checked'))
        $scope.currentCompany.application_status = 1;
      else
        $scope.currentCompany.application_status = 0;
      $scope.currentCompany.classification = $("#currentCompanyClassification").val();
      $scope.currentCompany.name = $("#currentCompanyName").val();
      $scope.currentCompany.symbol = $("#currentCompanySymbol").val();
      $scope.currentCompany.companyType = $("#currentCompanyType").val();
      $scope.currentCompany.city = $("#currentCompanyCity").val();
      $scope.currentCompany.country = $("#currentCompanyCountry").val();
      $scope.currentCompany.address_line_1 = $("#currentCompanyAddress_line_1").val();
      $scope.currentCompany.postcode = $("#currentCompanyPostcode").val();
      $scope.currentCompany.lat = $("#currentCompanyLat").val();
      $scope.currentCompany.lng = $("#currentCompanyLng").val();
      console.log($scope.currentCompany);
      var i = 0;
      while(i < $scope.companies.length)
      {
        if($scope.companies[i].id == companyid)
          $scope.companies[i] = $scope.currentCompany;
        i++;
      }


      CompanyUpdate.updateCompany($scope.currentCompany);
      $scope.hideCompanyInfo("#currentCompany");
      $scope.hideCompanyInfo();
      $scope.searchTerm = $scope.searchTerm;
      $scope.searchCompanies($scope.searchTerm, $(".company").first.id);
      $scope.searchCompanies($scope.searchTerm, $(".company").first.id);
      $scope.countAccepted();
      $scope.searchCompanies($scope.searchTerm, $(".company").first.id);
    });
    $scope.searchCompanies($scope.searchTerm, $(".company").first.id);
    $rootScope.setter = 0;
  };
  $scope.checkApplicantStatus = function(companyid) {
    var company = $scope.getCompany(companyid);
    
    if(company.application_status == 1)
    {
      return true;
    }
    else
    {
      return false;
    }
  };
  $scope.nullify = function(){
    return false;
  };
  $scope.nextPage = function(){
    $scope.noResults = true;
    if($scope.offset != 0)
      $scope.offset += 1;
    CompanySearch.searchCompany($scope.searchTerm, $scope.companies[$scope.companies.length-1].id).success(function (companies) {
       console.log(companies);
       $scope.companies = companies;
    });
    if($scope.companies.length > 0)
      $scope.noResults = false;
  };
  $scope.previousPage = function(){
    $scope.noResults = true;
    if($scope.offset != 0)
      $scope.offset -= 1;
    CompanySearch.searchCompanyBackwards($scope.searchTerm, $scope.companies[$scope.companies.length-20].id, $scope.offset).success(function (companies) {
       console.log(companies);
       $scope.companies = companies;
    });
    if($scope.companies.length > 0)
      $scope.noResults = false;
  };
  $scope.searchCompanies($scope.searchTerm, $(".company").first.id);
}]);
app.controller('UsersAdministratorAreaController', ['$scope', 'Countries', 'Companies', 'UserSearch', 'CompanySearch', 'UserUpdate', '$rootScope', function($scope, Countries, Companies, UserSearch, CompanySearch, UserUpdate, $rootScope){
  
  //--To-Dos--
  //1. Get the page to update users
  //2. 

  $scope.users = [];
  $scope.searchTerm = "";
  $scope.companySearchTerm = "";
  $scope.currentUser = {};
  $scope.countries = Countries.fetchCountries();
  $scope.newUser = {};
  $scope.userCount = 0;
  $scope.noResults = true;
  $scope.currentUser.accepted = 0;
  $scope.companies = [];
  $scope.acceptedUserCount = 0;
  $scope.companyOptions = "";
  var element = "";

  $scope.hideUserInfo = function(tag_id){
    if (typeof tag_id === undefined) {
      $(tag_id).animate({height: "0em"}, 300, function(){
        $("#currentUser").fadeOut(300);
      });
      return false;
    } 
    else 
    {
      $(tag_id).animate({height: "0em"}, 300, function(){
        
        if($(tag_id).is(":visible"))
        {
          $(tag_id).fadeOut(300);
        }
        else
        { 
          $(tag_id).fadeIn(300);
        }
      });
      return false;
    }
  };
  $scope.getCompany = function(companyid){
        return CompanySearch.getCompany(companyid);
  };
  $scope.searchUsers = function(searchTerm){
    $scope.noResults = true;
    UserSearch.searchUser(searchTerm).success(function (users) {
       $scope.users = users;
       $scope.userCount = users.length;
       $scope.countAccepted();
    });
    if($scope.users.length > 0)
      $scope.noResults = false;

  };
  $scope.searchCompanies = function(companyid){
    $scope.noResults = true;
    CompanySearch.searchCompanyOption($scope.searchTerm).success(function (companies) {
      $scope.companies = companies;
      for(var i = 0; i < companies.length; i++)
      {
        $scope.companyOptions += "<option id=\""+companies[i].id+" value=\""+companies[i].id+"\" >"+ companies[i].name +"</option>";
      }
      console.log($scope.companyOptions);
    });
    if($scope.companies.length > 0)
      $scope.noResults = false;
  };
  $scope.searchCompanies($scope.searchTerm);
  $scope.getUser = function(Userid){
    var i = 0;
    if($scope.users.length > 0)
    {
      $scope.userCount = $scope.users.length;
      while(i < $scope.users.length)
      {
        if($scope.users[i].id == Userid)
        {
          return $scope.users[i];
        }
        i++;
      }
    }
    else
    {
      $scope.searchUsers("");
      $scope.userCount = $scope.users.length;
      while(i < $scope.users.length)
      {
        if($scope.users[i].id == Userid)
        {
          return $scope.users[i];
        }
        i++;
      }
    }
  };
  $scope.checkApplicantStatus = function(userid) {
    var user = $scope.getUser(userid);
    if(user.accepted === 1 || user.accepted === '1' )
    {
      return true;
    }
    else
    {
      return false;
    }
  };
  $scope.countAccepted = function(){
    var counter = 0;
    var i = 0;
    while(i < $scope.users)
    {
      if($scope.users[i].accepted == 1 || $scope.users[i].accepted == '1')
        counter++;
      i++;
    }
    $scope.acceptedUserCount = counter;
  };
$scope.getCompanyOptions = function(action, user_id){
    $scope.noResults = true;
    if(action == "edit")
    {
      if(!typeof user_id === undefined)
      {
        
        if($scope.companyOptions === "" || $scope.companyOptions === undefined)
        {
          CompanySearch.searchCompanyOption($scope.companySearchTerm).success(function (companies) {
            $scope.companies = companies;
            for(var i = 0; i < companies.length; i++)
            {
              if($scope.companies[i].id == $scope.getUser(user_id).company_id)
                $("#currentCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" selected>"+ $scope.companies[i].name +"</option>");
              else
                $("#currentCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" >"+ $scope.companies[i].name +"</option>");
            }
          });
          if($scope.companies.length > 0)
            $scope.noResults = false;
        }
        else
        {
          for(var i = 0; i < $scope.companies.length; i++)
          {
            if($scope.companies[i].id == $scope.getUser(user_id).company_id)
                $("#currentCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" selected>"+ $scope.companies[i].name +"</option>");
              else
                $("#currentCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" >"+ $scope.companies[i].name +"</option>");
          }
        }
      }
      else
      {
        if($scope.companyOptions == "" || $scope.companyOptions === undefined)
        {
          
          $scope.companies = Companies.fetchCompanies().success(function(companies){
            for(var i = 0; i < companies.length; i++)
            {
              if(companies[i].id == $scope.getUser(user_id).company_id)
                $("#currentCompanyAssignedTo").append("<option value=\""+companies[i].id+"\" selected>"+ $scope.companies[i].name +"</option>");
              else
                $("#currentCompanyAssignedTo").append("<option value=\""+companies[i].id+"\" >"+ $scope.companies[i].name +"</option>");
            }
            if(companies.length > 0)
              $scope.noResults = false;
          });
        }
        else
        {

          for(var i = 0; i < $scope.companies.length; i++)
          {
            if($scope.companies[i].id == $scope.getUser(user_id).company_id)
            {
              if($scope.companies[i].id == $scope.getUser(user_id).company_id)
                $("#currentCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" selected>"+ $scope.companies[i].name +"</option>");
              else
                $("#currentCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" >"+ $scope.companies[i].name +"</option>");
            }
            else
            {
              if($scope.companies[i].id == $scope.getUser(user_id).company_id)
                $("#currentCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" selected>"+ $scope.companies[i].name +"</option>");
              else
                $("#currentCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" >"+ $scope.companies[i].name +"</option>");
            }
          }
        }
      }
    }
    else
    {
      if(!typeof user_id === undefined)
      {

        if($scope.companyOptions === "" || $scope.companyOptions === undefined)
        {
          CompanySearch.searchCompanyOption($scope.companySearchTerm).success(function (companies) {
            $scope.companies = companies;
            for(var i = 0; i < companies.length; i++)
            {
             
                $("#newCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" >"+ companies[i].name +"</option>");
            }
          });
          if($scope.companies.length > 0)
            $scope.noResults = false;
        }
        else
        {
          for(var i = 0; i < $scope.companies.length; i++)
          {
            $("#newCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" >"+ companies[i].name +"</option>");
          }
        }
      }
      else
      {
        if($scope.companyOptions === "" || $scope.companyOptions === undefined)
        {
          CompanySearch.searchCompanyOption($scope.companySearchTerm).success(function (companies) {
            $scope.companies = companies;
            for(var i = 0; i < $scope.companies.length; i++)
            {
              $("#newCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" >"+ companies[i].name +"</option>");
            }
          });
          if($scope.companies.length > 0)
            $scope.noResults = false;
        }
        else
        {
          for(var i = 0; i < $scope.companies.length; i++)
          {
            $("#newCompanyAssignedTo").append("<option value=\""+$scope.companies[i].id+"\" >"+ $scope.companies[i].name +"</option>");
          }
        }
      }
    }
  };

  $scope.newInit = function() {
      autocompleteNew = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocompleteNew')),
                    { types: ['address'] });
                google.maps.event.addListener(autocompleteNew, 'place_changed', function() {
                });
                autocompleteNew.addListener('place_changed', function() { fillInAddress(0)
                });
    }

  $scope.editInit = function() {
      autocompleteCurrent = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocompleteCurrent')),
                    { types: ['address'] });
                google.maps.event.addListener(autocompleteCurrent, 'place_changed', function() {
                });
                autocompleteCurrent.addListener('place_changed', function() { fillInAddress(1)
                });
    }


  function fillInAddress(index) {
      tempAddress = {}
      $scope.address = [];

      // Get the place details from the autocomplete object.
      if(index==0)
        var place = autocompleteNew.getPlace();
      else
        var place = autocompleteCurrent.getPlace();
      tempAddress.lat = place.geometry.location.lat()
      tempAddress.lng = place.geometry.location.lng()
      console.log(place.address_components)
      // Get each component of the address from the place details
      // and fill the corresponding field on the form.
      for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types;
          var val = place.address_components[i];
          if(addressType.indexOf("route")  != -1)
            {
              tempAddress.address_line_1 = val.long_name
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("street_number")  != -1)
            {
              tempAddress.address_line_1 = val.long_name + " " + place.address_components[++i].long_name;
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("locality")  != -1 || addressType.indexOf("postal_town")  != -1)
            {
            tempAddress.city = val.long_name
            $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("country") != -1)
            {
              tempAddress.country = $scope.countries.filter(function( obj ) {return obj.country == val.long_name;})[0];
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("postal_code") != -1 || addressType.indexOf("postal_code_prefix")  != -1)
            {
              tempAddress.postcode = val.long_name
              $scope.address.push(val.long_name)
            }
      }
      
      if(index==0)
      {
         $("#newUserAddress_line_1").val(tempAddress.address_line_1)
         $("#newUserCity").val(tempAddress.city)
         $("#newUserCountry").val(tempAddress.country.country)
         $("#newUserPostcode").val(tempAddress.postcode)
         $("#newUserLat").val(tempAddress.lat)
         $("#newUserLng").val(tempAddress.lng)
      }
      else
      {
         $("#currentUserAddress_line_1").val(tempAddress.address_line_1)
         $("#currentUserCity").val(tempAddress.city)
         $("#currentUserCountry").val(tempAddress.country.country)
         $("#currentUserPostcode").val(tempAddress.postcode)
         $("#currentUserLat").val(tempAddress.lat)
         $("#currentUserLng").val(tempAddress.lng)
      }

      $scope.$apply()
    }

  function repositionSuggestions(where){
      setTimeout(function(){
        var test = $('div.pac-container');
        $('div.pac-container').css('top', '');
        $('div.pac-container').css('left', '');
        $('#suggestions'+where).html(test);}
        ,0.1)
    }

    $scope.clearAddress = function(index) {

      if(index==0)
      {
         $("#newUserAddress_line_1").val("")
         $("#newUserCity").val("")
         $("#newUserCountry").val("")
         $("#newUserPostcode").val("")
         $("#newUserLat").val(0.0)
         $("#newUserLng").val(0.0)
      }
      else
      {
         $("#currentUserAddress_line_1").val("")
         $("#currentUserCity").val("")
         $("#currentUserCountry").val("")
         $("#currentUserPostcode").val("")
         $("#currentUserLat").val(0.0)
         $("#currentUserLng").val(0.0)
      }
    
  }

  $scope.newUser = function(){
    $scope.hideUserInfo("#newUser");
    $scope.hideUserInfo();
    $("#newUser").html("<td class=\"newUserInformation\" colspan=\"5\"><div class=\"column wide\">" +
                                "<form class = \"ui error form\" ng-submit=\"updateUser(User)\" novalidate>" +
                                  "<h3 class=\"ui top attached segment\">User Info</h3>" +
                                  "<div class=\"ui attached segment form\">" +
                                    "<div class=\"inline field\">" +
                                      "<label>Firstname:</label>" +
                                      "<input class=\"ui small input\" type=\"text\" id=\"newUserFirstName\" placeholder=\"Firstname\" ></input>" +
                                    "</div>" +
                                    "<div class=\"inline field\">" +
                                      "<label>Surname:</label>" +
                                      "<input class=\"ui small input\" type=\"text\" id=\"newUserSurName\" placeholder=\"Surname\" ></input>" +
                                    "</div>" +
                                    "<div class=\"inline field\">" +
                                      "<label>Email:</label>" +
                                      "<input class=\"ui small input\" type=\"text\" id=\"newUserEmail\" placeholder=\"Email\"  value=\"\" ></input>" +
                                    "</div>" +
                                    "<div class=\"field\">" +
                                      "<label>Address:</label>" +
                                        "<input class=\"ui input\" id=\"autocompleteNew\" placeholder=\"Enter address\" type=\"text\" ng-model=\"autocompleteNew\"></input>" +
                                        "<div class=\"suggestionTest\" id=\"suggestions0\"></div>" + 
                                        "<div class=\"ui segment\">" + 
                                          "<input type=\"text\" readonly placeholder=\"Address Line 1\" id=\"newUserAddress_line_1\"></input>" +
                                          "<input type=\"text\" readonly placeholder=\"City\" id=\"newUserCity\"></input>" +
                                          "<input type=\"text\" readonly id=\"newUserPostcode\" placeholder=\"Postcode\" ng-model=\"newUser.postcode\"></input>" +
                                          "<select disabled id=\"newUserCountry\">" +
                                            "<option selected=\"selected\">Country</option>" +
                                          "</select>" +
                                          "<div class=\"inline field\">" +
                                            "<label>Latitude:</label> <input type=\"text\" disabled placeholder=\"lat\" id=\"newUserLat\"></input>" +
                                          "</div>" +
                                          "<div class=\"inline field\">" +
                                            "<label>Longitude:</label> <input type=\"text\" disabled placeholder=\"lng\" id=\"newUserLng\"></input>" +
                                          "</div>" +
                                          "<div class=\"ui button tiny\" id=\"clearNew\">Clear Address</div>" + 
                                        "</div>" +
                                      // "<label>Address:</label>" +
                                      // "<input type=\"text\" placeholder=\"Address Line 1\" id=\"newUserAddress_line_1\" ></input>" +
                                      // "<input type=\"text\" placeholder=\"Address Line 2\" id=\"newUserAddress_line_2\"></input>" +
                                      // "<input type=\"text\" placeholder=\"Address Line 3\" id=\"newUserAddress_line_3\"></input>" +
                                    "</div>" +
                                    "<div class=\"inline field\">" +
                                      "<label>Telephone No.:</label>" +
                                      "<input class=\"ui small input\" type=\"text\" id=\"newUserTelephone\" placeholder=\"Telephone No.\"  value=\"\" ></input>" +
                                    "</div>" +
                                    "<select id=\"newCompanyAssignedTo\">" +
                                      "<option>Please select a company...</option>" +
                                    "</select>" +
                                "</div>" +
                                "<br/>" +

                                "<div class=\"ui toggle checkbox\">" +
                                  "<input id=\"newUserApplicationStatus\" type=\"checkbox\"></input>" +
                                  "<label>Permit User</label>" +
                                "</div><br/><br/>" +

                                "<button type=\"submit\" id=\"saveNewUser\" class=\"ui green button\" ng-click=\"updateUser(newUser)\" ng-show=\"editing[0]\">" +
                                  "<i class=\"check icon\"></i>Save" +
                                "</button>" +
                                "<button id=\"closeNewUser\" class=\"ui red button\" ng-show=\"editing[0]\" ng-click=\"hideUserInfo()\" >" +
                                  "<i class=\"x icon\"></i>Cancel" +
                                "</button>" +
                                "</form>" +
                              "</div></td>");
    $('.ui.checkbox').checkbox();

    $scope.newInit();
    $( "#currentUserCountry" ).append( "<option  value=\"\" selected=\"selected\"> Country </option>" );
    angular.forEach($scope.countries, function(value, key){
          $( "#newUserCountry" ).append( "<option value=\""+value.country+"\">" + value.country + "</option>" );
        })
    $("#autocompleteNew").keydown(function(){
      repositionSuggestions(0);
    })
    $("#autocompleteNew").on('click',function(){
      repositionSuggestions(0);
    })
    $("#clearNew").on('click',function(){
      $scope.clearAddress(0);
    })

    $("#closeNewUser").on('click', function(){
      $scope.hideUserInfo("#newUser");
      $scope.hideUserInfo();
    });
    $("#saveNewUser").on('click', function(){
      console.log($scope.newUser);
      $scope.newUser.firstname = $("#newUserFirstName").val();
      $scope.newUser.surname = $("#newUserSurName").val();
      $scope.newUser.email = $("#newUserEmail").val();
      if($scope.newUser.accepted = $("#newUserApplicationStatus").prop('checked'))
        $scope.newUser.accepted = 1;
      else
        $scope.newUser.accepted = 0;
      $scope.newUser.city = $("#newUserCity").val();
      $scope.newUser.country = $("#newUserCountry").val();
      $scope.newUser.address_line_1 = $("#newUserAddress_line_1").val();
      $scope.newUser.postcode = $("#newUserPostcode").val();
      $scope.newUser.lat = $("#newUserLat").val();
      $scope.newUser.lng = $("#newUserLng").val();
      $scope.newUser.postcode = $("#newUserPostcode").val();
      $scope.newUser.telephone = $("#newUserTelephone").val();
      $scope.newUser.company = $("#newCompanyAssignedTo").val();
      UserUpdate.createUser($scope.newUser);
      $scope.hideUserInfo("#newUser");
      $scope.hideUserInfo();
      $scope.searchUsers($scope.searchTerm);
    });
    $scope.getCompanyOptions("new");
  };
  $scope.editUser = function(Userid){
    $scope.currentUser = {};
    $("#currentUser").remove();

    $scope.hideUserInfo();

    $("#" + Userid).after("<tr id=\"currentUser\" ></tr>");
    $("#currentUser").css({height: '0em'});
    $("#currentUser").animate({height: '40em'}, 350, function(){
      $(".currentUserInformation").fadeIn(350);
    });
    $("#currentUser").html("<td class=\"currentUserInformation\" colspan=\"5\"><div class=\"column wide\">" +
                                "<form class = \"ui error form\" ng-submit=\"updateUser(User)\" novalidate>" +
                                  "<h3 class=\"ui top attached segment\">User Info</h3>" +
                                  "<div class=\"ui attached segment form\">" +
                                    "<div class=\"inline field\">" +
                                      "<label>Firstname:</label>" +

                                      "<input class=\"ui small input\" type=\"text\" id=\"currentUserFirstName\" placeholder=\"Firstname\"  value=\""+ $scope.getUser(Userid).firstname +"\" ></input>" +
                                    "</div>" +
                                    "<div class=\"inline field\">" +
                                      "<label>Surname:</label>" +
                                      "<input class=\"ui small input\" type=\"text\" id=\"currentUserSurName\" placeholder=\"Surname\"  value=\""+ $scope.getUser(Userid).surname + "\" ></input>" +
                                    "</div>" +
                                    "<div class=\"inline field\">" +
                                      "<label>Email:</label>" +
                                      "<input class=\"ui small input\" type=\"text\" id=\"currentUserEmail\" placeholder=\"Email\"  value=\""+ $scope.getUser(Userid).email + "\" ></input>" +
                                    "</div>" +
                                    "<div class=\"field\">" +
                                      "<label>Address:</label>" +
                                      "<input class=\"ui input\" id=\"autocompleteCurrent\" placeholder=\"Enter address\" type=\"text\" ng-model=\"autocompleteCurrent\"></input>" +
                                      "<div class=\"suggestionTest\" id=\"suggestions1\"></div>" +
                                      "<div class=\"ui segment\">" + 
                                        "<input type=\"text\" readonly placeholder=\"Address Line 1\" id=\"currentUserAddress_line_1\" value=\""+ $scope.getUser(Userid).address_line_1 +"\" ></input>" +
                                        "<input type=\"text\" readonly placeholder=\"City\" id=\"currentUserCity\" value=\""+ $scope.getUser(Userid).city +"\" ></input>" +
                                        "<input type=\"text\" readonly id=\"currentUserPostcode\" placeholder=\"Postcode\" ng-model=\"currentUser.postcode\" value=\""+ $scope.getUser(Userid).postcode +"\"></input>" +
                                        "<select disabled id=\"currentUserCountry\">" +
                                          "<option selected=\"selected\">Country</option>" +
                                        "</select>" +
                                        "<div class=\"inline field\">" +
                                          "<label>Latitude:</label> <input type=\"text\" disabled placeholder=\"lat\" id=\"currentUserLat\" value=\""+ $scope.getUser(Userid).lat +"\" ></input>" +
                                        "</div>" +
                                        "<div class=\"inline field\">" +
                                          "<label>Longitude:</label> <input type=\"text\" disabled placeholder=\"lng\" id=\"currentUserLng\" value=\""+ $scope.getUser(Userid).lng +"\" ></input>" +
                                        "</div>" +
                                        "<div class=\"ui button tiny\" id=\"clearCurrent\">Clear Address</div>" + 
                                      "</div>" +
                                      // "<label>Address:</label>" +
                                      // "<input type=\"text\" placeholder=\"Address Line 1\" id=\"currentUserAddress_line_1\" value=\""+ $scope.getUser(Userid).address_line_1 +"\" ></input>" +
                                      // "<input type=\"text\" placeholder=\"Address Line 2\" id=\"currentUserAddress_line_2\" value=\""+ $scope.getUser(Userid).address_line_2 +"\" ></input>" +
                                      // "<input type=\"text\" placeholder=\"Address Line 3\" id=\"currentUserAddress_line_3\" value=\""+ $scope.getUser(Userid).address_line_3 +"\" ></input>" +
                                    "</div>" +
                                    "<div class=\"inline field\">" +
                                      "<label>Telephone No.:</label>" +
                                      "<input class=\"ui small input\" type=\"text\" id=\"currentPhoneNumber\" placeholder=\"Telephone No.\"  value=\"" + $scope.getUser(Userid).telephone + "\" ></input>" +
                                    "</div>" +
                                    "<select id=\"currentCompanyAssignedTo\">" +
                                      "<option>Please select a company...</option>" +
                                    "</select>" +
                                "</div>" +
                                "<br/>" +

                                "<div class=\"ui toggle checkbox\">" +
                                  "<input id=\"currentUserApplicationStatus\" type=\"checkbox\"></input>" +
                                  "<label>Permit User</label>" +
                                "</div><br/><br/>" +

                                "<button type=\"submit\" id=\"saveCurrentUser\" class=\"ui green button\" ng-click=\"updateUser(currentUser)\" ng-show=\"editing[0]\">" +
                                  "<i class=\"check icon\"></i>Save" +
                                "</button>" +
                                "<button id=\"deleteCurrentUser\" class=\"ui red button\" ng-click=\"hideUserInfo()\" >" +
                                  "<i class=\"x icon\"></i>Delete" +
                                "</button>" +
                                "<button id=\"closeCurrentUser\" class=\"ui orange button\" ng-click=\"hideUserInfo()\" >" +
                                  "<i class=\"x icon\"></i>Cancel" +
                                "</button>" +
                                "</form>" +
                              "</div></td>");
    $scope.getCompanyOptions("edit", Userid);
    
    //May not be required
    //$('#currentPhoneNumber').val($scope.getCompany($scope.getUser(Userid).company_id).telephone)
    
    $scope.editInit();

    $( "#currentUserCountry" ).append( "<option  value=\"\" selected=\"selected\"> Country </option>" );
    angular.forEach($scope.countries, function(value, key){
          $( "#currentUserCountry" ).append( "<option value=\""+value.country+"\">" + value.country + "</option>" );
        })

    $("#autocompleteCurrent").keydown(function(){
      repositionSuggestions(1);
    })
    $("#autocompleteCurrent").on('click',function(){
      repositionSuggestions(1);
    })

    $("#clearCurrent").on('click',function(){
      $scope.clearAddress(1);
    })

    $("#currentUserCountry").val($scope.getUser(Userid).country);
    


    if($scope.getUser(Userid).accepted == 1)
      $('.ui.checkbox').checkbox('check');
    else
      $('.ui.checkbox').checkbox();
    $("#closeCurrentUser").on('click', function(){
      $scope.hideUserInfo("#currentUser");
      $scope.hideUserInfo();
    });
    $("#deleteCurrentUser").on('click', function(){
      $scope.hideUserInfo("#currentUser");
      $scope.hideUserInfo();
      UserUpdate.deleteUser(Userid);
      $("#"+Userid).empty();
      $scope.searchUsers($scope.searchTerm, $(".company").first.id);
    });
    $("#saveCurrentUser").on('click', function(){
      $scope.currentUser.id = Userid;
      $scope.currentUser.firstname = $("#currentUserFirstName").val();
      $scope.currentUser.surname = $("#currentUserSurName").val();
      $scope.currentUser.email = $("#currentUserEmail").val();
      if($scope.currentUser.accepted = $("#currentUserApplicationStatus").prop('checked'))
        $scope.currentUser.accepted = 1;
      else
        $scope.currentUser.accepted = 0;
      $scope.currentUser.city = $("#currentUserCity").val();
      $scope.currentUser.country = $("#currentUserCountry").val();
      $scope.currentUser.address_line_1 = $("#currentUserAddress_line_1").val();
      $scope.currentUser.postcode = $("#currentUserPostcode").val();
      $scope.currentUser.lat = $("#currentUserLat").val();
      $scope.currentUser.lng = $("#currentUserLng").val();
      $scope.currentUser.postcode = $("#currentUserPostcode").val();
      $scope.currentUser.telephone = $("#currentPhoneNumber").val();
      $scope.currentUser.company = $("#currentCompanyAssignedTo").val();
      console.log($scope.currentUser);

      var i = 0;
      while(i < $scope.users.length)
      {
        if($scope.users[i].id == Userid)
          $scope.users[i] = $scope.currentUser;
        i++;
      }
      UserUpdate.updateUser($scope.currentUser);
      $scope.hideUserInfo("#currentUser");
      $scope.hideUserInfo();
      setTimeout(function(){$scope.searchUsers($scope.searchTerm);}, 50);
      //$("#currentCompanyAssignedTo").html($($scope.companyOptions).not("#" +$scope.getUser(Userid).company_id).html() + $($scope.companyOptions).filter("#" +$scope.getUser(Userid).company_id).html().attr('selected', 'selected'));
    });
  };
  $scope.checkApplicantStatus = function(Userid) {
    var user = $scope.getUser(Userid);
    if(user.accepted == 1 || user.accepted == "1" || user.accepted === 1)
    {
      return true;
    }
    else
    {
      return false;
    }
  };
  $scope.searchUsers("");
}]);

//Controller for messages
app.controller('messagesController', ['$http', '$rootScope', '$scope', 'Messages', 'Friends', '$interval', '$localStorage', function($http, $rootScope, $scope, Messages, Friends, $interval, $localStorage){
  $scope.friends = [];
  $scope.messages = [];
  $scope.status = {};
  $scope.getFriends = {};
  $scope.message = "";
  $scope.friends = $rootScope.$storage.friends;
  $scope.user = $rootScope.$storage.userSesh;
  $scope.selectedFriend = $rootScope.$storage.selectedFriend;

  $scope.isMe = function(id) {
    if(id == $scope.user.userId)
      return true;
    else
      return false;
  };
  $scope.getMessages = function(user, friendid) {
    Messages.getMessages(user, friendid)
      .success(function (messages) {
          $scope.messages = messages;
      })
      .error(function (error) {
          $scope.status = 'Unable to load message data: ';
      });
    $('messagesToContainer').scrollTop($('messagesToContainer').height());
  };
  $scope.scrollToBottom = function(){
    $("#messagesToContainer").scrollTop($("#messagesToContainer").scrollHeight);
  };
  $scope.messagesExist = function() {
    if($scope.messages.length >= 1)
    {
      return true;
    }
    else
    {
      return false;
    }
  };
  $scope.showMessages = function() {
    if($scope.selectedFriend === undefined || $scope.selectedFriend === 'undefined')
      return false;
    else
      return true;
  };
  $scope.getFriends = function(userid) {
    Friends.getFriends(userid)
      .success(function (friends) {
          $rootScope.$storage.friends = friends;
          $scope.friends = friends;
          $rootScope.$storage.selectedFriend = friends[0];
          $scope.selectedFriend = friends[0];
      })
      .error(function (error) {
          $scope.status = 'Unable to load friends data: ';
      });
      
  };
  $scope.friendsExist = function(){
    if($scope.friends.length >= 1)
    {
      return true;
    }
    else
    {
      return false;
    }
  };
  $scope.getFriends($scope.user.userId);

  $scope.selectFriend = function(userid) {
    for(var i = 0; i < $scope.friends.length; i++)
    {
      if($scope.friends[i].id == userid)
      {
        $rootScope.$storage.selectedFriend = $scope.friends[i];
        $scope.selectedFriend = $scope.friends[i];
      }
    }
  };
  $scope.getFriendNameById = function(friendid) {
    for(var i = 0; i < $scope.friends.length; i++)
    {
      if($scope.friends[i].id == friendid)
      {
        return $scope.friends[i].firstname + " " + $scope.friends[i].surname;
      }
    }
  };
  $scope.setSelectedFriend = function(passedFriendId) {
    $scope.selectFriend(passedFriendId);
    $rootScope.$storage.selectedFriend = $scope.selectedFriend;
    $scope.getFriends($scope.user.userId);
    $scope.getMessages($scope.user.userId, passedFriendId);
  };
  $scope.checkSent = function($event) {
    if($event.keyCode == '13' && $scope.message !== "")
    {
      Messages.sendMessage($scope.user.userId, $scope.selectedFriend.id, $scope.message);
      $scope.getMessages($scope.user.userId, $scope.selectedFriend.id);
      $scope.message = null;
      $scope.scrollToBottom();
      return false;
    }
  };
  $scope.sendMessage = function() {
    Messages.sendMessage($scope.user.userId, $scope.selectedFriend.id, $scope.message);
    $scope.getMessages($scope.user.userId, $scope.selectedFriend.id);
    $scope.message = null;
    $scope.scrollToBottom();
    return false;
  };
  
  $scope.getMessages($scope.user.userId, $scope.selectedFriend.id);
  $scope.setSelectedFriend($scope.selectedFriend.id);

  var intervalPromise = $interval(function(){
    console.log($scope.user);
    $scope.getFriends($scope.user.userId);
    $scope.getMessages($scope.user.userId, $scope.selectedFriend.id);
  }, 5000);
  $rootScope.$on("$locationChangeStart", function(event, next, current) { 
    $interval.cancel(intervalPromise);
  });
}]);
app.controller('registrationController', ['$scope', '$state', 'Positions', 'Countries', 'Companies', 'Sectors', '$http', function($scope, $state, Positions, Countries, Companies, Sectors, $http){
  
  $scope.init = function() {
      autocomplete = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocomplete')),
                    { types: ['address'] });
                google.maps.event.addListener(autocomplete, 'place_changed', function() {
                });
                autocomplete.addListener('place_changed', fillInAddress);

    }
    $scope.init();


    
    function fillInAddress() {
      $scope.address = [];
      $scope.registration.company.address = {};
      // Get the place details from the autocomplete object.
      var place = autocomplete.getPlace();
      $scope.registration.company.address.lat = place.geometry.location.lat()
      $scope.registration.company.address.lng = place.geometry.location.lng()
      $scope.errors[8] = false;
      // Get each component of the address from the place details
      // and fill the corresponding field on the form.
      for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
          var val = place.address_components[i];
          if(addressType == "route")
            {
              $scope.registration.company.address.line1 = val.long_name
              $scope.address.push(val.long_name)
            }
          if(addressType == "street_number")
            {
              $scope.registration.company.address.line1 = val.long_name + " " + place.address_components[++i].long_name;
              $scope.address.push(val.long_name)
            }
          if(addressType == "locality" || addressType == "postal_town")
            {
            $scope.registration.company.address.city = val.long_name
            $scope.address.push(val.long_name)
            }
          if(addressType == "country")
            {
              $scope.registration.company.address.country = $scope.countries.filter(function( obj ) {return obj.country == val.long_name;})[0];
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("postal_code") != -1 || addressType.indexOf("postal_code_prefix")  != -1)
            {
              $scope.registration.company.address.postcode = val.long_name
              $scope.address.push(val.long_name)
            }

      }
      $scope.$apply()
    }



  $scope.repositionSuggestions = function() {
    setTimeout(function(){var test = $('div.pac-container');
    $('div.pac-container').css('top', '');
    $('div.pac-container').css('left', '');
    $('#suggestions').html(test);},0.1)
  }


  //Move register logic to a factory at a later date
  $scope.register = function(req) {
  req.company.investor = true;
  $scope.checkErrors();
   if($scope.errors.indexOf(true) == -1)
    return $http
        .post(backendUrl + '/user', req)
        .then(function (res) {
          if(res.data.success)
          $state.go('registrationSuccess')
          else
          {
            $scope.error = true;
            $scope.errors[0] = true;
            $scope.errorMessage = res.data.error_message;
            $scope.emailTaken = res.data.error[1];
            $scope.errors[1] = res.data.error[2];
            $scope.errors[2] = res.data.error[3];
            $scope.errors[3] = res.data.error[4];
            if(res.data.unknown)
              $state.go('registrationFail')
          }
        })
        .catch(function(){
          $scope.error_sending = true;
         });
  };

  $scope.positions = []
  $scope.positions = Positions.fetchPositions();
  $scope.countries = []
  $scope.countries = Countries.fetchCountries();
  $scope.sectors = [];
  $scope.sectors = Sectors.fetchSectors();
  $scope.membersNumber = 2;
  $scope.membersThree = false;
  $scope.membersFour = false;
  $scope.membersFive = false;
  $scope.addButtonStatus = "green";
  $scope.removeButtonStatus = "grey";

  $scope.passwordMatch = true;
  $scope.errors = [false, false, false, false, false, false, false, false ,false ,false, false, false];
  $scope.error = false;
  $scope.emailTaken = false;
  $scope.companyTaken = false;

  $scope.checkErrors = function(destination){
    $scope.errors[0] = $scope.registrationForm.$invalid;
    $scope.errors[1] = $scope.registrationForm.first_name.$invalid || /[^A-z$]/.test( $scope.registrationForm.first_name.$viewValue );
    $scope.errors[2] = $scope.registrationForm.last_name.$invalid || /[^A-z$]/.test( $scope.registrationForm.last_name.$viewValue );
    $scope.errors[3] = $scope.registrationForm.email_address.$invalid;
    // $scope.errors[4] = $scope.registrationForm.password_botemp.$invalid;
    $scope.errors[5] = $scope.registrationForm.job_position.$invalid;
    // $scope.errors[6] = $scope.registrationForm.password_confirmation.$error.required;
    $scope.errors[7] = $scope.registrationForm.company_name.$invalid;
    $scope.errors[8] = $scope.registrationForm.company_country.$invalid || $scope.registrationForm.company_address_line_1.$invalid || $scope.registrationForm.company_post_code.$invalid || $scope.registrationForm.company_city.$invalid
    $scope.errors[12] = $scope.registrationForm.contact_number.$invalid;
    $scope.error_sending = false;
   // $scope.errors[11] = $scope.registrationForm.company_ric.$invalid;
    // if($scope.registrationForm.password_confirmation.$error.passwordVerify)
       // $scope.errors[0] = true;
  }

  $scope.loadCompanies = function(){
    Companies.fetchCompaniesSmallInvestors()
      .then(function(response){
        $scope.companies = response.data;
      })
      .catch(function(){
        $scope.failedToLoad = true;
      })
  }

  $scope.fillName = function(x){
    $scope.registration.company.name = x.name;
  }

  $scope.searchBoth = function (x) {
    if (undefined != $scope.registrationForm.company_name.$viewValue)
    {
      var search;
      search = $scope.registrationForm.company_name.$viewValue;
      search = search.replace(/([()[{*+.$^\\|?])/g, '\\$1');
      regex = new RegExp('' + search, 'i');
      byTag = false;
      byName= false;
      //if ($scope.search.symbol)
      byTag = regex.test(x.symbol);
      //if ($scope.search.name)
      byName = regex.test(x.name);
      if (search.length < 3)
      {
        byTag = false
        byName = false
      }
      //IF YOU WANT TO ADD CONDITIONS ADD
      //Name: <input class="ui checkbox" type="checkbox" ng-model="search.name"/> Stock Tag: <input class="ui checkbox" type="checkbox" ng-model="search.symbol"/>
      //TO THE HTML
      returnvalue = byTag || byName;
      return returnvalue;
    }
  }

  $scope.loadCompanies();

  $scope.activateState = function(destination){
    $state.go(destination.state);
  }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

  $scope.addMember = function(){
    $scope.membersNumber++;
    $scope.checkButtonStatus();
    if($scope.membersNumber > 2)
    {
      if($scope.membersNumber > 3)
      {
        if($scope.membersNumber > 4)
        {
          $scope.membersFive = true;
        }
        else
        {
          $scope.membersFour = true;
        }
      }
      else
      {
        $scope.membersThree = true;
      }
    }
  }

  $scope.removeMember = function(){
    $scope.membersNumber--;
    $scope.checkButtonStatus();
    if($scope.membersNumber > 2)
    {
      if($scope.membersNumber > 3)
      {
        if($scope.membersNumber < 6)
        {
          $scope.membersFive = false;
        }
      }
    else
      {
        $scope.membersFour = false;
      }
    }
    else
    {
      $scope.membersThree = false;
    }
  }

  $scope.checkButtonStatus = function(){
    if($scope.membersNumber > 2)
    {
      $scope.removeButtonStatus = "red";
    }
    else
    {
      $scope.removeButtonStatus = "grey"
    }

    if($scope.membersNumber < 5)
    {
      $scope.addButtonStatus = "green";
    }
    else
    {
      $scope.addButtonStatus = "grey";
    }
  }

}]);

app.controller('companyListingController', ['$scope', '$filter', 'FTSE100','FTSE250', 'Favourites','Companies', '$localStorage', function($scope, $filter, FTSE100, FTSE250, Favourites, Companies, $localStorage){

  $scope.results = [];
  $scope.favouritesID = [];
  $scope.favourites = [];
  $scope.ticked = [];
  $scope.added = [false, false, false, false, false];
  $scope.search = false;
  $scope.symbol = false;
  $scope.allCompanies = [];
  $scope.companies = {};
  $scope.favourited = {};
  $scope.filtlist = [];
  $scope.searchSize = true;
  $scope.test = true;
  $scope.errorSaving = false;
  $scope.categories = []
  $scope.failedToLoad = false;
  $scope.newFavourites = [];
  $scope.loadedFavouritesID = [];
  $scope.favouritesLoaded = false;


  $scope.loadCompanies = function(){
    Companies.fetchCompaniesSmallNotInvestors()
      .then(function(response){
        $scope.allCompanies = response.data;
      })
      .catch(function(){
        $scope.failedToLoad = true;
      })
  }

  $scope.loadFavourites = function(){
    Favourites.fetchFavourites({"user": {"id": $scope.currentUser.userId}})
      .then(function(response){
        $scope.favourites = response.data.favourites;
        angular.forEach($scope.favourites, function(value, key){
          $scope.loadedFavouritesID.push(value.id);
        });
        $scope.favourites.sort($scope.compare);
        $scope.favouritesLoaded = true;
      })
      .catch(function(){
        $scope.failedToLoad = true;
      })
  }

  $scope.loadFavourites();
  $scope.loadCompanies();
  
  $("input[type=checkbox]").click(function(event){
    event.stopPropagation();
  });

  $scope.addAll = function(toggle){
    $scope.checkFavourites = false;
    $scope.checkResults = false;
    if(($scope.added[0] && toggle) || $scope.search.$=="")
    {
      $scope.results = [];
      $scope.added[0] = false;
    }
    else
    {
      $scope.categories = [];
      $scope.added = [];
      $scope.results = [];
      $scope.added[0] = true;
      $scope.results = $scope.allCompanies;
      $scope.results.sort($scope.compare);
    }
  }


  $scope.addCategory = function(number, name){
    $scope.checkFavourites = false;
    $scope.checkResults = false;

    $scope.added[0] = false;
    $scope.search.$ = "";
    if($scope.allCompanies.length == 0)
       $scope.allCompanies = Companies.fetchCompanies();
    $scope.added[number] = !$scope.added[number];
    if ($scope.added[number])
      $scope.categories[number-1] = name
    else
      $scope.categories[number-1] = null
    $scope.results = $scope.allCompanies.slice(0)
    $scope.results = _.remove($scope.results, function (n){return $scope.categories.indexOf(n.classification) > -1});
    $scope.results.sort($scope.compare);
  }

  $scope.arrayObjectIndexOf = function(inArray, searchTerm, property) {
  for(var i = 0; i < inArray.length; i++) {
    if (inArray[i][property] === searchTerm) 
      return i;
    }
    return -1;
  }
  $scope.compare = function(a,b) {
    if (a.name.toUpperCase() < b.name.toUpperCase())
       return -1;
    if (a.name.toUpperCase() > b.name.toUpperCase())
      return 1;
    return 0;
  }

  $scope.favourite = function(){
    angular.forEach($scope.results, function(value, key){
      if($scope.companies[value.name])
      {
        if($scope.arrayObjectIndexOf($scope.favourites, value.name, "name")==-1)
          $scope.favourites.push({name: value.name, symbol: value.symbol, id: value.id});
        delete $scope.companies[value.name];
      }
  });
  $scope.checkFavourites = false;
  $scope.checkResults = false;
  $scope.favourites.sort($scope.compare);
  $scope.saveFavourites(true);
  }
  $scope.unFavourite = function(){
    angular.forEach($scope.favourited, function(value, key){
      if(value)
      {
        $scope.favourites.splice($scope.arrayObjectIndexOf($scope.favourites, key, "name"),1);
        delete $scope.favourited[key];
      }
      $scope.checkFavourites = false;
      $scope.checkResults = false;
      $scope.saveFavourites(false);
    });
  }

  $scope.saveFavourites = function(add){
    $scope.favouritesID = [];
    angular.forEach($scope.favourites, function(value, key){
      $scope.favouritesID.push(value.id);
    });

    if(add)
    {
      Favourites.saveFavourites({"user": {"id": $scope.currentUser.userId, "favourites": _.difference($scope.favouritesID, $scope.loadedFavouritesID), add: true}})
      .then(function(response){
        $scope.errorSaving = response.data.error;
      })
    }
    else
    {
      Favourites.saveFavourites({"user": {"id": $scope.currentUser.userId, "favourites": _.difference($scope.loadedFavouritesID, $scope.favouritesID), add: false}})
      .then(function(response){
        $scope.errorSaving = response.data.error;
      })
    }
    $scope.loadedFavouritesID = $scope.favouritesID;
  }

  $scope.checkAll = function(box, ar1, ar2){
    ar2 = $filter('filter')(ar2,$scope.searchBoth)
    if(box)
      angular.forEach(ar2, function(value){
        ar1[value.name] = true;
      });       
    else
      angular.forEach(ar2, function(value){
        ar1[value.name] = false;
      });
  }
  $scope.searchBoth = function (x) {
    if (!$scope.search.$)
      return true;
    search = $scope.search.$;
    search = search.replace(/([()[{*+.$^\\|?])/g, '\\$1');
    regex = new RegExp('' + search, 'i');
    byTag = false;
    byName= false;
    //if ($scope.search.symbol)
    byTag = regex.test(x.symbol);
    //if ($scope.search.name)
    byName = regex.test(x.name);
    //IF YOU WANT TO ADD CONDITIONS ADD
    //Name: <input class="ui checkbox" type="checkbox" ng-model="search.name"/> Stock Tag: <input class="ui checkbox" type="checkbox" ng-model="search.symbol"/>
    //TO THE HTML
    returnvalue = byTag || byName;
    return returnvalue;
  }

}]);

app.controller('companyProfileController', ['$scope','Company', 'Countries','Positions','UsersFromCompany', '$stateParams', '$http', function($scope, Company, Countries, Positions, UsersFromCompany, $stateParams, $http){

  $scope.positions = []
  $scope.positions = Positions.fetchPositions();
  $scope.countries = []
  $scope.countries = Countries.fetchCountries();
  $scope.getCompany= {};
  $scope.updateTime= null;
  $scope.contacts = [];
  autocompletes = [];
  $scope.editing = [];
  $scope.errors = [];
  $scope.companyErrors = [];
  $scope.autocompleted = [];

  $scope.loading = true;

  $scope.firstTime = false;

  $scope.editThis = function(index) {
    $scope.editing[index]=!$scope.editing[index]
    autocompletes[index] = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocomplete_'+index)),
                    { types: ['address'] });
                google.maps.event.addListener(autocompletes[index], 'place_changed', function() {
                });
    autocompletes[index].addListener('place_changed', function() { fillInAddress(index)
                });
  }

  $scope.init = function() {
      autocomplete = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocomplete')),
                    { types: ['address'] });
                google.maps.event.addListener(autocomplete, 'place_changed', function() {
                });
    autocomplete.addListener('place_changed', function() { fillInAddress(0)
                });

    }
    $scope.init();

  $scope.clearAddress = function(contact) {
    $scope.contacts[contact].address_line_1 = undefined;
    $scope.contacts[contact].city = undefined;
    $scope.contacts[contact].country = undefined;
    $scope.contacts[contact].postcode = undefined;
    $scope.contacts[contact].lat = undefined;
    $scope.contacts[contact].lng = undefined;
  }

  $scope.repositionSuggestions = function(where) {
    setTimeout(function(){var test = $('div.pac-container');
    $('div.pac-container').css('top', '');
    $('div.pac-container').css('left', '');
    $('#suggestions'+where).html(test);},0.1)
  }


  function fillInAddress(index) {
      tempAddress = {}
      $scope.address = [];

      // Get the place details from the autocomplete object.
      if(index==0)
        var place = autocomplete.getPlace();
      else
        var place = autocompletes[index].getPlace();
      tempAddress.lat = place.geometry.location.lat()
      tempAddress.lng = place.geometry.location.lng()
      // Get each component of the address from the place details
      // and fill the corresponding field on the form.
      for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
          var val = place.address_components[i];
          if(addressType == "route")
            {
              tempAddress.address_line_1 = val.long_name
              $scope.address.push(val.long_name)
            }
          if(addressType == "street_number")
            {
              tempAddress.address_line_1 = val.long_name + " " + place.address_components[++i].long_name;
              $scope.address.push(val.long_name)
            }
          if(addressType == "locality" || addressType == "postal_town")
            {
            tempAddress.city = val.long_name
            $scope.address.push(val.long_name)
            }
          if(addressType == "country")
            {
              tempAddress.country = $scope.countries.filter(function( obj ) {return obj.country == val.long_name;})[0];
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("postal_code") != -1 || addressType.indexOf("postal_code_prefix")  != -1)
            {
              tempAddress.postcode = val.long_name
              $scope.address.push(val.long_name)
            }
      }
      
      if(index==0)
      {
        $scope.company.address_line_1 = tempAddress.address_line_1
        $scope.company.city = tempAddress.city
        $scope.company.country = tempAddress.country
        $scope.company.postcode = tempAddress.postcode
        $scope.company.lat = tempAddress.lat
        $scope.company.lng = tempAddress.lng
      }
      else
      {
        $scope.contacts[index-1].address_line_1 = tempAddress.address_line_1
        $scope.contacts[index-1].city = tempAddress.city
        $scope.contacts[index-1].country = tempAddress.country
        $scope.contacts[index-1].postcode = tempAddress.postcode
        $scope.contacts[index-1].lat = tempAddress.lat
        $scope.contacts[index-1].lng = tempAddress.lng
      }

      $scope.$apply()
    }

  $scope.getCompany = function(companyid){
    Company.fetchCompany(companyid)
      .then(function(response){
        $scope.company = response.data;
        $scope.company.country = $scope.countries.filter(function( obj ) {return obj.country == $scope.company.country;})[0];
        $scope.updateTime = $scope.company.updated_at
      })
      .catch(function(){
        $scope.failedLoading = true;
      });

  };

  $scope.getContacts = function(){
    return _.drop($scope.contacts)
  };

  $scope.getUsers = function(companyid){
    UsersFromCompany.fetchUsers(companyid)
      .then(function(response){
        temp = response.data;
        for(i = 0; i < temp.length; i++)
        {
          $scope.contacts[i] = _.find(temp, function(n) {
            return n.contact_number == i+1;
          })
          if($scope.contacts[i].updated_at > $scope.updateTime)
            $scope.updateTime = $scope.contacts[i].updated_at;
          if($scope.contacts[i].id == $scope.currentUser.userId)
              $scope.firstTime = $scope.contacts[i].first_time;
          $scope.contacts[i].country = $scope.countries.filter(function( obj ) {return obj.country == $scope.contacts[i].country;})[0];
          if($scope.address_line_1 == null)
            $scope.contacts[i].address_line_1 = "";

        }
        $scope.contacts = _.compact($scope.contacts);
        $scope.loading = false;
      })
      .catch(function(){
        $scope.failedLoading = true;
      });
  };
  $scope.getCompany($scope.currentUser.companyId);
  $scope.getUsers($scope.currentUser.companyId);

  $scope.update = function(user) {
    $scope.errors[user.contact_number-1] = []

    if($scope.errors[user.contact_number-1].indexOf(true) == -1)
    return $http
        .post(backendUrl + '/user/update', {id: user.id, user: user})
        .then(function (res) {
          delete $scope.errors[user.contact_number-1]
          if(res.data.success)
            {
              $scope.editing[user.contact_number]=!$scope.editing[user.contact_number]
              if(user.id == $scope.currentUser.userId)
              $scope.firstTime = false;
            }
          else
            $scope.errors[user.contact_number-1] = res.data.error
          return res.data;
        });
  };

  $scope.updateCompany = function(company) {
    $scope.companyErrors = [];
    $scope.companyErrors[1] = $scope.companyForm.company_country.$invalid || $scope.companyForm.company_address_line_1.$invalid || $scope.companyForm.company_post_code.$invalid || $scope.companyForm.company_city.$invalid

    if($scope.companyErrors.indexOf(true) == -1)
      return $http
          .post(backendUrl + '/company/update', {company: company})
          .then(function (res) {
            if(res.data.success)
              $scope.editing[0]=!$scope.editing[0]
            else
              $scope.companyErrors = res.data.error
            return res.data;
          });
    else
      $scope.companyErrors[0] = true
  };

}]);

app.controller('addUserController', ['$scope', '$state', 'Positions', '$http', function($scope, $state, Positions, $http){
  //Move register logic to a factory at a later date
  $scope.register = function(user) {
  $scope.checkErrors();
   if($scope.errors.indexOf(true) == -1)
    return $http
        .post(backendUrl + '/user/member', {id: $scope.currentUser.companyId,user: user})
        .then(function (res) {
          if(res.data.success)
          $state.go('registrationSuccess')
          else
          {
            $scope.error = true;
            $scope.errors[0] = true;
            $scope.errorMessage = res.data.error_message;
            $scope.emailTaken = res.data.error[1];
            $scope.errors[1] = res.data.error[2];
            $scope.errors[2] = res.data.error[3];
            $scope.errors[3] = res.data.error[4];
            $scope.errors[4] = res.data.error[5];
            if(res.data.unknown)
              $state.go('registrationFail')
          }
        });
  };

  $scope.positions = [];
  $scope.positions = Positions.fetchPositions();
  $scope.errors = [false, false, false, false, false];

  $scope.checkErrors = function(destination){
    $scope.errors[0] = $scope.registrationForm.$invalid;
    $scope.errors[1] = $scope.registrationForm.first_name.$invalid || /[^A-z$]/.test( $scope.registrationForm.first_name.$viewValue );
    $scope.errors[2] = $scope.registrationForm.last_name.$invalid || /[^A-z$]/.test( $scope.registrationForm.last_name.$viewValue );
    $scope.errors[3] = $scope.registrationForm.email_address.$invalid;
    $scope.errors[4] = $scope.registrationForm.job_position.$invalid;
    $scope.errors[0] = $scope.registrationForm.$invalid || !($scope.errors.indexOf(true) == -1)
    $scope.emailTaken = false;
    $scope.companyTaken = false;
  }
  
}]);

app.controller('inviteNewMemberController', ['$scope', '$http', '$state', function($scope, $http, $state){
  $scope.invite = {};
  $scope.invite.message = "Here at "+$scope.currentUser.companyName+" we would love it if you joined us on EquityFile.";
  $scope.invite.who = $scope.currentUser.companyName;
  $scope.errors = [false, false, false];

  $scope.sendInvite = function(invite) {
    $scope.errors = [false, false, false];
    $scope.checkErrors();
    if($scope.errors.indexOf(true) == -1)
    return $http
        .post(backendUrl + '/invite', {invite: invite})
        .then(function (res) {
          if(res.data.success)
            $state.go('inviteSuccess')
          else
            $scope.errors = res.data.error;
        });
  };

  $scope.checkErrors = function(invite) {
    $scope.errors[0] = $scope.inviteForm.$invalid;
    $scope.errors[1] = $scope.inviteForm.emails.$invalid;
    $scope.errors[2] = $scope.inviteForm.message.$invalid;
  };

}]);

app.controller('changePasswordController', ['$state', '$scope', '$http', function($state, $scope, $http){
  $scope.errors = [false, false, false];

  $scope.changePassword = function(user) {
    $scope.errors = [false, false, false];
    $scope.checkErrors();
    if($scope.errors.indexOf(true) == -1)
    {
      user.email = $scope.currentUser.email
      return $http
        .post(backendUrl + '/user/change_password', {user: user})
        .then(function (res) {
          if(res.data.success)
            $state.go('passwordSuccess')
          else
            $scope.errors = res.data.error;
        });
    }
    else
    {
      $scope.errors[0] = true
    }
  };

  $scope.checkErrors = function(invite) {
    $scope.errors[0] = $scope.changePasswordForm.$invalid;
    $scope.errors[1] = $scope.changePasswordForm.cur_pass.$invalid;
    $scope.errors[2] = $scope.changePasswordForm.new_pass_1.$invalid || $scope.changePasswordForm.new_pass_2.$invalid || $scope.changePasswordForm.new_pass_1.$viewValue != $scope.changePasswordForm.new_pass_2.$viewValue
  };

}]);

app.controller('registrationCompanyController', ['$scope', '$state', 'Countries', 'Companies', '$http', function($scope, $state, Countries, Companies, $http){
  
  $scope.init = function() {
      autocomplete = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocomplete')),
                    { types: ['address'] });
                google.maps.event.addListener(autocomplete, 'place_changed', function() {
                });
                autocomplete.addListener('place_changed', fillInAddress);

    }
    $scope.init();


    
    function fillInAddress() {
      $scope.address = [];
      $scope.registration.company.address = {};
      // Get the place details from the autocomplete object.
      var place = autocomplete.getPlace();
      $scope.registration.company.address.lat = place.geometry.location.lat()
      $scope.registration.company.address.lng = place.geometry.location.lng()
      $scope.errors[8] = false;
      // Get each component of the address from the place details
      // and fill the corresponding field on the form.
      for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
          var val = place.address_components[i];
          if(addressType == "route")
            {
              $scope.registration.company.address.line1 = val.long_name
              $scope.address.push(val.long_name)
            }
          if(addressType == "street_number")
            {
              $scope.registration.company.address.line1 = val.long_name + " " + place.address_components[++i].long_name;
              $scope.address.push(val.long_name)
            }
          if(addressType == "locality" || addressType == "postal_town")
            {
            $scope.registration.company.address.city = val.long_name
            $scope.address.push(val.long_name)
            }
          if(addressType == "country")
            {
              $scope.registration.company.address.country = $scope.countries.filter(function( obj ) {return obj.country == val.long_name;})[0];
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("postal_code") != -1 || addressType.indexOf("postal_code_prefix")  != -1)
            {
              $scope.registration.company.address.postcode = val.long_name
              $scope.address.push(val.long_name)
            }

      }
      $scope.$apply()
    }



  $scope.repositionSuggestions = function() {
    setTimeout(function(){var test = $('div.pac-container');
    $('div.pac-container').css('top', '');
    $('div.pac-container').css('left', '');
    $('#suggestions').html(test);},0.1)
  }


  //Move register logic to a factory at a later date
  $scope.register = function(req) {
  $scope.checkErrors();
  req.company.investor = false;
   if($scope.errors.indexOf(true) == -1)
    return $http
        .post(backendUrl + '/user', req)
        .then(function (res) {
          if(res.data.success)
          $state.go('registrationSuccess')
          else
          {
            $scope.error = true;
            $scope.errors[0] = true;
            $scope.errorMessage = res.data.error_message;
            $scope.emailTaken = res.data.error[1];
            $scope.errors[1] = res.data.error[2];
            $scope.errors[2] = res.data.error[3];
            $scope.errors[3] = res.data.error[4];
            // $scope.companyCodeTaken = res.data.error[5];
            if(res.data.unknown)
              $state.go('registrationFail')
          }
        })
      .catch(function(){
        $scope.error_sending = true;
        $scope.errors[0] = true;
        $scope.error = true;
      });
  };

  $scope.countries = []
  $scope.countries = Countries.fetchCountries();

  $scope.errors = [false, false, false, false, false, false, false, false ,false ,false, false, false];
  $scope.error = false;
  $scope.emailTaken = false;
  $scope.companyTaken = false;
  $scope.companyCodeTaken = false;

  $scope.checkErrors = function(destination){
    $scope.errors[0] = $scope.registrationForm.$invalid;
    $scope.errors[1] = $scope.registrationForm.first_name.$invalid || /[^A-z$]/.test( $scope.registrationForm.first_name.$viewValue );
    $scope.errors[2] = $scope.registrationForm.last_name.$invalid || /[^A-z$]/.test( $scope.registrationForm.last_name.$viewValue );
    $scope.errors[3] = $scope.registrationForm.email_address.$invalid;
    // $scope.errors[4] = $scope.registrationForm.password_box.$invalid;
    $scope.errors[5] = $scope.registrationForm.job_position.$invalid;
    // $scope.errors[6] = $scope.registrationForm.password_confirmation.$error.required;
    $scope.errors[7] = $scope.registrationForm.company_name.$invalid;
    $scope.errors[8] = $scope.registrationForm.company_country.$invalid || $scope.registrationForm.company_address_line_1.$invalid || $scope.registrationForm.company_post_code.$invalid || $scope.registrationForm.company_city.$invalid
    $scope.errors[12] = $scope.registrationForm.contact_number.$invalid;
    // $scope.errors[11] = $scope.registrationForm.company_ric.$invalid;
    $scope.error_sending = false;
    // if($scope.registrationForm.password_confirmation.$error.passwordVerify)
       // $scope.errors[0] = true;
  }

   $scope.loadCompanies = function(){
    Companies.fetchCompaniesSmallNotInvestors()
      .then(function(response){
        $scope.companies = response.data;
      })
      .catch(function(){
        $scope.failedToLoad = true;
      })
  }

  $scope.fillName = function(x){
    $scope.registration.company.name = x.name;
  }

  $scope.searchBoth = function (x) {
    if (undefined != $scope.registrationForm.company_name.$viewValue)
    {
      var search;
      search = $scope.registrationForm.company_name.$viewValue;
      search = search.replace(/([()[{*+.$^\\|?])/g, '\\$1');
      regex = new RegExp('' + search, 'i');
      byTag = false;
      byName= false;
      //if ($scope.search.symbol)
      byTag = regex.test(x.symbol);
      //if ($scope.search.name)
      byName = regex.test(x.name);
      if (search.length < 3)
      {
        byTag = false
        byName = false
      }
      //IF YOU WANT TO ADD CONDITIONS ADD
      //Name: <input class="ui checkbox" type="checkbox" ng-model="search.name"/> Stock Tag: <input class="ui checkbox" type="checkbox" ng-model="search.symbol"/>
      //TO THE HTML
      returnvalue = byTag || byName;
      return returnvalue;
    }
  }

  $scope.loadCompanies();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
}]);


app.controller('investorProfileController', ['$scope','Company','Positions','FindUser', 'StyleBiases', 'Sectors', 'UsersFromCompany', 'Countries', 'AdditionalInfo', 'Tags', 'TagRelations' ,'$stateParams', '$http', function($scope, Company, Positions, FindUser, StyleBiases, Sectors, UsersFromCompany, Countries, AdditionalInfo, Tags, TagRelations, $stateParams, $http){

  $scope.positions = []
  $scope.positions = Positions.fetchPositions();
  $scope.getCompany= {};
  $scope.updateTime= null;
  $scope.contacts = [];

  $scope.currencies = ['£', '€', '$']
  $scope.currencyIcon = "dollar"

  $scope.editing = [];
  $scope.errors = [];
  $scope.companyErrors = [];
  $scope.detailsErrors = [];

  $scope.loading = true;

  $scope.position;

  $scope.firstTime = false;

  $scope.styleBiases = [];
  $scope.styleBiases = StyleBiases.fetchStyleBiases();

  $scope.sectors = [];
  $scope.sectors = Sectors.fetchSectors();
  $scope.countries = []
  $scope.countries = Countries.fetchCountries();



  $scope.init = function() {
      autocomplete = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocomplete')),
                    { types: ['address'] });
                google.maps.event.addListener(autocomplete, 'place_changed', function() {
                });
                autocomplete.addListener('place_changed', fillInAddressCompany);
      autocompleteContact = new google.maps.places.Autocomplete(
                    /** @type {HTMLInputElement} */(document.getElementById('autocompleteContact')),
                    { types: ['address'] });
                google.maps.event.addListener(autocompleteContact, 'place_changed', function() {
                });
                autocompleteContact.addListener('place_changed', fillInAddressContact);

    }
    $scope.init();


    
    function fillInAddressCompany() {
      $scope.address = [];
      $scope.company.address_line_1 = "";
      $scope.company.city = "";
      $scope.company.country = "";
      $scope.company.postcode = "";
      $scope.companyErrors[1] = false

      // Get the place details from the autocomplete object.
      var place = autocomplete.getPlace();
      $scope.company.lat = place.geometry.location.lat()
      $scope.company.lng = place.geometry.location.lng()
      // Get each component of the address from the place details
      // and fill the corresponding field on the form.
      for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
          var val = place.address_components[i];
          if(addressType == "route")
            {
              $scope.company.address_line_1 = val.long_name
              $scope.address.push(val.long_name)
            }
          if(addressType == "street_number")
            {
              $scope.company.address_line_1 = val.long_name + " " + place.address_components[++i].long_name;
              $scope.address.push(val.long_name)
            }
          if(addressType == "locality" || addressType == "postal_town")
            {
            $scope.company.city = val.long_name
            $scope.address.push(val.long_name)
            }
          if(addressType == "country")
            {
              $scope.company.country = $scope.countries.filter(function( obj ) {return obj.country == val.long_name;})[0];
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("postal_code") != -1 || addressType.indexOf("postal_code_prefix")  != -1)
            {
              $scope.company.postcode = val.long_name
              $scope.address.push(val.long_name)
            }

      }
      $scope.$apply()
    }

    function fillInAddressContact() {
      $scope.address = [];
      $scope.contact.address_line_1 = "";
      $scope.contact.city = "";
      $scope.contact.country = "";
      $scope.contact.postcode = "";
      $scope.detailsErrors[5] = false

      // Get the place details from the autocomplete object.
      var place = autocompleteContact.getPlace();
      $scope.contact.lat = place.geometry.location.lat()
      $scope.contact.lng = place.geometry.location.lng()
      // Get each component of the address from the place details
      // and fill the corresponding field on the form.
      for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
          var val = place.address_components[i];
          if(addressType == "route")
            {
              $scope.contact.address_line_1 = val.long_name
              $scope.address.push(val.long_name)
            }
          if(addressType == "street_number")
            {
              $scope.contact.address_line_1 = val.long_name + " " + place.address_components[++i].long_name;
              $scope.address.push(val.long_name)
            }
          if(addressType == "locality" || addressType == "postal_town")
            {
            $scope.contact.city = val.long_name
            $scope.address.push(val.long_name)
            }
          if(addressType == "country")
            {
              $scope.contact.country = $scope.countries.filter(function( obj ) {return obj.country == val.long_name;})[0];
              $scope.address.push(val.long_name)
            }
          if(addressType.indexOf("postal_code") != -1 || addressType.indexOf("postal_code_prefix")  != -1)
            {
              $scope.contact.postcode = val.long_name
              $scope.address.push(val.long_name)
            }

      }
      $scope.$apply()
    }


  $scope.clearAddress = function() {
    $scope.contact.address_line_1 = undefined;
      $scope.contact.city = undefined;
      $scope.contact.country = undefined;
      $scope.contact.postcode = undefined;
      $scope.contact.lat = undefined;
      $scope.contact.lng = undefined;
  }

  $scope.repositionSuggestions = function(where) {
    setTimeout(function(){var test = $('div.pac-container');
    $('div.pac-container').css('top', '');
    $('div.pac-container').css('left', '');
    $('#suggestions'+where).html(test);},0.1)
  }

  $scope.setCurrencyIcon = function(currency){
    switch(currency) {
    case "$":
        $scope.currencyIcon = "dollar"
        break;
    case "£":
        $scope.currencyIcon = "pound"
        break;
    case "€":
        $scope.currencyIcon = "euro"
        break;
    }
  };

  $scope.getAdditionalInfo = function(whoToLoad){
    AdditionalInfo.fetchAdditionalInfo(whoToLoad)
      .then(function(response){
        temp = response.data;
       // console.log(temp)
        temp.assets = parseFloat(temp.assets)
        $scope.details = temp;
      })
      .catch(function(){
        $scope.failedLoading = true;
      });
  };

  $scope.getCompany = function(companyid){
    Company.fetchCompany(companyid)
      .then(function(response){
        $scope.company = response.data;
        $scope.company.assets = parseFloat($scope.company.assets);
        $scope.company.equity_assets = parseFloat($scope.company.equity_assets);
        $scope.company.uk_equity_assets = parseFloat($scope.company.uk_equity_assets);
        $scope.setCurrencyIcon($scope.company.currency)
        $scope.company.country = $scope.countries.filter(function( obj ) {return obj.country == $scope.company.country;})[0];
        $scope.updateTime = $scope.company.updated_at
      })
      .catch(function(){
        $scope.failedLoading = true;
      });

  };


  $scope.getTags = function(){
    TagRelations.fetchTagRelations($scope.contact.id)
      .then(function(response){
        $scope.tagRelations = response.data;
        tagRelationsID = []
        Tags.fetchTags()
        .then(function(response){
          $scope.tags = response.data
          $scope.tags.sort($scope.compare)
          angular.forEach($scope.tagRelations, function(value, key){
            temp_position = _.findIndex($scope.tags, { 'id': value.tag_id})
          if(temp_position != -1)
            $scope.tags[temp_position].boolean = true
          });
        })
        .catch(function(){
          $scope.failedLoading = true;
        });
      })
      .catch(function(){
        $scope.failedLoading = true;
      });
  };

  $scope.addTag = function(tag){
    tag.boolean=!tag.boolean;
    return $http
        .post(backendUrl + '/tags/save', {user_id: $scope.contact.id, tag_id: tag.id})
        .then(function (res) {
        });
  }
  $scope.getContacts = function(){
    return _.drop($scope.contacts)
  };

  $scope.getUser = function(whoToLoad){
    FindUser.fetchUser(whoToLoad)
      .then(function(response){
        temp = response.data;
        
        $scope.position = temp.position;
        
        if(temp.position == "Portfolio Manager")
        {
          temp.position = $scope.positions[0]
        } 
        else if (temp.position == "Analyst")
        {
          temp.position = $scope.positions[1]
        } 
        else if (temp.position == "Team Assistant")
        {
          temp.position = $scope.positions[2]
        }
        $scope.firstTime = temp.first_time;
        $scope.contact = temp;
        $scope.getTags();
        $scope.contact.country = $scope.countries.filter(function( obj ) {return obj.country == $scope.contact.country;})[0];

        if($scope.contact.updated_at > $scope.updateTime)
          $scope.updateTime = $scope.contact.updated_at
         //console.log($scope.contacts[i])
         $scope.loading = false;
      })
      .catch(function(){
        $scope.failedLoading = false;
        });
  };

  $scope.getUsers = function(companyid){
    UsersFromCompany.fetchUsers(companyid)
      .then(function(response){
        temp = response.data;
        for(i = 0; i < temp.length; i++)
        {
          $scope.contacts[i] = _.find(temp, function(n) {
            return n.contact_number == i+1;
          })
         //console.log($scope.contacts[i])
        }
        $scope.contacts = _.compact($scope.contacts);
      })
      .catch(function(){
        $scope.loading = false;
      });
  };

  if (typeof($stateParams.param1) != 'undefined' && $stateParams.param1 != null && $stateParams.param1 != "")
  {
      $scope.whoToLoad = $stateParams.param1;
  }
  else
  {
      $scope.whoToLoad = $scope.currentUser.userId;
  }
  $scope.getCompany($scope.currentUser.companyId);
  $scope.getUser($scope.whoToLoad);
  $scope.getUsers($scope.currentUser.companyId);
  $scope.getAdditionalInfo($scope.whoToLoad);

  $scope.update = function(user) {
    return $http
        .post(backendUrl + '/user/update', {id: user.id, user: user})
        .then(function (res) {
          delete $scope.detailsErrors
          if(res.data.success)
            {
              $scope.editing[1]=!$scope.editing[1]
              $scope.position = user.position.title
              $scope.firstTime = false;
            }
          else
            $scope.detailsErrors = res.data.error
          return res.data;
        });
  };

  $scope.updateCompany = function(company) {
    $scope.companyErrors = []

    if (!angular.isNumber(company.assets) || company.assets < 0)
      $scope.companyErrors[3] = true
    if (!angular.isNumber(company.equity_assets) || company.equity_assets < 0)
      $scope.companyErrors[4] = true
    if (!angular.isNumber(company.uk_equity_assets) || company.uk_equity_assets < 0)
      $scope.companyErrors[5] = true

    $scope.companyErrors[1] = $scope.companyForm.company_country.$invalid || $scope.companyForm.company_address_line_1.$invalid || $scope.companyForm.company_post_code.$invalid || $scope.companyForm.company_city.$invalid


    if($scope.companyErrors.indexOf(true) == -1)
      return $http
          .post(backendUrl + '/company/update', {company: company})
          .then(function (res) {
            if(res.data.success)
              $scope.editing[0]=!$scope.editing[0]
            else
              $scope.companyErrors = res.data.error
            return res.data;
          });
    else
      $scope.companyErrors[0] = true
  };

  $scope.updateDetails = function(details) {
    $scope.positionErrors = []
    if($scope.positionErrors.indexOf(true) == -1)
      return $http
          .post(backendUrl + '/user/show/additional_details/update', {id: $scope.whoToLoad, details: details})
          .then(function (res) {
            if(res.data.success)
              $scope.editing[2]=!$scope.editing[2]
            else
              $scope.positionErrors = res.data.error
            return res.data;
          });
  };

  $scope.compare = function(a,b) {
    if (a.name.toUpperCase() < b.name.toUpperCase())
       return -1;
    if (a.name.toUpperCase() > b.name.toUpperCase())
      return 1;
    return 0;
  }

}]);


app.controller('tagSearchController', ['$scope','Companies','Positions','FindUser', 'StyleBiases', 'Sectors', 'UsersFromCompany', 'InvestorUsers', 'Tags', 'TagRelations' ,'$stateParams', 'Matches', '$http', function($scope, Companies, Positions, FindUser, StyleBiases, Sectors, UsersFromCompany, InvestorUsers, Tags, TagRelations, $stateParams, Matches, $http){

  $scope.tagFilter = {}
  $scope.tagFilter.tags = {}
  $scope.failedToLoad = false;
  $scope.loaded = false;
  $scope.matches = [];
  $scope.unmatches = [];
  $scope.matched = [];


    $scope.getData = function(){
    TagRelations.fetchAllTagRelations()
      .then(function(response){
        $scope.tagRelations = response.data


        Tags.fetchTags()
        .then(function(response){
          $scope.tags = response.data
          $scope.tagArray = []
          i = 0;
          angular.forEach($scope.tags, function(value, key){
            $scope.tagArray[value.id] = value.name;
            i++
          });
          $scope.tags.sort($scope.compare)
          Companies.fetchCompaniesSmallInvestors()
          .then(function(response){
            $scope.company = response.data;
            $scope.companyArray = []
            i = 0;
            angular.forEach($scope.company, function(value, key){
              $scope.companyArray[value.id] = value.name;
              i++
            })
           


            InvestorUsers.fetchInvestorUsers()
            .then(function(response){
              $scope.results = response.data
              angular.forEach($scope.results, function(o_value, o_key){
                o_value.tags = {};
                angular.forEach($.grep($scope.tagRelations, function(e){ return e.user_id == o_value.id; }), function(i_value, i_key){
                  o_value.tags[$scope.tagArray[i_value.tag_id]] = true
                });
                delete o_value.tags.undefined
                o_value.company = $scope.companyArray[o_value.company_id]
              });
              $scope.results.sort($scope.compareCompany)
              $scope.loaded = true;
            })
            .catch(function(){
              $scope.failedToLoad = true;
            });

            Matches.fetchMatches({"company": {"id": $scope.currentUser.companyId}})
            .then(function(response){
              $scope.matched = response.data.matches;
              angular.forEach($scope.matched, function(o_value, o_key){
                o_value.tags = {};
                angular.forEach($.grep($scope.tagRelations, function(e){ return e.user_id == o_value.id; }), function(i_value, i_key){
                  o_value.tags[$scope.tagArray[i_value.tag_id]] = true
                });
                delete o_value.tags.undefined
                o_value.company = $scope.companyArray[o_value.company_id]
              });
               if ($scope.matched) {$scope.matched.sort($scope.compareCompany)}
            })
            .catch(function(){
              $scope.failedToLoad = true;
            })


          })
          .catch(function(){
            $scope.failedToLoad = true;
          });






        })
        .catch(function(){
          $scope.failedToLoad = true;
        });




      })
      .catch(function(){
        $scope.failedToLoad = true;
      });
    }

    $scope.filterTag = function(x){
      if (x.boolean)
      {
        x.boolean = false
        delete $scope.tagFilter.tags[x.name]
      }
      else
      {
        x.boolean = true
        $scope.tagFilter.tags[x.name] = true
      }
    }



  $scope.getData();

  $scope.compare = function(a,b) {
    if (a.name.toUpperCase() < b.name.toUpperCase())
       return -1;
    if (a.name.toUpperCase() > b.name.toUpperCase())
      return 1;
    return 0;
  }

  $scope.compareCompany = function(a,b) {
    if (a.company.toUpperCase() < b.company.toUpperCase())
       return -1;
    if (a.company.toUpperCase() > b.company.toUpperCase())
      return 1;
    return 0;
  }

  $scope.match = function(x, index) {
    x.index = $scope.results.indexOf(x)
    $scope.matches.push(x.index)
    $scope.results
    x.boolean = !x.boolean
  }

  $scope.unMatch = function(x, index) {
    x.index = index;
    $scope.unmatches.push(x.index)
    x.boolean = !x.boolean
  }

  $scope.save = function() {
    temp = [];
    angular.forEach($scope.matches, function(value, key){
      $scope.results[value].boolean = !$scope.results[value].boolean
      if($.grep($scope.matched, function(e){ return e.id == $scope.results[value].id}).length == 0)
      {
        temp.push($scope.results[value].id)
        $scope.matched.push(JSON.parse(JSON.stringify($scope.results[value])))
      }
    });
    $scope.matches = []
    if (temp.length > 0)
    {
      Matches.saveMatches({"company": {"id": $scope.currentUser.companyId, "matches": temp, "add": true}})
      .then(function(response){
        $scope.errorSaving = response.data.error;
      })
    }
  }

  $scope.remove = function() {
    temp = []
    angular.forEach($scope.unmatches, function(value, key){
      temp.push($scope.matched[value].id)
      $scope.matched.pop(value)
    });
    $scope.unmatches = []
    if (temp.length > 0)
    {
      Matches.saveMatches({"company": {"id": $scope.currentUser.companyId, "matches": temp, "add": false}})
      .then(function(response){
        $scope.errorSaving = response.data.error;
      })
    }

  }
}]);

app.controller('forgotPasswordController', ['$state', '$scope', '$http', function($state, $scope, $http){
  $scope.errors = [false, false, false];
  $scope.step = 0;
  $scope.next = function(user) {
    $scope.step++
  }
  $scope.changePassword = function(user) {
    $scope.errors[4] = false;
    if (!($scope.changePasswordForm.new_pass_1.$invalid || $scope.changePasswordForm.new_pass_2.$invalid || $scope.changePasswordForm.new_pass_1.$viewValue != $scope.changePasswordForm.new_pass_2.$viewValue))
    {
      user.email = $scope.email;
      user.code = $scope.code;
      return $http
        .post(backendUrl + '/forgot_pass/2', {user: user})
        .then(function (res) {
          if(res.data.success)
            $state.go('passwordSuccess')
          else
          {
            $scope.errors[4] = true;
          }
            
        });
    }
    else
    {
      $scope.errors[4] = true
    }
  };

  $scope.submitEmail = function(email) {
    $scope.errors[1] = false;
    return $http
        .post(backendUrl + '/forgot_pass/0', {email: email})
        .then(function (res) {
          if(res.data.success)
            {
              $scope.step = 1;
              $scope.email = email;
            }
          else
            {
              $scope.errors[1] = true;
            }
        });
  }

  $scope.submitCode = function(code) {
    $scope.errors[2] = false;
    return $http
        .post(backendUrl + '/forgot_pass/1', {email: $scope.email, code: code})
        .then(function (res) {
          if(res.data.success)
            {
              $scope.step = 2;
              $scope.code = code;
            }
          else
          {
            $scope.errors[2] = true;
          }
        });
  }


}]);