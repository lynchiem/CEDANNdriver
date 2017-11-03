// MODULE: 	CEDANNdriver/neuronet.js
// DESC: 	CEDANN compatible generic neural network.
// AUTHOR: 	matt@matthewlynch.net
// DATED: 	2017-11-02

function neuronet_scoreSensorVariance(otherNetwork)
{
	var self = this;
	
	var maxSensors = Math.max(self.sensors.length, otherNetwork.sensors.length);
	
	if(maxSensors == 0)
		return 0;
	
	var matchingSensors = 0;
	
	for(var i = 0; i < self.sensors.length; i++)
	{
		var sensorA = self.sensors[i];
		
		for(var j = 0; j < otherNetwork.sensors.length; j++)
		{
			var sensorB = otherNetwork.sensors[j];
		
			matchingSensors += (self.compareSensor(sensorA, sensorB))? 1 : 0;
		}
	}
	
	var differingSensors = num.limit(maxSensors - matchingSensors, 0, maxSensors);
	
	return (differingSensors / maxSensors);
}

function neuronet_scoreDisjointAxions(otherNetwork)
{
	var self = this;
	
	var maxAxions = Math.max(self.axions.length, otherNetwork.axions.length);
	
	if(maxAxions == 0)
		return 0;
	
	var innovationsA = [];
	var innovationsB = [];
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		innovationsA[axion.innovation] = true;
	}
	
	for(var i = 0; i < otherNetwork.axions.length; i++)
	{
		var axion = otherNetwork.axions[i];
		
		innovationsB[axion.innovation] = true;
	}
	
	var disjointAxions = 0;
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		disjointAxions += (innovationsB[axion.innovation] == null)? 1 : 0;
	}
	
	for(var i = 0; i < otherNetwork.axions.length; i++)
	{
		var axion = otherNetwork.axions[i];
		
		disjointAxions += (innovationsA[axion.innovation] == null)? 1 : 0;
	}
	
	return (disjointAxions / maxAxions);
}

function neuronet_scoreAxionWeightDiff(otherNetwork)
{
	var self = this;
	
	var maxAxions = Math.max(self.axions.length, otherNetwork.axions.length);
	
	if(maxAxions == 0)
		return 0;
	
	var innovationsB = [];
	
	for(var i = 0; i < otherNetwork.axions.length; i++)
	{	
		var axion = otherNetwork.axions[i];

		innovationsB[axion.innovation] = axion;
	}
	
	var sum = 0;
	var coincident = 0;
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axionA = self.axions[i];
		var axionB = innovationsB[axionA.innovation];
		
		if(axionB != null)
		{
			sum = sum + Math.abs(axionA.weight - axionB.weight);
			coincident = coincident + 1;
		}
	}
	
	if(coincident == 0)
		return 0;
	
	return (sum / coincident);
}

function neuronet_isCompatible(otherNetwork)
{
	var self = this;
	
	var compatibilityScore = 0.0;
	
	compatibilityScore += 2.0 * self.scoreDisjointAxions(otherNetwork);
	compatibilityScore += 0.5 * self.scoreAxionWeightDiff(otherNetwork);
	compatibilityScore += self.scoreSensorVariance(otherNetwork);
	
	return (compatibilityScore < 2.0);
}

function neuronet_breed(partnerNetwork, childNetwork, generation)
{
	var self = this;
	
	// NOTE: Because hooks can't be safely copied, the child network must
	// be pre-initialised with appropriate hooks. Breeding will simply
	// populate neurons, axions, etc.
	
	// Before we can breed two networks, we need to define their genomes,
	// which is their axions spaced out by innovation.
	//
	// We focus on axions, because they have a more meaningful impact on
	// networks. Neurons are basically interchangable.
	var fittestGenome = [];
	var weakestGenome = [];
	
	var minInnovation = Number.MAX_VALUE;
	var maxInnovation = 0;
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		minInnovation = (axion.innovation < minInnovation)? axion.innovation : minInnovation;
		maxInnovation = (axion.innovation > maxInnovation)? axion.innovation : maxInnovation;
		
		var genome = {
			origin: "local", 
			axion: axion, 
			inputNeuron: self.getNeuronByLayer(axion.inputNeuronLayer), 
			outputNeuron: self.getNeuronByLayer(axion.outputNeuronLayer)
		};
		
		if(self.fitness > partnerNetwork.fitness)
			fittestGenome[axion.innovation] = genome;
		else
			weakestGenome[axion.innovation] = genome;
	}
	
	for(var i = 0; i < partnerNetwork.axions.length; i++)
	{
		var axion = partnerNetwork.axions[i];
		
		minInnovation = (axion.innovation < minInnovation)? axion.innovation : minInnovation;
		maxInnovation = (axion.innovation > maxInnovation)? axion.innovation : maxInnovation;
		
		var genome = {
			origin: "partner", 
			axion: axion, 
			inputNeuron: self.getNeuronByLayer(axion.inputNeuronLayer), 
			outputNeuron: self.getNeuronByLayer(axion.outputNeuronLayer)
		};
		
		if(partnerNetwork.fitness > self.fitness)
			fittestGenome[axion.innovation] = genome;
		else
			weakestGenome[axion.innovation] = genome;
	}
	
	var sensorsMeta = [];
	
	// Copy unique sensors from local (self), and make note of any index changes.
	for(var i = 0; i < self.sensors.length; i++)
	{
		var sensorJson = JSON.stringify(self.sensors[i]);
		var sensor = JSON.parse(sensorJson);
		
		var newIndex = null;
		
		for(var j = 0; j < childNetwork.sensors.length; j++)
		{
			if(self.compareSensor(sensor, childNetwork.sensors[j]))
			{
				newIndex = j;
				
				break;
			}
		}
		
		if(newIndex == null)
		{
			newIndex = childNetwork.sensors.length;
			
			childNetwork.sensors.push(sensor);
		}
		
		sensorsMeta.push({origin: "local", oldIndex: i, newIndex: newIndex});
	}
	
	// Copy unique sensors from partner, and make note of any index changes.
	for(var i = 0; i < partnerNetwork.sensors.length; i++)
	{
		var sensorJson = JSON.stringify(partnerNetwork.sensors[i]);
		var sensor = JSON.parse(sensorJson);
		
		var newIndex = null;
		
		for(var j = 0; j < childNetwork.sensors.length; j++)
		{
			if(self.compareSensor(sensor, childNetwork.sensors[j]))
			{
				newIndex = j;
				
				break;
			}
		}
		
		if(newIndex == null)
		{
			newIndex = childNetwork.sensors.length;
			
			childNetwork.sensors.push(sensor);
		}
		
		sensorsMeta.push({origin: "partner", oldIndex: i, newIndex: newIndex});
	}
	
	// Now that we have the genomes laid out, we can start breeding.
	for(var i = minInnovation; i <= maxInnovation; i++)
	{
		var chance = (Math.random() * (0.75 - 0.50) + 0.50).toFixed(4);
		
		var genome = null;
		 
		if(Math.random() < chance)
			genome = fittestGenome[i];
		else
			genome = weakestGenome[i];
		
		if(genome ==  null)
			continue;
		
		childNetwork.createAxion(genome.axion.inputNeuronLayer, genome.axion.outputNeuronLayer, generation, genome.axion.innovation);
		
		var inputNeuronJson = JSON.stringify(genome.inputNeuron);
		var inputNeuron = JSON.parse(inputNeuronJson);
		
		var outputNeuronJson = JSON.stringify(genome.outputNeuron);
		var outputNeuron = JSON.parse(outputNeuronJson);
		
		if(inputNeuron.sensorIndex != null || outputNeuron.sensorIndex != null)
		{
			for(var i = 0; i < sensorsMeta.length; i++)
			{
				var sensorMeta = sensorsMeta[i];
				
				if(genome.origin == sensorMeta.origin && inputNeuron.sensorIndex == sensorMeta.oldIndex)
					inputNeuron.sensorIndex = sensorMeta.newIndex;
				if(genome.origin == sensorMeta.origin && outputNeuron.sensorIndex == sensorMeta.oldIndex)
					outputNeuron.sensorIndex = sensorMeta.newIndex;
			}
		}
		
		var conflictingInputNeuron = childNetwork.getNeuronByLayer(inputNeuron.layer);
		
		if(conflictingInputNeuron == null)
			childNetwork.push(inputNeuron);
		
		var conflictingOutputNeuron = childNetwork.getNeuronByLayer(outputNeuron.layer);
		
		if(conflictingOutputNeuron == null)
			childNetwork.push(outputNeuron);
	}
}

function neuronet_clone(targetNetwork)
{
	var self = this;
	
	// NOTE: This is not a complete clone. Hooks can not be safely cloned,
	// so this clone function assumes a new network has been created with
	// appropriate hooks.
	//
	// This function will simply clone all the value components like neurons,
	// axions, sensors, and actuators.
	
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuronJson = JSON.stringify(self.neurons[i]);
		var neuron = JSON.parse(neuronJson);
		
		// We don't want to copy actuator neurons, as they are externally added.
		if(neuron.layer < self.SPECIAL_LAYERS.ACTUATORS)
			targetNetwork.neurons.push(neuron);
	}
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axionJson = JSON.stringify(self.axions[i]);
		var axion = JSON.parse(axionJson);
		
		targetNetwork.axions.push(axion);
	}
	
	for(var i = 0; i < self.sensors.length; i++)
	{
		var sensorJson = JSON.stringify(self.sensors[i]);
		var sensor = JSON.parse(sensorJson);
		
		targetNetwork.sensors.push(sensor);
	}
}

function neuronet_propogateNeuron(inputNeuron, generation)
{
	var self = this;
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		if(!axion.enabled)
			continue;
		
		if(axion.inputNeuronLayer != inputNeuron.layer)
			continue;
		
		var outputNeuron = self.getNeuronByLayer(axion.outputNeuronLayer);
		
		outputNeuron.input += inputNeuron.output * axion.weight;
		
		axion.lastActivity = generation;
		outputNeuron.lastActivity = generation;
	}
}

function neuronet_evaluate(generation)
{
	var self = this;
	
	// We should only ever propogate forward, so the first thing we need to do
	// is sort the neurons by layer.
	var sortedNeurons = self.neurons.sort(function(a, b) { return a.layer - b.layer; });
	
	// We also need to reset any previously accumulated inputs on blackbox ("hidden") neurons
	// and actuator neurons.
	//
	// To save on loops, we should also read in external inputs for sensors at the same time.
	for(var i = 0; i < sortedNeurons.length; i++)
	{
		var neuron = sortedNeurons[i];
		
		if(neuron.sensorIndex != null)
		{
			var sensor = self.sensors[neuron.sensorIndex];
			
			neuron.input = sensor.output;
			neuron.output = 0.0;
		}
		else
		{
			neuron.input = 0.0;
			neuron.output = 0.0;
		}
	}
	
	// Now we can just work through our neurons in (layer) order and propogate.
	// While multiple sensors & actuators can exist on the same layer, they can't be linked.
	// Blackbox ("hidden") neurons will all exist on their own layers.
	for(var i = 0; i < sortedNeurons.length; i++)
	{
		var neuron = sortedNeurons[i];
		
		// Rather than simply passing on accumulated inputs, we instead run them through
		// a sigmoid function to introduce nonlinearity. This also effectively normalises
		// the output (in the case of TanH to [-1, 1];
		neuron.output = Math.tanh(neuron.input);
		
		if(neuron.actuatorIndex != null)
		{
			var actuator = self.actuators[neuron.actuatorIndex];
			
			actuator.output = neuron.output;
		}
		
		self.propogateNeuron(neuron, generation);
	}
}

function neuronet_getNeuronByLayer(layer)
{
	var self = this;
	var result = null;
	
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuron = self.neurons[i];
		
		if(neuron.layer == layer)
		{
			result = neuron;
			
			break;
		}
	}
	
	return result;
}

function neuronet_createNeuron(layer, sensorIndex, actuatorIndex, generation)
{
	var self = this;
	
	var correctedLayer = layer;
	
	if(layer < self.LIMITS.MAX_SENSORS && sensorIndex == null)
	{
		correctedLayer = self.LIMITS.MAX_SENSORS;
	}
	else if(layer == self.SPECIAL_LAYERS.SENSORS && sensorIndex != null)
	{
		var highestSensorLayer = 0;
		
		for(var i = 0; i < self.neurons.length; i++)
		{
			var neuron = self.neurons[i];
			
			if(neuron.layer < self.LIMITS.MAX_SENSORS && neuron.layer > highestSensorLayer)
				highestSensorLayer = neuron.layer;
		}
		
		correctedLayer = highestSensorLayer + 1;
	}
	else if(layer == self.SPECIAL_LAYERS.ACTUATORS && actuatorIndex != null)
	{
		var highestActuatorLayer = self.SPECIAL_LAYERS.ACTUATORS;
		
		for(var i = 0; i < self.neurons.length; i++)
		{
			var neuron = self.neurons[i];
			
			if(neuron.layer >= self.SPECIAL_LAYERS.ACTUATORS && neuron.layer > highestActuatorLayer)
				highestActuatorLayer = neuron.layer;
		}
		
		correctedLayer = highestActuatorLayer + 1;		
	}
	
	var neuron = {
		
		layer: correctedLayer,
		sensorIndex: sensorIndex,
		actuatorIndex: actuatorIndex,
		input: 0.0,
		output: 0.0,
		lastActivity: generation
		
	};
	
	self.neurons.push(neuron);
	
	return neuron;
}

function neuronet_spawnNeuron(generation)
{
	var self = this;
	
	// If there are no sensors, we should force the creation of one.
	var newSensorRate = (self.LIMITS.MAX_SENSORS > 0 && self.sensors.length == 0)? 1.0 : self.MUTATION_RATES.NEW_SENSOR;
	
	// Roll to determine if this neuron will be a sensor.
	var sensorIndex = (self.sensors.length < self.LIMITS.MAX_SENSORS && Math.random() < newSensorRate)? self.newSensor() : null;
	
	// If we rolled a sensor, we can just create it and exit.
	if(sensorIndex != null)
		return self.createNeuron(self.SPECIAL_LAYERS.SENSORS, sensorIndex, null, generation);
	
	// If we didn't roll a sensor, things are a bit more complicated.
	
	// To prevent chaos, we should only insert blackbox ("hidden") neurons
	// along an existing axion.
	//
	// We should also only intersect active axions.
	var activeAxions = [];
	
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		if(axion.enabled)
			activeAxions.push(axion);
	}
	
	// Abort if there are no active axions to intersect.
	if(activeAxions.length == 0)
		return;
	
	var targetAxion = activeAxions[num.randomInt(0, activeAxions.length - 1)];
	
	var inputNeuron  = self.getNeuronByLayer(targetAxion.inputNeuronLayer);
	var outputNeuron = self.getNeuronByLayer(targetAxion.outputNeuronLayer);
	
	// Now we need to "move" all neurons up one layer, starting with the
	// neurons to the left of the input of the target axion.
	// 
	// The reason we need to do this is that we can only propagate forward,
	// and we need to maintain the integrity of the network.
	var intersectLayer = inputNeuron.layer + 1;
	
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuron = self.neurons[i];
		
		if(neuron.layer >= self.SPECIAL_LAYERS.ACTUATORS)
			continue;
		
		neuron.layer += (neuron.layer >= intersectLayer)? 1 : 0;
	}
	
	// We also need to update any axions that were pointing to neurons that
	// we moved.
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		axion.inputNeuronLayer += (axion.inputNeuronLayer >= intersectLayer && axion.inputNeuronLayer < self.SPECIAL_LAYERS.ACTUATORS)? 1 : 0;
		axion.outputNeuronLayer += (axion.outputNeuronLayer >= intersectLayer && axion.outputNeuronLayer < self.SPECIAL_LAYERS.ACTUATORS)? 1 : 0;
	}
	
	// With "space" created for our new neuron, we can now create it.
	var newNeuron = self.createNeuron(intersectLayer, null, null, generation);
	
	// Now we need to create two new axions to link the input neuron to the new neuron,
	// and to link the new neuron to the output neuron.
	var inputAxion = self.createAxion(inputNeuron.layer, newNeuron.layer, generation);
	var outputAxion = self.createAxion(newNeuron.layer, outputNeuron.layer, generation);
	
	// We also need to adjust the weights of the axions to preserve the previous
	// weight of the network.
	inputAxion.weight = 1.0;
	outputAxion.weight = targetAxion.weight;
	
	// Finally we need to destroy the axion that we intersected.
	// We can't just disable it (think of it like cutting it in half).
	targetAxion.destroy = true;
	
	for (var i = self.axions.length - 1; i >= 0; i--)
	{
		var axion = self.axions[i];
		
		if(axion.destroy)
			self.axions.splice(i, 1);
	}
}

function neuronet_createAxion(inputNeuronLayer, outputNeuronLayer, generation, innovation)
{
	var self = this;
	
	// prevent duplicate axions
	for(var i = 0; i < self.axions.length; i++)
	{
		var axion = self.axions[i];
		
		if(axion.inputNeuronLayer == inputNeuronLayer && axion.outputNeuronLayer == outputNeuronLayer)
			return;
	}
	
	var axion = {
		
		innovation: innovation || self.newInnovation(),
		enabled: true,
		weight: (Math.random() * 2.0) - 1.0, // [-1.0, 1.0)
		inputNeuronLayer: inputNeuronLayer,
		outputNeuronLayer: outputNeuronLayer,
		lastActivity: generation
		
	};
	
	self.axions.push(axion);
	
	return axion;
}

function neuronet_spawnAxion(generation)
{
	var self = this;

	// The axion can originate from any neuron except actuators.
	var validInputNeurons = [];
	
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuron = self.neurons[i];
		
		if(neuron.actuatorIndex != null)
			continue;
		else
			validInputNeurons.push(neuron);
	}
	
	// Abort if there are no valid input neurons.
	if(validInputNeurons.length == 0)
		return;
	
	var inputNeuron = validInputNeurons[num.randomInt(0, validInputNeurons.length - 1)];
	
	// The axion can terminate at any neuron in a layer higher than the originating neuron.
	// This includes actuators.
	var validOutputNeurons = [];
	
	for(var i = 0; i < self.neurons.length; i++)
	{
		var neuron = self.neurons[i];
		
		if(neuron.layer <= inputNeuron.layer || neuron.sensorIndex != null)
			continue;
		else
			validOutputNeurons.push(neuron);
	}
	
	// Abort if there are no valid output neurons.
	if(validOutputNeurons.length == 0)
		return;
	
	var outputNeuron = validOutputNeurons[num.randomInt(0, validOutputNeurons.length - 1)];
	
	return self.createAxion(inputNeuron.layer, outputNeuron.layer, generation);
}

function neuronet_mutateNetwork(generation)
{
	var self = this;
	
	// If there are no input-compatible neurons, we should force the creation of one.
	// The network can't evolve without some starting structure.
	var newNeuronRate = (self.neuronCount == 0)? 1.0 : self.MUTATION_RATES.NEW_NEURON;
	
	if(Math.random() < newNeuronRate)
		self.spawnNeuron(generation);
	
	if(self.axions.length == 0)
		self.spawnAxion(generation);
	
	if(self.axions.length < self.LIMITS.MAX_AXIONS && Math.random() < self.MUTATION_RATES.NEW_AXION)
		self.spawnAxion(generation);
	
	if(self.axions.length > 0 && Math.random() < self.MUTATION_RATES.TOGGLE_AXION)
	{
		var randomAxion = self.axions[num.randomInt(0, self.axions.length - 1)];
		
		randomAxion.enabled = !randomAxion.enabled;
	}
	
	if(self.axions.length > 0 && Math.random() < self.MUTATION_RATES.ALTER_AXION)
	{
		var randomAxion = self.axions[num.randomInt(0, self.axions.length - 1)];
		var newWeight = randomAxion.weight;
		
		// Roll to decide if we completely replace weight with a new random value.
		newWeight = (Math.random() < self.MUTATION_RATES.REPLACE_WEIGHT)? ((Math.random() * 2.0) - 1.0) : newWeight;
		
		// Roll to decide if we tweak the weight by a small amount [-0.05 to 0.05).
		newWeight += (Math.random() < self.MUTATION_RATES.ALTER_WEIGHT)? ((Math.random() * 0.1) - 0.05) : 0;
		
		// Assign the (possibly) modified weight.
		randomAxion.weight = newWeight;
		
		randomAxion.lastActivity = generation;
	}
	
	if(self.sensors.length > 0 && Math.random() < self.MUTATION_RATES.ALTER_SENSOR)
	{
		var randomSensor = self.sensors[num.randomInt(0, self.sensors.length - 1)];
		
		self.mutateSensor(randomSensor);
		
		randomSensor.lastActivity = generation;
	}
	
	
	// The underlying design principle for this form of neural network is to use innovation
	// to solve a problem with as minimalistic a structure as possible. As such we need to
	// periodically cull "dead weight" in the form of axions or neurons that are effectively
	// doing nothing.
	
	// Cull any axions that have been disabled for over {self.LIMITS.DORM_GENS} generations,
	// or that have been zeroing values for that long (effectively disabled).
	// for (var i = self.axions.length - 1; i >= 0; i--)
	// {
		// var axion = self.axions[i];
		// var cull = false;

		// if(axion.lastActivity >= generation - self.LIMITS.DORM_GENS)
			// continue;

		// if(!axion.enabled)
			// cull = true; // effectively zero
		
		// if(axion.weight > -0.0001 && axion.weight < 0.0001)
			// cull = true; // effectively zero

		// if (cull)
			// self.axions.splice(i, 1);
	// }
	
	// Cull any blackbox ("hidden") neurons that have not received any propogated
	// values in over {self.LIMITS.DORM_GENS} generations.
	// for(var i = 1; i < self.LIMITS.MAX_LAYERS - 2; i++)
	// {
		// var layerIndex = "L" + i.toString(16);
		// var layer = self.layers[layerIndex];
		
		// if(layer == null)
			// continue;
		
		// for(var j = 0; j < self.LIMITS.MAX_NEURONS; j++)
		// {
			// var nodeIndex = "N" + j.toString(16);
			// var neuron = layer[nodeIndex];
			
			// if(neuron != null && neuron.lastActivity < generation - self.LIMITS.DORM_GENS)
			// {
				// layer[nodeIndex] = null;
				
				// Remove any axions that were attached to the dormant neuron.
				// These axions are either dormant, or are effectively dormant by
				// collectively zeroing all values destined for the neuron.
				// for (var k = self.axions.length - 1; k >= 0; k--)
				// {
					// var axion = self.axions[k];
					// var cull = false;
					
					// if(axion.inputNeuronKey.layerIndex == layerIndex && axion.inputNeuronKey.nodeIndex == nodeIndex)
						// cull = true;
					
					// if(axion.outputNeuronKey.layerIndex == layerIndex && axion.outputNeuronKey.nodeIndex == nodeIndex)
						// cull = true;
					
					// if (cull)
						// self.axions.splice(k, 1);
				// }
			// }
		// }
	// }
	
}

function neuronet_initiate(newInnovationHook, newSensorHook, mutateSensorHook, compareSensorHook)
{
	var spawn = {};
	
	spawn.fitness = null;
	
	spawn.neurons   = [];
	spawn.axions    = [];	
	spawn.sensors   = [];
	spawn.actuators = [];
	
	
	// Register external integration hooks.
	spawn.newInnovation = newInnovationHook;
	spawn.newSensor = function() { spawn.sensors.push(newSensorHook()); return (spawn.sensors.length - 1);  };
	spawn.mutateSensor = mutateSensorHook;
	spawn.compareSensor = compareSensorHook;
	
	
	// Define mutation functions.
	spawn.clone = neuronet_clone;
	spawn.breed = neuronet_breed;
	spawn.mutateNetwork = neuronet_mutateNetwork;
	spawn.spawnNeuron = neuronet_spawnNeuron;
	spawn.spawnAxion = neuronet_spawnAxion;
	spawn.createNeuron = neuronet_createNeuron;
	spawn.createAxion = neuronet_createAxion;
	spawn.getNeuronByLayer = neuronet_getNeuronByLayer;
	
	
	// Define evaluation functions.
	spawn.evaluate = neuronet_evaluate;
	spawn.propogateNeuron = neuronet_propogateNeuron;
	spawn.scoreAxionWeightDiff = neuronet_scoreAxionWeightDiff;
	spawn.scoreDisjointAxions = neuronet_scoreDisjointAxions;
	spawn.scoreSensorVariance = neuronet_scoreSensorVariance;
	spawn.isCompatible = neuronet_isCompatible;
	
	
	// Define constants.
	spawn.SPECIAL_LAYERS = {
		
		SENSORS: 0,
		ACTUATORS: 1000000
		
	};
	
	spawn.MUTATION_RATES = {
		
		NEW_AXION: 		0.15,
		NEW_NEURON: 	0.10,
		NEW_SENSOR: 	0.25, // for new neuron
		ALTER_AXION: 	0.80,
		ALTER_WEIGHT: 	0.90, // for axion alteration
		REPLACE_WEIGHT: 0.10, // for axion alteration
		ALTER_SENSOR: 	0.50,
		TOGGLE_AXION: 	0.00
		
	};
	
	spawn.LIMITS = {
		
		MAX_NEURONS:   100, 
		MAX_SENSORS:   25, 
		MAX_ACTUATORS: 5, 
		MAX_AXIONS:    500, 
		DORM_GENS: 	   50   // gens an axion or neuron can be dormant before being culled
		
	};
	
	return spawn;
}

