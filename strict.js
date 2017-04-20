var Gun = require('gun/gun');

function put(at, gun, opt, store){
	var tables = {}, err, tmp;
	Gun.graph.is(at.put, function(node, soul){ var type;
		if(store[soul]){
			return;
		}
		if(!(id = node.id)){
			return err = "Err: id is always mandatory.";
		}
		if(!(type = node._type)){
			return err = "Err: _type is mandatory, table name needed for '"+soul+"'.";
		}
		if(!store[type]){
			return err = "Err: That table (" + type + ") does not exist."
		}
		type = (tables[type] = tables[type] || {});
		type[soul] = node;
	});
	if(err){
		return gun.on('in', {'@': at['#'], err: err});
	}
	var check = {};
	Gun.obj.map(tables, function(table, name){
		tmp = store[name];
		Gun.obj.map(table, function(node, soul){
			soul = node.id;
			check[name+soul] = true;
			async[name+soul] = node;
			tmp.upsert(soul, Gun.obj.copy(node)).then(function(){
				Gun.obj.del(async, name+soul);
				check[name+soul] = false;
				if(Gun.obj.map(check, function(val){
					if(val){ return true }
				})){ return }
				//console.log("saved", check);
				gun.on('in', {'@': at['#'], ok: 1});
			}, function(e){
				if(e && e.toString().indexOf('UNIQUE') >= 0){
					// race condition in masterquest?
					return;
				}
				gun.on('in', {'@': at['#'], err: e});
			});
		});
	});
}

function get(at, gun, opt, store, table, id, u){ var tmp;
	!global.DAVE && console.log("get for dave:", table, id);
	if('_' === id){
		if(!store[table]){
			return gun.on('in', {'@': at['#']});
		}
		var empty = Gun.state.ify(u, u, u, u, table);
		gun.on('in', {'@': at['#'], put: Gun.graph.node(empty)});
		return;
	}
	if(!id){
		tmp = table.split(':');
		if(tmp[1]){
			return get(at, gun, opt, store, tmp[0], tmp[1]);
		}
		if(!(tmp = store[table])){
			return gun.on('in', {'@': at['#']});
		}
		// TODO: Handle async reads? :/
		tmp.find(null, {limit: 999999999}).then(function(records){
			var graph = {}, all = graph[table] = {};
			records.forEach(function(record){
				var soul = Gun.node.soul(record);
				if(soul && record.id && record.updatedAt){
					all = Gun.state.ify(all, record.id, parseFloat(record.updatedAt), Gun.val.rel.ify(soul), table);
					Gun.obj.del(record, 'createdAt');
					Gun.obj.del(record, 'updatedAt');
					Gun.obj.del(record, 'deletedAt');
					Gun.obj.del(record, 'revokedAt');
					graph[soul] = record;
					//gun.on('in', {'@': at['#'], put: Gun.graph.node(record)});
				}
			});
			// TODO: Convert to streaming - including getting MasterQuest to stream records.
			gun.on('in', {'@': at['#'], put: graph});
		});
		return;
	}
	if(!(tmp = store[table])){
		return console.log("ERROR: Table '"+ table +"' does not exist!");
	}
	tmp.get(id).then(function(record){
		record = Gun.obj.copy(record || async[table+id]);
		Gun.obj.del(record, 'createdAt');
		Gun.obj.del(record, 'updatedAt');
		Gun.obj.del(record, 'deletedAt');
		Gun.obj.del(record, 'revokedAt');
		//console.log("GOT", table, id, record);
		gun.on('in', {'@': at['#'], put: Gun.graph.node(record)});
	});
}

var async = {};

module.exports = {put: put, get: get};