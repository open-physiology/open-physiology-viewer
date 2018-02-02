import * as three from 'three';
const THREE = window.THREE || three;

import {lyphs}   from '../data/data';
import { schemePaired } from 'd3-scale-chromatic';
const ThreeBSP = require('three-js-csg')(THREE);

const defaultLyph = {
    "name": "?",
    "color": "#ccc"
};

//TODO convert to LyphModel class

//Assign colors to lyphs (Note: original dataset modified, deepClone if necessary)
const colors = schemePaired;
Object.keys(lyphs).filter(id => !lyphs[id].color)
    .forEach((id, i) => {
        lyphs[id].color = colors[i % colors.length]
    }
);

//TODO optimise - no need to create these materials again and again
//TODO One material for all lyphs of the same color is probably enough
function createLayerMaterials(lyphModel){
    let layerMaterials = {};
    if (lyphModel.layers) {
        lyphModel.layers.forEach(id => {
            if (layerMaterials[id]) return;
            let layer = lyphs[id] || defaultLyph;
            layerMaterials[id] = new THREE.MeshBasicMaterial({color: layer.color, side: THREE.DoubleSide});
        })
    }
    return layerMaterials;
}

//Make lyphs smaller for small edges, but not too small, hence log scale...
function lyphDimensions(link){
    const scaleFactor = link.length? Math.log(link.length): 1;
    const length    =  6 * scaleFactor;
    const thickness =  2 * scaleFactor;
    return {length, thickness};
}

function linkExtension(link, params = {}){
    params.method = params.method || "2d";
    //Add lyphs and edge text
    if (link.lyph){
        const lyphModel = lyphs[link.lyph] || defaultLyph;
        const layerMaterials = createLayerMaterials(lyphModel);

        const lyph = new THREE.Object3D();
        const {length, thickness} = lyphDimensions(link);
        if (params.method === "3d"){
            //3d - tubes
            Object.keys(layerMaterials).forEach((id, i) => {
                let layer = createSolidCylinder(
                    [ thickness * i + 1, thickness * i + 1, length, 10, 4],
                    [ thickness * (i + 1) + 1, thickness * (i + 1) + 1, length, 10, 4], layerMaterials[id]);
                lyph.add(layer);
            });
        } else {
            //2d - rectangles
            let layerGeometry = new THREE.PlaneGeometry( thickness, length, 8 );
            Object.keys(layerMaterials).forEach((id, i) => {
                let mesh = new THREE.Mesh( layerGeometry, layerMaterials[id]);
                mesh.translateX(thickness * i);
                lyph.add(mesh);
            });
        }
        return lyph;
    }
}

/**
 * Cylinder constructor parameters:
 * inner & outer arrays: [radiusAtTop, radiusAtBottom, height, segmentsAroundRadius, segmentsAlongHeight]
 */
function createSolidCylinder(inner, outer, material){
    let smallCylinderGeom = new THREE.CylinderGeometry( ...inner);
    let largeCylinderGeom = new THREE.CylinderGeometry( ...outer);

    let smallCylinderBSP = new ThreeBSP(smallCylinderGeom);
    let largeCylinderBSP = new ThreeBSP(largeCylinderGeom);
    let intersectionBSP = largeCylinderBSP.subtract(smallCylinderBSP);

    return intersectionBSP.toMesh( material );
}

//Experiment with tube geometry to draw thick edges
function testSpline(curve){
    let numPoints = 100;
    let tube = new THREE.TubeGeometry(curve, numPoints, 0.5, 20, false);
    let mesh = new THREE.Mesh(tube, new THREE.MeshNormalMaterial({
        opacity: 0.9,
        transparent: true
    }));

    return mesh;
}

export {linkExtension}