
var vfs = require( "sack.vfs" );
function dumpDatabase() {
	var vfs = require( "sack.vfs" );
	var db = vfs.Sqlite( "gun.db" );
	var tables = db.do( "select tbl_name from sqlite_master where type='table'" );
	console.log( "Tables:", tables );
	var records = db.do( "select * from record" );
	console.log( "records:" );
	records.forEach( rec=>{ 
		console.log( `   s:${rec.soul} f:${rec.field} v:${rec.value} r:${rec.relation} s:${rec.state}` );
	} );
	
}

dumpDatabase()