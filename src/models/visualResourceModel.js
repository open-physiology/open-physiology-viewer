import { Resource } from './resourceModel';
import {SpriteText2D} from "three-text2d";
import {copyCoords} from "./utils";

/**
 * The class implementing common methods for the visual resources.
 * @class
 * @property {string} color - visual resource color
 * @property {Map<string, Object3D>} viewObjects - visual objects representing the resource
 * @property {Map<string, SpriteText2D>} labels  - visual sprites representing resource labels
 * @property {boolean} hidden    - indicates whether the resource is currently hidden (invisible in the scene)
 * @property {boolean} skipLabel - excludes resource labels from the view
 */
export class VisualResource extends Resource{

    constructor(id) {
        super();
        this.id = id;
    }

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

    /**
     * Create resource labels
     * @param {Object} state - graph configuration, relevant parameters: fontParams
     */
    createLabels(state){
        if (this.skipLabel) { return; }
        let labelKey = state.labels[this.constructor.name];
        this.labels = this.labels || {};

        if (!this.labels[labelKey] && this[labelKey]) {
            this.labels[labelKey] = new SpriteText2D(this[labelKey], state.fontParams);
        }

        if (this.labels[labelKey]){
            this.viewObjects["label"] = this.labels[labelKey];
            this.viewObjects["label"].visible = this.isVisible;
        } else {
            delete this.viewObjects["label"];
        }
    }

    /**
     * Updates resource labels
     * @param {Object}  state    - graph configuration, relevant parameters: showLabels and labelRelSize
     * @param {Vector3} position - label position
     */
    updateLabels(state, position){
        if (this.skipLabel) { return; }
        let labelKey  = state.labels[this.constructor.name];
        let isVisible = state.showLabels[this.constructor.name];
        if (this.labels[labelKey]){
            this.labels[labelKey].visible = isVisible;
            this.labels[labelKey].scale.set(state.labelRelSize , state.labelRelSize , state.labelRelSize );
            copyCoords(this.labels[labelKey].position, position);
            this.viewObjects['label'] = this.labels[labelKey];
        } else {
            delete this.viewObjects['label'];
        }
    }
}

