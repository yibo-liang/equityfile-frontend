# EquityFile Frontend
## Work flow

When working on the frontend you work on the files in the src file path, there you may split up each of different aspects of angularJS into different files; controllers, config (states), directives and factories. Once you have finished working on your files in the src file path, these will be concatenated into files and placed in the build directory. Do not make changes to files in the build directory, only work from the src directory.

## Setup

Gulp has been setup as our task manager of choice, gulp shall watch our files in src and concatenate them into build, gulp shall then server up these files to localhost:9000. To run gulp use the following command:
`gulp`

Please run this command in the applications root directory.

To exit gulp please use the following keyboard combination: `Ctrl + C`

## Testing

Tests are written in Jasmine on the front end and are ran with Karma, currently Karma is configured to test on google chrome by default, write your tests and test them on either google chrome or firefox primarily, then before giving the final push to a branch and creating a pull request, edit your karma config to test across Google chrome, firefox and safari.

To run the tests please use: `karma start karma.conf.js`