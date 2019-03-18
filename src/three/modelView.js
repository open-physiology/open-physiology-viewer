import {values} from 'lodash-bound';
import {Group} from "../model/groupModel";
import {LINK_GEOMETRY} from "../model/visualResourceModel";
import {ForceEdgeBundling} from "./d3-forceEdgeBundling";
import {
    commonTemplate, copyCoords,
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
        node.viewObjects::values().filter(obj => !!obj).forEach(obj => state.graphScene.add(obj));
    });

    this.visibleLinks.forEach(link => {
        link.createViewObjects(state);
        link.viewObjects::values().filter(obj => !!obj).forEach(obj => state.graphScene.add(obj));
        if (link.geometry === LINK_GEOMETRY.INVISIBLE){
            link.viewObjects["main"].material.visible = false;
        }
    });

    this.visibleRegions.forEach(region => {
        region.createViewObjects(state);
        region.viewObjects::values().filter(obj => !!obj).forEach(obj => state.graphScene.add(obj));
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

    (this.coalescences||[]).forEach(coalescence => {
        if (!coalescence.lyphs || !coalescence.lyphs[0]) { return }
        let lyph = coalescence.lyphs[0];
        for (let i = 1; i < coalescence.lyphs.length; i++) {
            let lyph2 = coalescence.lyphs[i];
            if (lyph.isTemplate || lyph2.isTemplate){ return; }

            let layers  = lyph.layers  || [lyph];
            let layers2 = lyph2.layers || [lyph2];
            let container1 = lyph2.allContainers.find(x => x.id === lyph.id);
            if (container1) {
                let same = commonTemplate(lyph2.internalIn, layers2[layers2.length - 1]);
                layers2[layers2.length - 1].setMaterialVisibility( !state.showCoalescences || !same);
            } else {
                let container2 = lyph.allContainers.find(x => x.id === lyph2.id);
                if (container2) {
                    let same = commonTemplate(lyph.internalIn, layers[layers.length - 1]);
                    layers[layers.length - 1].setMaterialVisibility(!state.showCoalescences || !same);
                } else {
                    if (state.showCoalescences && lyph.viewObjects["2d"]){
                        //coalescing lyphs are independent / at the same scale level
                        let overlap = Math.min(layers[layers.length - 1].width, layers2[layers2.length - 1].width);
                        let scale = (lyph.width + lyph2.width - overlap) / (lyph.width || 1);
                        let v1 = lyph.points[3].clone().sub(lyph.points[0]).multiplyScalar(scale);
                        let v2 = lyph.points[2].clone().sub(lyph.points[1]).multiplyScalar(scale);
                        let c1 = extractCoords(lyph.axis.source).clone().add(v1);
                        let c2 = extractCoords(lyph.axis.target).clone().add(v2);
                        copyCoords(lyph2.axis.source, c1);
                        copyCoords(lyph2.axis.target, c2);
                    }
                }
            }
        }
    });

    this.visibleRegions.forEach(region => { region.updateViewObjects(state); });
};




