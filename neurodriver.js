// MODULE: 	CEDANNdriver/neurodriver.js
// DESC: 	CEDANN modelled neuro-evolver designed to learn CEDANNdriver/game.js
// AUTHOR: 	matt@matthewlynch.net
// DATED: 	2017-11-03

function neurodriver_determineClassification(network)
{
	var self = this;
	
	var assigned = false;
	for(var i = 0; i < self.classifications.length; i++)
	{
		var classification = self.classifications[i];
		
		if(classification.referenceNetwork.isCompatible(network))
		{
			classification.networks.push(network);
			
			assigned = true;
			break;
		}
	}
	
	
	return assigned;
}

function neurodriver_reclassifyNetworks()
{
	var self = this;
	
	for(var i = 0; i < self.classifications.length; i++)
	{
		var classification = self.classifications[i];
		
		for(var j = classification.networks.length - 1; j >= 0; j--)
		{
			var network = classification.networks[j];
			
			if(!classification.referenceNetwork.isCompatible(network))
			{
				if(!self.determineClassification(network))
					self.classificationBacklog.push(network);
				
				classification.networks.splice(j, 1);
			}
		}
	}
}

function neurodriver_spawnClassification(referenceNetwork)
{
	var self = this;
	
	var classification = neuroclass_initiate(referenceNetwork, function() { return self.spawnNetwork(); });
	self.classifications.push(classification);
	
	return classification;
}

function neurodriver_spawnNetwork(originGeneration)
{
	var self = this;
	
	originGeneration = originGeneration || self.generation;
	
	var network = neuronet_initiate(
		originGeneration,
		function() { return self.newInnovation(); },
		function() { return self.spawnRGBSensor(); },
		function(sensor) { self.mutateRGBSensor(sensor); },
		function(sensorA, sensorB) { return self.compareRGBSensor(sensorA, sensorB); }
	);
	
	var actuatorCodes = [
		game.KEY_CODES.UP,
		game.KEY_CODES.DOWN,
		game.KEY_CODES.LEFT,
		game.KEY_CODES.RIGHT
	];
	
	var blackboxPadding = (3 * self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS) + 1;
	
	for(var i = 0; i < actuatorCodes.length; i++)
	{
		var posX = (self.nodeDisplayArea * self.DISPLAY_PROPERTIES.MAX_BLACKBOX_COLS) + self.nodeDisplayArea + (self.nodeDisplayArea / 2) + self.gfxIn.width + blackboxPadding;
		var posY = (self.nodeDisplayArea * i) + (self.nodeDisplayArea / 2) + blackboxPadding;
		
		network.actuators.push({keyCode: actuatorCodes[i], posX: posX, posY: posY, output: 0.0});
		network.createNeuron(network.SPECIAL_LAYERS.ACTUATORS, null, (network.actuators.length - 1), 0);
	}
	
	return network;
}

function neurodriver_compareRGBSensor(sensorA, sensorB)
{
	var self = this;
	
	var match = true;
	
	if(sensorA.type != sensorB.type)
		match = false;
	
	if(sensorA.posX != sensorB.posX)
		match = false;
	
	if(sensorA.posY != sensorB.posY)
		match = false;
	
	//if(sensorA.radius != sensorB.radius)
		//match = false;
	
	//if(sensorA.channel != sensorB.channel)
		//match = false;
	
	return match;
}

function neurodriver_spawnRGBSensor()
{
	var self = this;
	
	// Sensors must have a numeric "output" field to allow for
	// blackbox integration with neural networks.
	
	// Sensors should also have a "type" field to allow for
	// the sensor manager to know what to do with sensors
	// stored against a neural network.
	
	// The neural networks have no real knowledge of the sensors,
	// except that they produce a numeric "output", but the sensor
	// objects are stored against the network to allow for swapping
	// between networks for evaluation purposes.
	
	var sensor = {
		
		type: "neurodriver:rgb",
		posX: num.randomInt(0, self.gfxIn.width),
		posY: num.randomInt(0, self.gfxIn.height),
		radius: num.randomInt(1, (self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS * 2)) / 2,
		channel: num.randomInt(0, 3), // 0: avg, 1: red, 2: green, 3: blue
		rgb: { n: 0, r: 0, g: 0, b: 0 },
		input: 0.0,
		output: 0.0
	};
	
	return sensor;
}

function neurodriver_mutateRGBSensor(sensor)
{
	var self = this;
	
	if(Math.random() < self.MUTATION_RATES.MODIFY_SENSOR_POS)
	{
		var r = Math.random();
		
		if(r < self.MUTATION_RATES.REPLACE_SENSOR_POS)
		{
			sensor.posX = num.randomInt(0, self.gfxIn.width);
			sensor.posX = num.randomInt(0, self.gfxIn.height);
		}
		else if(r < self.MUTATION_RATES.TWEAK_SENSOR_POS)
		{
			sensor.posX += Math.ceil(num.randomInt(0, 2 * self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS) - self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS);
			sensor.posY += Math.ceil(num.randomInt(0, 2 * self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS) - self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS);
		}
	}
	
	if(Math.random() < self.MUTATION_RATES.MODIFY_SENSOR_RAD)
		sensor.radius = num.randomInt(1, self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS);
	
	if(Math.random() < self.MUTATION_RATES.MODIFY_SENSOR_CHN)
		sensor.channel = num.randomInt(0, 3);
}

function neurodriver_updatedRGBSensors()
{
	var self = this;
	
	var network = self.evaluationNetwork;
	
	if(network == null)
		return;
	
	// Reset sensor values.
	for(var i = 0; i < network.sensors.length; i++)
	{
		var sensor = network.sensors[i];
		
		sensor.rgb = { n: 0, r: 0, g: 0, b: 0 };
		sensor.input = 0.0;
		sensor.output = 0.0;
	}
	
	// Cumulate new RGB values.
	var gfxInData = self.gfxIn.context.getImageData(0, 0 , self.gfxIn.width, self.gfxIn.height);
	var pixels = gfxInData.data;
	
	for (var i = 0; i < (gfxInData.width * gfxInData.height); i++)
	{
		var y = parseInt(i / gfxInData.width, 10);
		var x = i - y * gfxInData.width;
		
		for(var j = 0; j < network.sensors.length; j++)
		{
			var sensor = network.sensors[j];
			
			if(Math.sqrt((x - sensor.posX) * (x - sensor.posX) + (y - sensor.posY) * (y - sensor.posY)) < sensor.radius)
			{
				sensor.rgb.n += 1;
				
				sensor.rgb.r += pixels[i*4];
				sensor.rgb.g += pixels[i*4+1];
				sensor.rgb.b += pixels[i*4+2];
				//sensor.rgba.a += pixels[i*4+3];
			}
		}
	}
	
	for(var i = 0; i < network.sensors.length; i++)
	{
		var sensor = network.sensors[i];

		// Average cumulated RGB values, and filter colours not on sensor's channel.
		sensor.rgb.r = (sensor.channel == 1 || sensor.channel == 0)? ~~(sensor.rgb.r / sensor.rgb.n) : 0;
		sensor.rgb.g = (sensor.channel == 2 || sensor.channel == 0)? ~~(sensor.rgb.g / sensor.rgb.n) : 0;
		sensor.rgb.b = (sensor.channel == 3 || sensor.channel == 0)? ~~(sensor.rgb.b / sensor.rgb.n) : 0;
		
		// Normalise the selected RGB value(s) to the range [0,1]
		switch(sensor.channel)
		{
			case 1:
				sensor.input = sensor.rgb.r / 255;
				break;
				
			case 2:
				sensor.input = sensor.rgb.g / 255;
				break;
				
			case 3:
				sensor.input = sensor.rgb.b / 255;
				break;
				
			case 0:
				sensor.input = ((sensor.rgb.r + sensor.rgb.g + sensor.rgb.b) / 3) / 255;
				break;
				
			default:
				sensor.input = 0;
				break;
		}
		
		// Run the normalised input value through a sigmoid function.
		// This will help ensure nonlinearity. This can also be used
		// to normalise values, but for RGB we had a specific
		// normalisation method in mind.
		sensor.output = Math.tanh(sensor.input);
	}
}

function neurodriver_calculateFitness()
{
	var self = this;
	
	var now = num.timestamp();
	
	var playerLapTime = 90000;
	var targetLapTime = (playerLapTime / game.roadLength) * game.carPos;
	var actualLapTime = now - game.lapStart;
	
	return -Math.floor(actualLapTime - targetLapTime);
}

function neurodriver_newGeneration()
{
	var self = this;

	// Find and preserve the fittest network.
	var scoredNetworks = [];
	
	for(var i = 0; i < self.classifications.length; i++)
	{
		var classification = self.classifications[i];
		
		for(var j = 0; j < classification.networks.length; j++)
		{
			var network = classification.networks[j];
			
			if(network.fitness != null)
				scoredNetworks.push(network);
		}
	}
	
	scoredNetworks = scoredNetworks.sort(function(a, b) { return b.fitness - a.fitness; });
	
	if(scoredNetworks.length > 0 && scoredNetworks[0].fitness > 0)
		self.fittestNetworks.push(scoredNetworks[0]);
	
	self.fittestNetworks = self.fittestNetworks.sort(function(a, b) { return b.fitness - a.fitness; });
	
	while(self.fittestNetworks.length > 10)
		self.fittestNetworks.pop();
	
	if(self.fittestNetworks.length > 0)
		self.maxFitness = self.fittestNetworks[0].fitness;
	
	
	
	
	
	// Update generation count and reset current classification pointer.
	self.generation += 1;
	self.currentClassificationIndex = 0;
	
	// If there are no classifications, create a random one to get the ball going.
	if(self.classifications.length == 0)
		self.spawnClassification(self.spawnNetwork());
	
	// Seperate & sort scored and unscored outcasts.
	var unscoredOutcasts = [];
	var scoredOutcasts = [];
	
	for(var i = 0; i < self.classificationBacklog.length; i++)
	{
		var network = self.classificationBacklog[i];
		
		if(network.fitness == null)
			unscoredOutcasts.push(network);
		else
			scoredOutcasts.push(network);
	}
	
	scoredOutcasts = scoredOutcasts.sort(function(a, b) { return b.fitness - a.fitness; });
	
	// Strategically cull the population of scored outcasts if it is growing excessive.
	while(scoredOutcasts.length > 100)
	{
		scoredOutcasts.pop();
	}
	
	// Randomly cull the population of unscored outcasts if it is growing excessive.
	// There actually shouldn't be any, but this is a saftey net to prevent memory leaks.
	while(unscoredOutcasts.length > 100)
	{
		unscoredOutcasts.splice(num.randomInt(0, unscoredOutcasts.length - 1), 1);
	}
	
	// Create a new generation for each classification, and collect any outcasts from
	// the process.
	var newOutcasts = [];
	
	for(var i = 0; i < self.classifications.length; i++)
	{
		var classification = self.classifications[i];
		
		var outcasts = classification.newGeneration(self.generation);
		
		newOutcasts = newOutcasts.concat(outcasts);
	}
	
	// With any innovation preserved from the existing classifications (through the outcast process),
	// cull the list of current classifications down to the 5 strongest.
	self.classifications = self.classifications.sort(function(a, b) { return b.referenceNetwork.fitness - a.referenceNetwork.fitness; });
	
	for(var i = self.classifications.length - 1; i > 4; i--)
	{
		var classification = self.classifications[i];
		var strongestNetwork = classification.referenceNetwork;
		
		// The strongest network from the outcast classification will survive, but be outcast.
		if(strongestNetwork != null)
			newOutcasts.push(strongestNetwork);
		
		self.classifications.splice(i, 1);
	}
	
	// Allow outcasts to return if they are compatible with any new generations.
	// There can also be up to 10 active classifications, and we just cull all but
	// the strongest 5... so there is room to create up to 5 new groups for the
	// strongest outcasts.
	for(var i = scoredOutcasts.length - 1; i >= 0; i--)
	{
		var network = scoredOutcasts[i];
		var assigned = self.determineClassification(network);
		
		if(!assigned && self.classifications.length < 10)
		{
			var classification = self.spawnClassification(network);
			
			var outcasts = classification.newGeneration(self.generation);
			
			newOutcasts = newOutcasts.concat(outcasts);
			
			assigned = true;
		}
		
		if(assigned)
			scoredOutcasts.splice(0, 1);
	}
	
	// Mutate any scored outcasts that didn't find a home this generation.
	// This gives them a chance to prove wether their innovation is worthwhile.
	for(var i = 0; i < scoredOutcasts.length; i++)
	{
		var network = scoredOutcasts[i];
		
		network.mutateNetwork(self.generation);
	}
	
	// Recombine scored & unscored outcasts, and add in new outcasts.
	self.classificationBacklog = scoredOutcasts.concat(unscoredOutcasts).concat(newOutcasts);
	
	for(var i = self.classificationBacklog.length - 1; i >= 0; i--)
	{
		var network = self.classificationBacklog[i];
		
		if(network.neurons.length <= network.actuators.length && network.axions.length == 0)
			self.classificationBacklog.splice(i, 1);
	}
}

function neurodriver_getEvaluationNetwork(terminateCurrent)
{
	var self = this;

	var classification = self.classifications[self.currentClassificationIndex];	
	var network = self.evaluationNetwork;
	
	// Move on if a request has been made to terminate evaluation
	// of the current network.
	if(network != null && terminateCurrent)
		network = null;
	
	// Move on if the current network has no axions.
	if(network != null && network.axions == 0)
		network = null;
	
	if(network == null && classification != null)
	{
		network = classification.nextNetwork();
		
		if(network != null)
		{
			dom.set("stats-classification", self.currentClassificationIndex + 1);
			dom.set("stats-network", classification.nextNetworkIndex);
		}
	}
	
	// If there are no more networks in current classification,
	// move on to the next classification.
	if(network == null)
	{
		self.currentClassificationIndex += (self.currentClassificationIndex + 1	< self.classifications.length)? 1 : 0;
		
		classification = self.classifications[self.currentClassificationIndex];
		
		if(classification != null)
		{
			network = classification.nextNetwork();
			
			if(network != null)
			{
				dom.set("stats-classification", self.currentClassificationIndex + 1);
				dom.set("stats-network", classification.nextNetworkIndex);
			}
		}
	}
	
	// No classified networks available? See if there are any unclassified networks in classification backlog.
	if(network == null)
	{
		for(var i = 0; i < self.classificationBacklog.length; i++)
		{
			if(self.classificationBacklog[i].fitness == null)
			{
				network = self.classificationBacklog[i];
				
				break;
			}
		}
		
		if(network != null)
		{
			dom.set("stats-classification", "backlog");
			dom.set("stats-network", "n/a");
		}
	}
	
	// Still no network? Time for a new generation!
	if(network == null)
	{
		self.newGeneration();
		
		var classification = self.classifications[self.currentClassificationIndex];
		
		if(classification != null)
		{
			network = classification.nextNetwork();
			
			if(network != null)
			{
				dom.set("stats-classification", self.currentClassificationIndex + 1);
				dom.set("stats-network", classification.nextNetworkIndex);
			}
		}
	}
	
	self.evaluationNetwork = network;
	return network;
}

function neurodriver_sample()
{
	var self = this;
	
	var fitness = self.calculateFitness();
	var terminateCurrent = false;
	
	if(game.complete)
		terminateCurrent = true;
	
	if(game.carPos <= self.evaluation.lastSampleDistance && fitness < -500)
		terminateCurrent = true;
	
	if(game.carPos > self.evaluation.lastSampleDistance && fitness < -5000)
		terminateCurrent = true;
	
	if(terminateCurrent)
	{
		self.evaluation.lastSampleFitness = 0;
		self.evaluation.lastSampleDistance = 0;
		
		game.reset();
	}
	
	var network = self.getEvaluationNetwork(terminateCurrent);
	
	dom.set("stats-generation", "???");
	dom.set("stats-score", "???");
	dom.set("stats-outcasts", "???");
	
	dom.set("stats-generation", self.generation);
	dom.set("stats-score", fitness.toLocaleString());
	dom.set("stats-outcasts", self.classificationBacklog.length.toLocaleString());
	
	self.evaluation.lastSampleFitness = fitness;
	self.evaluation.lastSampleDistance = game.carPos;
	
	self.updatedRGBSensors();
	
	network.fitness = (game.carPos * 1000) + fitness;
	network.evaluate(self.generation);
	
	var actuatorCodes = [
		game.KEY_CODES.UP,
		game.KEY_CODES.DOWN,
		game.KEY_CODES.LEFT,
		game.KEY_CODES.RIGHT
	];
	
	for(var i = 0; i < network.actuators.length; i++)
	{
		var actuator = network.actuators[i];
		
		if(actuator.output > 0)
			game.keyPressed(actuator.keyCode);
		else
			game.keyReleased(actuator.keyCode);
	}
}

function neurodriver_receiveAnimationFrame()
{
	var self = this;
	
	self.currentFrameStart = num.timestamp();
	
	self.deltaFrameTime  = Math.min(1, (self.currentFrameStart - self.previousFrameStart) / 1000);
	self.deltaSampleTime = self.deltaSampleTime + self.deltaFrameTime;
	
	while (self.deltaSampleTime > self.sampleRate)
	{
		self.deltaSampleTime = self.deltaSampleTime - self.sampleRate;
		self.sample();
	}
	
	self.renderDisplay();
	self.previousFrameStart = self.currentFrameStart;
	
	window.requestAnimationFrame(function() { self.receiveAnimationFrame(); });
}

function neurodriver_getNeuronDisplayPos(neuronLayer)
{
	var self = this;
	
	var network = self.evaluationNetwork;
	
	if(network == null)
		return;
	
	var blackboxPadding = (3 * self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS) + 1;
	
	var layerOffset = Math.floor((neuronLayer - network.LIMITS.MAX_SENSORS) / self.DISPLAY_PROPERTIES.MAX_BLACKBOX_COLS);
	var nodeOffset = (neuronLayer - network.LIMITS.MAX_SENSORS) % self.DISPLAY_PROPERTIES.MAX_BLACKBOX_ROWS;
	
	var posX = (self.nodeDisplayArea * layerOffset) + (self.nodeDisplayArea / 2) + self.gfxIn.width + blackboxPadding;
	var posY = (self.nodeDisplayArea * nodeOffset)  + (self.nodeDisplayArea / 2) + blackboxPadding;
	
	var pos = {x: posX, y: posY};
	
	return pos;
}

function neurodriver_renderDisplay()
{
	var self = this;
	
	var network = self.evaluationNetwork;
	
	if(network == null)
		return;
	
	self.gfxOut.clear();
	self.gfxOut.fillBackground("#CCCCCC");
	self.gfxOut.copyCanvas(self.gfxIn.canvas, 0, 0);
	self.gfxOut.drawRectangle(0, 0, self.gfxIn.width, self.gfxIn.height, "rgba(0, 0, 0, 0.35)");
	
	var lineWidth = self.DISPLAY_PROPERTIES.LINE_WIDTH;
	
	for(var i = 0; i < network.axions.length; i++)
	{
		var axion = network.axions[i];
		
		if(!axion.enabled)
			continue;
		
		var inputNeuron = network.getNeuronByLayer(axion.inputNeuronLayer);
		var outputNeuron = network.getNeuronByLayer(axion.outputNeuronLayer);
		
		var inPos = {x: 0, y: 0};
		if(inputNeuron.sensorIndex != null)
		{
			var sensor = network.sensors[inputNeuron.sensorIndex];
			
			inPos.x = sensor.posX;
			inPos.y = sensor.posY;
		}
		else
		{
			inPos = self.getNeuronDisplayPos(inputNeuron.layer);
		}
		
		
		var outPos = {x: 0, y: 0};
		if(outputNeuron.actuatorIndex != null)
		{
			var actuator = network.actuators[outputNeuron.actuatorIndex];
			
			outPos.x = actuator.posX;
			outPos.y = actuator.posY;
		}
		else
		{
			outPos = self.getNeuronDisplayPos(outputNeuron.layer);
		}
		
		var c = Math.floor(num.softstep(inputNeuron.output * axion.weight) * 255);
		var cssColour = "rgb("+ c +","+ c +","+ c +")";
		
		self.gfxOut.drawLine(inPos.x, inPos.y, outPos.x, outPos.y, lineWidth, cssColour);
	}
	
	for(var i = 0; i < network.sensors.length; i++)
	{
		var sensor = network.sensors[i];
		var cssColour = "rgb("+ sensor.rgb.r +","+ sensor.rgb.g +","+ sensor.rgb.b +")";
		
		self.gfxOut.drawCircle(sensor.posX, sensor.posY, sensor.radius + (2 * lineWidth), cssColour, lineWidth, "#000000");
	}
	
	for(var i = 0; i < network.actuators.length; i++)
	{
		var actuator = network.actuators[i];
		var cssColour = "#FFFFFF"; //"rgb("+ sensor.rgb.r +","+ sensor.rgb.g +","+ sensor.rgb.b +")";
		
		var c = Math.floor(num.softstep(actuator.output) * 255);
		var cssColour = "rgb("+ c +","+ c +","+ c +")";
		
		self.gfxOut.drawCircle(actuator.posX, actuator.posY, self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS + (2 * lineWidth), cssColour, lineWidth, "#000000");
	}
	
	for(var i = 0; i < network.neurons.length; i++)
	{
		var neuron = network.neurons[i];
		
		if(neuron.layer < network.LIMITS.MAX_SENSORS || neuron.layer >= network.SPECIAL_LAYERS.ACTUATORS)
			continue;
		
		var pos = self.getNeuronDisplayPos(neuron.layer);
		
		var c = Math.floor(num.softstep(neuron.output) * 255);
		var cssColour = "rgb("+ c +","+ c +","+ c +")";
		
		self.gfxOut.drawCircle(pos.x, pos.y, 3 + (2 * lineWidth), cssColour, lineWidth, "#000000");
	}
}

function neurodriver_configureDisplay(displayCanvasId)
{
	var self = this;
	
	// Calculate how much space an individual neuron will take up on the display.
	var nodeRadius = self.DISPLAY_PROPERTIES.MAX_NODE_RADIUS;
	var nodeSpacing = (10 * nodeRadius);
	var lineWidth = self.DISPLAY_PROPERTIES.LINE_WIDTH;
	
	self.nodeDisplayArea = (2 * nodeRadius) + (2 * lineWidth) + nodeSpacing;
	
	// Calculate width & height for area to accomodate blackbox neurons.
	var blackboxRows = self.DISPLAY_PROPERTIES.MAX_BLACKBOX_ROWS;
	var blackboxCols = self.DISPLAY_PROPERTIES.MAX_BLACKBOX_COLS;
	var blackboxPadding = (3 * nodeRadius) + 1;
	
	self.blackboxDisplayWidth =  (blackboxCols * self.nodeDisplayArea) + (2 * blackboxPadding);
	self.blackboxDisplayHeight = (blackboxRows * self.nodeDisplayArea) + (2 * blackboxPadding);
	
	// Calculate how much width & height needs to be added on top of that required to display input graphics.
	var dw = self.blackboxDisplayWidth + (2 * self.nodeDisplayArea);
	var dh = (self.gfxIn.height < self.blackboxDisplayHeight)? self.blackboxDisplayHeight - self.gfxIn.height : 0;
	
	// Instantiate output graphics controller.
	self.gfxOut = gfx_instantiate(displayCanvasId, self.gfxIn.width + dw, self.gfxIn.height + dh);
}

function neurodriver_initiate(displayCanvasId, gfxIn)
{
	var spawn = {};
	
	spawn.gfxIn = gfxIn;
	spawn.gfxOut = null;
	
	spawn.generation = 0;
	spawn.fittestNetworks = [];
	
	// Manage global innovation count for all networks.
	spawn.innovation = 0;
	spawn.newInnovation = function() { return spawn.innovation++; };
	
	// Manage classification of networks based on divergence in innovation & weights.
	spawn.classifications = [];
	spawn.spawnClassification = neurodriver_spawnClassification;
	
	spawn.classificationBacklog = [];
	
	// Manage the creation of networks, to allow passing of required hooks.
	spawn.spawnNetwork = neurodriver_spawnNetwork;
	
	// Define pointers to the current classification & network being evaluated.
	spawn.currentClassificationIndex = null;
	spawn.evaluationNetwork = null;
	
	// Define constants.
	spawn.POPULATION_LIMITS = {
		
		MAX_SPECIES:  50,
		MAX_NETWORKS: 50
		
	};
	
	spawn.DISPLAY_PROPERTIES = {
		
		MAX_NODE_RADIUS: 	3,
		MAX_BLACKBOX_ROWS: 	10,
		MAX_BLACKBOX_COLS: 	10,
		MAX_OUTPUT_ROWS: 	10,
		MAX_OUTPUT_COLS: 	10,
		LINE_WIDTH: 		2
		
	};
	
	spawn.MUTATION_RATES = {
		
		MODIFY_SENSOR_POS:  0.90,
		TWEAK_SENSOR_POS: 	0.90,
		REPLACE_SENSOR_POS: 0.10,
		MODIFY_SENSOR_RAD: 	0.05,
		MODIFY_SENSOR_CHN: 	0.25
		
	};
	
	// Configure output display.
	spawn.nodeDisplayArea = 0;
	spawn.blackboxDisplayWidth = 0;
	spawn.blackboxDisplayHeight = 0;
	
	spawn.configureDisplay = neurodriver_configureDisplay;
	spawn.configureDisplay(displayCanvasId);
	
	spawn.getNeuronDisplayPos = neurodriver_getNeuronDisplayPos;
	
	// Allow the creation of RGB sensors to sample input graphics.
	// These can be interfaced with network neurons in a blackbox fashion (output only),
	// via a callback hook.
	spawn.rgbSensors = [];
	spawn.spawnRGBSensor = neurodriver_spawnRGBSensor;
	spawn.mutateRGBSensor = neurodriver_mutateRGBSensor;
	spawn.compareRGBSensor = neurodriver_compareRGBSensor;
	
	// Manage a visual representation of the network currently being evaluated.
	spawn.renderDisplay = neurodriver_renderDisplay;
	
	
	// ...

	//var tempNetwork = spawn.spawnNetwork();
	//var tempClassification = spawn.spawnClassification(tempNetwork);
	
	// if(neurobackup != null)
	// {
		// for(var i = 0; i < neurobackup.networks.length; i++)
		// {
			// var dummy = neurobackup.networks[i];
			// var network = spawn.spawnNetwork();
			
			// network.fitness = dummy.fitness;
			// network.sensors = dummy.sensors;
			// network.actuators = dummy.actuators;
			// network.neurons = dummy.neurons;
			// network.axions = dummy.axions;
			
			// spawn.classificationBacklog.push(network);
		// }
	// }
	
	spawn.currentClassificationIndex = 0;
	
	// ...
	
	spawn.evaluation = {
		
		lastSampleFitness: 0,
		lastSampleDistance: 0
		
	};
	
	// Synchronise sampling of input graphics to display frame rate.
	spawn.currentFrameStart = num.timestamp();
	spawn.previousFrameStart = spawn.currentFrameStart;
	
	spawn.deltaFrameTime = 0;
	spawn.deltaSampleTime = 0;
	
	spawn.sampleRate = 1/4; // seconds between samples.
	
	spawn.newGeneration = neurodriver_newGeneration;
	spawn.determineClassification = neurodriver_determineClassification;
	spawn.reclassifyNetworks = neurodriver_reclassifyNetworks;
	spawn.calculateFitness = neurodriver_calculateFitness;
	spawn.sample = neurodriver_sample;
	spawn.getEvaluationNetwork = neurodriver_getEvaluationNetwork;
	spawn.updatedRGBSensors = neurodriver_updatedRGBSensors;
	
	spawn.receiveAnimationFrame = neurodriver_receiveAnimationFrame;
	spawn.receiveAnimationFrame();
	

	
	return spawn;
}