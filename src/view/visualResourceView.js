import {modelClasses} from "../model";
import {SpriteText2D} from "./text/spriteText2D";

const {VisualResource} = modelClasses;

/**
 * Create resource labels
 */
VisualResource.prototype.createLabels = function(){
    if (this.skipLabel || !this.state.showLabels) { return; }
    const labelKey = this.state.labels[this.constructor.name];
    this.labels = this.labels || {};

    if (!this.labels[labelKey] && this[labelKey]) {
        this.labels[labelKey] = new SpriteText2D(this[labelKey], this.state.fontParams);
        this.labels[labelKey].material.alphaTest = 0.1
    }

    if (this.labels[labelKey]){
        this.viewObjects["label"] = this.labels[labelKey];
        this.viewObjects["label"].visible = !this.hidden;
    } else {
        delete this.viewObjects["label"];
    }
};

/**
 * Updates resource labels
 * @param {Object} position - label position
 */
VisualResource.prototype.updateLabels = function(position){
    if (this.skipLabel || !this.state.showLabels) { return; }
    const labelKey = this.state.labels[this.constructor.name];
    if (this.labels[labelKey]){
        this.labels[labelKey].visible = this.state.showLabels[this.constructor.name];
        if (this.labels[labelKey].visible) {
            const scale = (this.state.labelRelSize || 1) * (this.labels[labelKey].baseScale || 1);
            this.labels[labelKey].scale.set(this.labels[labelKey].aspect * scale, scale, scale);
            this.labels[labelKey].position.copy(position);
            this.viewObjects['label'] = this.labels[labelKey];
            if (this.state.graphScene && !this.state.graphScene.children.includes(this.labels[labelKey])) {
                this.state.graphScene.add(this.labels[labelKey]);
            }
        }
    } else {
        delete this.viewObjects['label'];
    }
};

/**
 * Create visual object for abstract visual resource
 */
VisualResource.prototype.createViewObjects = function(state) {
    this.state = state; //Save graph state
};

/**
 * Update visual object for abstract visual resource
 */
VisualResource.prototype.updateViewObjects = function(state) {
    const labelKey = state.labels[this.constructor.name];
    if (!this.viewObjects["main"] || (!this.skipLabel && !this.labels[labelKey] && this[labelKey])) {
        this.createViewObjects(state);
    }
};