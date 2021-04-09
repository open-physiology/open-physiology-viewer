import {Resource} from './resourceModel';
import {
    $Field,
    $Prefix,
    getGenID,
    getNewID,
    LINK_GEOMETRY,
    EDGE_STROKE,
    PROCESS_TYPE,
    WIRE_GEOMETRY
} from "./utils";
import {$LogMsg, logger} from "./logger";

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
    static EDGE_STROKE   = EDGE_STROKE;
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