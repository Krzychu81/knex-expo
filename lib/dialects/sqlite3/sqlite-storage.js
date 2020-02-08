'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _clone2 = require('lodash/clone');

var _clone3 = _interopRequireDefault(_clone2);

var _map2 = require('lodash/map');

var _map3 = _interopRequireDefault(_map2);

var _expoSqlite = require('expo-sqlite');

var SQLite = _interopRequireWildcard(_expoSqlite);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (_ClientSQLite) {
  (0, _inherits3.default)(ClientReactNativeSqliteStorage, _ClientSQLite);

  // dialect: 'sqlite';
  // driverName = 'expo-sqlite-storage';
  function ClientReactNativeSqliteStorage() {
    (0, _classCallCheck3.default)(this, ClientReactNativeSqliteStorage);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _this = (0, _possibleConstructorReturn3.default)(this, _ClientSQLite.call.apply(_ClientSQLite, [this].concat(args)));

    _this.dialect = 'sqlite';
    _this.driverName = 'expo-sqlite-storage';
    return _this;
  }

  ClientReactNativeSqliteStorage.prototype._driver = function _driver() {
    // eslint-disable-line class-methods-use-this
    return SQLite;
  };

  ClientReactNativeSqliteStorage.prototype.acquireRawConnection = function acquireRawConnection() {
    console.log(this.connectionSettings.filename);
    var conn = _bluebird2.default.cast(SQLite.openDatabase(this.connectionSettings.filename, 1, '', 0));
    return conn;
  };

  ClientReactNativeSqliteStorage.prototype.destroyRawConnection = function destroyRawConnection(db) {
    var _this2 = this;

    db.close().catch(function (err) {
      _this2.emit('error', err);
    });
  };

  ClientReactNativeSqliteStorage.prototype._query = function _query(connection, obj) {
    // eslint-disable-line class-methods-use-this
    if (!connection) return _bluebird2.default.reject(new Error('No connection provided.'));

    return new _bluebird2.default(function (resolve, reject) {
      connection.transaction(function (tx) {
        tx.executeSql(obj.sql, obj.bindings, function (_, info) {
          obj.response = (0, _assign2.default)({}, info, {
            rows: info.rows._array
          });
          obj.response = info;
          resolve(obj);
        }, function (_, error) {
          return reject(error);
        });
      });
    });
  };

  ClientReactNativeSqliteStorage.prototype._stream = function _stream(connection, sql, stream) {
    var client = this;
    return new _bluebird2.default(function (resolve, reject) {
      stream.on('error', reject);
      stream.on('end', resolve);
      return client // eslint-disable-line no-underscore-dangle
      ._query(connection, sql).then(function (obj) {
        return client.processResponse(obj);
      }).map(function (row) {
        return stream.write(row);
      }).catch(function (err) {
        return stream.emit('error', err);
      }).then(function () {
        return stream.end();
      });
    });
  };

  ClientReactNativeSqliteStorage.prototype.processResponse = function processResponse(obj, runner) {
    // eslint-disable-line class-methods-use-this
    var resp = obj.response;
    if (obj.output) return obj.output.call(runner, resp);
    switch (obj.method) {
      case 'pluck':
      case 'first':
      case 'select':
        {
          var results = [];
          for (var i = 0, l = resp.rows.length; i < l; i++) {
            results[i] = (0, _clone3.default)(resp.rows.item(i));
          }
          if (obj.method === 'pluck') results = (0, _map3.default)(results, obj.pluck);
          return obj.method === 'first' ? results[0] : results;
        }
      case 'insert':
        return [resp.insertId];
      case 'delete':
      case 'update':
      case 'counter':
        return resp.rowsAffected;
      default:
        return resp;
    }
  };

  return ClientReactNativeSqliteStorage;
}(_index2.default);
// eslint-disable-next-line