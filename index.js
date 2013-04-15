"use strict"

var fs = require('fs')
var mysql = require('mysql')
var debug = require('debug')('tiny-migrate')

/**
 * Set connection to use a particular DB.
 *
 * @param {Connection} connection MySQL connection
 * @return {Function} migration function
 * @api public
 */

module.exports = TinyMigrate

function TinyMigrate(connection) {
  if (!(this instanceof TinyMigrate)) return new TinyMigrate(connection)
  this.connection = connection
  this._queue = []
}

TinyMigrate.prototype.use = function use(db, fn) {
  this._db = db
  if (fn) return this.run(fn)
  return this
}

TinyMigrate.prototype.migrate = function migrate(dir, fn) {
  this._dir = dir
  if (fn) return this.run(fn)
  return this
}

TinyMigrate.prototype.drop = function drop(fn) {
  this._drop = true
  if (fn) return this.run(fn)
  return this
}

TinyMigrate.prototype.run = function run(fn) {
  if (!this._db) fn(new Error('DB Required!'))
  if (this._drop) {
    this._enqueue(dropDB.bind(null, this.connection, this._db))
  }

  this._enqueue(createDB.bind(null, this.connection, this._db))
  this._enqueue(useDB.bind(null, this.connection, this._db))
  if (this._dir) this._enqueue(migrate.bind(null, this.connection, this._dir))

  var exec = fnSeries.bind(null, this._queue)
  exec(fn)
  return exec
}

TinyMigrate.prototype._enqueue = function _enqueue(fn) {
  this._queue.push(fn)
}

function fnSeries(queue, fn) {
  var next = queue.shift()
  if (!next) return fn()
  next(function(err) {
    if (err) return fn(err)
    fnSeries(queue, fn)
  })
}

/**
 * Drop DB.
 *
 * @param {Connection} connection MySQL connection
 * @param {String} name DB name
 * @param {Function} fn callback
 * @api private
 */

function dropDB(connection, name, fn) {
  var query = 'DROP DATABASE IF EXISTS `'+ name +'`;'
  debug(query)
  connection.query(query, fn)
}

/**
 * Set connection to use a particular DB.
 *
 * @param {Connection} connection MySQL connection
 * @param {String} name DB name
 * @param {Function} fn callback
 * @api private
 */

function createDB(connection, name, fn) {
  var query = 'CREATE DATABASE IF NOT EXISTS `'+name+'`;'
  debug(query)
  connection.query(query, fn)
}

/**
 * Set connection to use a particular DB.
 *
 * @param {Connection} connection MySQL connection
 * @param {String} name DB name
 * @param {Function} fn callback
 * @api private
 */

function useDB(connection, name, fn) {
  var query = 'USE `'+ name +'`;'
  debug(query)
  connection.query(query, fn)
}

function migrate(connection, dir, fn) {
  var query = concatSQL(dir)
  debug('migrating...' + ' Query length: ' + query.length)
  connection.query(query, fn)
}

/**
 * Concatenate all .sql files to single sql string.
 *
 * @param {String} dir directory name
 * @return {String}
 * @api private
 */

function concatSQL(dir) {
  return fs.readdirSync(dir, 'utf8')
    // get .sql files
    .filter(function(file) {
      var extParts = file.split('.');
      var ext = extParts[extParts.length-1]
      return ext === 'sql'
    })
    // sort by version
    .sort()
    // load sql
    .map(function(file) {
      return fs.readFileSync([dir, file].join('/'), 'utf8')
    })
    // concat
    .reduce(function(previous, current) {
      return previous + current
    }, '')
}

