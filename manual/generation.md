# Model generation

We start from processing graph definitions.

The first step is to validate the JSON schema to ensure that it is syntactically correct.
If this is the case, the model processing algorithm proceeds with creation of the main group.

Resource relationships are defined by pairs of related attributes, e.g.,
* Lyph.layers - Lyph.layerIn
* Lyph.internalNodes - Node.internalIn
* Lyph.internalLyphs - Lyph.internalIn,
* Link.source - Node.sourceOf
* Link.target - Link.targetOf
* Chain.root - Node.rootOf
* Chain.leaf - Node.leafOf

## Group processing:

1. *markAsTemplate* -  in each group, the first step is to revise lyph definitions and mark lyphs which are layers in some lyph template as templates too. Abstract lyphs are not shown in the model graph and having such lyphs explicitly marked as templates helps with model debugging (TODO example).
1. *replaceReferencesToTemplates* - at this stage, all references to materials and lyph templates are replaced with identifiers which point to unique lyphs instances subtyping original abstract definitions. This procedure helps users to define models in a more concise way by skipping definitions which can be automatically derived from abstract types. Lyph identifiers are composed on the parent resource identifier, template or material identifier, and a prefix that helps to identify the origin of the instance (generated from material, generated from lyph template, etc.) (TODO example)
1. *expandGroupTemplates* - process (most of the) group templates (channel and chain templates). This procedure typically creates many generated lyphs, links, nodes and subgroups which are included to the current group. Since newly created resources are defined before visual resources, most significantly, lyphs, are processed, their definitions in the code only specify necessary properties and rely on the tools to auto-complete the model. (TODO example with image)
1. *expandLyphTemplates* - at this stage, lyph definitions that refer to lyph templates get auto-completed - lyph template layers get replicated in such a way that each lyph instance contains unique layer instances which inherit a number of properties from their supertypes (TODO example with image).
1. *expandVillusTemplates* - villus is a small projection from a membrane, e.g., found in the mucous membranes of the intestines. ApiNATOMY villus template is defined by the number of layers in the villus and the number of levels the villus spreads into, visually reminding a telescopic tube. Villus templates have to be created after lyph template expansion as they are often housed by generated lyphs (TODO example with image).
1. *embedChainsToHousingLyphs* - position lyphs in generated chain groups on housing lyphs (TODO image).
1. *createTemplateInstances* - if required by the model, here we generate multiple instances of generic groups such as trees and channels. (TODO explain)
1. *replicateBorderNodes* - this method replicates nodes in embedded chains (more generally, nodes that must appear on two or more lyph borders) to be able to visualize them without conflicts in positional constraints (TODO example to explain)
1. *replicateInternalNodes* - clone nodes simultaneously required to be internal in at least two lyphs
1. *mapInternalResourcesToLayers* - reposition internal resources (lyphs and nodes)

\end{enumerate}