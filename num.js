// MODULE: 	CEDANNdriver/num.js
// DESC: 	Numeric related helper functions & shortcuts.
// AUTHOR: 	matt@matthewlynch.net
// DATED: 	2017-10-30

function num_initiate()
{
	var spawn = {};

	spawn.limit = function(value, min, max) { return Math.max(min, Math.min(value, max)); };
	spawn.timestamp = function() { return new Date().getTime(); };
	spawn.easeIn = function(a, b, percent) { return a + (b - a) * Math.pow(percent, 2); };
	spawn.easeOut = function(a, b, percent) { return a + (b - a) * (1 - Math.pow(1 - percent, 2)); };
	spawn.ease = function(a, b, percent) { return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5); };
	spawn.percentRemaining = function(n, total) { return (n % total) / total; };
	spawn.softstep = function(x) { return 1 / (1 + Math.exp(-x)); };
	spawn.interpolate = function(a, b, percent) { return a + (b - a) * percent; };
	spawn.randomInt = function(min, max) { return Math.round(spawn.interpolate(min, max, Math.random())); };
	
	return spawn;
}

var num = num_initiate();