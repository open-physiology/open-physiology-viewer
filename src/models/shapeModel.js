import {Entity} from './entityModel';

/**
 * Class that creates visualization objects of regions
 */
export class Shape extends Entity {

    static fromJSON(json, modelClasses = {}, entitiesByID) {
        json.border      = json.border || {};
        json.border.id   = json.border.id || json.id + "_border";
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.border.host = res;
        return res;
    }
}
