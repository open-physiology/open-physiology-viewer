import { Group } from './groupModel';
export class Tree extends Group {

    /**
     * Create a graph model from the JSON specification
     * @param json - input model
     * @param modelClasses - recognized entity models
     * @param entitiesByID
     * @returns {*} - Graph model
     */
    static fromJSON(json, modelClasses = {}, entitiesByID) {

        let res  = super.fromJSON(json, modelClasses, entitiesByID);
        if (!res.root){
            if (res.levels && res.levels[0]){
                res.root = res.levels[0].source ;
            } else {
                //generate a node that becomes the root tree
            }
        }

        if (res.levels.length !== res.numLevels){
            console.warn("The level assignment array does not comply with the requested number of levels in the tree", json);
            if (res.numLevels < res.levels.length){
                console.warn("Auto-increased number of levels in the tree", json, res.numLevels);
            }
        }

        for (let i = res.levels.length; i < 4; i++){ res.levels.push({}); }
        for (let i = 0; i < res.numLevels; i++){

        }

        return res;
    }



}
