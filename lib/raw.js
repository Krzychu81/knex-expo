'use strict';

exports.__esModule = true;

var _isNumber2 = require('lodash/isNumber');

var _isNumber3 = _interopRequireDefault(_isNumber2);

var _isUndefined2 = require('lodash/isUndefined');

var _isUndefined3 = _interopRequireDefault(_isUndefined2);

var _isObject2 = require('lodash/isObject');

var _isObject3 = _interopRequireDefault(_isObject2);

var _isPlainObject2 = require('lodash/isPlainObject');

var _isPlainObject3 = _interopRequireDefault(_isPlainObject2);

var _reduce2 = require('lodash/reduce');

var _reduce3 = _interopRequireDefault(_reduce2);

var _assign2 = require('lodash/assign');

var _assign3 = _interopRequireDefault(_assign2);

var _inherits = require('inherits');

var _inherits2 = _interopRequireDefault(_inherits);

var _helpers = require('./helpers');

var helpers = _interopRequireWildcard(_helpers);

var _events = require('events');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _formatter = require('./formatter');

var _formatter2 = _interopRequireDefault(_formatter);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Raw
// -------
var debugBindings = (0, _debug2.default)('knex:bindings');

var fakeClient = {
  formatter: function formatter(builder) {
    return new _formatter2.default(fakeClient, builder);
  }
};

function Raw() {
  var client = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : fakeClient;

  this.client = client;

  this.sql = '';
  this.bindings = [];

  // Todo: Deprecate
  this._wrappedBefore = undefined;
  this._wrappedAfter = undefined;
  this._debug = client && client.config && client.config.debug;
}
(0, _inherits2.default)(Raw, _events.EventEmitter);

(0, _assign3.default)(Raw.prototype, {
  set: function set(sql, bindings) {
    this.sql = sql;
    this.bindings = (0, _isObject3.default)(bindings) && !bindings.toSQL || (0, _isUndefined3.default)(bindings) ? bindings : [bindings];

    return this;
  },
  timeout: function timeout(ms) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        cancel = _ref.cancel;

    if ((0, _isNumber3.default)(ms) && ms > 0) {
      this._timeout = ms;
      if (cancel) {
        this.client.assertCanCancelQuery();
        this._cancelOnTimeout = true;
      }
    }
    return this;
  },


  // Wraps the current sql with `before` and `after`.
  wrap: function wrap(before, after) {
    this._wrappedBefore = before;
    this._wrappedAfter = after;
    return this;
  },


  // Calls `toString` on the Knex object.
  toString: function toString() {
    return this.toQuery();
  },


  // Returns the raw sql for the query.
  toSQL: function toSQL(method, tz) {
    var obj = void 0;
    var formatter = this.client.formatter(this);

    if (Array.isArray(this.bindings)) {
      obj = replaceRawArrBindings(this, formatter);
    } else if (this.bindings && (0, _isPlainObject3.default)(this.bindings)) {
      obj = replaceKeyBindings(this, formatter);
    } else {
      obj = {
        method: 'raw',
        sql: this.sql,
        bindings: (0, _isUndefined3.default)(this.bindings) ? [] : [this.bindings]
      };
    }

    if (this._wrappedBefore) {
      obj.sql = this._wrappedBefore + obj.sql;
    }
    if (this._wrappedAfter) {
      obj.sql = obj.sql + this._wrappedAfter;
    }

    obj.options = (0, _reduce3.default)(this._options, _assign3.default, {});

    if (this._timeout) {
      obj.timeout = this._timeout;
      if (this._cancelOnTimeout) {
        obj.cancelOnTimeout = this._cancelOnTimeout;
      }
    }

    obj.bindings = obj.bindings || [];
    if (helpers.containsUndefined(obj.bindings)) {
      debugBindings(obj.bindings);
      throw new Error('Undefined binding(s) detected when compiling RAW query: ' + obj.sql);
    }

    obj.__knexQueryUid = _uuid2.default.v4();

    return obj;
  }
});

function replaceRawArrBindings(raw, formatter) {
  var expectedBindings = raw.bindings.length;
  var values = raw.bindings;
  var index = 0;

  var sql = raw.sql.replace(/\\?\?\??/g, function (match) {
    if (match === '\\?') {
      return match;
    }

    var value = values[index++];

    if (match === '??') {
      return formatter.columnize(value);
    }
    return formatter.parameter(value);
  });

  if (expectedBindings !== index) {
    throw new Error('Expected ' + expectedBindings + ' bindings, saw ' + index);
  }

  return {
    method: 'raw',
    sql: sql,
    bindings: formatter.bindings
  };
}

function replaceKeyBindings(raw, formatter) {
  var values = raw.bindings;
  var sql = raw.sql;


  var regex = /\\?(:(\w+):(?=::)|:(\w+):(?!:)|:(\w+))/g;
  sql = raw.sql.replace(regex, function (match, p1, p2, p3, p4) {
    if (match !== p1) {
      return p1;
    }

    var part = p2 || p3 || p4;
    var key = match.trim();
    var isIdentifier = key[key.length - 1] === ':';
    var value = values[part];

    if (value === undefined) {
      if (values.hasOwnProperty(part)) {
        formatter.bindings.push(value);
      }

      return match;
    }

    if (isIdentifier) {
      return match.replace(p1, formatter.columnize(value));
    }

    return match.replace(p1, formatter.parameter(value));
  });

  return {
    method: 'raw',
    sql: sql,
    bindings: formatter.bindings
  };
}

// Allow the `Raw` object to be utilized with full access to the relevant
// promise API.
require('./interface')(Raw);
helpers.addQueryContext(Raw);

exports.default = Raw;
module.exports = exports['default'];