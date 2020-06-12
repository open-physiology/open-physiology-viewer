import { Resource } from './resourceModel';
import { getNewID, LINK_GEOMETRY, LINK_STROKE, PROCESS_TYPE, getGenID, $Field, $Prefix} from "./utils";
import { merge, pick } from "lodash-bound";

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

    static LINK_GEOMETRY = LINK_GEOMETRY;
    static LINK_STROKE   = LINK_STROKE;
    static PROCESS_TYPE  = PROCESS_TYPE;

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
        if (!sourceNode) { return; }
        targetNode = targetNode || {};
        targetNode.cloneOf = sourceNode.id;
        targetNode.id = targetNode.id || getGenID(sourceNode.id, $Prefix.clone);
        targetNode::merge(sourceNode::pick([$Field.color, $Field.skipLabel]));
        targetNode.generated = true;
        if (!sourceNode.clones){ sourceNode.clones = []; }
        sourceNode.clones.push(targetNode.id);
        return targetNode;
    }

    /**
     * Determines whether the node's position is constrained in the model
     */
    get isConstrained() {
        return !!((this.fixed && this.layout) ||
            //(this.controlNodes && this.controlNodes.length > 0) ||
            (this.hostedBy && this.hostedBy.isVisible) ||
            (this.internalIn && this.internalIn.isVisible));
    }

    // get isVisible(){
    //     return super.isVisible && (!this.hostedBy || this.hostedBy.isVisible) || (!this.internalIn || this.internalIn.isVisible);
    // }
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
        json.source = json.source || getGenID($Prefix.source, json.id);
        json.target = json.target || getGenID($Prefix.target, json.id);
        return super.fromJSON(json, modelClasses, entitiesByID);
    }

    static clone(sourceLink, targetLink){
        if (!sourceLink || !targetLink) { return; }
        targetLink.cloneOf = sourceLink.id;
        targetLink::merge(sourceLink::pick([$Field.conveyingType, $Field.conveyingMaterials, $Field.color, $Field.generated]));
    }

    static createCollapsibleLink(sourceID, targetID){
        return {
            [$Field.id]         : getGenID($Prefix.link, sourceID, targetID),
            [$Field.source]     : sourceID,
            [$Field.target]     : targetID,
            [$Field.stroke]     : LINK_STROKE.DASHED,
            [$Field.length]     : 1,
            [$Field.strength]   : 1,
            [$Field.collapsible]: true,
            [$Field.generated]  : true
        };
    }

    get isVisible(){
        return (this.onBorder? this.onBorder.isVisible : super.isVisible) && this.source && this.source.isVisible && this.target && this.target.isVisible;
    }
}

/**
 * The class to model Material resources
 */
export class Material extends VisualResource {}