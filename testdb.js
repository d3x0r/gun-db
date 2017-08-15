

var Gun = require( "gun/gun" );
var gunNot = require('gun/lib/not')
var gunDb = require( "." );

//var vfs = require( "sack.vfs" );
//var vol = vfs.Volume( "Mount", "data.vfs"/*, "key1", "key2"*/ );
//var gun = new Gun( { db:{ file:'$sack@Mount$gun.db' } } );

var gun = new Gun( /*{ db:{ file:'gun.db' } }*/ );

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

var done = false;
function showItems() {
	console.log( new Date(), "Got", count, "items" );
	//dumpDatabase();
	if( !done )
		setTimeout( showItems, 1000 );
}
timeout = setTimeout( showItems, 1000 );
var timeout;
var tick = Date.now();
var _n = 0;
var gotHello = false;
root.map( (field,val)=>{ 
	if( !first ) {
		console.log( "first map in ", Date.now() - start );
		first = true;
	}
	count++;
	if( count % 3000 === 0 ) console.log( new Date(), "count:", count );
	//console.log( "Got:", val, field ) 
	if( val == "hello" && !gotHello ) {
		gotHello = true;
		console.log( new Date(), "Got:", val, field ) 
		for( var n = 0; n < 30000; n++ ) {
			if( (n % 1000) === 0 ) {
				console.log( new Date(), "new items:", n , Date.now() - tick, (n-_n)/(Date.now() - tick) );
				tick = Date.now();
				_n = n;
			}
			root.set( { field: "randomkey" }  );
		}
		done = true;
	}
} )


