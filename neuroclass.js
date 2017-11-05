// MODULE: 	CEDANNdriver/neuroclass.js
// DESC: 	CEDANN compatible generic neural network classification.
// AUTHOR: 	matt@matthewlynch.net
// DATED: 	2017-11-02

function neuroclass_updateAverageFitness()
{
	var self = this;
	
	var totalFitness = 0;
	
	for(var i = 0; i < self.networks.length; i++)
		totalFitness += (self.networks[i].fitness != null)? self.networks[i].fitness : self.minFitness;
	
	var averageFitness = totalFitness / self.networks.length;
	
	if(averageFitness <= self.averageFitness)
		self.mutationMultiplier += 0.5;
	else
		self.mutationMultiplier = 1;
	
	self.averageFitness = averageFitness;
}

function neuroclass_getFittestNetwork()
{
	var self = this;
	
	var sortedNetworks = self.networks.sort(function(a, b) { return b.fitness - a.fitness; });
	
	if(sortedNetworks.length > 0)
		return sortedNetworks[0];
	else
		return null;
}

function neuroclass_newGeneration(generation)
{
	var self = this;
	
	// Reset the next network pointer.
	self.nextNetworkIndex = 0;
	
	// Abort if there are no networks.
	if(self.networks.length == 0)
		return;
	
	var survivors = [];
	var outcasts = [];
	var descendants = [];
	
	survivors = self.networks.sort(function(a, b) { return b.fitness - a.fitness; });
	
	var strongestNetwork = survivors[0];
	
	// While the strongest network always survives, other networks will only
	// survive if they are compatible with the strongest.
	for(var i = survivors.length - 1; i >= 1; i--)
	{
		var network = survivors[i];
		
		if(strongestNetwork.isCompatible(network))
			continue;
		
		// If the network is not compatible with the strongest network in the
		// generation, it is outcast.
		
		// Add to list of outcasts.
		outcasts.push(network);
		
		// Remove from list of survivors.
		survivors.splice(i, 1);
	}
	
	// If there are more than 5 survivors (including the strongest), the weaker
	// are allowed to produce up to 5 descendants, but they are immediately outcast.
	if(survivors.length > 5)
	{	
		// Remove the wealkings from the list of survivors.
		var weaklings = survivors.splice(5, survivors.length - 5);
		
		// Shuffle weaklings to decide who gets to breed if there are not an even
		// number of weak networks.
		for(var i = weaklings.length - 1; i > 0; i--)
		{
			var j = Math.floor(Math.random() * (i + 1));
			var temp = weaklings[i];
			
			weaklings[i] = weaklings[j];
			weaklings[j] = temp;
		}
		
		var weakDescendants = [];
		
		for(var i = 0; i < weaklings.length; i++)
		{
			if(weakDescendants.length >= 5)
				break;
			
			if(i + 1 < weaklings.length)
			{
				var childNetwork = self.createNetwork();
				
				weaklings[i].breed(weaklings[i + 1], childNetwork, generation);
				
				childNetwork.mutateNetwork(generation);
				
				weakDescendants.push(childNetwork);
			}
		}
		
		outcasts = outcasts.concat(weakDescendants);
	}
	
	// The strongest network gets two clones, one with mutation and one without.
	var strongCloneA = self.createNetwork();
	var strongCloneB = self.createNetwork();
	
	strongestNetwork.clone(strongCloneA);
	strongestNetwork.clone(strongCloneB);
	
	strongCloneB.mutateNetwork(generation);
	
	descendants.push(strongCloneA);
	descendants.push(strongCloneB);
	
	// Each of the survivors also gets a clone, with mutation.
	for(var i = 1; i < survivors.length; i++)
	{
		var network = survivors[i];
		var cloneNetwork = self.createNetwork();
		
		network.clone(cloneNetwork)
		
		cloneNetwork.mutateNetwork(generation);
		
		descendants.push(network);
	}
	
	// The rest of the descendants will be the result of the strongest network
	// breeding with other survivors.
	var clonePenalty = 0;
	
	while(descendants.length < 10)
	{
		if(survivors.length == 1)
		{
			// If the strongest network is the only survivor, cloning can be used,
			// but with a heavy mutation penalty.
			var cloneNetwork = self.createNetwork();
			
			strongestNetwork.clone(cloneNetwork)
			
			for(var i = 0; i < 5 + clonePenalty; i++)
				cloneNetwork.mutateNetwork(generation);
			
			descendants.push(cloneNetwork);
			
			clonePenalty += 1;
		}
		else
		{
			for(var i = 1; i < survivors.length; i++)
			{
				var network = survivors[i];
				var childNetwork = self.createNetwork();
				
				strongestNetwork.breed(network, childNetwork, generation);
				
				childNetwork.mutateNetwork(generation);
				
				descendants.push(childNetwork);
			}
		}
	}
	
	self.referenceNetwork = strongCloneA;
	self.networks = descendants;
	
	return outcasts;
}

function neuroclass_nextNetwork()
{
	var self = this;
	
	// Abort if there are no networks available, or if we have already
	// passed the final network.
	if(self.networks.length == 0 || self.nextNetworkIndex > self.networks.length - 1)
		return;
		
	var network = self.networks[self.nextNetworkIndex];
	
	self.nextNetworkIndex += 1;
	
	return network;
}

function neuroclass_initiate(referenceNetwork, createNetworkHook)
{
	var spawn = {};
	
	spawn.minFitness = -12500;
	
	spawn.averageFitness = 0;
	spawn.mutationMultiplier = 1;
	
	spawn.referenceNetwork = referenceNetwork;
	spawn.networks = [];
	
	spawn.networks.push(referenceNetwork);
	
	spawn.nextNetworkIndex = 0;
	
	spawn.updateAverageFitness = neuroclass_updateAverageFitness;
	spawn.nextNetwork = neuroclass_nextNetwork;
	spawn.createNetwork = createNetworkHook;
	spawn.newGeneration = neuroclass_newGeneration;
	spawn.getFittestNetwork = neuroclass_getFittestNetwork;
	
	return spawn;
}