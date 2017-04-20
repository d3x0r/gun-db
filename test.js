try{require('fs').unlinkSync('gun.db');
}catch(e){}

require('./index');

global.Gun = require('gun/gun');

require('gun/test/abc');