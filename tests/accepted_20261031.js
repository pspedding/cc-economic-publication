// Frozen release fixture: September/October feature contracts must not drift with live data.
const cp=require('node:child_process');
const ref='704a45d8733c79df89524569a3728453bc1a3b9a';
exports.file=f=>cp.execFileSync('git',['show',ref+':'+f]);
exports.data=JSON.parse(exports.file('data/data.js').toString().split('const CC_ECONOMIC_DATA = ')[1].split(';\n\nif (typeof module')[0]);
