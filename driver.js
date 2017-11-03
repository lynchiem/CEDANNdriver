function driver_spawnAxion()
{
	var self = this;
	
	var axion = {
		
		index: self.axions.length,
		weight: (Math.random() * 2.0) - 1, // [-1 to 1)
		neuronIndexA: num.randomInt(0, self.neurons.length - 1),
		neuronIndexB: num.randomInt(0, self.neurons.length - 1),
		colour: {n: 0, r: 0, g: 0, b: 0},
		input: 0,
		output: 0
		
	};
	
	if(axion.neuronIndexA != axion.neuronIndexB)
	{
		var neuronA = self.neurons[axion.neuronIndexA];
		var neuronB = self.neurons[axion.neuronIndexB];
		
		if(neuronA.type.startsWith("std:") || neuronB.type.startsWith("std:"))
		{
			var swap = false;
			
			if(neuronA.type.startsWith("std:") && neuronB.type.startsWith("in:"))
				swap = true;
			
			if(neuronA.type.startsWith("out:") && (neuronB.type.startsWith("std:") || neuronB.type.startsWith("in:")))
				swap = true;
			
			if(swap)
			{
				var tempIndex = axion.neuronIndexA;
				
				axion.neuronIndexA = axion.neuronIndexB;
				axion.neuronIndexB = tempIndex;
			}
			
			self.axions.push(axion);
		}
	}
	
}

function driver_spawnNeuron()
{
	var self = this;
	
	var type = "std:sigmoid";
	
	if(Math.random() < self.rateSensorNeuron)
	{
		var sensorTypes = ["in:rgb:red", "in:rgb:green", "in:rgb:blue", "in:rgb:avg"];
		
		type = sensorTypes[num.randomInt(0, sensorTypes.length - 1)];
	}
	
	var neuron = {
		
		index: self.neurons.length,
		type: type,
		posX: 0,
		posY: 0,
		radius: num.randomInt(1, 3),
		colour: {n: 0, r: 0, g: 0, b: 0},
		input: 0.0,
		output: 0.0
		
	};
	
	if(neuron.type.startsWith("in:rgb:"))
	{
		neuron.posX = num.randomInt(0, self.gfxIn.width);
		neuron.posY = num.randomInt(0, self.gfxIn.height);
	}
	else 
	{	
		var availableHeight = self.displayStdAreaHeight - (2 * self.displayStdPadding);
		var wrap = Math.floor((neuron.index * self.displayStdOuterDiameter) / availableHeight);
		
		neuron.posX = (self.displayStdOuterDiameter * wrap) + (self.displayStdOuterDiameter / 2) + self.gfxIn.width + self.displayStdPadding;
		neuron.posY = (self.displayStdOuterDiameter * neuron.index) + (self.displayStdOuterDiameter / 2) - (wrap * availableHeight) + self.displayStdPadding;
		neuron.radius = self.displayStdInnerRadius;
	}
	
	self.neurons.push(neuron);
}

function driver_updateRGBNeurons()
{
	var self = this;
	
	var rgbNeurons = [];
	
	// Reset RGB values.
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuron = self.neurons[i];
		
		if(neuron.type.startsWith("in:rgb:"))
		{
			neuron.colour = {n: 0, r: 0, g: 0, b: 0};
			rgbNeurons.push(neuron);
		}
	}
	
	// Cumulate new RGB values.
	var gfxInData = self.gfxIn.context.getImageData(0, 0 , self.gfxIn.width, self.gfxIn.height);
	var pixels = gfxInData.data;
	
	for (var i = 0; i < (gfxInData.width * gfxInData.height); i++)
	{
		var y = parseInt(i / gfxInData.width, 10);
		var x = i - y * gfxInData.width;
		
		for(var j = 0; j < rgbNeurons.length; j++)
		{
			var neuron = rgbNeurons[j];
			
			if(Math.sqrt((x - neuron.posX) * (x - neuron.posX) + (y - neuron.posY) * (y - neuron.posY)) < neuron.radius)
			{
				neuron.colour.n += 1;
				
				neuron.colour.r += pixels[i*4];
				neuron.colour.g += pixels[i*4+1];
				neuron.colour.b += pixels[i*4+2];
				neuron.colour.a += pixels[i*4+3];
			}
		}
	}
	
	// Average new RGB values, and compute input and output values.
	for(var i = 0; i < rgbNeurons.length; i++)
	{
		var neuron = rgbNeurons[i];
		
		var meta = neuron.type.split(":");
		var channel = (meta != null && meta.length >= 3)? meta[2] : "unknown";
		
		neuron.colour.r = (channel == "red" || channel == "avg")? ~~(neuron.colour.r / neuron.colour.n) : 0;
		neuron.colour.g = (channel == "green" || channel == "avg")? ~~(neuron.colour.g / neuron.colour.n) : 0;
		neuron.colour.b = (channel == "blue" || channel == "avg")? ~~(neuron.colour.b / neuron.colour.n) : 0;
		
		switch(channel)
		{
			case "red":
				neuron.input = neuron.colour.r / 255;
				break;
				
			case "green":
				neuron.input = neuron.colour.g / 255;
				break;
				
			case "blue":
				neuron.input = neuron.colour.b / 255;
				break;
				
			case "avg":
				neuron.input = ((neuron.colour.r + neuron.colour.g + neuron.colour.b) / 3) / 255;
				break;
				
			default:
				neuron.input = 0;
				break;
		}
		
		neuron.output = num.softstep(neuron.input);
	}
}

function driver_updateAxions()
{
	var self = this;
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		var neuronA = self.neurons[axion.neuronIndexA];
		var neuronB = self.neurons[axion.neuronIndexB];
		
		axion.input = neuronA.output;
		
		axion.output = axion.input * axion.weight;
		axion.output += (axion.output < 0)? 1 : 0;
		
		// Update display colour while we are here:
		var c = Math.floor(255 * axion.output);
		axion.colour.r = Math.floor(c * 0.9912); // magic numbers
		axion.colour.g = Math.floor(c * 0.6235); // just make
		axion.colour.b = Math.floor(c * 0.2705); // lines orangey
	}
}

function driver_updateStdNeurons()
{
	var self = this;
	
	// Update standard neuron input values.
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuron = self.neurons[i];
		
		// Ignore if not a standard neuron.
		if(!neuron.type.startsWith("std:"))
			continue;
		
		// Reset neuron input.
		neuron.input = 0;
		
		// Cumulate input values.
		for(var j = 0; j < self.neurons.length; j++)
		{
			var axion = self.axions[j];
			
			// Ignore axion if current neuron is not destination.
			if(axion.neuronIndexB != neuron.index)
				continue;
			
			neuron.input += axion.output;
		}
	}
	
	// Update standard neuron output values.
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuron = self.neurons[i];
		
		// Ignore if not a standard neuron.
		if(!neuron.type.startsWith("std:"))
			continue;
		
		var meta = neuron.type.split(":");
		var func = (meta != null && meta.length >= 2)? meta[1] : "unknown";
		
		switch(func)
		{
			case "sigmoid":
				neuron.output = num.softstep(neuron.input);
				break;
				
			default:
				neuron.output = 0;
				break;
		}
		
		// Update display colour while we are here:
		var c = Math.floor(255 * neuron.output);
		neuron.colour.r = Math.floor(c * 0.9912); // magic numbers
		neuron.colour.g = Math.floor(c * 0.6235); // just make
		neuron.colour.b = Math.floor(c * 0.2705); // circles orangey
	}
}

function driver_update()
{
	var self = this;
	
	self.updateRGBNeurons();
	self.updateAxions();
	self.updateStdNeurons();
	
}

function driver_render()
{
	var self = this;
	
	self.gfxOut.clear();
	self.gfxOut.fillBackground("#CCCCCC");
	self.gfxOut.copyCanvas(self.gfxIn.canvas, 0, 0);
	self.gfxOut.drawRectangle(0, 0, self.gfxIn.width, self.gfxIn.height, "rgba(0, 0, 0, 0.35)");
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		var neuronA = self.neurons[axion.neuronIndexA];
		var neuronB = self.neurons[axion.neuronIndexB];
		
		var cssColour = "rgb("+ axion.colour.r +","+ axion.colour.g +","+ axion.colour.b +")";
	
		self.gfxOut.drawLine(neuronA.posX, neuronA.posY, neuronB.posX, neuronB.posY, 2, cssColour);
	}
	
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuron = self.neurons[i];
		
		var cssColour = "rgb("+ neuron.colour.r +","+ neuron.colour.g +","+ neuron.colour.b +")";
		
		self.gfxOut.drawCircle(neuron.posX, neuron.posY, neuron.radius + 4, cssColour, 2, "#000000");
	}
}

function driver_frame()
{
	var self = this;
	
	self.currentFrameStart = num.timestamp();
	
	self.deltaFrameTime  = Math.min(1, (self.currentFrameStart - self.previousFrameStart) / 1000);
	self.deltaSampleTime = self.deltaSampleTime + self.deltaFrameTime;
	
	while (self.deltaSampleTime > self.sampleRate)
	{
		self.deltaSampleTime = self.deltaSampleTime - self.sampleRate;
		self.update();
	}
	
	self.render();
	self.previousFrameStart = self.currentFrameStart;
	
	window.requestAnimationFrame(function() { self.frame(); });
}

function driver_initiate(canvasId, gfxIn, outputs, getFitness, hasCompletedTask, hasStagnated)
{
	var spawn = {};
	
	spawn.gfxIn = gfxIn;
	
	// Configure & calculate the size of the area to display standard (std) neurons.
	spawn.displayStdInnerRadius = 3; // pixels
	spawn.displayStdStroke = 2; // pixels
	spawn.displayStdColums = 10; // neurons
	spawn.displayStdRows = 10; // neurons;
	spawn.displayStdSpacing = 30; // pixels;
	spawn.displayStdPadding = 10; // pixels;
	
	spawn.displayStdOuterDiameter = (2 * spawn.displayStdInnerRadius) + (2 * spawn.displayStdStroke) + spawn.displayStdSpacing;
	
	spawn.displayStdAreaWidth = (spawn.displayStdColums * spawn.displayStdOuterDiameter) + (2 * spawn.displayStdPadding);
	spawn.displayStdAreaHeight = (spawn.displayStdRows * spawn.displayStdOuterDiameter) + (2 * spawn.displayStdPadding);
	
	// Calculate how much width & height needs to be added to canvas (in addition to input) to accommodate neurons.
	var widthMod = spawn.displayStdAreaWidth;
	var heightMod = (gfxIn.height < spawn.displayStdAreaHeight)? spawn.displayStdAreaHeight - gfxIn.height : 0;
	
	// Instantiate output graphics controller.
	spawn.gfxOut = gfx_instantiate(canvasId, gfxIn.width + widthMod, gfxIn.height + heightMod);
	
	spawn.sampleRate = 1 / 30;
	
	spawn.currentFrameStart = num.timestamp();
	spawn.previousFrameStart = spawn.currentFrameStart;
	
	spawn.deltaFrameTime = 0;
	spawn.deltaSampleTime = 0;
	
	spawn.outputs = outputs;
	
	spawn.getFitness = getFitness;
	spawn.hasCompletedTask = hasCompletedTask;
	spawn.hasStagnated = hasStagnated;
	
	spawn.neurons = [];
	spawn.axions = [];
	
	spawn.rateSensorNeuron = (1/3);
	spawn.rateInversion = (1/2);
	
	spawn.frame = driver_frame;
	spawn.update = driver_update;
	spawn.updateRGBNeurons = driver_updateRGBNeurons;
	spawn.updateStdNeurons = driver_updateStdNeurons;
	spawn.updateAxions = driver_updateAxions;
	spawn.render = driver_render;
	spawn.spawnNeuron = driver_spawnNeuron;
	spawn.spawnAxion = driver_spawnAxion;
	
	for(var i = 0; i < 15; i++)
		spawn.spawnNeuron();
	
	for(var i = 0; i < 45; i++)
		spawn.spawnAxion();
	
	spawn.frame();
	
	return spawn;
}