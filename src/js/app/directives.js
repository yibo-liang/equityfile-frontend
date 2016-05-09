app.directive('ngNavBar', function(){
  return {
    restrict: 'A',
    templateUrl: 'templates/nav-bar-template.html',
    replace: true,
    transclude: true,
  };
});


app.directive('ngFooter', function(){
  return {
    restrict: 'A',
    templateUrl: 'templates/footer-template.html',
    replace: true,
    transclude: true,
  };
});
