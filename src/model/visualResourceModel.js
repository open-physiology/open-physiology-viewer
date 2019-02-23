import { Resource } from './resourceModel';

/**
 * Supported link geometries
 * @type {{LINK: string, SEMICIRCLE: string, RECTANGLE: string, PATH: string, SPLINE: string, INVISIBLE: string, FORCE: string}}
 */
export const LINK_GEOMETRY = {
    LINK       : "link",        //straight line
    SEMICIRCLE : "semicircle",  //line in the form of a semicircle
    RECTANGLE  : "rectangle",   //rectangular line with rounded corners
    PATH       : "path",        //path defined (e.g., in the shape for the edge bundling)
    SPLINE     : "spline",      //solid curve line that uses other nodes to produce a smooth path
    INVISIBLE  : "invisible",   //link with hidden visual geometry,
    FORCE      : "force"        //link without visual geometry, works as force to attract or repel nodes
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
 * The class implementing common methods for the visual resources.
 * @class
 * @property {string} color - visual resource color
 * @property {Map<string, Object3D>} viewObjects - visual objects representing the resource
 * @property {boolean} hidden    - indicates whether the resource is currently hidden (invisible in the scene)
 * @property {boolean} skipLabel - excludes resource labels from the view
 */
export class VisualResource extends Resource{

    /**
     * Polygon offset factor determines order of rendering of objects with the same depth (z-coordinate).
     * Smaller number indicates that the visual object is rendered "closer" to the viewer
     * @returns {number}
     */
    get polygonOffsetFactor() {
        return 0;
    }

    /**
     * Determines whether the resource should appear in the scheme based on its 'hidden' attribute and other resource dependencies
     * @returns {boolean}
     */
    get isVisible(){
        return !this.hidden;
    }
}

/**
 * The class to model Material resources within Lyphs
 */
export class Material extends VisualResource {}

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

    /**
     * Determines whether the node's position is constrained in the model
     */
    get isConstrained() {
        return !!((this.fixed && this.layout) ||
            (this.controlNodes && this.controlNodes.length > 0) ||
            (this.hostedBy && this.hostedBy.isVisible) ||
            (this.internalIn && this.internalIn.isVisible));
    }

    get polygonOffsetFactor() {
        return Math.min(...["hostedBy", "internalIn"].map(prop => this[prop]?
            (this[prop].polygonOffsetFactor || 0) - 1: 0));
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
 * @property stroke
 * @property path
 * @property lineWidth
 * @property hostedNodes
 */
export class Link extends VisualResource {

    get polygonOffsetFactor(){
        return Math.min(...["hostedBy", "source", "target"].map(prop => this[prop]?
            (this[prop].polygonOffsetFactor || 0) - 1: 0));
    }

}

