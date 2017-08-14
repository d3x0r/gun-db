

var Gun = require( "gun/gun" );
var gunNot = require('gun/lib/not')
var gunDb = require( "." );

var gun = new Gun( { db:{ file:'gun.db' } } );

var root = gun.get( "db" );

root.not( ()=>{
	console.log( "not happened." );
	root.put( { hello:"world" } );
	root.put( { other:"test" } );
	root.set( { field: "randomkey" } );
	root.set( { field: "randomkey" } );
	root.set( { field: "randomkey" } );
} );

var count = 0;
var start = Date.now();
var first = false;

function dumpDatabase() {
	var vfs = require( "sack.vfs" );
	var db = vfs.Sqlite( "gun.db" );
	var tables = db.do( "select tbl_name from sqlite_master where type='table'" );
	console.log( "Tables:", tables );
	var records = db.do( "select * from record" );
	console.log( "records:" );
	records.forEach( rec=>{ 
		console.log( `   ${rec.soul} ${rec.field} ${rec.value} ${rec.relation} ${rec.state}` );
	} );
	
}

function showItems() {
	console.log( "Got", count, "items" );
	dumpDatabase();
}
var timeout;
root.map( (field,val)=>{ 
	if( !first ) {
		console.log( "first map in ", Date.now() - start );
		first = true;
	}
	count++;
	if( timeout )
		clearTimeout( timeout );
	timeout = setTimeout( showItems, 100 );
	//console.log( "Got:", val, field ) 
	if( val == "hello" ) {
		for( var n = 0; n < 10; n++ )
			root.set( { field: "randomkey" } );
	}
} )


