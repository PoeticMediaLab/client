'use strict';

var fakeStore = require('../../test/fake-redux-store');
var stateUtil = require('../state-util');

describe('state-util', function () {
  var number;

  beforeEach(function() {
    number = fakeStore({ val: 0 });
  });

  describe('awaitStateChange()', function () {
    function findNum(store) {
      if (store.getState().val < 3) {
        return null;
      }
      return store.getState().val;
    }

    it('should return promise that resolve to a non-null value', function () {
      var expected = 5;

      number.setState({ val: 5 });

      return stateUtil.awaitStateChange(number, findNum).then(function (actual) {
        assert.equal(actual, expected);
      });
    });

    it('should wait for state change from a null value to a non-null value', function () {
      var expected = 5;

      number.setState({ val: 1 });
      number.setState({ val: 5 });

      return stateUtil.awaitStateChange(number, findNum).then(function (actual) {
        assert.equal(actual, expected);
      });
    });
  });
});
