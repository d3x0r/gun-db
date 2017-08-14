
process.on( "warning", (warning)=>{console.trace( "WARNING:", warning ); } );
process.on( "error", (warning)=>{console.trace( "ERROR PROCESS:", warning ); } );
//process.on( "exit", (warning)=>{console.trace( warning ); } );

var Gun = require('gun/gun');
const vfs = require("sack.vfs");

var sqls = {};
var mqthen = [];

Gun.on('opt', function(ctx){
	this.to.next(ctx);
	if(ctx.once){ return }
	var opt = ctx.opt.db || (ctx.opt.db = {});
	opt.file = opt.file || (__dirname + '/gun.db');
	opt.client = sqls[opt.file] || (sqls[opt.file] = vfs.Sqlite(opt.file));
	//opt.client.run("PRAGMA synchronous = 0"); // necessary for perf!
	opt.client.makeTable( `create table record (
			soul char,
			field char,
			value char,
			relation char,
			state char,
			constraint record_unique unique(soul,field)
                     )` );

	
	
	ctx.on('put', function(at){
		this.to.next(at);
		var gun = at.gun, client = opt.client;

		if(!client){ console.log( "Somehow you lost the database." ); }

		Gun.graph.is(at.put, null, function(value, field, node, soul){ var id;
			// kinda hate to always do a select just to see that the new update is newer than what was there.
		//console.log( "do select soul field", field, `select state from Record where soul='${client.escape(soul)}' and field='${client.escape(field)}'` );
			var record = client.do( `select state from Record where soul='${client.escape(soul)}' and field='${client.escape(field)}'` );
			{
				var dataRelation, dataValue, tmp;
				var state = Gun.state.is(node, field);
				// Check to see if what we have on disk is more recent.
		//	console.log( "result?", record )
				if(record && record.length && state <= record[0].state){ return }
				if(value && (tmp = value['#'])){ // TODO: Don't hardcode.
					dataRelation = "'" + client.escape(tmp) + "'";
					dataValue = "NULL"
				} else {
					dataRelation = "NULL";
					dataValue = "'" + JSON.stringify(value) + "'";
				}
				try {
		//console.log( "do replace field", field );
					client.do( `replace into Record (soul,field,value,relation,state) values('${client.escape(soul)}','${client.escape(field)}',${dataValue},${dataRelation},${state})` );
					gun.on('in', {'@': at['#'], ok: 1});
				} catch( e ) {
					gun.on('in', {'@': at['#'], err: e});
				}
			}
		});
	});

	ctx.on('get', function(at){
		this.to.next(at);
		var gun = at.gun, client = opt.client;
		if(!client){ console.log( "Lost the database somehow" ) }
		var lex = at.get, u;
		if(!lex){ return }
		var soul = lex['#'];
		var field = lex['.'];
	//	console.log( "doing get..." );
		if('_' === field){
	//console.log( "underscore field..." );
			var record = client.do( `select * from Record where soul='${client.escape(soul)}'` );
			if(!record || !record.length){
				return gun.on('in', {'@': at['#']});
			}
			{
				record = (record||[])[0];
				var empty = Gun.state.ify(u, u, u, u, soul);
				return gun.on('in', {'@': at['#'], put: Gun.graph.node(empty)});
			}
		}
		if(field){
	//console.log( " field...", field );
			var record = client.do( `select * from Record where soul='${client.escape(soul)}' and field='${client.escape(field)}'` );
			//console.log( "Specific field?" );
			if( record ) return gun.on('in', {'@': at['#'], put: Gun.graph.node(nodeify(record[0]))});
			return 
		}
	//console.log( " select all fields..." );
		var record = client.do( `select * from Record where soul='${client.escape(soul)}'` );
		if(!record){
			gun.on('in', {'@': at['#']});	
		}
		else {
			var node;
			record.forEach(function(record){ node=nodeify(record, node);});
			gun.on('in', {'@': at['#'], put: Gun.graph.node(node)});
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
