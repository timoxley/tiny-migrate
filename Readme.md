# tiny-migrate

Naive sql migrations. Just supply a directory of versioned/numbered .sql files,
and it will run them in order.

## Example

```js
var Migrate = require('tiny-migrate')
var mysql = require('mysql')

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'me',
  password : 'secret',
});

connection.connect(function(err) {
  var connection = mysql.createConnection
  var migration = Migrate(connection)
  migration
    .use('some-database') // Db will be created if it doesn't exist
    .drop() // drop db before creation
    .migrate('db/migrations') // relative path to migrations
    .run(function(err) {
      console.log('Migration complete:', arguments)
    }) 
})
```
