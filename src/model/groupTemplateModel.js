import {Resource} from './resourceModel';
import {Lyph} from "./shapeModel";
import {Link, Node} from "./visualResourceModel";
import {Coalescence} from "./coalescenceModel";
import {
    mergeGenResource,
    mergeGenResources,
    findResourceByID,
    getNewID,
    getGenID,
    addBorderNode,
    $Field,
    $Color,
    $Prefix, $SchemaClass
} from "./utils";
import {logger} from './logger';
import {defaults, isObject, isArray, flatten} from 'lodash-bound';

/**
 * Group template
 * @property group
 */
export class GroupTemplate extends Resource{
    /**
     * Create empty group to accumulate resources generated from a template
     * @param template - tree or channel template
     * @param parentGroup - parent group
     */
    static createTemplateGroup(template, parentGroup){
        let group = template.group || {};
        group::defaults({
            [$Field.id]        : getGenID($Prefix.group, template.id),
            [$Field.name]      : template.name,
            [$Field.generated] : true
        });
        [$Field.links, $Field.nodes, $Field.lyphs].forEach(prop => {
            group[prop] = group[prop] || [];
            if ( group[prop].length > 0){
                logger.warn(`Generated group contains extra ${prop}: ${group[prop]}!`)
            }
        });

        if (!parentGroup.groups) { parentGroup.groups = []; }
        parentGroup.groups.push(group.id);
        return group;
    }
}


/**
 * Chain model
 * @property lyphs
 * @property housingLyphs
 * @property housingChain
 * @property housingRange
 * @property housingLayers
 */
export class Chain extends GroupTemplate {

    /**
     * Generate a group from tree template
     * @param parentGroup - model resources that may be referred from the template
     * @param chain - chain template in JSON
     */
    static expandTemplate(parentGroup, chain){
        if (!chain){
            logger.warn("Cannot expand undefined tree template");
            return;
        }

        if (chain.generated){
            return; //skip already expanded
        }

        chain.id = chain.id || getGenID("tree", getNewID());

        const isDefined = value => value && value::isArray() && value.length > 0;

        if ( !(chain.numLevels || isDefined(chain.levels) || isDefined(chain.lyphs) ||
            isDefined(chain.housingLyphs) || chain.housingChain)) {
            logger.warn(`Skipped chain template - it must have "numLevels" set to a positive number, provide a non-empty 
                "${$Field.lyphs}", "${$Field.levels}", or "${$Field.housingLyphs}" array, or a "${$Field.housingChain}" reference`, chain);
            return;
        }

        chain.group = this.createTemplateGroup(chain, parentGroup);

        function getTemplate(){
            let template = chain.lyphTemplate;
            if (template){
                if (template::isObject()){
                    if (!template.id) { template.id = getGenID(chain.id, "template"); }
                    mergeGenResource(chain.group, parentGroup, template, $Field.lyphs);
                    chain.lyphTemplate = template.id;
                } else {
                    //find lyph template to establish topology of the tree
                    template = (parentGroup.lyphs||[]).find(e => e.id === chain.lyphTemplate);
                    if (!template){
                        logger.error("Failed to find the lyph template definition in the parent group: ",
                            chain.lyphTemplate);
                    }
                }
            }
            return template;
        }

        function getTopology(level, N, template){
            if (template){
                if (level === 0) {
                    if ([Lyph.LYPH_TOPOLOGY["BAG+"], Lyph.LYPH_TOPOLOGY.BAG2, Lyph.LYPH_TOPOLOGY.CYST].includes(template.topology)) {
                        if (N === 1){
                            return Lyph.LYPH_TOPOLOGY.CYST;
                        }
                        return Lyph.LYPH_TOPOLOGY.BAG2;
                    }
                }
                if (level === N - 1) {
                    if ([Lyph.LYPH_TOPOLOGY["BAG-"], Lyph.LYPH_TOPOLOGY.BAG, Lyph.LYPH_TOPOLOGY.CYST].includes(template.topology)) {
                        return Lyph.LYPH_TOPOLOGY.BAG;
                    }
                }
            }
            return Lyph.LYPH_TOPOLOGY.TUBE;
        }

        function deriveFromLyphs(){

            let lyphs = chain.lyphs.map(lyphID => findResourceByID(parentGroup.lyphs, lyphID) || {
                "id": lyphID
            });

            if (chain.lyphTemplate){
                let template = getTemplate();
                lyphs.forEach(subtype => {
                    if (!subtype.supertype && !isDefined(subtype.layers)){
                        subtype.supertype = chain.lyphTemplate;
                        Lyph.clone(parentGroup.lyphs, template, subtype)
                    }
                })
            }

            let conveyingMaterials = lyphs.filter(lyph => lyph.layers && lyph.layers[0] && lyph.layers[0].materials).map(lyph => lyph.layers[0].materials)::flatten();
            conveyingMaterials = [...new Set(conveyingMaterials)];

            if (conveyingMaterials.length > 0){
                logger.warn("Incorrectly defined chain pattern - innermost layers do not convey the same material!", chain.lyphs);
            }

            let [start, end] = [$Field.root, $Field.leaf].map(prop => findResourceByID(parentGroup.nodes, chain[prop]));

            for (let i = 0; i < lyphs.length + 1; i++) {
                let nodeID = (i === 0 && chain.start)? chain.start: (i === lyphs.length && chain.leaf)? chain.leaf: getGenID(chain.id, $Prefix.node, i);
                let node = (i === 0 && start)
                    ? start
                    : (i === lyphs.length && end)
                        ? end
                        : {
                            [$Field.id]        : nodeID,
                            [$Field.color]     : $Color.Node,
                            [$Field.skipLabel] : true,
                            [$Field.generated] : true
                        };
                mergeGenResource(chain.group, parentGroup, node, $Field.nodes);
            }

            chain.levels = [];
            for (let i = 0; i < lyphs.length; i++) {
                let link = {
                    [$Field.id]                 : getGenID(chain.id, $Prefix.link, i + 1),
                    [$Field.source]             : chain.group.nodes[i],
                    [$Field.target]             : chain.group.nodes[i + 1],
                    [$Field.conveyingLyph]      : lyphs[i].id,
                    [$Field.conveyingType]      : chain.conveyingType || Link.PROCESS_TYPE.ADVECTIVE,
                    [$Field.conveyingMaterials] : conveyingMaterials,
                    [$Field.color]              : $Color.Link,
                    [$Field.generated]          : true
                };
                if (chain.length){
                    link.length = chain.length / lyphs.length;
                }
                //TODO check why duplicates are created
                mergeGenResource(chain.group, parentGroup, link, $Field.links);
                chain.levels[i] = link.id;
            }
            chain.numLevels = chain.levels.length;
        }

        function deriveFromLevels(){
            const getID  = (e) => e::isObject()? e.id : e;
            const match  = (e1, e2) => getID(e1) === getID(e2);

            if (chain.housingChain){
                if (chain.housingLyphs){
                    logger.warn(`Conflicting chain specification: both "${$Field.housingLyphs}" and "${$Field.housingChain}" are given. Proceeding with "${$Field.housingLyphs}".`)
                } else {
                    //Retrieve lyphs from housing chain
                    let housingChain = findResourceByID(parentGroup.chains, chain.housingChain);
                    if (!housingChain){
                        logger.warn(`Incorrect chain specification: "${$Field.housingChain}" not found!`);
                        return;
                    }
                    chain.housingLyphs = housingChain.lyphs || [];
                    if (chain.housingRange){
                        let min = Math.max(chain.housingRange.min, 0);
                        let max = Math.min(chain.housingRange.max, chain.housingLyphs.length);
                        chain.housingLyphs = chain.housingLyphs.slice(min, max);
                    }
                    //Slice to the range
                    logger.info(`Found ${chain.housingLyphs.length} lyphs in the housing chain ${housingChain.id}`);
                }
            }

            chain.numLevels = chain.numLevels || 0;
            if (!chain.numLevels && chain.housingLyphs){
                chain.numLevels = chain.housingLyphs.length;
            }

            chain.levels = chain.levels || new Array(chain.numLevels);

            //Levels should contain link objects for generation/validation
            for (let i = 0; i < chain.levels.length; i++) {
                chain.levels[i] = findResourceByID(parentGroup.links, chain.levels[i]) || {};
            }

            //Match number of requested levels with the tree.levels[i] array length
            if (chain.levels.length !== chain.numLevels){
                let min = Math.min(chain.levels.length, chain.numLevels || 100);
                let max = Math.max(chain.levels.length, chain.numLevels || 0);
                logger.info(`Corrected number of levels in the tree from ${min} to ${max}` );
                for (let i = min; i < max; i++){
                    chain.levels.push({});
                }
                chain.numLevels = max;
            }
            let N = chain.numLevels;

            if (chain.leaf){
                chain.levels[N - 1].target = chain.leaf;
            }

            let sources = [...chain.levels.map(l => l? l.source: null), null];
            let targets = [chain.root,...chain.levels.map(l => l? l.target: null)];

            for (let i = 0; i < sources.length; i++){
                if (sources[i] && targets[i] && !match(sources[i], targets[i])){
                    logger.error(`A mismatch between link ends found at level ${i}: `, sources[i], targets[i]);
                }
                let newNode = {
                    [$Field.id]        : getGenID(chain.id, $Prefix.node, i),
                    [$Field.color]     : $Color.Node,
                    [$Field.skipLabel] : true,
                    [$Field.generated] : true
                };
                sources[i] = sources[i] || targets[i] || newNode;
                mergeGenResource(chain.group, parentGroup, sources[i], "nodes");
            }
            targets[targets.length - 1] = targets[targets.length - 1] || chain.leaf;

            chain.root = getID(sources[0]);
            let template = getTemplate();

            //Create levels
            chain.lyphs = [];
            for (let i = 0; i < N; i++){
                if (!chain.levels[i]){ chain.levels[i] = {}; }
                //Do not override existing properties
                let link = chain.levels[i];
                link::defaults({
                    [$Field.id]        : getGenID(chain.id, $Prefix.link, i+1),
                    [$Field.source]    : getID(sources[i]),
                    [$Field.target]    : getID(sources[i + 1]),
                    [$Field.color]     : $Color.Link,
                    [$Field.generated] : true
                });
                if (chain.length){
                    link.length = chain.length / N;
                }

                if (template && !chain.levels[i].conveyingLyph){
                    //Only create ID, conveying lyphs will be generated and added to the group by the "expandTemplate" method
                    let lyph = {
                        [$Field.id]         : getGenID(chain.id, $Prefix.lyph, i+1),
                        [$Field.supertype]  : chain.lyphTemplate,
                        [$Field.conveys]    : chain.levels[i].id,
                        [$Field.topology]   : getTopology(i, N, template),
                        [$Field.generated]  : true
                    };
                    chain.levels[i].conveyingLyph = lyph.id;
                    mergeGenResource(chain.group, parentGroup, lyph, $Field.lyphs);
                }
                mergeGenResource(chain.group, parentGroup, chain.levels[i].conveyingLyph, $Field.lyphs);
                mergeGenResource(chain.group, parentGroup, chain.levels[i], $Field.links);

                chain.lyphs[i] = chain.levels[i].conveyingLyph;
                chain.levels[i] = chain.levels[i].id; //Replace with ID to avoid resource definition duplication
            }
        }

        if (isDefined(chain.lyphs)){
            if (isDefined(chain.levels)){
                logger.warn(`Conflicting chain specification: both "${$Field.lyphs}" and "${$Field.levels}" arrays are given. Proceeding with "${$Field.lyphs}".`)
            }
            deriveFromLyphs(parentGroup, chain)
        } else {
            deriveFromLevels(parentGroup, chain);
        }

    }

    /**
     * Align tree levels along housing lyphs
     * @param parentGroup
     * @param chain
     */
    static embedToHousingLyphs(parentGroup, chain) {
        if (!chain || !chain.id || !chain.levels){ return; }
        if (!chain.housingLyphs) {return; }

        const addInternalNode = (lyph, node) => {
            lyph.internalNodes = lyph.internalNodes || [];
            lyph.internalNodes.push(node);
        };

        let N = Math.min(chain.housingLyphs.length, chain.levels.length);
        parentGroup.coalescences = parentGroup.coalescences || [];

        for (let i = 0; i < N; i++) {
            if (!chain.housingLyphs[i]) {return; }
            let housingLyph = findResourceByID(parentGroup.lyphs, chain.housingLyphs[i]);
            if (!housingLyph) {
                logger.warn("Failed to find a housing lyph", chain.housingLyphs[i]);
                return;
            }

            //A tree level can be "hosted" by the lyph or by its outermost layer.
            let hostLyph = housingLyph;
            if (hostLyph.layers){
                let layers = hostLyph.layers.map(layerID => findResourceByID(parentGroup.lyphs, layerID));
                let bundlingLayer = layers.find(e => (e.bundlesChains||[]).find(t => t === chain.id));
                let index = layers.length - 1;
                if (chain.housingLayers && chain.housingLayers.length > i){
                    if (chain.housingLayers[i] < index){
                        index = Math.max(0, chain.housingLayers[i]);
                        if (bundlingLayer && (bundlingLayer !== layers[index])){
                            logger.warn(`Conflicting specification of housing layer: layer's ${$Field.bundlesChains} property disagrees with the chain's ${$Field.housingLayers} property`,
                                bundlingLayer.id, layers[index].id);
                        }
                    }
                }
                hostLyph = bundlingLayer || layers[index] || hostLyph;
            }

            let level = findResourceByID(parentGroup.links, chain.levels[i]);

            if (!hostLyph || !level)  {
                logger.warn(`Could not house a tree level ${chain.levels[i]} in a lyph ${housingLyph.id}`, level, hostLyph);
                return;
            }

            if (!hostLyph.isTemplate) {
                hostLyph.bundles  = hostLyph.bundles ||[];
                hostLyph.bundles.push(level.id);

                hostLyph.border = hostLyph.border || {};
                hostLyph.border.borders = hostLyph.border.borders || [{}, {}, {}, {}];

                if (i === 0){
                    addInternalNode(hostLyph, level.source);
                    //addBorderNode(hostLyph.border.borders[1], level.source);
                } else {
                    addBorderNode(hostLyph.border.borders[3], level.source);
                }
                if (i === chain.housingLyphs.length - 1){
                    addInternalNode(hostLyph, level.target);
                    //addBorderNode(hostLyph.border.borders[3], level.target);
                } else {
                    let targetNode = findResourceByID(parentGroup.nodes, level.target);
                    let targetClone = Node.clone(targetNode);
                    addBorderNode(hostLyph.border.borders[1], targetClone.id);
                    let lnk = Link.createCollapsibleLink(targetNode.id, targetClone.id);
                    level.target = targetClone.id;
                    chain.group.nodes.push(targetClone);
                    chain.group.links.push(lnk);
                }
            } else {
                logger.warn("Housing lyph or its layer is a template", hostLyph);
            }

            //Coalescence is always defined with the main housing lyph
            let lyphCoalescence = {
                [$Field.id]       : getGenID(housingLyph.id, $Prefix.coalescence, level.conveyingLyph),
                [$Field.generated]: true,
                [$Field.topology] : Coalescence.COALESCENCE_TOPOLOGY.EMBEDDING,
                [$Field.lyphs]    : [housingLyph.id, level.conveyingLyph]
            };

            parentGroup.coalescences.push(lyphCoalescence);
        }
    }
}


/**
 * Tree model
 * @property numInstances
 * @property branchingFactors
 */
export class Tree extends GroupTemplate {

    /**
     * Generate instances of a given omega tree
     * @param parentGroup - model resources that may be referred from the template
     * @param tree - omega tree object
     */
    static createInstances(parentGroup, tree){
        if (!tree || !tree.chain){
            logger.warn("Cannot create omega tree instances: canonical tree chain undefined!");
            return;
        }

        let chain = findResourceByID(parentGroup.chains, tree.chain);
        if (!chain || !chain.group || !chain.levels){
            logger.warn("Cannot create omega tree instances: canonical tree chain not found or empty");
            return;
        }

        for (let i = 0; i < tree.numInstances; i++){
            let instance  = createInstance(i + 1);
            tree.instances = tree.instances || [];
            tree.instances.push(instance);
            parentGroup.groups.push(instance);
        }

        /**
         * Create a tree instance
         * @param instanceIndex - instance id/name instanceIndex
         * @returns Group
         */
        function createInstance(instanceIndex){
            tree.id = tree.id || getGenID(chain.id, $Prefix.tree);

            let instance = {
                [$Field.id]        : getGenID(tree.id, instanceIndex),
                [$Field.generated] : true
            };
            [$Field.links, $Field.nodes, $Field.lyphs].forEach(prop => {
                instance[prop] = instance[prop] || [];
            });

            let root  = findResourceByID(parentGroup.nodes, chain.root);
            mergeGenResource(instance, parentGroup, root, $Field.nodes);

            let levels = chain.levels || [];

            let levelResources = {};

            for (let i = 0; i < levels.length; i++) {
                let lnk  = findResourceByID(parentGroup.links, levels[i]);
                let trg  = findResourceByID(parentGroup.nodes, lnk.target);
                let lyph = findResourceByID(parentGroup.lyphs, lnk.conveyingLyph);

                if (!lnk) {
                    logger.warn("Failed to find tree level link (created to proceed): ", tree.id, i, levels[i]);
                    lnk = {
                        [$Field.id]: levels[i],
                        [$Field.generated]: true
                    };
                }
                if (!trg){
                    logger.warn("Failed to find tree level target node (created to proceed): ", tree.id, i, lnk);
                    trg = {
                        [$Field.id]: lnk.target,
                        [$Field.generated]: true
                    };
                }

                if (lyph){ lyph.create3d = true; }
                levelResources[i] = [[lnk, trg, lyph]];
                mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
            }

            tree.branchingFactors = tree.branchingFactors || [];

            const MAX_GEN_RESOURCES = 1000;
            let count = 0;
            for (let i = 0; i < Math.min(levels.length, tree.branchingFactors.length); i++){
                levelResources[i].forEach((base, m) => {
                    for (let k = 1; k < tree.branchingFactors[i]; k++){ //Instances reuse chain objects
                        if (count > MAX_GEN_RESOURCES){
                            throw new Error(`Reached maximum allowed number of generated resources per tree instance (${MAX_GEN_RESOURCES})!`);
                        }
                        let prev_id = base[0].source;
                        for (let j = i; j < levels.length; j++) {
                            let baseResources = levelResources[j][0];
                            let [lnk, trg, lyph] = baseResources.map(r => (r ? { [$Field.id] : getGenID(r.id, i+1, m+1, instanceIndex) }: r));
                            lnk.target = trg.id;
                            lnk.conveyingLyph = lyph ? lyph.id : null;
                            lnk.source = prev_id;
                            Link.clone(baseResources[0], lnk);
                            Node.clone(baseResources[1], trg);
                            Lyph.clone(parentGroup.lyphs, baseResources[2], lyph);
                            mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
                            levelResources[j].push([lnk, trg, lyph]);
                            prev_id = lnk.target;
                            count += 3;
                        }
                    }
                })
            }
            return instance;
        }
    }
}


/**
 * Channel model
 * @property materials
 * @property housingLyphs
 */
export class Channel extends GroupTemplate {

    /**
     * Create membrane channel group
     * @param parentGroup - model resources that may be referred from the template
     * @param channel - channel template in JSON
     */
    static expandTemplate(parentGroup, channel) {
        if (!channel){
            logger.warn("Cannot expand undefined channel template");
            return;
        }

        if (!channel.id) {
            logger.warn(`Skipped channel template - it must have (non-empty) ID!`);
            return;
        }

        channel.group = this.createTemplateGroup(channel, parentGroup);

        //Important: do not change the order of lyphs in this array
        let mcLyphs = [
            {
                [$Field.id]        : "mcInternal",
                [$Field.name]      : "Internal",
                [$Field.supertype] : "mcTemplate",
                [$Field.topology]  : Lyph.LYPH_TOPOLOGY.TUBE,
            },
            {
                [$Field.id]        : "mcMembranous",
                [$Field.name]      : "Membranous",
                [$Field.supertype] : "mcTemplate",
                [$Field.topology]  : Lyph.LYPH_TOPOLOGY.TUBE
            },
            {
                [$Field.id]        : "mcExternal",
                [$Field.name]      : "External",
                [$Field.supertype] : "mcTemplate",
                [$Field.topology]  : Lyph.LYPH_TOPOLOGY.TUBE
            },
            {
                [$Field.id]     : "mcTemplate",
                [$Field.layers] : ["mcContent", "mcWall", "mcOuter"]
            },
            {
                [$Field.id]        : "mcContent",
                [$Field.name]      : "Content",
            },
            {
                [$Field.id]        : "mcWall",
                [$Field.name]      : "Wall",
            },
            {
                [$Field.id]        : "mcOuter",
                [$Field.name]      : "Outer",
            }
        ];
        mcLyphs.forEach(lyph => {
            lyph.isTemplate = true;
            lyph.generated = true;

            //for the first channel, add templates to the parent group
            parentGroup.lyphs = parentGroup.lyphs || [];
            if (!parentGroup.lyphs.find(x => x.id === lyph.id)) {
                parentGroup.lyphs.push(lyph);
            }
        });

        let CHANNEL_LENGTH = 3;

        for (let i = 0; i < CHANNEL_LENGTH + 1; i++) {
            let node = {
                [$Field.id]       : getGenID(channel.id, $Prefix.node, i),
                [$Field.color]    : $Color.Node,
                [$Field.skipLabel]: true,
                [$Field.generated]: true
            };
            mergeGenResource(channel.group, parentGroup, node, $Field.nodes);
        }
        for (let i = 0; i < CHANNEL_LENGTH; i++) {
            let lyph = {
                [$Field.id]       : getGenID(channel.id, $Prefix.lyph, mcLyphs[i].id),
                [$Field.supertype]: mcLyphs[i].id,
                [$Field.generated]: true
            };

            //Each of the three MC segments will convey a Diffusive edge
            //Associate each Diffusive Edge with the material payload

            let link = {
                [$Field.id]           : getGenID(channel.id, $Prefix.link, i + 1),
                [$Field.source]       : channel.group.nodes[i],
                [$Field.target]       : channel.group.nodes[i + 1],
                [$Field.conveyingLyph]: lyph.id,
                [$Field.conveyingType]: channel.conveyingType || Link.PROCESS_TYPE.DIFFUSIVE,
                [$Field.conveyingMaterials]: channel.materials,
                [$Field.color]        : $Color.Link,
                [$Field.generated]    : true
            };
            if (channel.length){
                link.length = channel.length / CHANNEL_LENGTH;
            }

            mergeGenResource(channel.group, parentGroup, lyph, $Field.lyphs);
            mergeGenResource(channel.group, parentGroup, link, $Field.links);
        }

        channel.housingLyphs = channel.housingLyphs || [];

        //This is needed to merge Channel.housighLyphs into Lyph.channels for correct template derivation (lyph templates will pass channels to subtypes)
        channel.housingLyphs.forEach(lyphRef => {
            let lyph = findResourceByID(parentGroup.lyphs, lyphRef);
            if (!lyph) {
                logger.warn("Housing lyph not found while processing channel group", lyphRef);
                return;
            }
            lyph.channels = lyph.channels || [];
            if (!lyph.channels.find(x => x === channel.id || x.id === channel.id)) {
                lyph.channels.push(channel.id);
            }
        });
    }

    /**
     * Generate instances of channel groups for every conveyed housing lyph
     * @param parentGroup - model resources that may be referred from the template
     * @param channel - channel object
     */
    static createInstances(parentGroup, channel) {

        if (!channel.group) {
            logger.warn("Cannot create channel instances: canonical group not found!");
            return;
        }

        //This is needed to merge Lyph.channels for generated lyphs back to Channel.housingLyph
        (parentGroup.lyphs||[]).forEach(lyph => {
            if (lyph.channels && lyph.channels.includes(channel.id) && !channel.housingLyphs.includes(lyph.id)) {
                logger.info("Found derivative of a housing lyph", lyph.id);
                channel.housingLyphs.push(lyph.id);
            }
        });

        (channel.housingLyphs||[]).forEach(lyphRef => {
            logger.info("Processing channel instance for lyph", lyphRef);
            let lyph = findResourceByID(parentGroup.lyphs, lyphRef);

            if (!lyph) {
                logger.warn("Housing lyph not found while creating instances", lyphRef);
                return;
            }

            if ((lyph.layers||[]).length !== (channel.group.links||[]).length) {
                logger.warn("The number of layers in the housing lyph does not match the number of links in its membrane channel",
                    lyph, (lyph.layers||[]).length, (channel.group.links||[]).length);
                return;
            }

            if (lyph.isTemplate) {
                embedToHousingLyph(lyph, channel.group);
            } else {
                let instance = createInstance(lyph.id);
                channel.instances = channel.instances || [];
                channel.instances.push(instance);
                parentGroup.groups.push(instance);
                embedToHousingLyph(lyph, instance);
            }
        });

        /**
         * Create a channel instance
         * @param parentLyph - instance id/name parentLyph
         * @returns Group
         */
        function createInstance(parentLyph) {
            let instance = {
                [$Field.id]        : getGenID(channel.id, $Prefix.instance, parentLyph),
                [$Field.generated] : true
            };
            [$Field.links, $Field.nodes, $Field.lyphs].forEach(prop => {
                instance[prop] = instance[prop] || [];
            });

            //Clone first node
            let prev_id = channel.group.nodes[0];
            let baseSrc = findResourceByID(parentGroup.nodes, prev_id);
            if (!baseSrc) {
                logger.error("Failed to find first node of the channel group", prev_id);
                return instance;
            }
            let src = {
                [$Field.id]: getGenID(baseSrc.id, parentLyph),
                [$Field.generated]: true
            };
            Node.clone(baseSrc, src);
            mergeGenResource(instance, parentGroup, src, $Field.nodes);

            //Clone the rest of the chain resources: link, target node, conveying lyph
            prev_id = src.id;
            let links = parentGroup.links.filter(lnk => channel.group.links.includes(lnk.id));
            links.forEach(baseLnk => {
                let baseTrg = findResourceByID(parentGroup.nodes, baseLnk.target);
                let baseLyph = findResourceByID(parentGroup.lyphs, baseLnk.conveyingLyph);
                let [lnk, trg, lyph] = [baseLnk, baseTrg, baseLyph].map(r => (r ? {
                    [$Field.id]: getGenID(r.id, parentLyph),
                    [$Field.generated]: true
                } : r));
                lnk.source = prev_id;
                lnk.target = trg.id;
                lnk.conveyingLyph = lyph ? lyph.id : null;

                Node.clone(baseTrg, trg);
                Link.clone(baseLnk, lnk);
                Lyph.clone(parentGroup.lyphs, baseLyph, lyph);

                mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
                prev_id = lnk.target;
            });

            return instance;
        }

        /**
         * position channel link nodes on borders of the housing lyph layers
         * @param lyph - housing lyph
         * @param instance - channel instance group
         */
        function embedToHousingLyph(lyph, instance) {
            //Embed channel to the housing lyph

            let layers = (lyph.layers || []).filter(e => !!e);
            parentGroup.coalescences = parentGroup.coalescences || [];

            for (let i = 0; i < layers.length; i++) {
                let layer = findResourceByID(parentGroup.lyphs, lyph.layers[i]);
                if (!layer) {
                    logger.warn("Housing lyph layer not found", lyph, layers[i]);
                    return;
                }

                if (!lyph.isTemplate) {
                    layer.border = layer.border || {};
                    layer.border.borders = layer.border.borders || [{}, {}, {}, {}];
                    addBorderNode(layer.border.borders[0], instance.nodes[i]);
                    if (i === layers.length - 1) {
                        addBorderNode(layer.border.borders[2], instance.nodes[instance.nodes.length - 1]);
                    }
                }

                let layerCoalescence = {
                    [$Field.id]       : getGenID(layer.id, $Prefix.channel, instance.lyphs[i]),
                    [$Field.generated]: true,
                    [$Field.topology] : Coalescence.COALESCENCE_TOPOLOGY.EMBEDDING,
                    [$Field.lyphs]    : [layer.id, instance.lyphs[i]]
                };

                parentGroup.coalescences.push(layerCoalescence);
            }
        }
    }

    validate(parentGroup){
        let MEMBRANE_ANNOTATION = "GO:0016020";
        const findMembrane = (array) => (array||[]).find(e => (e.external || []).find(x => (x.id? x.id: x) === MEMBRANE_ANNOTATION));

        let membraneLyph     = findMembrane(parentGroup.lyphs);
        let membraneMaterial = findMembrane(parentGroup.materials);
        if (membraneLyph || membraneMaterial) {
            (this.housingLyphs||[]).forEach(lyph => {
                if ((lyph.layers||[]).length > 1) {
                    let isOk = membraneLyph && lyph.layers[1].isSubtypeOf(membraneLyph.id);
                    if (!isOk) {
                        isOk = membraneMaterial && lyph.layers[1].containsMaterial(membraneMaterial.id);
                        if (!isOk) {
                            logger.warn(`Second layer of a housing lyph is not a (subtype of) membrane (externals - GO:0016020, id - 
                                ${membraneLyph? membraneLyph.id: membraneMaterial.id} ): `, lyph.layers[1]);
                        }
                    }
                    return isOk;
                }
            })
        } else {
            logger.warn("Did not find a reference to a membrane lyph or material - validation of the housing lyphs is skipped");
        }
    }
}


/**
 * Villus model
 * @property numLayers
 * @property numLevels
 * @property villusOf
 */
export class Villus extends GroupTemplate{

    static expandTemplate(parentGroup, villus){
        if (!villus) {
            logger.warn("Cannot expand undefined villus template");
            return;
        }

        if (!villus.villusOf){
            logger.warn("Incomplete villus definition - hosting lyph is missing", villus);
            return;
        }

        let lyph = findResourceByID(parentGroup.lyphs, villus.villusOf);
        if (!lyph){
            logger.error("Could not find the villus hosting lyph definition in the parent group", villus);
            return;
        }

        if (lyph.isTemplate){
            logger.warn("Skipping generation of villus group for lyph template", lyph);
            return;
        }

        if (villus.numLayers > lyph.layers.length){
            logger.warn(`Skipping incorrect villus template: number of villus layers cannot exceed the number of layers in the lyph`, lyph);
            return;
        }

        villus.numLayers = villus.numLayers || 0;
        villus.numLevels = villus.numLevels || 1;

        let prev;
        villus.id = villus.id || getNewID();
        villus.group = GroupTemplate.createTemplateGroup(villus, parentGroup);

        let lyphLayers = lyph.layers.map(layer2 => findResourceByID(parentGroup.lyphs, layer2));
        let sourceLayers = lyphLayers.slice(0, villus.numLayers).reverse();

        for (let i = villus.numLayers - 1; i >= 0; i--){
            let layer = lyphLayers[i];
            if (!layer){
                logger.error(`Error while generating a villus object - could not locate a layer resource: `, lyph.layers[i]);
                return;
            }
            layer.border = layer.border || {};
            layer.border.borders = layer.border.borders || [{}, {}, {}, {}];

            let node1 = (i === villus.numLayers - 1)? {
                [$Field.id]: getGenID($Prefix.villus, $Prefix.node, layer.id, 0),
                [$Field.generated]: true
            }: prev;

            if (i === villus.numLayers - 1){
                addBorderNode(layer.border.borders[2], node1.id);
                mergeGenResource(villus.group, parentGroup, node1, $Field.nodes);
            }
            let node2 = {
                [$Field.id]: getGenID($Prefix.villus, $Prefix.node, lyph.id, layer.id, i + 1),
                [$Field.generated]: true
            };
            addBorderNode(layer.border.borders[0], node2.id);
            mergeGenResource(villus.group, parentGroup, node2, $Field.nodes);

            let villus_layers = sourceLayers.slice(0, villus.numLayers - i).reverse().map(sourceLyph => {
                let targetLyph =  {
                    [$Field.id] : getGenID(lyph.id, layer.id, sourceLyph.id),
                    [$Field.generated] : true
                };
                Lyph.clone(parentGroup.lyphs, sourceLyph, targetLyph);
                return targetLyph;
            });

            villus_layers.forEach(newLayer => {
                mergeGenResource(villus.group, parentGroup, newLayer, $Field.lyphs);
            });
            villus_layers = villus_layers.map(x => x.id);

            let villusLyph = {
                [$Field.id]      : getGenID($Prefix.villus, $Prefix.lyph, lyph.id, layer.id),
                [$Field.layers]  : villus_layers.reverse(),
                [$Field.topology]: (i===0)? Lyph.LYPH_TOPOLOGY.BAG : Lyph.LYPH_TOPOLOGY.TUBE,
                [$Field.scale]   : {"width": 40 * (villus.numLayers - i), "height": 80},
                [$Field.generated] : true
            };
            // if (i === 0 && villus.numLevels > 0){
            //     villus = {
            //         "numLayers": villus.numLayers,
            //         "numLevels": villus.numLevels - 1
            //     }
            // }

            mergeGenResource(villus.group, parentGroup, villusLyph, $Field.lyphs);

            let link = {
                [$Field.id]            : getGenID($Prefix.villus, $Prefix.link, layer.id),
                [$Field.source]        : node1.id,
                [$Field.target]        : node2.id,
                [$Field.conveyingLyph] : villusLyph.id,
                [$Field.geometry]      : Link.LINK_GEOMETRY.INVISIBLE,
                [$Field.generated]     : true
            };
            mergeGenResource(villus.group, parentGroup, link, $Field.links);
            prev = node2;
        }
        //Assign villus to the last generated lyph
    }
}