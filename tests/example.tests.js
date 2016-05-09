describe('exampleController', function(){
  var scope;//we'll use this scope in our tests

  // //mock Application to allow us to inject our own dependencies
  // beforeEach(angular.mock.module('App'));
  // //mock the controller for the same reason and include $rootScope and $controller
  // beforeEach(angular.mock.inject(function($rootScope, $controller){
  //     //create an empty scope
  //     scope = $rootScope.$new();
  //     //declare the controller and inject our empty scope
  //     $controller('applicationController', {$scope: scope});
  // });

  // tests start here
  // it('should have variable currentUser = null', function(){
  //     expect(scope.currentUser).toBe(null);
  // });
  it('should allow true to be true', function(){
    expect(true).toBe(true);
  });
});