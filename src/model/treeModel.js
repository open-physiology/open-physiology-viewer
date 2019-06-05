import { Resource } from './resourceModel';
import { isPlainObject, defaults } from 'lodash-bound';
import { LYPH_TOPOLOGY, Lyph } from "./shapeModel";
import { Link, Node } from './visualResourceModel';
import { Group } from './groupModel';
import { mergeGenResource, mergeGenResources, findResourceByID } from "./utils";
import {logger} from './logger';
import {COALESCENCE_TOPOLOGY} from "./coalescenceModel";

/**
 * Tree model
 * @property group
 * @property root
 * @property levels
 * @property numLevels
 * @property numInstances
 * @property group
 * @property instances
 */
export class Tree extends Resource {
    /**
    * Generate a group from tree template
    * @param parentGroup
    * @param tree
    */
    static expandTemplate(parentGroup, tree){
        if ( !tree.id){
            logger.warn(`Skipped tree template - it must have (non-empty) ID!`); return;
        }

        const isDefined = value => value && (!Array.isArray(value) || value.length > 0);

        if ( !(isDefined(tree.numLevels) || isDefined(tree.housingLyphs) || isDefined(tree.levels))) {
            logger.warn(`Skipped tree template - it must have ID, "numLevels" set to a positive number or provide a non-empty "levels" or "housingLyphs" arrays`);
            return;
        }

        tree.group = Group.createTemplateGroup(tree, parentGroup);

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
            tree.levels[i]::defaults({
                "id"       : tree.id + "_lnk" + (i+1),
                "name"     : `${tree.name || ""}: level ${i}`,
                "source"   : getID(sources[i]),
                "target"   : getID(sources[i + 1]),
                "color"    : "#000",
                "generated": true
            });
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

        embedToHousingLyphs(tree.housingLyphs, tree.levels);


        /**
         * Align tree levels along housing lyphs
         * @param lyphs - housing lyphs
         * @param tree - tree group
         */
        function embedToHousingLyphs(lyphs, levels) {
            if (!lyphs || !levels){ return; }

            const addBorderNode = (border, node) => {
                border.hostedNodes = border.hostedNodes || [];
                border.hostedNodes.push(node);
            };

            const addInternalNode = (lyph, node) => {
                lyph.internalNodes = lyph.internalNodes || [];
                lyph.internalNodes.push(node);
            };

            let N = Math.min(lyphs.length, levels.length);

            for (let i = 0; i < N; i++) {
                let lyph = findResourceByID(parentGroup.lyphs, lyphs[i]);
                let level = findResourceByID(parentGroup.links, levels[i]);

                if (!lyph || !level)  {
                    logger.warn(`Could not house a tree level ${levels[i]} in a lyph ${lyphs[i]}`, level, lyph);
                    return;
                }

                if (!lyph.isTemplate) {
                    lyph.border = lyph.border || {};
                    lyph.border.borders = lyph.border.borders || [{}, {}, {}, {}];
                    if (i === 0){
                        addInternalNode(lyph, level.source);
                    } else {
                        addBorderNode(lyph.border.borders[1], level.source);
                    }
                    if (i === lyphs.length - 1){
                        addInternalNode(lyph, level.target);
                    } else {
                        addBorderNode(lyph.border.borders[3], level.target);
                    }
                }

                let lyphCoalescence = {
                    "id"       : `${lyph.id}_tree-${level.conveyingLyph}`,
                    "name"     : `${lyph.name} tree #${level.conveyingLyph}`,
                    "generated": true,
                    "topology" : COALESCENCE_TOPOLOGY.EMBEDDING,
                    "lyphs"    : [level.conveyingLyph, lyph.id]
                };

                parentGroup.coalescences.push(lyphCoalescence);
            }
        }
    }

    /**
     * Generate instances of a given omega tree
     * @param parentGroup - parent group, i.e., model resources that may be referred from the template
     * @param tree - omega tree definition
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
                //TODO clone these resources
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
}
