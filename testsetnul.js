

var add = false;
var del = false;
if( process.argv[2] == "add" )
	add = true;
else if( process.argv[2] == "del" )
	del = true;
else {
	console.log( "Must supply parameter 'add' or 'del'" );
	//process.exit(0);
}

var Gun = require( "gun/gun" );
var gunDb = require( "." );

//var Gun = require( "gun" );

var gunNot = require('gun/lib/not')


const rel_ = Gun.val.rel._;  // '#'
const val_ = Gun._.field;  // '.'
const node_ = Gun.node._;  // '_'

var gun = new Gun( /*{ db:{ file:'gun.db' } }*/ );

console.log( new Date(), "Initialized gun instance" );
var root = gun.get( "db" );

var alice = root.get( "alice" )
alice.not( (val)=>{
	console.log( "init alice data", val );
	alice.put( { name: 'alice', dob: 'before now', whatever: 'one' } );
} );
var bob = root.get( "bob" )
bob.not( (val)=>{
	console.log( "init bob data" , val);
	bob.put( { name:'bob', dob: "yes", color: "purple" } );
} );
if( add ) {
	console.log( "adding bob friend" );
	alice.get( 'friends' ).set( bob );
}

var charlie = root.get( "charlie" )
charlie.not( (val)=>{
	console.log( "init charlie data", val );
	charlie.put( {name:"charlie", dob : "not yet", extra: "banana" } );
} );

if( add ) {
	console.log( "adding charlie friend" );
	alice.get( 'friends' ).set( charlie );
}

var deleting = false;
var deleted = false;
alice.get( 'friends' ).map( ).val( function(val, field, ctx) { 
		if( deleting ) { console.log( "skip new value during delete" ); return }
		if( !val ) { console.log( "(val)Got empty value:", val ); return }
		if( del && !deleted )
			if( val.name == 'bob' ) {
				console.log( "Removing bob from alice friend", field, val, ctx );
				deleting = true;
				deleted = true;
				this.back(1).put( { [field]: null } );
				deleting = false;
				//alice.get( 'fiends' ).get( field ).put(null );
			}
		console.log( "(val)alice has a friend", val.name );
} );

