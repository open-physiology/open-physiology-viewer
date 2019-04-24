import {values} from 'lodash-bound';
import {Group} from "../model/groupModel";
import {LINK_GEOMETRY} from "../model/visualResourceModel";
import {COALESCENCE_TOPOLOGY} from "../model/coalescenceModel";
import {ForceEdgeBundling} from "../algorithms/forceEdgeBundling";
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
    this.visibleNodes.forEach(node => node.updateViewObjects(state));

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
        if (coalescence.inactive || !coalescence.lyphs) { return }
        let lyph = coalescence.lyphs[0];
        if (!lyph || lyph.isTemplate ) { return; }
        for (let i = 1; i < coalescence.lyphs.length; i++) {
            let lyph2 = coalescence.lyphs[i];
            if (lyph2.isTemplate) { return; }

            let layers2 = lyph2.layers || [lyph2];
            if (coalescence.topology === COALESCENCE_TOPOLOGY.EMBEDDING) {
                //Non-symmetric - first lyph is a "housing lyph"
                //let same = commonTemplate(lyph, layers2[layers2.length - 1]);
                layers2[layers2.length - 1].setMaterialVisibility( !state.showCoalescences);// || !same);
            } else {//CONNECTING
                //Non-symmetric - second lyph moves towards the first
                //coalescing lyphs are independent / at the same scale level
                if (state.showCoalescences && lyph.viewObjects["2d"]) {
                    let layers = lyph.layers || [lyph];
                    let overlap = Math.min(layers[layers.length - 1].width, layers2[layers2.length - 1].width);
                    let scale = (lyph.width + lyph2.width - overlap) / (lyph.width || 1);
                    if (lyph.axis && lyph2.axis) {
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




