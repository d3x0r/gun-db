
process.on( "warning", (warning)=>{console.trace( "WARNING:", warning ); } );
process.on( "error", (warning)=>{console.trace( "ERROR PROCESS:", warning ); } );
process.on( "exit", (warning)=>{console.trace( "EXIT:", warning ); } );

const Gun = require('gun/gun');
const vfs = require("sack.vfs");

var _debug_counter = 0;
var __debug_counter = 0;
var _debug_tick = Date.now();
const _debug = false;

const rel_ = Gun.val.rel._;  // '#'
const val_ = Gun._.field;  // '.'
const node_ = Gun.node._;  // '_'
const state_ = Gun.state._;// '>';

const ACK_ = '@';
const SEQ_ = '#';

Gun.on('opt', function(ctx){
	this.to.next(ctx);
	if(ctx.once){ return }
	var opt = ctx.opt.db || (ctx.opt.db = {});
	opt.file = opt.file || (__dirname + '/gun.db');
	var client = vfs.Sqlite(opt.file);
	var gun = ctx.gun;
	if( !client ) {
		console.log( "Failed to open database:", opt.file );
		return;
	}
	//client.transaction();
	client.makeTable( `create table record (
			soul char,
			field char,
			value char,
			relation char,
			state char,
			constraint record_unique unique(soul,field)
	             )` );

	client.do( "create index if not exists soul_index on record(soul)");
	//client.do( "PRAGMA mmap_size=16777216" );
	client.do( "PRAGMA journal_mode=PERSIST" );
	//client.do( "PRAGMA journal_mode=WAL" );
	client.do( "PRAGMA synchronous = 0"); // necessary for perf!
	client.do( "PRAGMA locking_mode = EXCLUSIVE" );
	//client.do( "create index if not exists soul_field_index on record(soul,field)");
	//client.commit();
	//client.autoTransact( true );
	var skip_put = null;

	ctx.on('put', function(at){
		this.to.next(at);
		if( skip_put && skip_put == at[ACK_] ) {
			if( _debug ) {
				var now = Date.now();
				if( now - _debug_tick > 1000 ) {
					console.log( "N in M", _debug_counter - __debug_counter, now-_debug_tick, (_debug_counter - __debug_counter)/( now-_debug_tick) );
					_debug_tick = now;
					__debug_counter = _debug_counter;
				}
				_debug_counter++;
				console.log( new Date(), "skipping put in-get:", _debug_counter, " get putting:", skip_put, at[ACK_], JSON.stringify( at.put ) ); 
			}
			return;
		}
		_debug && console.log( new Date(), "PUT", at["#"], at["@"], JSON.stringify( at.put ) );
		Gun.graph.is(at.put, null, function(value, field, node, soul){ var id;
			// kinda hate to always do a select just to see that the new update is newer than what was there.
			//console.log( "do select soul field", field, `select state from Record where soul='${client.escape(soul)}' and field='${client.escape(field)}'` );
			var record = client.do( `select state from record where soul='${client.escape(soul)}' and field='${client.escape(field)}'` );
			{
				var dataRelation, dataValue, tmp;
				var state = Gun.state.is(node, field);
				// Check to see if what we have on disk is more recent.
				//console.log( "result?", record )
				if(record && record.length && state <= record[0].state){ 
					_debug && console.log( new Date(), "already newer in database.." ); 
					gun.on('in', {[ACK_]: at[rel_], ok: 1});
					return 
				}
				if(value && (tmp = value[rel_])){ // TODO: Don't hardcode.
					dataRelation = "'" + client.escape(tmp) + "'";
					dataValue = "NULL"
				} else if( value ) {
					dataRelation = "NULL";
					dataValue = "'" + client.escape(JSON.stringify(value)) + "'";
				} else {
					dataRelation = "NULL";
					dataValue = "NULL"
				}
				try {
					_debug && console.log( new Date(), "Do replace field soul:", soul, " field:", field, "val:", dataValue );
					client.do( `replace into record (soul,field,value,relation,state) values('${client.escape(soul)}','${client.escape(field)}',${dataValue},${dataRelation},${state})` );
					gun.on('in', {[ACK_]: at[rel_], ok: 1});
				} catch( e ) {
					gun.on('in', {[ACK_]: at[rel_], err: e});
				}
			}
		});
		_debug && console.log( new Date(), " : Put done" );
	});

	ctx.on('get', function(at){
		this.to.next(at);
		if(!client){ console.log( "Lost the database somehow" ); return }
		var lex = at.get, u;
		if(!lex){ return }
		var soul = lex['#'];
		var field = lex[val_];
		_debug && console.log( new Date(), "doing get...for soul:", soul, "field:",field );
		if(node_ === field){
			var record = client.do( `select 1 from record where soul='${client.escape(soul)}' limit 1` );
			_debug && console.log( new Date(), "select result:", record );
			if(!record || !record.length){
				_debug && console.log( "So, result with an in?" );
				return gun.on('in', {[ACK_]: at[SEQ_]});
			}
			_debug && console.log( new Date(), "give back empty"  );
			return gun.on('in', {[ACK_]: at[SEQ_], put: { [soul]: { [node_]:{ [rel_]:soul, [state_]:{}} }}});
		}
		if(field){
			_debug && console.log( new Date(), " field...", field );
			var record = client.do( `select * from record where soul='${client.escape(soul)}' and field='${client.escape(field)}'` );
			if( record && record.length ) {
				_debug && console.log( new Date(), "Specific field?", record );
				let rec= record[0]
				var msg;
				if( rec.relation )
					msg = { [rec.soul]: { [node_]:{ [rel_]:rec.soul, [state_]:{[rec.field]:rec.state }}, [rec.field]:{[rel_]:rec.relation} } };
				else if( rec.value )
					msg = { [rec.soul]: { [node_]:{ [rel_]:rec.soul, [state_]:{[rec.field]:rec.state }}, [rec.field]:JSON.parse(rec.value) } };
				skip_put = at[SEQ_];
				_debug && console.log( new Date(), "Missed skip-put", msg );
				gun.on('in', {[ACK_]: at[SEQ_], put: msg});
				skip_put = null;
			}
			return 
		}
		_debug && console.log( new Date(), "select all fields...", soul );
		var record = client.do( `select * from record where soul='${client.escape(soul)}'` );
		if( !record || !record.length){
			_debug && console.log( new Date(), "nothing... So, result with an in?" );
			gun.on('in', {[ACK_]: at[SEQ_]});	
		}
		else {
			record.forEach(function(record){ 
				var msg;
				if( record.relation )
					msg = { [record.soul]: { [node_]:{ [rel_]:record.soul, [state_]:{[record.field]:record.state }}, [record.field]:{[rel_]:record.relation} } };
				else 
					msg = { [record.soul]: { [node_]:{ [rel_]:record.soul, [state_]:{[record.field]:record.state }}, [record.field]:JSON.parse(record.value) } };
				_debug && console.log( new Date(), "  From Nodify", JSON.stringify(msg) );
				skip_put = at[SEQ_];
				result = gun.on('in', {[ACK_]: at[SEQ_], put: msg } );
				skip_put = null;
			});
		}
	});


});
