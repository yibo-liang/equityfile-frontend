app.factory('authService', ['$http', 'Session', '$rootScope', function ($http, Session, $rootScope) {
  var authService = {};
 
  authService.login = function (userHold) {
    var submit = new Object();
    submit.user = userHold;
    return $http
      .post(backendUrl + '/logins/authenticate_user', submit)
      .then(function (res) {
        Session.create(res.data.token, res.data.user_id,
                      res.data.email, res.data.firstname, res.data.userRole, res.data.investor);
        return res.data;
      });
  };
 
  authService.isAuthenticated = function () {
    return !!$rootScope.$storage.userSesh;
  };
  authService.isAccepted = function () {
    if ($rootScope.$storage.userSesh.accepted == 1 || $rootScope.$storage.userSesh.accepted == "1")      
    {
      return true;
    }
    else
    {
      return false;
    }

  };
  authService.isAuthorized = function (authorizedRoles) {
    if (!angular.isArray(authorizedRoles)) {
      authorizedRoles = [authorizedRoles];
    }
    return (authService.isAuthenticated() &&
      authService.isAccepted() &&
      authorizedRoles.indexOf($rootScope.$storage.userSesh.userRole) !== -1);
  };
 
  return authService;
}]);
app.factory('Messages', [ '$http', function($http){
  var Messages = {};

  return {
    getMessages: function (userid, friendid) {
        return $http({
          method: 'POST',
          url: backendUrl + '/messages/index',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
              var str = [];
              for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              return str.join("&");
          },
          data: {user_id: userid, friend_id: friendid}
      }).success(function(data){
        console.log("getMessages return console log: \n" + data);
        //Needs to be here to scroll on AJAX data request completion
        $('#messagesToContainer').scrollTop($('#messagesToContainer')[0].scrollHeight);
        return data;
      });
    },
    sendMessage: function (userid, friendid, message) {
      if(message !== "" && message != " " && message !== null)
        return $http({
          method: 'POST',
          url: backendUrl + '/messages/send',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
              var str = [];
              for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              return str.join("&");
          },
          data: {posted_by: userid, posted_to: friendid, content: message}
        }).success(function(data){
          console.log(data);
          //Needs to be here to scroll on AJAX data request completion
          $('#messagesToContainer').scrollTop($('#messagesToContainer')[0].scrollHeight);
          return data;
        });

    }
  };

}]);
app.factory('CompanyUpdate', [ '$http', function($http){
    return { updateCompany: function(companyToUpdate) {
        $http({
          method: 'POST',
          url: backendUrl + '/company/update_admin',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: {company_id: companyToUpdate.id,
                  company_name: companyToUpdate.name,
                  company_application_status: companyToUpdate.application_status,
                  company_symbol: companyToUpdate.symbol,
		              company_classification: companyToUpdate.classification,
                  company_type: companyToUpdate.companyType,
                  company_address_line_1: companyToUpdate.address_line_1,
                  company_city: companyToUpdate.city,
                  company_country: companyToUpdate.country,
                  company_postcode: companyToUpdate.postcode,
                  company_lat: companyToUpdate.lat,
                  company_lng: companyToUpdate.lng}
      }).success(function(data){
        console.log("updateCompany return console log: \n" + data);
        return data;
      });
    },
    createCompany: function(companyToUpdate) {
        $http({
          method: 'POST',
          url: backendUrl + '/company/create',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: { company_name: companyToUpdate.company_name,
                  company_application_status: companyToUpdate.application_status,
		  company_classification: companyToUpdate.classification,
                  company_symbol: companyToUpdate.symbol,
                  company_type: companyToUpdate.companyType,
                  company_address_line_1: companyToUpdate.address_line_1,
                  company_city: companyToUpdate.city,
                  company_country: companyToUpdate.country,
                  company_postcode: companyToUpdate.postcode,
                  company_lat: companyToUpdate.lat,
                  company_lng: companyToUpdate.lng }
      }).success(function(data){
        console.log("createCompany return console log: \n" + data);
        return data;
      });
    },
    deleteCompany: function(companyToUpdate) {
        console.log("Data passed to deleteCompany: \n" + companyToUpdate);
        $http({
          method: 'POST',
          url: backendUrl + '/company/destroy',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: { company_id: companyToUpdate }
      }).success(function(data){
        console.log("deleteCompany return console log: \n" + data);

        return data;

      }).error(function(data){
        console.log("deleteCompany error return console log: \n" + data);
      });
    }
  };
}]);
app.factory('CompanySearch', [ '$http', '$rootScope', function($http, $rootScope){
  var CompanySearch = {};
  return {
    searchCompany: function (searchterm, companyid) {
      if($rootScope.setter == 0) 
        $(".company-loader").show();
      if(arguments.length == 2)
        var nextPageReq = true;

      var settings = {
          method: 'POST',
          url: backendUrl + '/company/search',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
              var str = [];
              for(var p in obj)
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              return str.join("&");
          },
          data: {company_name : searchterm, last_company_id : ( !isNaN(companyid) ? companyid : "")},
          async: true
      }

      return $http(settings).success(function(data){
        console.log("searchCompany return console log: \n" + data);
        $(".company-loader").hide();
        return data;
      });
    },
    searchCompanyOption: function (searchterm, companyid) {
      if($rootScope.setter == 0) 
        $(".company-loader").show();
      if(arguments.length == 2)
        var nextPageReq = true;

      var settings = {
          method: 'POST',
          url: backendUrl + '/companies/small',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
              var str = [];
              for(var p in obj)
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              return str.join("&");
          },
          data: {company_name : searchterm, last_company_id : ( !isNaN(companyid) ? companyid : "")},
          async: true
        }
        return $http(settings).success(function(data){
          console.log("searchCompany return console log: \n" + data);
          $(".company-loader").hide();
          return data;
        });
      },
      getCompany: function (companyid) {

        var settings = {
            method: 'POST',
            url: backendUrl + '/company/show',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
                var str = [];
                for(var p in obj)
                  str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {company_id : companyid},
            async: true
        }
        return $http(settings).success(function(data){
          console.log("searchCompany return console log: \n" + data);
          $(".company-loader").hide();
          return data;
        });
      },
      searchCompanyBackwards: function (searchterm, companyid, offset) {
        if($rootScope.setter == 0) 
          $(".company-loader").show();
        if(arguments.length == 2)
          var nextPageReq = true;

        var settings = {
            method: 'POST',
            url: backendUrl + '/company/search',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
                var str = [];
                for(var p in obj)
                  str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {company_name : searchterm, reverse_company_id : ( !isNaN(companyid) ? companyid : ""), offsetter : offset},
            async: true
        }

        return $http(settings).success(function(data){
          console.log("searchCompany return console log: \n" + data);
          $(".company-loader").hide();
          return data;
        });
      }
    }
}]);
app.factory('UserUpdate', [ '$http', function($http){
    return { updateUser: function(userToUpdate) {
      console.log(userToUpdate)
        $http({
          method: 'POST',
          url: backendUrl + '/user/update_admin',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: {user_id: userToUpdate.id,
                  user_firstname: userToUpdate.firstname,
                  user_surname: userToUpdate.surname,
                  user_email: userToUpdate.email,
                  user_accepted: userToUpdate.accepted,
                  user_enabled: userToUpdate.application_status,
                  user_address_line_1: userToUpdate.address_line_1,
                  user_city: userToUpdate.city,
                  user_country: userToUpdate.country,
                  user_postcode: userToUpdate.postcode,
                  user_lat: userToUpdate.lat,
                  user_lng: userToUpdate.lng,
                  user_telephone: userToUpdate.telephone,
                  user_company: userToUpdate.company}
      }).success(function(data){
        console.log("updateUser return console log: \n" + data);
        return data;
      });
    },
    createUser: function(userToUpdate) {
        $http({
          method: 'POST',
          url: backendUrl + '/user/create_admin',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: { user_firstname: userToUpdate.firstname,
                  user_surname: userToUpdate.surname,
                  user_email: userToUpdate.email,
                  user_accepted: userToUpdate.accepted,
                  user_address_line_1: userToUpdate.address_line_1,
                  user_city: userToUpdate.city,
                  user_country: userToUpdate.country,
                  user_postcode: userToUpdate.postcode,
                  user_lat: userToUpdate.lat,
                  user_lng: userToUpdate.lng,
                  user_postcode: userToUpdate.postcode,
                  user_telephone: userToUpdate.telephone,
                  user_enabled: userToUpdate.application_status,
                  user_company: userToUpdate.company }
      }).success(function(data){

        console.log("createUser return console log: \n" + data);
        return data;
      });
    },
    deleteUser: function(userToUpdate) {
        console.log("Data passed to deleteUser: \n" + userToUpdate);
        $http({
          method: 'POST',
          url: backendUrl + '/user/destroy',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: { user_id: userToUpdate }
      }).success(function(data){
        console.log("deleteUser return console log: \n" + data);
        return data;
      }).error(function(data){
        console.log("deleteUser error return console log: \n" + data);
      });
    }
  };
}]);
app.factory('UserSearch', [ '$http', function($http){
  var UserSearch = {};
  return {
    searchUser: function (searchterm) {
      $(".user-loader").show();
      return $http({
          method: 'POST',
          url: backendUrl + '/user/search',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
              var str = [];
              for(var p in obj)
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              return str.join("&");
          },
          data: {user_email: searchterm},
          async: true
      }).success(function(data){
        console.log("searchUser return console log: \n" + data);
        $(".user-loader").hide();
        return data;
      });
    }
  };
}]);

app.factory('Friends', [ '$http', function($http){
  var Friends = {};
  return {
    getFriends: function (userid) {
      return $http({
          method: 'POST',
          url: backendUrl + '/users/friends',
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
              var str = [];
              for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              return str.join("&");
          },
          data: {user_id: userid},
          async: true
      }).success(function(data){
        console.log("getFriends return console log: \n" + data);
        return data;
      });
    }
  };
}]);
app.factory('FTSE250', [ '$http', function($http){
  var ftse250 = [];
  return {
    fetchFTSE250: function(){
      //Get req we'll use in future
      // $http.get(backendUrl + '/companies', {async: true}).success(function(resp){
      //  ftse250 = _.remove(resp, function (n){return n.classification==='ftse250'}); 
      // });
      ftse250 = [
      {name:"3i Infrastructure"},
      {name:"Aberforth Smaller Companies Trust"},
      {name:"Afren"},
      {name:"Acacia Mining"},
      {name:"Alent"},
      {name:"Alliance Trust"},
      {name:"Allied Minds"},
      {name:"Al Noor Hospitals"},
      {name:"Amec Foster Wheeler"},
      {name:"Amlin"},
      {name:"AO World"},
      {name:"Ashmore Group"},
      {name:"Atkins"},
      {name:"Aveva"},
      {name:"BBA Aviation"},
      {name:"BH Macro"},
      {name:"BTG plc"},
      {name:"Balfour Beatty"},
      {name:"Bankers Investment Trust"},
      {name:"Bank of Georgia"},
      {name:"A.G. Barr"},
      {name:"Beazley Group"},
      {name:"Bellway"},
      {name:"Berendsen"},
      {name:"Berkeley Group Holdings"},
      {name:"Betfair Group"},
      {name:"Big Yellow Group"},
      {name:"BlackRock World Mining Trust"},
      {name:"Bluecrest Allblue Fund"},
      {name:"Bodycote"},
      {name:"Booker Group"},
      {name:"Bovis Homes Group"},
      {name:"Brewin Dolphin Holdings"},
      {name:"Brit"},
      {name:"British Empire Securities and General Trust"},
      {name:"Britvic"},
      {name:"N Brown Group"},
      {name:"Bwin.Party Digital Entertainment"},
      {name:"CSR"},
      {name:"Cable & Wireless Communications"},
      {name:"Cairn Energy"},
      {name:"Caledonia Investments"},
      {name:"Capital & Counties Properties"},
      {name:"Card Factory"},
      {name:"Carillion"},
      {name:"Catlin Group"},
      {name:"Centamin"},
      {name:"Cineworld"},
      {name:"City of London Investment Trust"},
      {name:"Close Brothers Group"},
      {name:"CLS Holdings"},
      {name:"Cobham"},
      {name:"Colt Group"},
      {name:"Computacenter"},
      {name:"Countrywide"},
      {name:"Cranswick"},
      {name:"Crest Nicholson"},
      {name:"Croda International"},
      {name:"Daejan Holdings"},
      {name:"Dairy Crest"},
      {name:"DCC"},
      {name:"De La Rue"},
      {name:"Debenhams"},
      {name:"Dechra Pharmaceuticals"},
      {name:"Derwent London"},
      {name:"Dignity"},
      {name:"Diploma"},
      {name:"Direct Line Group"},
      {name:"Dixons Carphone"},
      {name:"Domino Printing Sciences"},
      {name:"Domino's Pizza"},
      {name:"Drax Group"},
      {name:"Dunelm Group"},
      {name:"Edinburgh Investment Trust"},
      {name:"Electra Private Equity"},
      {name:"Electrocomponents"},
      {name:"Elementis"},
      {name:"Enterprise Inns"},
      {name:"Entertainment One"},
      {name:"Essentra"},
      {name:"Esure"},
      {name:"Euromoney Institutional Investor"},
      {name:"Evraz"},
      {name:"F&C Commercial Property Trust"},
      {name:"Fidelity China Special Situations"},
      {name:"Fidelity European Values"},
      {name:"Fidessa Group"},
      {name:"FirstGroup"},
      {name:"Fisher (James) & Sons"},
      {name:"Foreign & Colonial Investment Trust"},
      {name:"Galliford Try"},
      {name:"GCP Infrastructure Investments"},
      {name:"Genesis Emerging Markets Fund"},
      {name:"Genus"},
      {name:"Go-Ahead Group"},
      {name:"Grafton Group"},
      {name:"Grainger"},
      {name:"Great Portland Estates"},
      {name:"Greencore"},
      {name:"Greene King"},
      {name:"Greggs"},
      {name:"HICL Infrastructure Company"},
      {name:"Halfords Group"},
      {name:"Halma"},
      {name:"Hansteen Holdings"},
      {name:"Hays"},
      {name:"HellermannTyton"},
      {name:"Henderson Group"},
      {name:"Hikma Pharmaceuticals"},
      {name:"Hiscox"},
      {name:"Home Retail Group"},
      {name:"Homeserve"},
      {name:"Howdens Joinery"},
      {name:"Hunting"},
      {name:"ICAP"},
      {name:"IG Group Holdings"},
      {name:"IMI"},
      {name:"IP Group"},
      {name:"Inchcape"},
      {name:"Infinis Energy"},
      {name:"Informa"},
      {name:"Inmarsat"},
      {name:"Intermediate Capital Group"},
      {name:"International Personal Finance"},
      {name:"International Public Partnerships"},
      {name:"Interserve"},
      {name:"Investec"},
      {name:"JD Sports"},
      {name:"JPMorgan American Investment Trust"},
      {name:"JPMorgan Emerging Markets Investment Trust"},
      {name:"Jardine Lloyd Thompson"},
      {name:"Jimmy Choo"},
      {name:"John Laing Infrastructure Fund"},
      {name:"Jupiter Fund Management"},
      {name:"Just-Eat"},
      {name:"Just Retirement"},
      {name:"Kazakhmys"},
      {name:"Keller"},
      {name:"Kennedy Wilson Europe Real Estate"},
      {name:"Kier Group"},
      {name:"Ladbrokes"},
      {name:"Laird"},
      {name:"Lancashire Holdings"},
      {name:"Law Debenture"},
      {name:"LondonMetric Property"},
      {name:"Lonmin"},
      {name:"Man Group"},
      {name:"Marston's"},
      {name:"Melrose"},
      {name:"Mercantile Investment Trust"},
      {name:"Merlin Entertainments"},
      {name:"Michael Page International"},
      {name:"Micro Focus International"},
      {name:"Millennium & Copthorne Hotels"},
      {name:"Mitchells & Butlers"},
      {name:"Mitie"},
      {name:"Moneysupermarket.com Group"},
      {name:"Monks Investment Trust"},
      {name:"Morgan Advanced Materials"},
      {name:"Murray International Trust"},
      {name:"National Express Group"},
      {name:"NB Global"},
      {name:"NMC Health"},
      {name:"Northgate"},
      {name:"Nostrum Oil & Gas"},
      {name:"Ocado Group"},
      {name:"Ophir Energy"},
      {name:"Oxford Instruments"},
      {name:"PZ Cussons"},
      {name:"Pace"},
      {name:"Paragon Group of Companies"},
      {name:"PayPoint"},
      {name:"Pennon Group"},
      {name:"Perpetual Income & Growth Investment Trust"},
      {name:"Personal Assets Trust"},
      {name:"Petra Diamonds"},
      {name:"Petrofac"},
      {name:"Pets at Home"},
      {name:"Phoenix Group Holdings"},
      {name:"Playtech"},
      {name:"Polar Capital Technology Trust"},
      {name:"Polymetal"},
      {name:"Poundland"},
      {name:"Premier Farnell"},
      {name:"Premier Oil"},
      {name:"Provident Financial"},
      {name:"QinetiQ"},
      {name:"RIT Capital Partners"},
      {name:"RPC Group"},
      {name:"RPS Group"},
      {name:"Rank Group"},
      {name:"Rathbone Brothers"},
      {name:"Redefine International"},
      {name:"Redrow"},
      {name:"Regus Group"},
      {name:"Renishaw"},
      {name:"Rentokil Initial"},
      {name:"Restaurant Group"},
      {name:"Rightmove"},
      {name:"Riverstone Energy"},
      {name:"Rotork"},
      {name:"SIG plc"},
      {name:"SSP Group"},
      {name:"SVG Capital"},
      {name:"Saga"},
      {name:"Savills"},
      {name:"Scottish Investment Trust"},
      {name:"Scottish Mortgage Investment Trust"},
      {name:"Segro"},
      {name:"Senior"},
      {name:"Serco"},
      {name:"Shaftesbury"},
      {name:"Smith (DS)"},
      {name:"SOCO International"},
      {name:"Spectris"},
      {name:"Spirax-Sarco Engineering"},
      {name:"Spire Healthcare"},
      {name:"Spirit Pub Company"},
      {name:"St. Modwen Properties"},
      {name:"Stagecoach Group"},
      {name:"Stock Spirits"},
      {name:"SuperGroup"},
      {name:"Synergy Health"},
      {name:"Synthomer"},
      {name:"TSB"},
      {name:"TalkTalk Group"},
      {name:"Tate & Lyle"},
      {name:"Taylor Wimpey"},
      {name:"Ted Baker"},
      {name:"Telecity Group"},
      {name:"Telecom Plus"},
      {name:"Temple Bar Investment Trust"},
      {name:"Templeton Emerging Markets Investment Trust"},
      {name:"Thomas Cook Group"},
      {name:"TR Property Investment Trust"},
      {name:"Tullett Prebon"},
      {name:"UBM"},
      {name:"UDG Healthcare"},
      {name:"UK Commercial Property Trust"},
      {name:"Ultra Electronics Holdings"},
      {name:"Unite Group"},
      {name:"Vedanta Resources"},
      {name:"Vesuvius"},
      {name:"Victrex"},
      {name:"W H Smith"},
      {name:"Wetherspoon (J D)"},
      {name:"William Hill"},
      {name:"Witan Investment Trust"},
      {name:"Wood Group"},
      {name:"Workspace Group"},
      {name:"Worldwide Healthcare Trust"},
      {name:"Zoopla"}];

      return ftse250;
    },
    listFTSE250: function(){
      return ftse250;
    }

  };
}]);

app.factory('FTSE100', [ '$http', function($http){
  var ftse100 = [];
  return {
    fetchFTSE100: function(){
      //Get req we'll use in future
      //$http.get(backendUrl + 'styleBiases.json', {async: true}).success(function(resp){
      //  positions = resp;
      //});
      ftse100 = [
      {name:"3i"},
      {name:"Aberdeen Asset Management",
      symbol:"ADN.L"},
      {name:"Admiral Group"},
      {name:"Aggreko"},
      {name:"Anglo American"},
      {name:"Antofagasta"},
      {name:"ARM Holdings"},
      {name:"Ashtead Group"},
      {name:"Associated British Foods"},
      {name:"AstraZeneca"},
      {name:"Aviva"},
      {name:"Babcock International"},
      {name:"BAE Systems"},
      {name:"Barclays"},
      {name:"Barratt Developments"},
      {name:"BG Group"},
      {name:"BHP Billiton"},
      {name:"BP"},
      {name:"British American Tobacco"},
      {name:"British Land Company"},
      {name:"British Sky Broadcasting Group"},
      {name:"BT Group"},
      {name:"Bunzl"},
      {name:"Burberry Group"},
      {name:"Capita"},
      {name:"Carnival"},
      {name:"Centrica"},
      {name:"Coca-Cola Hellenic"},
      {name:"Compass Group"},
      {name:"CRH"},
      {name:"Diageo"},
      {name:"Direct Line"},
      {name:"Dixons Carphone"},
      {name:"easyJet"},
      {name:"Experian"},
      {name:"Fresnillo"},
      {name:"Friends Life"},
      {name:"G4S"},
      {name:"GKN"},
      {name:"GlaxoSmithKline"},
      {name:"Glencore"},
      {name:"Hammerson"},
      {name:"Hargreaves Lansdown"},
      {name:"HSBC"},
      {name:"Imperial Tobacco"},
      {name:"International Consolidated Airlines Group"},
      {name:"InterContinental Hotels Group"},
      {name:"Intertek Group"},
      {name:"Intu Properties"},
      {name:"ITV"},
      {name:"Johnson Matthey"},
      {name:"Kingfisher"},
      {name:"Land Securities Group"},
      {name:"Legal & General"},
      {name:"Lloyds Banking Group"},
      {name:"London Stock Exchange Group"},
      {name:"Marks & Spencer"},
      {name:"Meggitt"},
      {name:"Mondi"},
      {name:"Wm Morrison Supermarkets"},
      {name:"National Grid"},
      {name:"Next"},
      {name:"Old Mutual"},
      {name:"Pearson"},
      {name:"Persimmon"},
      {name:"Prudential"},
      {name:"Randgold Resources"},
      {name:"Reckitt Benckiser"},
      {name:"Reed Elsevier"},
      {name:"Rio Tinto Group"},
      {name:"Rolls-Royce"},
      {name:"Royal Bank of Scotland Group"},
      {name:"Royal Dutch Shell"},
      {name:"Royal Mail"},
      {name:"RSA Insurance Group"},
      {name:"SABMiller"},
      {name:"Sage Group"},
      {name:"J Sainsbury"},
      {name:"Schroders"},
      {name:"Scottish and Southern Energy"},
      {name:"Severn Trent"},
      {name:"Shire"},
      {name:"Smith & Nephew"},
      {name:"Smiths Group"},
      {name:"Sports Direct"},
      {name:"Standard Chartered Bank"},
      {name:"Standard Life"},
      {name:"St. James's Place"},
      {name:"Taylor Wimpey"},
      {name:"Tesco"},
      {name:"Travis Perkins"},
      {name:"TUI"},
      {name:"Tullow Oil"},
      {name:"Unilever"},
      {name:"United Utilities"},
      {name:"Vodafone"},
      {name:"Weir Group"},
      {name:"Whitbread"},
      {name:"Wolseley"},
      {name:"WPP Group"}];

      return ftse100;
    },
    listFTSE100: function(){
      return ftse100;
    }
  }
}]);

app.factory('Positions', [ '$http', function($http){
  var positions = [];
  return {
    fetchPositions: function(){
      //Get req we'll use in future
      //$http.get(backendUrl + 'positions.json', {async: true}).success(function(resp){
      //  positions = resp;
      //});
      positions = [
      {
        title: "Portfolio Manager",
        state: "registration.portfolioManager"
      },
      {
        title: "Analyst",
        state: "registration.analyst"
      },
      {
        title: "Team Assistant",
        state: "registration.teamAssistant"
      }];

      return positions;
    },
    listPositions: function(){
      return positions;
    }

  };
}]);
app.factory('Countries', [ '$http', function($http){
  var countries = [];
  return {
    fetchCountries: function(){
      //Get req we'll use in future
      //$http.get(backendUrl + 'countries.json', {async: true}).success(function(resp){
      //  countries = resp;
      //});
      countries = [
      {country: "Afghanistan"},
        {country: "Albania"},
        {country: "Algeria"},
        {country: "Andorra"},
        {country: "Angola"},
        {country: "Antigua & Deps"},
        {country: "Argentina"},
        {country: "Armenia"},
        {country: "Australia"},
        {country: "Austria"},
        {country: "Azerbaijan"},
        {country: "Bahamas"},
        {country: "Bahrain"},
        {country: "Bangladesh"},
        {country: "Barbados"},
        {country: "Belarus"},
        {country: "Belgium"},
        {country: "Belize"},
        {country: "Benin"},
        {country: "Bhutan"},
        {country: "Bolivia"},
        {country: "Bosnia Herzegovina"},
        {country: "Botswana"},
        {country: "Brazil"},
        {country: "Brunei"},
        {country: "Bulgaria"},
        {country: "Burkina"},
        {country: "Burundi"},
        {country: "Cambodia"},
        {country: "Cameroon"},
        {country: "Canada"},
        {country: "Cape Verde"},
        {country: "Central African Rep"},
        {country: "Chad"},
        {country: "Chile"},
        {country: "China"},
        {country: "Colombia"},
        {country: "Comoros"},
        {country: "Congo"},
        {country: "Congo {Democratic Rep}"},
        {country: "Costa Rica"},
        {country: "Croatia"},
        {country: "Cuba"},
        {country: "Cyprus"},
        {country: "Czech Republic"},
        {country: "Denmark"},
        {country: "Djibouti"},
        {country: "Dominica"},
        {country: "Dominican Republic"},
        {country: "East Timor"},
        {country: "Ecuador"},
        {country: "Egypt"},
        {country: "El Salvador"},
        {country: "Equatorial Guinea"},
        {country: "Eritrea"},
        {country: "Estonia"},
        {country: "Ethiopia"},
        {country: "Fiji"},
        {country: "Finland"},
        {country: "France"},
        {country: "Gabon"},
        {country: "Gambia"},
        {country: "Georgia"},
        {country: "Germany"},
        {country: "Ghana"},
        {country: "Greece"},
        {country: "Grenada"},
        {country: "Guatemala"},
        {country: "Guinea"},
        {country: "Guinea-Bissau"},
        {country: "Guyana"},
        {country: "Haiti"},
        {country: "Honduras"},
        {country: "Hungary"},
        {country: "Iceland"},
        {country: "India"},
        {country: "Indonesia"},
        {country: "Iran"},
        {country: "Iraq"},
        {country: "Ireland {Republic}"},
        {country: "Israel"},
        {country: "Italy"},
        {country: "Ivory Coast"},
        {country: "Jamaica"},
        {country: "Japan"},
        {country: "Jordan"},
        {country: "Kazakhstan"},
        {country: "Kenya"},
        {country: "Kiribati"},
        {country: "Korea North"},
        {country: "Korea South"},
        {country: "Kosovo"},
        {country: "Kuwait"},
        {country: "Kyrgyzstan"},
        {country: "Laos"},
        {country: "Latvia"},
        {country: "Lebanon"},
        {country: "Lesotho"},
        {country: "Liberia"},
        {country: "Libya"},
        {country: "Liechtenstein"},
        {country: "Lithuania"},
        {country: "Luxembourg"},
        {country: "Macedonia"},
        {country: "Madagascar"},
        {country: "Malawi"},
        {country: "Malaysia"},
        {country: "Maldives"},
        {country: "Mali"},
        {country: "Malta"},
        {country: "Marshall Islands"},
        {country: "Mauritania"},
        {country: "Mauritius"},
        {country: "Mexico"},
        {country: "Micronesia"},
        {country: "Moldova"},
        {country: "Monaco"},
        {country: "Mongolia"},
        {country: "Montenegro"},
        {country: "Morocco"},
        {country: "Mozambique"},
        {country: "Myanmar, {Burma}"},
        {country: "Namibia"},
        {country: "Nauru"},
        {country: "Nepal"},
        {country: "Netherlands"},
        {country: "New Zealand"},
        {country: "Nicaragua"},
        {country: "Niger"},
        {country: "Nigeria"},
        {country: "Norway"},
        {country: "Oman"},
        {country: "Pakistan"},
        {country: "Palau"},
        {country: "Panama"},
        {country: "Papua New Guinea"},
        {country: "Paraguay"},
        {country: "Peru"},
        {country: "Philippines"},
        {country: "Poland"},
        {country: "Portugal"},
        {country: "Qatar"},
        {country: "Romania"},
        {country: "Russian Federation"},
        {country: "Rwanda"},
        {country: "St Kitts & Nevis"},
        {country: "St Lucia"},
        {country: "Saint Vincent & the Grenadines"},
        {country: "Samoa"},
        {country: "San Marino"},
        {country: "Sao Tome & Principe"},
        {country: "Saudi Arabia"},
        {country: "Senegal"},
        {country: "Serbia"},
        {country: "Seychelles"},
        {country: "Sierra Leone"},
        {country: "Singapore"},
        {country: "Slovakia"},
        {country: "Slovenia"},
        {country: "Solomon Islands"},
        {country: "Somalia"},
        {country: "South Africa"},
        {country: "South Sudan"},
        {country: "Spain"},
        {country: "Sri Lanka"},
        {country: "Sudan"},
        {country: "Suriname"},
        {country: "Swaziland"},
        {country: "Sweden"},
        {country: "Switzerland"},
        {country: "Syria"},
        {country: "Taiwan"},
        {country: "Tajikistan"},
        {country: "Tanzania"},
        {country: "Thailand"},
        {country: "Togo"},
        {country: "Tonga"},
        {country: "Trinidad & Tobago"},
        {country: "Tunisia"},
        {country: "Turkey"},
        {country: "Turkmenistan"},
        {country: "Tuvalu"},
        {country: "Uganda"},
        {country: "Ukraine"},
        {country: "United Arab Emirates"},
        {country: "United Kingdom"},
        {country: "United States"},
        {country: "Uruguay"},
        {country: "Uzbekistan"},
        {country: "Vanuatu"},
        {country: "Vatican City"},
        {country: "Venezuela"},
        {country: "Vietnam"},
        {country: "Yemen"},
        {country: "Zambia"},
        {country: "Zimbabwe"}];

      return countries;
    },
    listCountries: function(){
      return countries;
    }

  };
}]);

app.factory('StyleBiases', [ '$http', function($http){
  var styleBiases = [];
  return {
    fetchStyleBiases: function(){
      //Get req we'll use in future
      //$http.get(backendUrl + 'styleBiases.json', {async: true}).success(function(resp){
      //  positions = resp;
      //});
      styleBiases = [
      {
        name: "Growth",
      },
      {
        name: "Value",
      },
      {
        name: "Income",
      },
      {
        name: "GARP",
      },
      {
        name: "Contrarian",
      },
      {
        name: "Momentum",
      }];

      return styleBiases;
    },
    listStyleBiases: function(){
      return styleBiases;
    }

  };
}]);
app.factory('StyleBiases', [ '$http', function($http){
  var styleBiases = [];
  return {
    fetchStyleBiases: function(){
      //Get req we'll use in future
      //$http.get(backendUrl + 'styleBiases.json', {async: true}).success(function(resp){
      //  positions = resp;
      //});
      styleBiases = [
      {
        name: "Growth",
        mName: "growth",
      },
      {
        name: "Value",
        mName: "value",
      },
      {
        name: "Income",
        mName: "income",
      },
      {
        name: "GARP",
        mName: "garp",
      },
      {
        name: "Contrarian",
        mName: "contrarian",
      },
      {
        name: "Momentum",
        mName: "momentum",
      }];

      return styleBiases;
    },
    listStyleBiases: function(){
      return styleBiases;
    }

  };
}]);
app.factory('Sectors', [ '$http', function($http){
  var sectors = [];
  return {
    fetchSectors: function(){
      //Get req we'll use in future
      //$http.get(backendUrl + 'sectors.json', {async: true}).success(function(resp){
      //  positions = resp;
      //});
      sectors = [
      {
        name: "Aerospace & Defense",
        mName: "aerospace_defense",
      },
      {
        name: "Alternative Energy",
        mName: "alternative_energy",
      },
      {
        name: "Automobiles & Parts",
        mName: "automobiles_parts",
      },
      {
        name: "Banks",
        mName: "banks",
      },
      {
        name: "Beverages",
        mName: "beverages",
      },
      {
        name: "Chemicals",
        mName: "chemical",
      },
      {
        name: "Construction & Materials",
        mName: "contruction_materials",
      },
      {
        name: "Electricity",
        mName: "electricity",
      },
      {
        name: "Electronic & Electrical Equipment",
        mName: "electronic_electrical_equipment",
      },
      {
        name: "Equity Investment Instruments",
        mName: "equity_investment_instruments",
      },
      {
        name: "Financial Services",
        mName: "financial_services",
      },
      {
        name: "Fixed Line Telecommunications",
        mName: "fixed_line_telecommunications",
      },
      {
        name: "Food & Drug Retailers",
        mName: "food_drug_retailers",
      },
      {
        name: "Food Producers",
        mName: "food_producers",
      },
      {
        name: "Forestry & Paper",
        mName: "forestry_paper",
      },
      {
        name: "Gas, Water & Multiutilities",
        mName: "gas_water_multiutilities",
      },
      {
        name: "General Industrials",
        mName: "general_industrials",
      },
      {
        name: "General Retailers",
        mName: "general_retailers",
      },
      {
        name: "Health Care Equipment & Services",
        mName: "health_care_equipment_services",
      },
      {
        name: "Household Goods & Home Construction",
        mName: "household_goods_home_construction",
      },
      {
        name: "Industrial Engineering",
        mName: "industrial_engineering",
      },
      {
        name: "Industrial Metals & Mining",
        mName: "industrial_metals_mining",
      },
      {
        name: "Industrial Transportation",
        mName: "insutrial_transportation",
      },
      {
        name: "Leisure Goods",
        mName: "leisure_goods",
      },
      {
        name: "Life Insurance",
        mName: "life_insurance",
      },
      {
        name: "Media",
        mName: "media",
      },
      {
        name: "Mining",
        mName: "mining",
      },
      {
        name: "Mobile Telecommunications",
        mName: "mobile_telecommunications",
      },
      {
        name: "Nonequity Investment Instruments",
        mName: "nonequity_investment_instruments",
      },
      {
        name: "Nonlife Insurance",
        mName: "nonlife_insurance",
      },
      {
        name: "Oil & Gas Producers",
        mName: "oil_gas_producers",
      },
      {
        name: "Oil Equipment, Services & Distribution",
      },
      {
        name: "Personal Goods",
        mName: "personal_goods",
      },
      {
        name: "Pharmaceuticals & Biotechnology",
        mName: "pharmaceuticals_biotechnology",
      },
      {
        name: "Real Estate Investment & Services",
        mName: "real_estate_investment_services",
      },
      {
        name: "Real Estate Investment Trusts",
        mName: "real_estate_investment_trusts",
      },
      {
        name: "Software & Computer Services",
        mName: "software_computer_services",
      },
      {
        name: "Support Services",
        mName: "support_services",
      },
      {
        name: "Technology Hardware & Equipment",
        mName: "technology_hardware_equipment",
      },
      {
        name: "Tobacco",
        mName: "tobacco",
      },
      {
        name: "Travel & Leisure",
        mName: "travel_leisure",
      }];

      return sectors;
    },
    listStyleBiases: function(){
      return sectors;
    }

  };
}]);

app.factory('FTSE250', [ '$http', function($http){
  var ftse250 = [];
  return {
    fetchFTSE250: function(){
      //Get req we'll use in future
      $http.post(backendUrl + '/companies').success(function(resp){
       ftse250 = _.remove(resp, function (n){return n.classification==='FTSE250'}); 
      });

      return ftse250;
    },
    listFTSE250: function(){
      return ftse250;
    }

  };
}]);

app.factory('FTSE100', [ '$http', function($http){
  var ftse100 = [];
  return {
    fetchFTSE100: function(){
      $http.post(backendUrl + '/companies').success(function(resp){
       ftse100 = _.remove(resp, function (n){return n.classification==='FTSE100'}); 
      });
      
      return ftse100;
    },
    listFTSE100: function(){
      return ftse100;
    }

  };
}]);

app.factory('Companies', [ '$http', function($http){
  var companies = [];
  return {
    fetchCompanies: function(){
      return $http.post(backendUrl + '/companies')
    },
    fetchCompaniesSmall: function(){
      return $http.post(backendUrl + '/companies/small')
    },
    fetchCompaniesSmallInvestors: function(){
      return $http.post(backendUrl + '/companies/small/investors')
    },
    fetchCompaniesSmallNotInvestors: function(){
      return $http.post(backendUrl + '/companies/small/not_investors')
    }
  }
}]);

app.factory('Favourites', [ '$rootScope', '$http', function($rootScope, $http){
  var favourites = [];
  return {
    fetchFavourites : function(requested){
      //Get req we'll use in future
      return $http.post(backendUrl + '/favourites', requested)
    },
    saveFavourites : function(data){
      //Get req we'll use in future
      return $http.post(backendUrl + '/favourites/update', data)
    }
  };
}]);

app.factory('Invites', ['$http', function($http){
  var favourites = [];
  return {
    fetchInvestorInvites : function(requested){
      //Get req we'll use in future
      return $http.post(backendUrl + '/invites/companies', requested);
    },
    fetchCompanyInvites : function(requested){
      return $http.post(backendUrl + '/invites/investors', requested);
    }
  };
}]);

app.factory('InvAppointments', ['$http', function($http){
  var favourites = [];
  return {
    fetchAppointments : function(requested){
      //Get req we'll use in future
      return $http.post(backendUrl + '/investor_appointments', requested);
    }
  };
}]);

app.factory('CompanyAppointments', ['$http', function($http){
  var favourites = [];
  return {
    fetchAppointments : function(requested){
      //Get req we'll use in future
      return $http.post(backendUrl + '/company_appointments', requested);
    }
  };
}]);

app.factory('Company', [ '$rootScope', '$http', function($rootScope, $http){
  var company = [];
  return {
    fetchCompany : function(){
      //Get req we'll use in future
      return $http.post(backendUrl + '/company/show', {company_id: $rootScope.$storage.userSesh.companyId})
    }
  };
}]);

app.factory('UsersFromCompany', [ '$rootScope', '$http', function($rootScope, $http){
  return {
    fetchUsers : function(){
      //Get req we'll use in future
      return $http.post(backendUrl + '/users/from_company', {company_id: $rootScope.$storage.userSesh.companyId})
    }
  };
}]);

app.factory('FindUser', [ '$rootScope', '$http', function($rootScope, $http){
  return {
    fetchUser : function(whoToLoad){
      //Get req we'll use in future
      return $http.post(backendUrl + '/user/show', {id: whoToLoad})
    }
  };
}]);

app.factory('AdditionalInfo', [ '$rootScope', '$http', function($rootScope, $http){
  var info = [];
  return {
    fetchAdditionalInfo : function(whoToLoad){
      //Get req we'll use in future
      return $http.post(backendUrl + '/user/show/additional_details', {id: whoToLoad})
    }
  };
}]);

app.factory('Events', [ '$http', '$rootScope', function($http, $rootScope){
  var events = {};
  return { 
    fetchEvents: function (userid, inv) {
      return $http
      .post(backendUrl + '/events', {id: userid, investor: inv})
      .success(function(data){
        events = data;
        $rootScope.$broadcast('eventsLoaded');
      });
    },
    parseEvents: function () {
      events = _.map(events, function(n, key){
        n.startsAt = new Date(n.startsAt);
        return _.mapKeys(n, function(value, key) {
          if (key == "event_type"){
            return key = "type";
          } else {
            return key;
          }
        });
      });
      $rootScope.$broadcast('eventsParsed');
    },
    list: function(){
      return events;
    }
  };
}]);

app.factory('Tags', [ '$rootScope', '$http', function($rootScope, $http){
  var tags = [];
  return {
    fetchTags : function(){
      //Get req we'll use in future
      return $http.post(backendUrl + '/tags')
    }
  };
}]);

app.factory('TagRelations', [ '$rootScope', '$http', function($rootScope, $http){
  return {
    fetchTagRelations : function(whoToLoad){
      //Get req we'll use in future
      return $http.post(backendUrl + '/tags/relations/from_user', {id: whoToLoad})
    },
    fetchAllTagRelations : function(){
      //Get req we'll use in future
      return $http.post(backendUrl + '/tags/relations/')
    }
  };
}]);

app.factory('InvestorUsers', [ '$rootScope', '$http', function($rootScope, $http){
  return {
    fetchInvestorUsers : function(){
      //Get req we'll use in future
      return $http.post(backendUrl + '/users/investors')
    }
  };
}]);

app.factory('Matches', [ '$rootScope', '$http', function($rootScope, $http){
  var matches = [];
  return {
    fetchMatches : function(requested){
      //Get req we'll use in future
      return $http.post(backendUrl + '/matches', requested)
    },
    fetchDashboardMatches: function(requested){
      return $http.post(backendUrl + '/matches_interested', requested)
    },
    saveMatches : function(data){
      //Get req we'll use in future
      return $http.post(backendUrl + '/matches/update', data)
    }
  };
}]);

app.factory('UserMeetingLocations', [ '$rootScope', '$http', function($rootScope, $http){
  var userLocations = [];
  return {
    fetchLocation : function(){
      //Get req we'll use in future
      return $http.post(backendUrl + '/users/meeting_location', {id: $rootScope.$storage.userSesh.companyId})
    }
  };
}]);

// Services
app.service('Session', ['$rootScope', '$localStorage', function($rootScope, $localStorage) {
  this.create = function (user) {
    if (!$rootScope.$storage.userSesh) 
      $rootScope.$storage.userSesh = {};
    $rootScope.$storage.userSesh.token = user.token;
    $rootScope.$storage.userSesh.userId = user.user_id;
    $rootScope.$storage.userSesh.accepted = user.accepted;
    $rootScope.$storage.userSesh.email = user.email;
    $rootScope.$storage.userSesh.firstName = user.firstname;
    $rootScope.$storage.userSesh.surname = user.surname;
    $rootScope.$storage.userSesh.userRole = user.userRole;
    $rootScope.$storage.userSesh.investor = user.investor;
    $rootScope.$storage.userSesh.companyId = user.company_id;
    $rootScope.$storage.userSesh.companyName = user.company_name;
  };
  this.destroy = function () {
    $rootScope.$storage.userSesh = {};
  };
  return this;
}]);
