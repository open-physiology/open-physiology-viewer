import {values} from 'lodash-bound';
import {Group} from "../model/groupModel";
import {LINK_GEOMETRY} from "../model/visualResourceModel";
import {ForceEdgeBundling} from "./d3-forceEdgeBundling";
import {
    extractCoords
} from "./utils";

import './visualResourceView';
import './shapeView';

/**
 * Create visual objects for group resources
 * @param state
 */
Group.prototype.createViewObjects = function(state){
    this.visibleNodes.forEach(node => {
        node.createViewObjects(state);
        node.viewObjects::values().forEach(obj => state.graphScene.add(obj));
    });

    this.visibleLinks.forEach(link => {
        link.createViewObjects(state);
        link.viewObjects::values().forEach(obj => state.graphScene.add(obj));
        if (link.geometry === LINK_GEOMETRY.INVISIBLE){
            link.viewObjects["main"].material.visible = false;
        }
    });

    this.visibleRegions.forEach(region => {
        region.createViewObjects(state);
        region.viewObjects::values().forEach(obj => state.graphScene.add(obj));
    });
};

/**
 * Update visual objects for group resources
 * @param state
 */
Group.prototype.updateViewObjects = function(state){
    // Update nodes positions
    this.visibleNodes.forEach(node => { node.updateViewObjects(state) });

    //Edge bundling
    const fBundling = ForceEdgeBundling()
        .nodes(this.visibleNodes)
        .edges(this.visibleLinks.filter(e => e.geometry === LINK_GEOMETRY.PATH).map(edge => {
            return {
                source: this.nodes.indexOf(edge.source),
                target: this.nodes.indexOf(edge.target)
            };
        }));
    let res = fBundling();
    (res || []).forEach(path => {
        let lnk = this.links.find(e => e.source.id === path[0].id && e.target.id === path[path.length -1 ].id);
        if (lnk){
            let dz = (path[path.length - 1].z - path[0].z) / path.length;
            for (let i = 1; i < path.length - 1; i++){
                path[i].z = path[0].z + dz * i;
            }
            lnk.path = path.slice(1, path.length - 2).map(p => extractCoords(p));
        }
    });

    this.visibleLinks.forEach(link => { link.updateViewObjects(state); });

    this.visibleRegions.forEach(region => { region.updateViewObjects(state); });
};




