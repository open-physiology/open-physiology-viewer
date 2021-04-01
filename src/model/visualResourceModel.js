import {Resource} from './resourceModel';
import {
    $Prefix,
    getGenID,
    getNewID,
    LINK_GEOMETRY,
    LINK_STROKE,
    PROCESS_TYPE,
    WIRE_GEOMETRY
} from "./utils";

/**
 * The class implementing common methods for the visual resources.
 * @class
 * @property {string} color - visual resource color
 * @property {Map<string, Object>} viewObjects - visual objects representing the resource
 * @property {boolean} hidden    - indicates whether the resource is currently hidden (invisible in the scene)
 * @property {boolean} skipLabel - excludes resource labels from the view
 * @property {Object} cloneOf
 */
export class VisualResource extends Resource{

    /**
     * @property INVISIBLE
     * @property LINK
     * @property SEMICIRCLE
     * @property RECTANGLE
     * @property ARC
     * @property SPLINE
     * @property PATH
     */
    static LINK_GEOMETRY = LINK_GEOMETRY;
    static LINK_STROKE   = LINK_STROKE;
    static PROCESS_TYPE  = PROCESS_TYPE;
    static WIRE_GEOMETRY = WIRE_GEOMETRY;

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
 */
export class Material extends VisualResource {}

/**
 * The class to represent scaffold anchor points
 */
export class Anchor extends VisualResource {
    /**
     * Determines whether the anchor's position is constrained in the model
     */
    get isConstrained() {
        return (this.hostedBy && this.hostedBy.isVisible) ||
            (this.internalIn && this.internalIn.isVisible);
    }
}

/**
 * The class to represent scaffold wires
 */
export class Wire extends VisualResource {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.id = json.id || getNewID(entitiesByID);
        json.source = json.source || getGenID($Prefix.source, json.id);
        json.target = json.target || getGenID($Prefix.target, json.id);
        const res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        //Wires are not in the force-field, so we set their length from end points
        const s = res.source && res.source.layout;
        const t = res.target && res.target.layout;
        if (s && t){
            const d = {};
            ["x", "y"].forEach(dim => d[dim] =  (t[dim] || 0) - (s[dim] || 0));
            res.length = Math.sqrt( d.x * d.x + d.y * d.y + d.z * d.z);
        } else {
            res.length = 10; //TODO replace with config constract
        }
        return res;
    }
}