import { Resource } from './resourceModel';
import {SpriteText2D} from "three-text2d";
import {copyCoords} from "./utils";

/**
 * The class implementing common methods for visual resources
 * @class
 * @property color
 * @property viewObjects
 * @property labels
 * @property hidden
 * @property skipLabel
 * @property userData
 *
 */
export class VisualResource extends Resource{

    constructor(id) {
        super();
        this.id = id;
    }

    /**
     * Create VisualResource model from the JSON specification
     * @param json - input model
     * @param modelClasses - recognized classes
     * @param entitiesByID - map of all model entities
     * @returns {VisualResource} - VisualResource model
     */
    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        //Do not expand templates ?
        return super.fromJSON(json, modelClasses, entitiesByID );
    }

    get polygonOffsetFactor() {
        return 0;
    }

    get isVisible(){
        return !this.hidden;
    }

    /**
     * Create resource labels
     * @param state - graph configuration, relevant parameters: fontParams
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
     * @param state - graph configuration, relevant parameters: showLabels and labelRelSize
     * @param position - label position
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

