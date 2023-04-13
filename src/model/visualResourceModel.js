import {Resource} from './resourceModel';
import {$SchemaClass} from "./utils";
/**
 * The class implementing common methods for the visual resources.
 * @class
 * @property {string} color - visual resource color
 * @property {Map<string, Object>} viewObjects - visual objects representing the resource
 * @property {boolean} hidden    - indicates whether the resource is currently hidden (invisible in the scene)
 * @property {boolean} skipLabel - excludes resource labels from the view
 * @property {Object} cloneOf    - points to other instances of the same conceptual resource
 * @property {Object} viewObjects - WebGL objects corresponding to the visual resource
 */
export class VisualResource extends Resource{

    /**
     * Determines whether the resource should appear in the scheme based on its 'hidden' attribute and other resource dependencies
     * @returns {boolean}
     */
    get isVisible(){
        return !this.hidden;
    }
}

/**
 * The class to model Material resources
 * @property materials
 * @property inMaterials
 * @property transportedBy
 */
export class Material extends VisualResource {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.class = json.class || $SchemaClass.Material;
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    containsMaterial(materialID){
        let res = false;
        if (this.id === materialID) { res = true; }
        if (!res){
            res = (this.materials || []).find(e => e.containsMaterial(materialID));
        }
        return res;
    }
}