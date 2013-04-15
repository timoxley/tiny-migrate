"use strict"

var fs = require('fs')
var mysql = require('mysql')

/**
 * Set connection to use a particular DB.
 *
 * @param {Connection} connection MySQL connection
 * @return {Function} migration function
 * @api public
 */

module.exports = function(connection) {
  return new TinyMigrate(connection)
  //return function (options, fn) {
    //options = options || {}
    //var connection = options.connection
    //var name = options.name

    //var flush = options.flush || false
    //if (flush) {
      //dropDB(function(err) {
        //if (err) return fn(err)
        //migrate(fn)
      //})
    //} else {
      //migrate(fn)
    //}

    //function migrate(fn) {
      //createDB(connection, name, function(err) {
        //if (err) return fn(err)
          //useDB(connection, name, function(err) {
            //if (err) return fn(err)
              //connection.query(concatSQL(dir), fn)
          //})
      //}) 
    //}
  //}
}

function TinyMigrate(connection) {
  if (!(this instanceof TinyMigrate)) return new TinyMigrate(db)
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

TinyMigrate.prototype.flush = function flush(fn) {
  this._flush = true
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
  this._enqueue(migrate.bind(null, this.connection, this._dir))

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
  connection.query('DROP DATABASE IF EXISTS `'+ name +'`;', fn) 
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
  connection.query('CREATE DATABASE IF NOT EXISTS `'+name+'`;', fn)
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
  connection.query('USE `'+ name +'`;', fn)
}

function migrate(connection, dir, fn) {
  connection.query(concatSQL(dir), fn)
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
