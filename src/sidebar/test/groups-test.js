'use strict';

var events = require('../events');
var groups = require('../groups');

// Return a mock session service containing three groups.
var sessionWithThreeGroups = function() {
  return {
    state: {},
  };
};

describe('groups', function() {
  var fakeAnnotationUI;
  var fakeSession;
  var fakeStore;
  var fakeLocalStorage;
  var fakeRootScope;
  var fakeServiceUrl;
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    fakeAnnotationUI = {
      searchUris: sinon.stub().returns(['http://example.org']),
    };
    fakeSession = sessionWithThreeGroups();
    fakeLocalStorage = {
      getItem: sandbox.stub(),
      setItem: sandbox.stub(),
    };
    fakeRootScope = {
      eventCallbacks: [],

      $broadcast: sandbox.stub(),

      $on: function(event, callback) {
        if (event === events.GROUPS_CHANGED) {
          this.eventCallbacks.push(callback);
        }
      },
    };
    fakeStore = {
      group: {
        member: {
          delete: sandbox.stub().returns(Promise.resolve()),
        },
      },
      groups: {
        list: sandbox.stub().returns(Promise.resolve([
          {name: 'Group 1', id: 'id1'},
          {name: 'Group 2', id: 'id2'},
          {name: 'Group 3', id: 'id3'},
        ])),
      },
    };
    fakeServiceUrl = sandbox.stub();
  });

  afterEach(function () {
    sandbox.restore();
  });

  function service() {
    return groups(fakeAnnotationUI, fakeLocalStorage, fakeServiceUrl, fakeSession,
      fakeRootScope, fakeStore);
  }

  describe('.all()', function() {
    it('returns no groups if there are none in the session', function() {
      fakeSession = {state: {}};

      var groups = service().all();

      assert.equal(groups.length, 0);
    });

    it('returns the groups when there are some', function() {
      var svc = service();

      return svc.load().then(() => {
        var groups = svc.all();
        assert.equal(groups.length, 3);
        assert.deepEqual(groups, [
          {name: 'Group 1', id: 'id1'},
          {name: 'Group 2', id: 'id2'},
          {name: 'Group 3', id: 'id3'},
        ]);
      });
    });
  });

  describe('.load() method', function() {
    it('loads all available groups', function() {
      var svc = service();

      return svc.load().then(() => {
        assert.equal(svc.all().length, 3);
      });
    });
  });

  describe('.get() method', function() {
    it('returns the requested group', function() {
      var svc = service();

      return svc.load().then(() => {
        var group = svc.get('id2');
        assert.equal(group.id, 'id2');
      });
    });

    it("returns null if the group doesn't exist", function() {
      var svc = service();

      return svc.load().then(() => {
        var group = svc.get('foobar');
        assert.isNull(group);
      });
    });
  });

  describe('.focused() method', function() {
    it('returns the focused group', function() {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id2');
        assert.equal(svc.focused().id, 'id2');
      });
    });

    it('returns the first group initially', function() {
      var svc = service();

      return svc.load().then(() => {
        assert.equal(svc.focused().id, 'id1');
      });
    });

    it('returns the group selected in localStorage if available', function() {
      fakeLocalStorage.getItem.returns('id3');
      var svc = service();

      return svc.load().then(() => {
        assert.equal(svc.focused().id, 'id3');
      });
    });
  });

  describe('.focus()', function() {
    it('sets the focused group to the named group', function() {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id2');

        assert.equal(svc.focused().id, 'id2');
      });
    });

    it('does nothing if the named group isn\'t recognised', function() {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('foobar');

        assert.equal(svc.focused().id, 'id1');
      });
    });

    it('stores the focused group id in localStorage', function() {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id3');

        assert.calledWithMatch(fakeLocalStorage.setItem, sinon.match.any, 'id3');
      });
    });

    it('emits the GROUP_FOCUSED event if the focused group changed', function () {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id3');
        assert.calledWith(fakeRootScope.$broadcast, events.GROUP_FOCUSED, 'id3');
      });
    });

    it('does not emit GROUP_FOCUSED if the focused group did not change', function () {
      var svc = service();
      return svc.load().then(() => {
        svc.focus('id3');
        fakeRootScope.$broadcast = sinon.stub();
        svc.focus('id3');
        assert.notCalled(fakeRootScope.$broadcast);
      });
    });
  });

  describe('.leave()', function () {
    it('should call the group leave API', function () {
      var s = service();
      return s.leave('id2').then(() => {
        assert.calledWithMatch(fakeStore.group.member.delete, {
          pubid: 'id2',
          user: 'me',
        });
      });
    });
  });
});
