
[![Join the chat at https://gitter.im/sack-vfs/Lobby](https://badges.gitter.im/sack-vfs/gun-db.svg)](https://gitter.im/sack-vfs/gun-db?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# gun.db
ODBC/Sqlite native persistence layer for [gun](https://github.com/amark/gun)! GUN is an Open Source Firebase with swappable storage engines (level, SQLite, etc.) that handles data synchronization across machines / devices.


Get it by

`npm install gun-db`

Use by

```javascript
var Gun = require('gun');
require('gun-db');

var gun = Gun({
  file: false // turn off pesky file.js data.json default
  , db: {
    file: "gun.db"
    exclusive : false // default
  }
});
```

If you want to have maximum speed, you can set exclusive, which will gain about 30-40% speed; but you're only allowed one instance of Gun against this database.
You can open multiple instances if they don't have the same database name.

Check the gun docs on how to read/write data, it will then handle sync automatically for you (even to the browser!). Tip: It is a graph database, so you can do key/value, document, relational, or graph based data - here is a [crash course](https://github.com/amark/gun/wiki/graphs) on how to use it.

Enjoy!

Or: Complain about bugs. :)


# notes
   If the filename is '*.db' it defaults to sqlite if it's not it tries it as a DSN (data source name) and then if that doesn't work falls back to use sqlite filename.
   ODBC can be provided by providing unixodbc on linux, but requires modifying the build to enable; it  is by default only enabled for windows.

   It also ends up writing a sql.config file somewhere ... there's options you can set there to enable sql logging (optionally with data returned) which goes to stderr
     under windows this goes to (/programdata/freedom collective/node/...) probably.  If your node.exe is not what your running it will be in a folder that is whatever the program name is minus the last (.*)
     under not windows it probably just goes to ~
     
## VFS Usage

This is an example of how to open the sqlite database in a virtual filesystem storage; the access to the sqlite database 
is then memory mapped.

```
var vfs = require( "sack.vfs" );
var vol = vfs.Volume( "MountName", "vfsFile.dat" );

var Gun = require('gun');
require('gun-db');

var gun = Gun({
  file: false // turn off pesky file.js data.json default
  , db: {
    file: "$sack@MountName$gun.db"
  }
});

/* ... your appcode ... */

```


# Changelog
- 1.0.566 for very large nodes, batch results into a single 'in' to gun.
- 1.0.565 disable exclusive by default; add option to enable it
- 1.0.564 test sqlite database without exclusive, but with URI filename and nolock option.
- 1.0.563 remove excess logging
- 1.0.562 store json string in data  otherwise simple number types come back as numbers and not strings (invalid graph! error)
- 1.0.561 fix last minute typo
- 1.0.56 fix writing null value and relation; fixed relation restore; remove unused code; optimize existance check
- 1.0.55 More cleanup; if database open fails, don't register handlers.
- 1.0.54 fixed typo
- 1.0.53 a little cleanup; move varibes to closure (bad debug typo)
- 1.0.52 remove noisy logging when record already up to date; post reply acking the transation.
- 1.0.51 Update docs; add gitter badge
- 1.0.4 fix excessively slow load; misported from sqlite.gun.
- 1.0.3 fix database performance options.
- 1.0.2 update to Gun 0.8.3
- 1.0.1 First usable version







(sqlite, native filesystem, windows)
__ Small Nodes: 10 Properties Each __
Write 10000 nodes: : 19841ms; 19.841s; 1.984 ms/node; errors: 0.
Read 10000 nodes: : 7690ms; 7.69s; 0.769 ms/node; errors: 0.
Update 10000 nodes: : 22273ms; 22.273s; 2.227 ms/node; errors: 0.
Update single field on 10000 nodes: : 3215ms; 3.215s; 0.321 ms/node; errors: 0.
__ Medium Nodes: 1000 Properties Each __
Write 100 nodes: : 18155ms; 18.155s; 179.752 ms/node; errors: 0.
Read 100 nodes: : 15554ms; 15.554s; 154.000 ms/node; errors: 0.
Update 100 nodes: : 21044ms; 21.044s; 208.356 ms/node; errors: 0.
Update single field on 100 nodes: : 245ms; 0.245s; 2.426 ms/node; errors: 0.
__ Large Nodes: 10000 Properties Each __
Write 10 nodes: : 20773ms; 20.773s; 1888.455 ms/node; errors: 0.
Read 10 nodes: : 17342ms; 17.342s; 1576.545 ms/node; errors: 0.
Update 10 nodes: : 22796ms; 22.796s; 2072.364 ms/node; errors: 0.
Update single field on 10 nodes: : 1919ms; 1.919s; 174.455 ms/node; errors: 0.


(sqlite, vfs)
__ Small Nodes: 10 Properties Each __
Write 10000 nodes: : 11667ms; 11.667s; 1.167 ms/node; errors: 0.
Read 10000 nodes: : 7086ms; 7.086s; 0.709 ms/node; errors: 0.
Update 10000 nodes: : 13439ms; 13.439s; 1.344 ms/node; errors: 0.
Update single field on 10000 nodes: : 2530ms; 2.53s; 0.253 ms/node; errors: 0.
__ Medium Nodes: 1000 Properties Each __
Write 100 nodes: : 12935ms; 12.935s; 128.069 ms/node; errors: 0.
Read 100 nodes: : 5792ms; 5.792s; 57.347 ms/node; errors: 0.
Update 100 nodes: : 16061ms; 16.061s; 159.020 ms/node; errors: 0.
Update single field on 100 nodes: : 200ms; 0.2s; 1.980 ms/node; errors: 0.
__ Large Nodes: 10000 Properties Each __
Write 10 nodes: : 16134ms; 16.134s; 1466.727 ms/node; errors: 0.
Read 10 nodes: : 7653ms; 7.653s; 695.727 ms/node; errors: 0.
Update 10 nodes: : 21076ms; 21.076s; 1916.000 ms/node; errors: 0.
Update single field on 10 nodes: : 1962ms; 1.962s; 178.364 ms/node; errors: 0.


(sqlite, vfs, with encryption)
__ Small Nodes: 10 Properties Each __
Write 10000 nodes: : 14899ms; 14.899s; 1.490 ms/node; errors: 0.
Read 10000 nodes: : 7301ms; 7.301s; 0.730 ms/node; errors: 0.
Update 10000 nodes: : 18248ms; 18.248s; 1.825 ms/node; errors: 0.
Update single field on 10000 nodes: : 3224ms; 3.224s; 0.322 ms/node; errors: 0.
__ Medium Nodes: 1000 Properties Each __
Write 100 nodes: : 20645ms; 20.645s; 204.406 ms/node; errors: 0.
Read 100 nodes: : 5952ms; 5.952s; 58.931 ms/node; errors: 0.
Update 100 nodes: : 27732ms; 27.732s; 274.574 ms/node; errors: 0.
Update single field on 100 nodes: : 350ms; 0.35s; 3.465 ms/node; errors: 0.
__ Large Nodes: 10000 Properties Each __
Write 10 nodes: : 28288ms; 28.288s; 2571.636 ms/node; errors: 0.
Read 10 nodes: : 9496ms; 9.496s; 863.273 ms/node; errors: 0.
Update 10 nodes: : 37709ms; 37.709s; 3428.091 ms/node; errors: 0.
Update single field on 10 nodes: : 3587ms; 3.587s; 326.091 ms/node; errors: 0.

