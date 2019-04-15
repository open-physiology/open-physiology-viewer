import { Resource } from './resourceModel';
import { isPlainObject, defaults } from 'lodash-bound';
import { LYPH_TOPOLOGY, Lyph } from "./shapeModel";
import { mergeGenResource, mergeGenResources } from "./utils";

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
            console.warn(`Skipped tree template - it must have (non-empty) ID!`); return;
        }

        tree.group = tree.group || {};
        tree.group::defaults({
            "id"        : "group_" + tree.id,
            "name"      : tree.name,
            "generated" : true
        });

        if (!parentGroup.groups) { parentGroup.groups = []; }
        parentGroup.groups.push(tree.group);

        if ( !tree.numLevels && ((tree.levels||[]).length === 0)) {
            console.warn(`Skipped tree template - it must have ID, "numLevels" set to a positive number or provide a non-empty "levels" array`);
            return;
        }
        if ( tree.group.links && (tree.group.links.length > 0)){
            console.warn(`Tree group contains extra links: ${tree.group.links}!`)
        }
        if ( tree.group.nodes && (tree.group.nodes.length > 0)){
            console.warn(`Tree group contains extra nodes: ${tree.group.nodes}!`)
        }

        const getID  = (e) => e::isPlainObject()? e.id : e;
        const getObj = (e, prop) => e::isPlainObject()? e: (parentGroup[prop]||[]).find(x => x.id === e);
        const match  = (e1, e2) => getID(e1) === getID(e2);

        //START
        tree.numLevels = tree.numLevels || 0;
        tree.levels = tree.levels || new Array(tree.numLevels);
        //Levels should contain link objects for generation/validation

        for (let i = 0; i < tree.levels.length; i++) {
            tree.levels[i] = getObj(tree.levels[i], "links");
        }

        //Match number of requested levels with the tree.levels[i] array length
        if (tree.levels.length !== tree.numLevels){
            let min = Math.min(tree.levels.length, tree.numLevels||100);
            let max = Math.max(tree.levels.length, tree.numLevels||0);
            console.info(`Corrected number of levels in the tree from ${min} to ${max}` );
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
                console.error(`A mismatch between link ends found at level ${i}: `, sources[i], targets[i]);
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
                    console.error("Failed to find the lyph template definition in the parent group: ",
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
    }

    /**
     * Generate instances of a given omega tree
     * @param parentGroup - parent group, i.e., model resources that may be referred from the template
     * @param tree - omega tree definition
     */
    static createInstances(parentGroup, tree){
        if (!tree || !tree.group || !tree.levels){
            console.warn("Cannot create omega tree instances: canonical tree undefined!");
            return;
        }

        if (!tree.branchingFactors || !tree.branchingFactors.find(x => x !== 1)){
            console.info("Omega tree has no branching points, the instances coincide with the canonical tree!");
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

            const getObj = (e, prop) => e::isPlainObject()? e: (parentGroup[prop]||[]).find(x => x.id === e);

            let root  = getObj(tree.root, "nodes");

            mergeGenResource(instance, parentGroup, root, "nodes");

            let levelResources = {};
            for (let i = 0; i < tree.levels.length; i++) {
                let lnk  = getObj(tree.levels[i], "links");
                let trg  = getObj(lnk.target, "nodes");
                let lyph = getObj(lnk.conveyingLyph, "lyphs");

                if (!lnk) {
                    console.warn("Failed to find tree level link (created to proceed): ", tree.id, i, tree.levels[i]);
                    lnk = {"id": tree.levels[i], "generated": true};
                }
                if (!trg){
                    console.warn("Failed to find tree level target node (created to proceed): ", tree.id, i, lnk);
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
                    for (let k = 1; k < tree.branchingFactors[i]; k++){
                        if (count > MAX_GEN_RESOURCES){
                            throw new Error(`Reached maximum allowed number of generated resources per tree instance (${MAX_GEN_RESOURCES})!`);
                        }
                        let prev = base[0].source;
                        for (let j = i; j < tree.levels.length; j++) {
                            let [lnk, trg, lyph] = levelResources[j][0].map(r => (r
                                    ? {
                                        "id"       : `${r.id}_${i+1}:${m+1}:${k}-${prefix}`,
                                        "cloneOf"  : r.id,
                                        "generated": true
                                    }
                                    : r
                            ));
                            lnk.target = trg.id;
                            lnk.conveyingLyph = lyph ? lyph.id : null;
                            lnk.source = prev;
                            Lyph.clone(parentGroup.lyphs, levelResources[j][0][2], lyph);
                            mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
                            levelResources[j].push([lnk, trg, lyph]);
                            prev = lnk.target;
                            count += 3;
                        }
                    }
                })
            }
            return instance;
        }
    }
}
