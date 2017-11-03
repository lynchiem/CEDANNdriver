// MODULE: 	CEDANNdriver/dom.js
// DESC: 	DOM related helper functions & shortcuts.
// AUTHOR: 	matt@matthewlynch.net
// DATED: 	2017-10-30

function dom_instantiate()
{
	var spawn = {};
	
	spawn.get = function(id) { return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id); };
	spawn.set = function(id, html) { spawn.get(id).innerHTML = html; };
	spawn.show = function(id) { spawn.get(ele).style.display = "block"; };
	spawn.hide = function(id) { spawn.get(ele).style.display = "none"; };
	spawn.on = function(id, type, fn, capture) { spawn.get(id).addEventListener(type, fn, capture); };
	spawn.un = function(id, type, fn, capture) { spawn.get(id).removeEventListener(type, fn, capture); };
	
	return spawn;
}

var dom = dom_instantiate();