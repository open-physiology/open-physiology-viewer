import { Group } from './groupModel';
import { isObject, defaults} from 'lodash-bound';

export class Tree extends Group {
    /**
    * Generate a group from tree template
    * @param parentGroup
    * @param tree
    */
    static expandTemplate(parentGroup, tree){

        if (!tree.id){ console.warn(`Skipped tree template - it must have (non-empty) ID!`); return; }
        if ( !tree.numLevels && ((tree.levels||[]).length === 0)) { console.warn(`Skipped tree template - it must have ID, "numLevels" set to a positive number or provide a non-empty "levels" array`); return; }
        if ( tree.links && (tree.links.length > 0)){ console.warn(`Tree group contains extra links: ${tree.links}!`)}
        if ( tree.nodes && (tree.nodes.length > 0)){ console.warn(`Tree group contains extra nodes: ${tree.nodes}!`)}

        const mergeGenResource = (e, prop) => {
            tree[prop]        = tree[prop] || [];
            parentGroup[prop] = parentGroup[prop] || [];
            if (!tree[prop].includes(e)) { tree[prop].push(e.id); }
            if (!parentGroup[prop].find(x => x.id === e.id)){ parentGroup[prop].push(e); }
        };
        const getID  = (e) => e::isObject()? e.id : e;
        const match  = (e1, e2) => getID(e1) === getID(e2);
        const getObj = (e, prop) => e::isObject()? e: (parentGroup[prop]||[]).find(x => x.id == e);

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
        // if (sources[0]::isObject() && sources[0].layout::isEmpty()){
        //     sources[0].layout = {"x": -100, "y": 0, "z": 0};
        // }
        // if (sources[N]::isObject() && sources[N].layout::isEmpty()){
        //     sources[N].layout = {"x": 100, "y": 0, "z": 0};
        // }

        let template = tree.lyphTemplate;
        let topology = "TUBE"; //leave default untouched
        if (template){
            if (template::isObject()){
                if (!template.id) { template.id = tree.id + "_template"; }
                mergeGenResource(template, "lyphs");
                topology = template.topology;
                tree.lyphTemplate = template.id;
            } else {
                //find lyph template to establish topology of the tree
                template = parentGroup.lyphs.find(e => e.id === tree.lyphTemplate);
                if (!template){
                    console.error("Failed to find the lyph template definition in the parent group: ",
                        tree.lyphTemplate);
                } else {
                    topology = template.topology;
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
                    "topology"   : (i === N - 1)? topology: "TUBE"
                };
                tree.levels[i].conveyingLyph = lyph.id;
                mergeGenResource(lyph, "lyphs");
            }
            mergeGenResource(tree.levels[i], "links");
            tree.levels[i] = tree.levels[i].id; //Replace with ID to avoid resource definition duplication
        }
    }
}
