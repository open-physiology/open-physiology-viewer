import {modelClasses} from "../model";
import {SpriteText2D} from "three-text2d";

import {
    copyCoords,
} from "./utils";

import './lines/Line2.js';
import { getBoundingBoxSize } from "./render/autoLayout/objects";

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
        this.labels[labelKey].material.alphaTest = .4;
        this.labels[labelKey].scale.set(.1, .1, .1)
    }

    if (this.labels[labelKey]){
        this.viewObjects["label"] = this.labels[labelKey];
        this.viewObjects["label"].visible = (this.viewObjects["main"]?.visible ) && this.state.showLabels[this.constructor.name];
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
        this.labels[labelKey].visible = (this.viewObjects["main"]?.visible ) && this.state.showLabels[this.constructor.name];
        if (this.labels[labelKey].visible) {
            this.labels[labelKey].scale.set(this.state.labelRelSize, this.state.labelRelSize, this.state.labelRelSize);
            const lyphDim = getBoundingBoxSize(this.viewObjects["main"]);
            const refHeight  = lyphDim.y * this.viewObjects["main"].scale.y * .85;
            position ? position.y = position.y - refHeight/2: null;
            copyCoords(this.labels[labelKey].position, position);
            this.viewObjects['label'] = this.labels[labelKey];
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