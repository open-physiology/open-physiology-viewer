import * as three from 'three';
const THREE = window.THREE || three;

import {lyphs}   from '../data/data';
import { schemePaired } from 'd3-scale-chromatic';
const ThreeBSP = require('three-js-csg')(THREE);

const defaultLyph = {
    "name": "?",
    "color": "#ccc"
};

//Assign colors to lyphs (Note: original dataset modified, deepClone if necessary)
const colors = schemePaired;
Object.keys(lyphs).filter(id => !lyphs[id].color).forEach(id => {
        lyphs[id].color = colors[id % colors.length]
    }
);

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

//TODO add options to choose whether to fit lyph to given dimensions or set up a default layer size
function lyph2d(id){
    let lyphModel = lyphs[id] || defaultLyph;
    let layerMaterials = createLayerMaterials(lyphModel);

    let lyph = new THREE.Object3D();
    const thickness = 10;
    //add thickness to layers
    let layerGeometry = new THREE.PlaneGeometry( 20, 10, 8 );
    let i = 0;
    Object.keys(layerMaterials).forEach(id => {
        let mesh = new THREE.Mesh( layerGeometry, layerMaterials[id]);
        mesh.translateY(thickness * i++);
        lyph.add(mesh);
    });

    return lyph;
}

function lyph3d(id){
    let lyphModel = lyphs[id] || defaultLyph;
    let layerMaterials = createLayerMaterials(lyphModel);

    let lyph = new THREE.Object3D();

    const thickness = 5;
    //add thickness to layers
    let i = 1;
    Object.keys(layerMaterials).forEach(id => {
        let layer = createSolidCylinder(
            [ thickness * i, thickness * i, 80, 20, 4],
            [ thickness * (i + 1), thickness * (i + 1), 80, 20, 4], layerMaterials[id]);
        lyph.add(layer);
        i++;
    });

    return lyph;
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



export {lyph2d, lyph3d, createSolidCylinder}