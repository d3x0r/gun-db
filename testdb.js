

var Gun = require( "gun/gun" );
var gunNot = require('gun/lib/not')
var gunDb = require( "." );

//var vfs = require( "sack.vfs" );
//var vol = vfs.Volume( "Mount", "data.vfs" );
//var gun = new Gun( { db:{ file:'$sack@Mount$gun.db' } } );

var gun = new Gun( /*{ db:{ file:'gun.db' } }*/ );

console.log( new Date(), "Initialized gun instance" );
var root = gun.get( "db" );

console.log( new Date(), "got root db" );

var notStart = Date.now();
root.not( ()=>{
	console.log( "not happened." );
	root.put( { hello:"world" } );
	root.put( { other:"test" } );
	root.set( { field: "randomkey" } );
	root.set( { field: "randomkey" } );
	root.set( { field: "randomkey" } );
} );
console.log( "waited in not?", Date.now() - notStart );

var count = 0;
var start = Date.now();
var first = false;

var done = false;
function showItems() {
	console.log( new Date(), "Got", count, "items" );
	//dumpDatabase();
	if( !done )
		setTimeout( showItems, 1000 );
}
timeout = setTimeout( showItems, 100 );
var timeout;
var tick = Date.now();
console.log( new Date(), "marked tick." );
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


