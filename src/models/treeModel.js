import { Resource } from './resourceModel';
import { isPlainObject, defaults } from 'lodash-bound';
import { LYPH_TOPOLOGY, Lyph } from "./lyphModel";

const mergeGenResource = (group, parentGroup, e, prop) => {
    if (!e) { return; }
    if (group){
        group[prop] = group[prop] || [];
        if (e::isPlainObject()){
            if (e.id){ if (!group[prop].find(x => x.id === e.id)){ group[prop].push(e.id); }}
        } else {
            if (!group[prop].includes(e)){ group[prop].push(e); }
        }
    }
    if (parentGroup && e.id){
        parentGroup[prop] = parentGroup[prop] || [];
        if (!parentGroup[prop].find(x => x.id === e.id)){ parentGroup[prop].push(e); }
    }
};

/**
 * Tree model
 * @property group
 * @property root
 * @property levels
 * @property numLevels
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
            "id"   : "group_" + tree.id,
            "name" : tree.name + " group",
        });

        if (!parentGroup.groups) { parentGroup.groups = []; }
        parentGroup.groups.push(tree.group);

        if ( !tree.numLevels && ((tree.levels||[]).length === 0)) { console.warn(`Skipped tree template - it must have ID, "numLevels" set to a positive number or provide a non-empty "levels" array`); return; }
        if ( tree.group.links && (tree.group.links.length > 0)){
            console.warn(`Tree group contains extra links: ${tree.group.links}!`)}
        if ( tree.group.nodes && (tree.group.nodes.length > 0)){ console.warn(`Tree group contains extra nodes: ${tree.group.nodes}!`)}

        const getID  = (e) => e::isPlainObject()? e.id : e;
        const match  = (e1, e2) => getID(e1) === getID(e2);
        const getObj = (e, prop) => e::isPlainObject()? e: (parentGroup[prop]||[]).find(x => x.id === e);

        //START
        tree.levels = tree.levels || new Array(tree.numLevels);
        //Levels should contain link objects for generation/validation

        for (let i = 0; i < tree.levels.length; i++) {
            tree.levels[i] = getObj(tree.levels[i], "links");
        }

        //Match number of requested levels with the tree.levels[i] array length
        if (tree.levels.length !== tree.numLevels){
            let min = Math.min(tree.levels.length, tree.numLevels);
            let max = Math.max(tree.levels.length, tree.numLevels);
            console.info(`Corrected number of levels in the tree from ${min} to ${max}` );
            for (let i = tree.levels.length; i < max; i++){
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
                "skipLabel": true
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
                "id"    : tree.id + "_lnk" + (i+1),
                "name"  : `${tree.name || ""}}: level ${i}`,
                "source": getID(sources[i]),
                "target": getID(sources[i + 1]),
                "color" : "#000"
            });
            if (template && !tree.levels[i].conveyingLyph){
                //Only create ID, conveying lyphs will be generated and added to the group by the "expandTemplate" method
                let lyph = {
                    "id"         : tree.id + "_lyph" + (i+1),
                    "supertype"  : tree.lyphTemplate,
                    "conveyedBy" : tree.levels[i].id,
                    "topology"   : getTopology(i, N, template)
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
     * Generate an instance of a given omega tree
     * @param parentGroup - parent group, i.e., model resources that may be referred from the template
     * @param tree - omega tree definition
     */
    static createInstance(parentGroup, tree){
        if (!tree || !tree.group || !tree.levels){
            console.warn("Cannot create an omega tree instance: canonical tree undefined!");
            return;
        }

        if (!tree.branchingFactors || !tree.branchingFactors.find(x => x !== 1)){
            console.info("Omega tree has no branching points, the instances coincide with the canonical tree!");
            return;
        }

        tree.instance = {
            "id"       : "instance_" + tree.id,
            "name"     : tree.name + " instance"
        };

        const mergeGenResources = ([lnk, trg, lyph]) => {
            mergeGenResource(tree.instance, parentGroup, lnk, "links");
            mergeGenResource(tree.instance, parentGroup, trg, "nodes");
            mergeGenResource(tree.instance, parentGroup, lyph, "lyphs");
        };

        let levelResources = {};
        for (let i = 0; i < tree.levels.length; i++){
            let lnk = tree.levels[i]::isPlainObject()?   tree.levels[i] : (parentGroup.links||[]).find(e => e.id === tree.levels[i]);
            let trg = lnk.target::isPlainObject()? lnk.target: (parentGroup.nodes||[]).find(e => e.id === lnk.target);
            let lyph = lnk.conveyingLyph::isPlainObject()? lnk.conveyingLyph : (parentGroup.lyphs||[]).find(e => e.id === lnk.conveyingLyph);

            if (!lnk || !trg) {
                console.warn("Failed to find tree level resources: ", tree.id, i, tree.levels[i]);
                if (!trg) { trg = {"id": lnk.target}; }
                if (!lnk) { lnk = {"id": tree.levels[i]}; }
            }
            if (lyph){ lyph.create3d = true; }
            levelResources[i] = [[lnk, trg, lyph]];
            mergeGenResources([lnk, trg, lyph]);
        }

        for (let i = 0; i < Math.min(tree.levels.length, tree.branchingFactors.length); i++){
            levelResources[i].forEach((base, m) => {
                for (let k = 1; k < tree.branchingFactors[i]; k++){
                    let prev = base[0].source;
                    for (let j = i; j < tree.levels.length; j++) {
                        let [lnk, trg, lyph] = levelResources[j][0].map(r => (r? {
                            id: `${r.id}_${i+1}:${m+1}:${k}`,
                            cloneOf: r.id} : r
                        ));
                        lnk.target = trg.id;
                        lnk.conveyingLyph = lyph ? lyph.id : null;
                        lnk.source = prev;
                        prev = lnk.target;
                        Lyph.clone(levelResources[j][0][2], lyph, parentGroup.lyphs); //clone lyph structure
                        mergeGenResources([lnk, trg, lyph]);
                        levelResources[j].push([lnk, trg, lyph]);
                    }
                }
            })
        }

        parentGroup.groups.push(tree.instance);
    }
}
