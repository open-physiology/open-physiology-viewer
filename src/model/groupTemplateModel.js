import {Resource} from './resourceModel';
import {LYPH_TOPOLOGY, Lyph} from "./shapeModel";
import {PROCESS_TYPE, Link, Node} from "./visualResourceModel";
import {COALESCENCE_TOPOLOGY} from "./coalescenceModel";
import {mergeGenResource, mergeGenResources, findResourceByID} from "./utils";
import {logger} from './logger';
import {defaults, isPlainObject, isArray, flatten} from "lodash-bound";

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
            "id"        : "group_" + template.id,
            "name"      : template.name,
            "generated" : true
        });
        ["links", "nodes", "lyphs"].forEach(prop => {
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
 * Tree model
 * @property root
 * @property levels
 * @property numLevels
 * @property numInstances
 * @property group
 * @property instances
 */
export class Tree extends GroupTemplate {
    /**
     * Generate a group from tree template
     * @param parentGroup - model resources that may be referred from the template
     * @param tree - omega tree template in JSON
     */
    static expandTemplate(parentGroup, tree){
        if ( !tree.id){
            logger.warn(`Skipped tree template - it must have (non-empty) ID!`); return;
        }

        const isDefined = value => value && (!value::isArray() || value.length > 0);

        if ( !(isDefined(tree.numLevels) || isDefined(tree.housingLyphs) || isDefined(tree.levels))) {
            logger.warn(`Skipped tree template - it must have ID, "numLevels" set to a positive number or provide a non-empty "levels" or "housingLyphs" arrays`);
            return;
        }

        tree.group = GroupTemplate.createTemplateGroup(tree, parentGroup);

        const getID  = (e) => e::isPlainObject()? e.id : e;
        const match  = (e1, e2) => getID(e1) === getID(e2);

        //START
        tree.numLevels = tree.numLevels || 0;

        if (!tree.numLevels && tree.housingLyphs){
            tree.numLevels = tree.housingLyphs.length;
        }

        tree.levels = tree.levels || new Array(tree.numLevels);
        //Levels should contain link objects for generation/validation

        for (let i = 0; i < tree.levels.length; i++) {
            tree.levels[i] = findResourceByID(parentGroup.links, tree.levels[i]);
        }

        //Match number of requested levels with the tree.levels[i] array length
        if (tree.levels.length !== tree.numLevels){
            let min = Math.min(tree.levels.length, tree.numLevels||100);
            let max = Math.max(tree.levels.length, tree.numLevels||0);
            logger.info(`Corrected number of levels in the tree from ${min} to ${max}` );
            for (let i = min; i < max; i++){
                tree.levels.push({});
            }
            tree.numLevels = max;
        }
        let N = tree.numLevels;

        let sources = [...tree.levels.map(l => l? l.source: null), null];
        let targets = [tree.root,...tree.levels.map(l => l? l.target: null)];

        for (let i = 0; i < sources.length; i++){
            if (sources[i] && targets[i] && !match(sources[i], targets[i])){
                logger.error(`A mismatch between link ends found at level ${i}: `, sources[i], targets[i]);
            }
            let newNode = {
                "id"       : tree.id + "_node" + i,
                "color"    : "#000", //put this to node template
                "skipLabel": true,
                "generated": true
            };
            sources[i] = sources[i] || targets[i] || newNode;
            mergeGenResource(tree.group, parentGroup, sources[i], "nodes");
        }

        tree.root = getID(sources[0]);

        /**
         * Define topology of edge conveying lyphs based on the topology of the lyph template
         * @param level    - level index
         * @param N        - number of levels in the tree
         * @param template - lyph template
         * @returns {string} lyph topology: TUBE, BAG, BAG2, or CYST
         */
        const getTopology = (level, N, template) => {
            if (template){
                if (level === 0) {
                    if (template.topology === LYPH_TOPOLOGY.BAG2 || template.topology === LYPH_TOPOLOGY.CYST) {
                        if (N === 1){
                            return LYPH_TOPOLOGY.CYST;
                        }
                        return LYPH_TOPOLOGY.BAG2;
                    }
                }
                if (level === N - 1) {
                    if (template.topology === LYPH_TOPOLOGY.BAG || template.topology === LYPH_TOPOLOGY.CYST) {
                        return LYPH_TOPOLOGY.BAG;
                    }
                }
            }
            return LYPH_TOPOLOGY.TUBE;
        };

        let template = tree.lyphTemplate;
        if (template){
            if (template::isPlainObject()){
                if (!template.id) { template.id = tree.id + "_template"; }
                mergeGenResource(tree.group, parentGroup, template, "lyphs");
                tree.lyphTemplate = template.id;
            } else {
                //find lyph template to establish topology of the tree
                template = parentGroup.lyphs.find(e => e.id === tree.lyphTemplate);
                if (!template){
                    logger.error("Failed to find the lyph template definition in the parent group: ",
                        tree.lyphTemplate);
                }
            }
        }

        //Create tree levels
        for (let i = 0; i < N; i++){
            if (!tree.levels[i]){ tree.levels[i] = {}; }
            //Do not override existing properties
            let link = tree.levels[i];
            link::defaults({
                "id"       : tree.id + "_lnk" + (i+1),
                "name"     : `${tree.name || ""}: level ${i}`,
                "source"   : getID(sources[i]),
                "target"   : getID(sources[i + 1]),
                "color"    : "#000",
                "generated": true
            });
            if (tree.length){
                link.length = tree.length / N;
            }

            if (template && !tree.levels[i].conveyingLyph){
                //Only create ID, conveying lyphs will be generated and added to the group by the "expandTemplate" method
                let lyph = {
                    "id"         : tree.id + "_lyph" + (i+1),
                    "supertype"  : tree.lyphTemplate,
                    "conveyedBy" : tree.levels[i].id,
                    "topology"   : getTopology(i, N, template),
                    "generated"  : true
                };
                tree.levels[i].conveyingLyph = lyph.id;
                mergeGenResource(tree.group, parentGroup, lyph, "lyphs");
            }
            mergeGenResource(tree.group, parentGroup, tree.levels[i].conveyingLyph, "lyphs");
            mergeGenResource(tree.group, parentGroup, tree.levels[i], "links");
            tree.levels[i] = tree.levels[i].id; //Replace with ID to avoid resource definition duplication
        }
    }

    /**
     * Generate instances of a given omega tree
     * @param parentGroup - model resources that may be referred from the template
     * @param tree - omega tree object
     */
    static createInstances(parentGroup, tree){
        if (!tree || !tree.group || !tree.levels){
            logger.warn("Cannot create omega tree instances: canonical tree undefined!");
            return;
        }

        if (!tree.branchingFactors || !tree.branchingFactors.find(x => x !== 1)){
            logger.info("Omega tree has no branching points, the instances coincide with the canonical tree!");
        }

        for (let i = 0; i < tree.numInstances; i++){
            let instance  = createInstance(i + 1);
            tree.instances = tree.instances || [];
            tree.instances.push(instance);
            parentGroup.groups.push(instance);
        }

        /**
         * Create a tree instance
         * @param prefix - instance id/name prefix
         * @returns Group
         */
        function createInstance(prefix){
            let instance = {
                "id"        : `${tree.id}_instance-${prefix}`,
                "name"      : `${tree.name} instance #${prefix}`,
                "generated" : true
            };
            ["links", "nodes", "lyphs"].forEach(prop => {
                instance[prop] = instance[prop] || [];
            });

            let root  = findResourceByID(parentGroup.nodes, tree.root);
            mergeGenResource(instance, parentGroup, root, "nodes");

            let levelResources = {};
            for (let i = 0; i < tree.levels.length; i++) {
                let lnk  = findResourceByID(parentGroup.links, tree.levels[i]);
                let trg  = findResourceByID(parentGroup.nodes, lnk.target);
                let lyph = findResourceByID(parentGroup.lyphs, lnk.conveyingLyph);

                if (!lnk) {
                    logger.warn("Failed to find tree level link (created to proceed): ", tree.id, i, tree.levels[i]);
                    lnk = {"id": tree.levels[i], "generated": true};
                }
                if (!trg){
                    logger.warn("Failed to find tree level target node (created to proceed): ", tree.id, i, lnk);
                    trg = {"id": lnk.target, "generated": true};
                }

                if (lyph){ lyph.create3d = true; }
                levelResources[i] = [[lnk, trg, lyph]];
                mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
            }

            tree.branchingFactors = tree.branchingFactors || [];

            const MAX_GEN_RESOURCES = 1000;
            let count = 0;
            for (let i = 0; i < Math.min(tree.levels.length, tree.branchingFactors.length); i++){
                levelResources[i].forEach((base, m) => {
                    for (let k = 1; k < tree.branchingFactors[i]; k++){ //Instances reuse the canonic tree objects
                        if (count > MAX_GEN_RESOURCES){
                            throw new Error(`Reached maximum allowed number of generated resources per tree instance (${MAX_GEN_RESOURCES})!`);
                        }
                        let prev_id = base[0].source;
                        for (let j = i; j < tree.levels.length; j++) {
                            let baseResources = levelResources[j][0];
                            let [lnk, trg, lyph] = baseResources.map(r => (r ? { "id" : `${r.id}_${i+1}:${m+1}:${k}-${prefix}` }: r));
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

    /**
     * Align tree levels along housing lyphs
     * @param parentGroup
     * @param tree
     */
    static embedToHousingLyphs(parentGroup, tree) {
        if (!tree || !tree.id || !tree.housingLyphs || !tree.levels){ return; }

        const addBorderNode = (border, node) => {
            border.hostedNodes = border.hostedNodes || [];
            border.hostedNodes.push(node);
        };

        const addInternalNode = (lyph, node) => {
            lyph.internalNodes = lyph.internalNodes || [];
            lyph.internalNodes.push(node);
        };

        let N = Math.min(tree.housingLyphs.length, tree.levels.length);

        parentGroup.coalescences = parentGroup.coalescences || [];

        for (let i = 0; i < N; i++) {
            let lyph = findResourceByID(parentGroup.lyphs, tree.housingLyphs[i]);
            if (!lyph) { return; }

            //A tree level can be "hosted" by the lyph or by its outermost layer.
            let hostLyph = lyph;
            if (hostLyph.layers){
                let layers = hostLyph.layers.map(layerID => findResourceByID(parentGroup.lyphs, layerID));
                let bundlingLayer = layers.find(e => (e.bundlesTrees||[]).find(t => t === tree.id));
                hostLyph = bundlingLayer || layers[layers.length - 1] || hostLyph;
            }

            let level = findResourceByID(parentGroup.links, tree.levels[i]);

            if (!hostLyph || !level)  {
                logger.warn(`Could not house a tree level ${tree.levels[i]} in a lyph ${lyph.id}`, level, hostLyph);
                return;
            }

            if (!hostLyph.isTemplate) {
                hostLyph.bundles  = hostLyph.bundles ||[];
                hostLyph.bundles.push(level);

                hostLyph.border = hostLyph.border || {};
                hostLyph.border.borders = hostLyph.border.borders || [{}, {}, {}, {}];
                if (i === 0){
                    addInternalNode(hostLyph, level.source);
                } else {
                    addBorderNode(hostLyph.border.borders[3], level.source);
                }
                if (i === tree.housingLyphs.length - 1){
                    addInternalNode(hostLyph, level.target);
                } else {
                    addBorderNode(hostLyph.border.borders[1], level.target);
                }
            }

            //Coalescence is always defined with the main housing lyph
            let lyphCoalescence = {
                "id"       : `${lyph.id}_tree-${level.conveyingLyph}`,
                "name"     : `${lyph.name} tree #${level.conveyingLyph}`,
                "generated": true,
                "topology" : COALESCENCE_TOPOLOGY.EMBEDDING,
                "lyphs"    : [lyph.id, level.conveyingLyph]
            };

            parentGroup.coalescences.push(lyphCoalescence);
        }
    }
}

/**
 * Channel model
 * @property materials
 * @property housingLyphs
 */
export class Channel extends Resource {

    /**
     * Create membrane channel group
     * @param parentGroup - model resources that may be referred from the template
     * @param channel - channel template in JSON
     */
    static expandTemplate(parentGroup, channel) {
        if (!channel.id) {
            logger.warn(`Skipped channel template - it must have (non-empty) ID!`);
            return;
        }

        channel.group = GroupTemplate.createTemplateGroup(channel, parentGroup);

        let mcLyphs = [
            {
                "id"        : "mcInternal",
                "name"      : "Internal",
                "isTemplate": true,
                "supertype" : "mcTemplate",
                "topology"  : LYPH_TOPOLOGY.TUBE
            },
            {
                "id"        : "mcMembranous",
                "name"      : "Membranous",
                "isTemplate": true,
                "supertype" : "mcTemplate",
                "topology"  : LYPH_TOPOLOGY.TUBE
            },
            {
                "id"        : "mcExternal",
                "name"      : "External",
                "isTemplate": true,
                "supertype" : "mcTemplate",
                "topology"  : LYPH_TOPOLOGY.TUBE
            },
            {
                "id"        : "mcTemplate",
                "isTemplate": true,
                "layers"    : ["mcContent", "mcWall", "mcOuter"]
            },
            {
                "id"        : "mcContent",
                "name"      : "Content",
                "isTemplate": true
            },
            {
                "id"        : "mcWall",
                "name"      : "Wall",
                "isTemplate": true
            },
            {
                "id"        : "mcOuter",
                "name"      : "Outer",
                "isTemplate": true
            }
        ];

        //for the first channel, add templates to the parent group
        mcLyphs.forEach(lyph => {
            lyph.generated = true;
            parentGroup.lyphs = parentGroup.lyphs || [];
            if (!parentGroup.lyphs.find(x => x.id === lyph.id)) {
                parentGroup.lyphs.push(lyph);
            }
        });

        let CHANNEL_LENGTH = 3;

        for (let i = 0; i < CHANNEL_LENGTH + 1; i++) {
            let node = {
                "id"       : channel.id + "_node" + i,
                "name"     : channel.name + ": node " + i,
                "color"    : "#000",
                "skipLabel": true,
                "generated": true
            };
            mergeGenResource(channel.group, parentGroup, node, "nodes");
        }
        for (let i = 0; i < CHANNEL_LENGTH; i++) {
            let lyph = {
                "id"       : channel.id + "_" + mcLyphs[i].id,
                "name"     : `${mcLyphs[i].name} of ${channel.name || "?"}`,
                "supertype": mcLyphs[i].id,
                "generated": true
            };

            //Each of the three MC segments will convey a Diffusive edge
            //Associate each Diffusive Edge with the material payload

            let link = {
                "id"           : channel.id + "_lnk" + (i + 1),
                "name"         : `${channel.name || ""}: level ${i}`,
                "source"       : channel.group.nodes[i],
                "target"       : channel.group.nodes[i + 1],
                "conveyingLyph": lyph.id,
                "conveyingType": PROCESS_TYPE.DIFFUSIVE,
                "conveyingMaterials": channel.materials,
                "color"        : "#000",
                "generated"    : true
            };
            if (channel.length){
                link.length = channel.length / CHANNEL_LENGTH;
            }

            mergeGenResource(channel.group, parentGroup, lyph, "lyphs");
            mergeGenResource(channel.group, parentGroup, link, "links");
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
            if (!lyph.channels.find(x => x.id === channel.id)) {
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

        let MEMBRANE_ANNOTATION = "GO:0016020";
        let membraneLyph = (parentGroup.lyphs||[]).find(e => (e.external || []).find(x => x === MEMBRANE_ANNOTATION || x.id === MEMBRANE_ANNOTATION));
        let membraneMaterial = (parentGroup.materials||[]).find(e => (e.external || []).find(x => x === MEMBRANE_ANNOTATION || x.id === MEMBRANE_ANNOTATION));

        if (!membraneLyph && !membraneMaterial) {
            logger.warn("Did not find a reference to a membrane lyph or material - validation of the housing lyphs will be skipped");
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

            if (!validate(lyph, channel)) {
                logger.warn(`Skipping channel for lyph ${lyph.id} - custom validation failed!`);
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

        //TODO test
        function validate(lyph, channel) {
            if ((lyph.layers||[]).length !== (channel.group.links||[].length)) {
                logger.warn("The number of layers in the housing lyph does not match the number of links in its membrane channel", lyph);
                return false;
            }
            if (membraneLyph || membraneMaterial) {
                let middleLayer = lyph.layers && lyph.layers[1];
                let isOk = membraneLyph && middleLayer.isSubtypeOf(membraneLyph.id);
                if (!isOk && membraneMaterial) {
                    isOk = (middleLayer.materials || []).find(e => e === membraneMaterial.id || e.id === membraneMaterial.id);
                }
                if (!isOk) {
                    logger.warn("Second layer of a housing lyph is not a (subtype of) membrane", middleLayer, membraneLyph, membraneMaterial);
                }
                return isOk;
            }
            return true;
        }

        /**
         * Create a channel instance
         * @param prefix - instance id/name prefix
         * @returns Group
         */
        function createInstance(prefix) {
            let instance = {
                "id": `${channel.id}_instance-${prefix}`,
                "name": `${channel.name} instance for lyph ${prefix}`,
                "generated": true
            };
            ["links", "nodes", "lyphs"].forEach(prop => {
                instance[prop] = instance[prop] || [];
            });

            //Clone first node
            let prev_id = channel.group.nodes[0];
            let baseSrc = findResourceByID(parentGroup.nodes, prev_id);
            if (!baseSrc) {
                logger.error("Failed to find first node of the channel group", prev_id);
                return instance;
            }
            let src = {"id": `${baseSrc.id}-${prefix}`};
            Node.clone(baseSrc, src);
            mergeGenResource(instance, parentGroup, src, "nodes");

            //Clone the rest of the chain resources: link, target node, conveying lyph
            prev_id = src.id;
            let links = parentGroup.links.filter(lnk => channel.group.links.includes(lnk.id));
            links.forEach(baseLnk => {
                let baseTrg = findResourceByID(parentGroup.nodes, baseLnk.target);
                let baseLyph = findResourceByID(parentGroup.lyphs, baseLnk.conveyingLyph);
                let [lnk, trg, lyph] = [baseLnk, baseTrg, baseLyph].map(r => (r ? {"id": `${r.id}-${prefix}`} : r));
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

            const addBorderNode = (border, node) => {
                border.hostedNodes = border.hostedNodes || [];
                border.hostedNodes.push(node);
            };

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
                    "id"       : `${layer.id}_channel-${instance.lyphs[i]}`,
                    "name"     : `${layer.name} channel #${instance.lyphs[i]}`,
                    "generated": true,
                    "topology" : COALESCENCE_TOPOLOGY.EMBEDDING,
                    "lyphs"    : [layer.id, instance.lyphs[i]]
                };

                parentGroup.coalescences.push(layerCoalescence);
            }
        }
    }
}

/**
 * Chain model
 * @property conveyingLyphs
 */
export class Chain extends Resource{

    /**
     * advective edges that convey the material of the innermost layer of these conveying lyphs.
     * Validation: innermost layers constituted of the same material.

     * innermost layer
     * @param parentGroup
     * @param chain
     */

    static expandTemplate(parentGroup, chain){
        if (!chain.id) {
            logger.warn(`Skipped chain template - it must have (non-empty) ID!`);
            return;
        }

        chain.group = GroupTemplate.createTemplateGroup(chain, parentGroup);

        if (!chain.conveyingLyphs::isArray() || chain.conveyingLyphs.length <= 0){
            logger.warn(`Skipped chain template - no conveying lyphs given!`);
        }

        let lyphs = chain.conveyingLyphs.map(lyphID => findResourceByID(parentGroup.lyphs, lyphID));

        let conveyingMaterials = lyphs.filter(lyph => lyph.layers && lyph.layers[0] && lyph.layers[0].materials).map(lyph => lyph.layers[0].materials)::flatten();
        conveyingMaterials = [...new Set(conveyingMaterials)];

        if (conveyingMaterials.length > 0){
            logger.warn("Incorrectly defined chain pattern - innermost layers do not convey the same material!", chain.conveyingLyphs);
        }

        let [start, end] = ["start", "end"].map(prop => findResourceByID(parentGroup.nodes, chain[prop]));

        for (let i = 0; i < lyphs.length + 1; i++) {
            let nodeID = (i === 0 && chain.start)? chain.start: (i === lyphs.length && chain.end)? chain.end : chain.id + "_node" + i;
            let node = (i === 0 && start)? start:
                (i === lyphs.length && end)? end:
                {
                    "id"        : nodeID,
                    "name"      : chain.name + ": node " + i,
                    "color"     : "#000",
                    "skipLabel" : true,
                    "generated" : true
                };
            mergeGenResource(chain.group, parentGroup, node, "nodes");
        }

        for (let i = 0; i < lyphs.length; i++) {
            let link = {
                "id"                 : chain.id + "_lnk" + (i + 1),
                "name"               : `${chain.name || ""}: level ${i}`,
                "source"             : chain.group.nodes[i],
                "target"             : chain.group.nodes[i + 1],
                "conveyingLyph"      : lyphs[i].id,
                "conveyingType"      : PROCESS_TYPE.ADVECTIVE,
                "conveyingMaterials" : conveyingMaterials,
                "color"              : "#000",
                "generated"          : true
            };
            if (chain.length){
                link.length = chain.length / lyphs.length;
            }
            mergeGenResource(chain.group, parentGroup, link, "links");
        }
    }
}