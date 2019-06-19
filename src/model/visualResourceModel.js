import { Resource } from './resourceModel';
import { getNewID } from "./utils";
import { merge, pick } from "lodash-bound";

/**
 * Supported link geometries
 * @type {{LINK: string, SEMICIRCLE: string, RECTANGLE: string, PATH: string, SPLINE: string, FORCE: string}}
 */
export const LINK_GEOMETRY = {
    LINK       : "link",        //straight line
    SEMICIRCLE : "semicircle",  //line in the form of a semicircle
    RECTANGLE  : "rectangle",   //rectangular line with rounded corners
    PATH       : "path",        //path defined (e.g., in the shape for the edge bundling)
    SPLINE     : "spline",      //solid curve line that uses other nodes to produce a smooth path
    INVISIBLE  : "invisible",   //link with hidden visual geometry
};

/**
 * Supported link strokes
 * @type {{DASHED: string, THICK: string}}
 */
export const LINK_STROKE = {
    DASHED     : "dashed",      //dashed line
    THICK      : "thick"        //thick line
};

/**
 * Process types
 * @type {{ADVECTIVE: string, DIFFUSIVE: string}}
 */
export const PROCESS_TYPE = {
    ADVECTIVE     : "ADVECTIVE",
    DIFFUSIVE     : "DIFFUSIVE"
};

/**
 * The class implementing common methods for the visual resources.
 * @class
 * @property {string} color - visual resource color
 * @property {Map<string, Object3D>} viewObjects - visual objects representing the resource
 * @property {boolean} hidden    - indicates whether the resource is currently hidden (invisible in the scene)
 * @property {boolean} skipLabel - excludes resource labels from the view
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
 *  The class to visualize Node resources in the force-directed graphs
 * @class
 * @property {number} val
 * @property {Array<Node>} controlNodes
 * @property {Link} hostedBy
 * @property {Link} sourceOf
 * @property {Link} targetOf
 * @property {Shape} internalIn
 * @property {boolean} fixed
 * @property {Object} layout
 * @property {number} collide
 * @property {number} charge
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */
export class Node extends VisualResource {

    static clone(sourceNode, targetNode){
        if (!sourceNode || !targetNode) { return; }
        targetNode.cloneOf = sourceNode.id;
        targetNode::merge(sourceNode::pick(["color", "skipLabel", "generated"]));
    }

    /**
     * Determines whether the node's position is constrained in the model
     */
    get isConstrained() {
        return !!((this.fixed && this.layout) ||
            (this.controlNodes && this.controlNodes.length > 0) ||
            (this.hostedBy && this.hostedBy.isVisible) ||
            (this.internalIn && this.internalIn.isVisible));
    }
}

/**
 *  The class to visualize processes (edges)
 * @class
 * @property source
 * @property target
 * @property directed
 * @property collapsible
 * @property geometry
 * @property conveyingLyph
 * @property conveyingType
 * @property conveyingMaterials
 * @property stroke
 * @property path
 * @property lineWidth
 * @property hostedNodes
 * @property onBorder
 */
export class Link extends VisualResource {

    static fromJSON(json, modelClasses = {}, entitiesByID) {
        json.id = json.id || getNewID(entitiesByID);
        json.source = json.source || `s_${json.id}`;
        json.target = json.target || `t_${json.id}`;
        return super.fromJSON(json, modelClasses, entitiesByID);
    }

    static clone(sourceLink, targetLink){
        if (!sourceLink || !targetLink) { return; }
        targetLink.cloneOf = sourceLink.id;
        targetLink::merge(sourceLink::pick(["conveyingType", "conveyingMaterials", "color", "generated"]));
    }

    get isVisible(){
        return this.onBorder? this.onBorder.isVisible : super.isVisible && this.source && this.source.isVisible && this.target && this.target.isVisible;
    }
}

/**
 * The class to model Material resources
 */
export class Material extends VisualResource {}