import { Group } from './groupModel';
import { merge, isString } from 'lodash-bound';

export class Tree extends Group {

    // expandModel(modelClasses, entitiesByID){
    //     //Warn about overriding group links
    //     if (this.links && (this.links.length > 0)){
    //         console.warn("Tree group contains extra links:", this.id, this.links);
    //     }
    //     this.links = this.links || [];
    //     this.nodes = this.nodes || [];
    //     this.lyphs = this.lyphs || [];
    //
    //     this.levels = this.levels || new Array(this.numLevels);
    //
    //     //If first level is given, its source must coincide with root
    //     if (this.levels[0]){
    //         if (this.root && this.root !== this.levels[0].source){
    //             console.warn("Tree root and the source node of the first branch are not the same: ",
    //                 this.root, this.levels[0].source);
    //         } else {
    //             this.root = this.levels[0].source ;
    //         }
    //     } else {
    //         //generate a node that becomes the root tree
    //         if (!this.root){
    //             this.root = modelClasses["Node"].fromJSON({"id": this.id + "_root"}, modelClasses, entitiesByID);
    //             this.nodes.push(this.root);
    //         }
    //     }
    //
    //     //Match number of requeste levels with the level array length
    //     if (this.levels.length !== this.numLevels){
    //         let min = Math.min(this.levels.length, this.numLevel);
    //         let max = Math.max(this.levels.length, this.numLevel);
    //         console.info(`Corrected number of levels in the tree from ${min} to ${max}` );
    //         this.numLevels = this.levels.length = max;
    //     }
    //
    //     //Auto-generate missing entities for the tree levels
    //     let source = this.root;
    //     this.root.layout = this.root.layout::merge({"x": -100, "y": 0, "z": 0});
    //     for (let i = 0; i < this.levels.length; i++){
    //         this.levels[i] = this.levels[i] || {};
    //         if (!this.levels[i].target) {
    //             let target = modelClasses["Node"].fromJSON({
    //                 "id"    : this.id + "_node" + i,
    //                 "color" : "#000",
    //                 "skipLabel": true
    //             }, modelClasses, entitiesByID);
    //             this.levels[i] = modelClasses["Link"].fromJSON({
    //                 "id"    : this.id + "_lnk" + i,
    //                 "name"  : (this.name? this.name: "") + "level" + 1,
    //                 "source": source,
    //                 "target": target,
    //                 "color" : "#000"
    //             }, modelClasses, entitiesByID);
    //         }
    //         if (this.lyphTemplate && !this.levels[i].conveyingLyph){
    //             this.levels[i].conveyingLyph = modelClasses["Lyph"].fromJSON({
    //                 "id"        : this.id + "_lyph_" + i,
    //                 "supertype" : this.lyphTemplate
    //             });
    //             this.lyphTemplate.subtypes = this.lyphTemplate.subtypes || [];
    //             this.lyphTemplate.subtypes.push(this.levels[i].conveyingLyph);
    //             this.lyphs.push(this.levels[i].conveyingLyph); //group lyphs
    //         }
    //         this.links.push(this.levels[i]);
    //         this.nodes.push(this.levels[i].target);
    //         source = this.levels[i].target;
    //     }
    //     source.layout = source.layout::merge({"x": 100, "y": 0, "z": 0});
    //     // if (this.lyphTemplate){
    //     //     modelClasses["Lyph"].expandTemplate(this.lyphTemplate, modelClasses, entitiesByID);
    //     // }
    // }

    /**
     * Generate a group from tree template
     * Note: expandLyphTemplate must be called after to instantiate conveying lyphs in a tree
     * @param parentGroup
     * @param json
     */
    static expandTemplate(parentGroup, json){
        if (!json.id){
            console.warn("Skipped a tree template without ID!");
            return;
        }

        //Warn about overriding group links
        if (json.links && (json.links.length > 0)){
            console.warn("Tree group contains extra links:", json.id, json.links);
        }
        json.links = json.links || [];
        json.nodes = json.nodes || [];
        json.lyphs = json.lyphs || [];

        json.levels = json.levels || new Array(json.numLevels);

        for (let i = 0; i < json.levels.length; i++) {
            if (json.levels[i]::isString()) {
                json.levels[i] = (parentGroup.links||[]).find(e => e.id === json.levels[i])
            }
        }
        //If first level is given, its source must coincide with root
        if (json.levels[0]){
            if (json.root && json.root !== json.levels[0].source){
                console.warn("Tree root and the source node of the first branch are not the same: ",
                    json.root, json.levels[0].source);
            } else {
                json.root = json.levels[0].source ;
            }
        } else {
            //generate a node that becomes the root tree
            if (!json.root){
                json.root = {"id": json.id + "_root"};
                json.nodes.push(json.root);
            }
        }

        //Match number of requeste levels with the level array length
        if (json.levels.length !== json.numLevels){
            let min = Math.min(json.levels.length, json.numLevel);
            let max = Math.max(json.levels.length, json.numLevel);
            console.info(`Corrected number of levels in the tree from ${min} to ${max}` );
            json.numLevels = json.levels.length = max;
        }

        if (json.root::isString()){
            json.root = (parentGroup.nodes||[]).find(e => e.id === json.root);
        }

        //Auto-generate missing entities for the tree levels
        let source = json.root;
        json.root.layout = json.root.layout::merge({"x": -100, "y": 0, "z": 0});
        for (let i = 0; i < json.levels.length; i++){
            json.levels[i] = json.levels[i] || {};
            if (!json.levels[i].target) {
                let target = {
                    "id"       : json.id + "_node" + i,
                    "color"    : "#000",
                    "skipLabel": true
                };
                json.levels[i] = {
                    "id"    : json.id + "_lnk" + i,
                    "name"  : (json.name? json.name: "") + "level" + 1,
                    "source": source,
                    "target": target,
                    "color" : "#000"
                };
            }
            if (json.lyphTemplate && !json.levels[i].conveyingLyph){
                if (json.lyphTemplate::isString()){
                    json.lyphTemplate = (parentGroup.lyphs||[]).find(e => e.id === json.lyphTemplate);
                }
                json.levels[i].conveyingLyph = {
                    "id"        : json.id + "_lyph_" + i
                };
                json.lyphTemplate.subtypes = json.lyphTemplate.subtypes || [];
                json.lyphTemplate.subtypes.push(json.levels[i].conveyingLyph);
                json.lyphs.push(json.levels[i].conveyingLyph); //group lyphs
            }
            json.links.push(json.levels[i]);
            json.nodes.push(json.levels[i].target);
            source = json.levels[i].target;
        }
        source.layout = source.layout::merge({"x": 100, "y": 0, "z": 0});
    }
}
