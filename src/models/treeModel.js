import { Group } from './groupModel';
import { isObject, merge, isString } from 'lodash-bound';

export class Tree extends Group {
    /**
     * Generate a group from tree template
     * @param parentGroup
     * @param treeGroup
     */
    static expandTemplate(parentGroup, treeGroup){
        if (!treeGroup.id){ console.warn("Skipped a tree template without ID!"); return; }

        //Warn about overriding group links
        if (treeGroup.links && (treeGroup.links.length > 0)){
            console.warn("Tree group contains extra links:", treeGroup.id, treeGroup.links);
        }
        treeGroup.levels = treeGroup.levels || new Array(treeGroup.numLevels);
        for (let i = 0; i < treeGroup.levels.length; i++) {
            if (treeGroup.levels[i]::isString()) {
                treeGroup.levels[i] = (parentGroup.links||[]).find(e => e.id === treeGroup.levels[i])
            }
        }

        const mergeGenResource = (e, prop) => {
            treeGroup[prop]   = treeGroup[prop] || [];
            parentGroup[prop] = parentGroup[prop] || [];
            if (!treeGroup[prop].includes(e)) {
                treeGroup[prop].push(e.id);
            }
            if (!parentGroup[prop].find(x => x.id === e.id)){
                parentGroup[prop].push(e);
            }
        };

        //Now treeGroup.levels are objects

        //If first treeGroup.levels[i] is given, its source must coincide with root
        if (treeGroup.levels[0]) {
            let a = treeGroup.root;
            let b = treeGroup.levels[0].source;
            if ((a || a.id) !== (b || b.id)) {
                console.warn("Tree root and the source node of the first branch are not the same: ", a, b);
            }
            if (b::isObject() && !b.id){
                console.error("treeGroup.levels[i] node definition must have ID:", b);
            } else {
                if (!a) {treeGroup.root = b::isObject()? b.id: b;}
            }
        }
        //generate a node that becomes the root tree (this covers also the case with )
        if (!treeGroup.root){
            let rootNode = {"id": treeGroup.id + "_root"};
            treeGroup.root = rootNode.id;
            mergeGenResource(rootNode, "nodes");
        }

        //Match number of requeste levels with the treeGroup.levels[i] array length
        if (treeGroup.levels.length !== treeGroup.numLevels){
            let min = Math.min(treeGroup.levels.length, treeGroup.numLevel);
            let max = Math.max(treeGroup.levels.length, treeGroup.numLevel);
            console.info(`Corrected number of levels in the tree from ${min} to ${max}` );
            treeGroup.numLevels = treeGroup.levels.length = max;
        }

        //Auto-generate missing entities for the tree levels
        let rootNode = parentGroup.nodes.find(e => e.id === treeGroup.root);
        rootNode.layout::merge({"x": -100, "y": 0, "z": 0});
        let source = rootNode;
        for (let i = 0; i < treeGroup.numLevels; i++){
            if (!treeGroup.levels[i]){ treeGroup.levels[i] = {}; }
            let target = treeGroup.levels[i].target;
            if (!target) {
                target = {
                    "id"       : treeGroup.id + "_node" + i,
                    "color"    : "#000",
                    "skipLabel": true
                };
                treeGroup.levels[i]::merge({
                    "id"    : treeGroup.id + "_lnk" + i,
                    "name"  : (treeGroup.name? treeGroup.name: "") + "treeGroup.levels[i]" + 1,
                    "source": source.id,
                    "target": target.id,
                    "color" : "#000"
                });
            }
            let t = treeGroup.lyphTemplate;
            if (t && !treeGroup.levels[i].conveyingLyph){
                if (t::isObject()){
                    if (!t.id) { t.id = treeGroup.id + "_template"; }
                    mergeGenResource(t, "lyphs");
                    treeGroup.lyphTemplate = t.id;
                }
                //Only create ID, conveying lyphs will be generated and added to the group by the "expandTemplate" method
                let lyph = {
                    "id"         : treeGroup.id + "_lyph_" + i,
                    "supertype"  : treeGroup.lyphTemplate,
                    "conveyedBy" : treeGroup.levels[i].id
                };
                treeGroup.levels[i].conveyingLyph = lyph.id;
                mergeGenResource(lyph, "lyphs");
            }
            mergeGenResource(treeGroup.levels[i], "links");
            mergeGenResource(target, "nodes");
            source = target;
            treeGroup.levels[i] = treeGroup.levels[i].id; //Replace with ID to avoid resource definition duplication
        }
        source.layout = source.layout::merge({"x": 100, "y": 0, "z": 0});
    }
}
