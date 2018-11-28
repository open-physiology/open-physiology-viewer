import { Resource } from './resourceModel';
import {SpriteText2D} from "three-text2d";
import {copyCoords} from "./utils";
/**
 * Common methods for all entity models
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
     * Create visible labels
     * @param labelKey - object property to use as label
     * @param fontParams - font settings
     */
    createLabels(labelKey, fontParams){
        if (this.skipLabel) { return; }
        this.labels = this.labels || {};

        if (!this.labels[labelKey] && this[labelKey]) {
            this.labels[labelKey] = new SpriteText2D(this[labelKey], fontParams);
        }

        if (this.labels[labelKey]){
            this.viewObjects["label"] = this.labels[labelKey];
            this.viewObjects["label"].visible = this.isVisible;
        } else {
            delete this.viewObjects["label"];
        }
    }

    /**
     * Updates visual labels
     * @param labelKey  - object property to use as label
     * @param isVisible - a boolean flag to toggle the label
     * @param position  - label's position wrt the visual object
     */
    updateLabels(labelKey, isVisible, position){
        if (this.skipLabel) { return; }
        if (this.labels[labelKey]){
            this.viewObjects['label'] = this.labels[labelKey];
            this.viewObjects["label"].visible = isVisible;
            copyCoords(this.viewObjects["label"].position, position);
        } else {
            delete this.viewObjects['label'];
        }
    }
}

