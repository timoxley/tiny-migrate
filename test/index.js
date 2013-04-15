"use strict"

var mysql = require('mysql')
var assert = require('assert')

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  multipleStatements: true
});

var migration = require('../')(connection)

var DIR = __dirname + '/fixtures/sql'
var DB = 'tinymigrate'

function flush(fn) {
  connection.query('DROP DATABASE IF EXISTS `'+ DB +'`;', fn) 
}

before(connection.connect.bind(connection))
before(flush)
afterEach(flush)

describe('migrate', function() {
  describe('DB does not exist', function() {

    beforeEach(function(done) {
      migration
      .use(DB)
      .migrate(DIR)
      .run(done)
    })

    it('creates DB if it does not exist', function(done) {
      connection.query('SHOW DATABASES;', function(err, result) {
        assert.ifError(err)
        // ensure contains our newly created DB
        assert.ok(result.filter(function(db) {
          return db.Database === DB
        }).length)
        done()
      })
    })

    it('uses DB', function(done) {
      connection.query('SELECT DATABASE();', function(err, result) {
        assert.ifError(err)
        assert.equal(result[0]['DATABASE()'], DB)
        done()
      })
    })
  })

  it('takes a directory and a database name, then runs all the .sql files in it, in order', function(done) {
    migration
    .use(DB)
    .drop()
    .migrate(DIR)
    .run(function(err) {
      assert.ifError(err)
      connection.query('DESCRIBE Users', function(err, result) {
        assert.ifError(err)
        assert.deepEqual(result, require('./fixtures/expected.json'))
        done()
      })
    })
  })
})
