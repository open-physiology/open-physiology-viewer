import {values} from 'lodash-bound';
import {modelClasses} from "../../model";

import '../anchor'
import '../border'
import '../edge'
import '../group'
import '../link'
import '../lyph'
import '../node'
import '../region'
import '../shape'
import '../vertice'
import '../wire'

const { Component } = modelClasses;

/**
 * Create visual objects for Scaffold resources
 * @param state
 */
Component.prototype.createViewObjects = function(state){
    [this.visibleAnchors, this.visibleWires, this.visibleRegions].forEach(resArray =>
        resArray.forEach(res => {
            res.createViewObjects(state);
            res.viewObjects::values().forEach(obj => obj && state.graphScene.add(obj));
        })
    );
};

/**
 * Update visual objects for group resources
 */
Component.prototype.updateViewObjects = function(state){
    this.visibleAnchors.forEach(anchor => anchor.updateViewObjects(state));
    this.visibleWires.forEach(wire => wire.updateViewObjects(state));
    this.visibleRegions.forEach(region => region.updateViewObjects(state));
};
