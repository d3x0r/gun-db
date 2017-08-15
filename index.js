
process.on( "warning", (warning)=>{console.trace( "WARNING:", warning ); } );
process.on( "error", (warning)=>{console.trace( "ERROR PROCESS:", warning ); } );
process.on( "exit", (warning)=>{console.trace( "EXIT:", warning ); } );

const Gun = require('gun/gun');
const vfs = require("sack.vfs");

const sqls = {};
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
	opt.client = sqls[opt.file] || (sqls[opt.file] = vfs.Sqlite(opt.file));
	//opt.client.transaction();
	opt.client.makeTable( `create table record (
			soul char,
			field char,
			value char,
			relation char,
			state char,
			constraint record_unique unique(soul,field)
	             )` );

	opt.client.do( "create index if not exists soul_index on record(soul)");
	//opt.client.do( "PRAGMA mmap_size=16777216" );
	opt.client.do( "PRAGMA journal_mode=PERSIST" );
	//opt.client.do( "PRAGMA journal_mode=WAL" );
	opt.client.do( "PRAGMA synchronous = 0"); // necessary for perf!
	opt.client.do( "PRAGMA locking_mode = EXCLUSIVE" );
	//opt.client.do( "create index if not exists soul_field_index on record(soul,field)");
	//opt.client.commit();
	//opt.client.autoTransact( true );
	var skip_put = null;
	var gun = ctx.gun, client = opt.client;
	
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
				_debug && console.log( "skipping put in-get:", _debug_counter, " get putting:", skip_put, at[ACK_], JSON.stringify( at.put ) ); 
			}
			return;
		}
		_debug && console.log( "PUT", at["#"], at["@"], JSON.stringify( at.put ) );
		//console.log( new Date(), " : Put" );
		if(!client){ console.log( "Somehow you lost the database." ); }

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
					_debug && console.log( "already newer in database.." ); 
					gun.on('in', {[ACK_]: at[rel_], ok: 1});
					return 
				}
				if(value && (tmp = value[rel_])){ // TODO: Don't hardcode.
					dataRelation = "'" + client.escape(tmp) + "'";
					dataValue = "NULL"
				} else {
					dataRelation = "NULL";
					dataValue = "'" + client.escape(JSON.stringify(value)) + "'";
				}
				try {
					_debug && console.log( "Do replace field soul:", soul, " field:", field, "val:", dataValue );
					client.do( `replace into record (soul,field,value,relation,state) values('${client.escape(soul)}','${client.escape(field)}',${dataValue},${dataRelation},${state})` );
					gun.on('in', {[ACK_]: at[rel_], ok: 1});
				} catch( e ) {
					gun.on('in', {[ACK_]: at[rel_], err: e});
				}
			}
		});
		//console.log( new Date(), " : Put done" );
	});

	ctx.on('get', function(at){
		this.to.next(at);
		if(!client){ console.log( "Lost the database somehow" ) }
		var lex = at.get, u;
		if(!lex){ return }
		var soul = lex['#'];
		var field = lex[val_];
		_debug && console.log( "doing get...for", soul, typeof field, field );
		if(node_ === field){
			_debug && console.log( "underscore field...", lex );
			var record = client.do( `select * from record where soul='${client.escape(soul)}'` );
			if(!record || !record.length){
				_debug && console.log( "So, result with an in?" );
				return gun.on('in', {[ACK_]: at[SEQ_]});
			}
			{
				record = (record||[])[0];
				var empty = Gun.state.ify(u, u, u, u, soul);
				console.log( "give back empyt?", empty );
				return gun.on('in', {[ACK_]: at[SEQ_], put: Gun.graph.node(empty)});
			}
		}
		if(field){
			_debug && console.log( " field...", field );
			var record = client.do( `select * from record where soul='${client.escape(soul)}' and field='${client.escape(field)}'` );
			_debug && console.log( "Specific field?" );
			if( record ) return gun.on('in', {[ACK_]: at[SEQ_], put: Gun.graph.node(nodeify(record[0]))});
			return 
		}
		_debug && console.log( "select all fields...", soul );
		var record = client.do( `select * from record where soul='${client.escape(soul)}'` );
		if( !record || !record.length){
			_debug && console.log( "nothing... So, result with an in?" );
			gun.on('in', {[ACK_]: at[SEQ_]});	
		}
		else {
			if( true ) {
				record.forEach(function(record){ 
					var msg;
					if( record.relation )
						msg = { [record.soul]: { [node_]:{ [rel_]:record.soul, [state_]:{[record.field]:record.state }}, [record.field]:{[rel_]:record.relation} } };
					else
						msg = { [record.soul]: { [node_]:{ [rel_]:record.soul, [state_]:{[record.field]:record.state }}, [record.field]:JSON.parse(record.value) } };
					_debug && console.log( new Date(), "  From Nodify", JSON.stringify(msg) );
					skip_put = at[SEQ_];
					gun.on('in', {[ACK_]: at[SEQ_], put: msg } );
					skip_put = null;
			        
				});
			} else {        
				var node;
				record.forEach(function(record){ 
					node=nodeify(record, node);			        
				});
				skip_put = at[SEQ_];
				_debug && console.log( new Date(), "  to in", node );
				gun.on('in', {[ACK_]: at[SEQ_], put: Gun.graph.node(node) } );
				_debug && console.log( new Date(), "  from in" );
				skip_put = null;
			}
		}
	});

	function nodeify(record, node){
		if(!record){ return }
		var value;
		try{value = record.relation? Gun.val.rel.ify(record.relation) : JSON.parse(record.value);
		}catch(e){}
		return Gun.state.ify(node, record.field, parseFloat(record.state), value, record.soul);
	}

});
