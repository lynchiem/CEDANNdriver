// MODULE: 	CEDANNdriver/neuroclass.js
// DESC: 	CEDANN compatible generic neural network classification.
// AUTHOR: 	matt@matthewlynch.net
// DATED: 	2017-11-02

function neuroclass_newGeneration(generation, maxPopulation)
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
	
	// Reset the next network pointer.
	self.nextNetworkIndex = 0;
	
	// Abort if there are no networks.
	if(self.networks.length == 0)
		return;
	
	var newNetworks = [];
	
	// Before we can create a new generation, we need to cull the existing
	// generation and select a breeding pool. The first step in doing this
	// is to sort the networks by fitness.
	var breedingNetworks = self.networks.sort(function(a, b) { return b.fitness - a.fitness; });
	
	// Next we cull the weakest half of the existing population (which we
	// only do if there are more than two networks in current generation).
	var maxBreederIndex = Math.ceil(breedingNetworks.length / 2) - 1;
	
	breedingNetworks = (breedingNetworks.length > 2)? breedingNetworks.splice(0, maxBreederIndex) : breedingNetworks;
	
	// To make sure we don't go backwards, we copy the fittest network with
	// no mutation of breeding.
	var fittestNetwork = self.createNetwork();
	breedingNetworks[0].clone(fittestNetwork);
	
	newNetworks.push(fittestNetwork);
	
	// We also make the fittest network the new reference for the classification.
	// (In a speciated evolution the fittest network could be a new species, but
	// for our classified evolution we always keep the fittest in place to ensure
	// an existing classification doesn't go backwards).
	self.referenceNetwork = fittestNetwork;
	
	// Stop if we have already reached population cap (the min. population is always
	// one, even if the passed in population cap is lower).
	if(newNetworks.length >= maxPopulation)
	{
		self.networks = newNetworks;
		
		return;
	}
	
	// Next we want to clone random healthy networks, with the possibility for mutations.
	var clonePopulation = (maxPopulation - 1 * 0.25);
	var maxCloneIndex = Math.ceil(breedingNetworks.length / 2) - 1;
	
	while(newNetworks.length < clonePopulation + 1)
	{
		var parentNetwork = breedingNetworks[num.randomInt(0, maxCloneIndex)];
		var cloneNetwork = self.createNetwork();
		
		parentNetwork.clone(cloneNetwork);
		
		for(var i = 0; i < Math.floor(self.mutationMultiplier); i++)
			cloneNetwork.mutateNetwork(generation);
		
		newNetworks.push(cloneNetwork);
	}
	
	// For the remainder, we will randomly select two networks and breed them.
	while(newNetworks.length < maxPopulation)
	{
		var indexA = num.randomInt(0, breedingNetworks.length - 1);
		var indexB = num.randomInt(0, breedingNetworks.length - 1);
		
		if(indexA == indexB)
		{
			// If we randomly selected the same network twice, we will just clone it,
			// but we will run multiple mutation cycles.
			//
			// Consider it the neural network version of "kissing cousins".
			var parentNetwork = breedingNetworks[indexA];
			var cloneNetwork = self.createNetwork();

			parentNetwork.clone(cloneNetwork);
			
			for(var i = 0; i < (5 * Math.floor(self.mutationMultiplier)); i++)
				cloneNetwork.mutateNetwork(generation);
			
			newNetworks.push(cloneNetwork);
		}
		else
		{
			var parentNetworkA = breedingNetworks[indexA];
			var parentNetworkB = breedingNetworks[indexB];
			var childNetwork = self.createNetwork();
			
			parentNetworkA.breed(parentNetworkB, childNetwork, generation);
			
			newNetworks.push(childNetwork);
		}
	}
	
	self.networks = newNetworks;
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
	
	spawn.nextNetwork = neuroclass_nextNetwork;
	spawn.createNetwork = createNetworkHook;
	spawn.newGeneration = neuroclass_newGeneration;
	
	return spawn;
}