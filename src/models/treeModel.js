import { Group } from './groupModel';
import { isObject, defaults} from 'lodash-bound';
import { LYPH_TOPOLOGY } from "./lyphModel";

/**
 * Tree model
 * @property group
 * @property root
 * @property levels
 * @property numLevels
 */
export class Tree extends Group {
    /**
    * Generate a group from tree template
    * @param parentGroup
    * @param tree
    */
    static expandTemplate(parentGroup, tree){
        if ( !tree.id){ console.warn(`Skipped tree template - it must have (non-empty) ID!`); return; }

        if (!tree.group) {
            tree.group = {
                "id"   : "group_" + tree.id,
                "name" : tree.name + " group",
            }
        }
        tree.group.treeTemplate = tree.id;
        if (!parentGroup.groups) { parentGroup.groups = []; }
        parentGroup.groups.push(tree.group);

        if ( !tree.numLevels && ((tree.levels||[]).length === 0)) { console.warn(`Skipped tree template - it must have ID, "numLevels" set to a positive number or provide a non-empty "levels" array`); return; }
        if ( tree.group.links && (tree.group.links.length > 0)){
            console.warn(`Tree group contains extra links: ${tree.group.links}!`)}
        if ( tree.group.nodes && (tree.group.nodes.length > 0)){ console.warn(`Tree group contains extra nodes: ${tree.group.nodes}!`)}

        const mergeGenResource = (e, prop) => {
            tree.group[prop]        = tree.group[prop] || [];
            parentGroup[prop] = parentGroup[prop] || [];
            if (!tree.group[prop].includes(e)) { tree.group[prop].push(e.id); }
            if (!parentGroup[prop].find(x => x.id === e.id)){ parentGroup[prop].push(e); }
        };
        const getID  = (e) => e::isObject()? e.id : e;
        const match  = (e1, e2) => getID(e1) === getID(e2);
        const getObj = (e, prop) => e::isObject()? e: (parentGroup[prop]||[]).find(x => x.id === e);

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
                console.log(`A mismatch between link ends found at level ${i}: `, sources[i], targets[i]);
            }
            let newNode = {
                "id"       : tree.id + "_node" + i,
                "color"    : "#000", //put this to node template
                "skipLabel": true
            };
            sources[i] = sources[i] || targets[i] || newNode;
            if (sources[i] === newNode){
                mergeGenResource(sources[i], "nodes");
            }
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
            if (template::isObject()){
                if (!template.id) { template.id = tree.id + "_template"; }
                mergeGenResource(template, "lyphs");
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
                mergeGenResource(lyph, "lyphs");
            }
            mergeGenResource(tree.levels[i], "links");
            tree.levels[i] = tree.levels[i].id; //Replace with ID to avoid resource definition duplication
        }
    }
}
