# Combative Evolution of Directed Acyclic Neural Networks (CEDANN)

CEDANN is an anthropomorphised twist on neuro-evolution, that focuses on the strongest (fittest) networks fighting for limited slots to continue their evolution.

Heavily inspired by NEAT (NeuroEvolution of Augmenting Topologies), but employing a combative outcast & redemption system over a more passive species system.

Where as NEAT will create a new species whenever a network diverges from its ancestor species (up to a species cap - behaviour beyond the cap varies by implementation), CEDANN offers a limited number of active breeding groups, with the strongest network in each generation rising to dominate its group. Any network that is not compatible with (has genetically diverged from) the new leader of the group will be outcast.

Furthermore, only the strongest half of active breeding groups will survive each generation, with the leaders of the weaker groups being outcast. This creates opportunities for the strongest outcasts from previous generations to return and create their own groups.

Active groups will also reintegrate any outcasts that become genetically compatible with their leader (through ongoing group or outcast mutation).

There are also a number of other notable differences from NEAT, with the combative theme applied to most aspects of the neuro-evolution, but the outcast & redemption system is the key variance.

The author makes no claims as to whether this combative approach provides any notable benefits over the more established NEAT methodology, and instead presents it as an interesting artefact of exploration of alternative methods.

Leveraging the more agressive cycle of combative neuro-evolution, CEDANN also explores allowing networks to evolve their inputs, rather than being restricted to a fixed set of pre-configured inputs. Without specific knowledge of the workings of the inputs, networks should be able to use a blackbox mechanism to request new inputs and mutate existing inputs throughout the network's evolution.

# CEDANNdriver

CEDANNdriver is a Javascript implementation of CEDANN, paired with a basic psuedo-3d racing game (based on tutorials by "Code inComplete". Using a blackbox mechanism that provides basic RGB sensors, and a fitness model based on distance & ideal lap time, CEDANN will attempt to learn to complete the racing course using only visual inputs.