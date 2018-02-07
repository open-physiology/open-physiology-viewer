import { schemePaired } from 'd3-scale-chromatic';
import * as three from 'three';
const THREE = window.THREE || three;
const ThreeBSP = require('three-js-csg')(THREE);
//const SubdivisionModifier = require('three-subdivision-modifier'); //Can be used to get a shape with rounded corners
//const modifier = new SubdivisionModifier( 1 ); // Number of subdivisions

/**
 * Autoset attribute colorField by colorByAccessor property
 * If an object has already a color, don't set it
 * Objects can be nodes or links
 * @param objects
 * @param colorByAccessor
 * @param colorField
 */
export function autoColorObjects(objects, colorByAccessor, colorField) {
    if (!colorByAccessor || typeof colorField !== 'string') return;

    const colors = schemePaired; // Paired color set from color brewer
    const uncoloredObjects = objects.filter(obj => !obj[colorField]);
    const objGroups = {};

    uncoloredObjects.forEach(obj => { objGroups[colorByAccessor(obj)] = null });
    Object.keys(objGroups).forEach((group, idx) => { objGroups[group] = idx });

    uncoloredObjects.forEach(obj => {
        obj[colorField] = colors[objGroups[colorByAccessor(obj)] % colors.length];
    });
}

/**
 * Draw THREE.js cubic Bezier curve resembling the semicircle
 * @param startV - start point
 * @param endV   - end point
 * @returns {CubicBezierCurve3|*}
 */
export function bezierSemicircle(startV, endV){
    let edgeV   = endV.clone().sub(startV);
    let pEdgeV  = edgeV.clone().applyAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2);
    pEdgeV.z = 0;
    let insetV  = edgeV.multiplyScalar(0.05);
    let offsetV = pEdgeV.multiplyScalar(2/3);

    return new THREE.CubicBezierCurve3(
        startV.clone(),
        startV.clone().add(insetV).add(offsetV),
        endV.clone().sub(insetV).add(offsetV),
        endV.clone());
}

/**
 * Copy coordinates from source object to target
 * @param target
 * @param source
 */
export function copyCoords(target, source){
    if (!source || !target) return;
    target.x = source.x || 0;
    target.y = source.y || 0;
    target.z = source.z || 0;
}

export function alignIcon(iconObj, link){
    if (!iconObj) {return; }
    let axis = new THREE.Vector3(0, 1, 0);
    let vector = new THREE.Vector3(
        link.target.x - link.source.x,
        link.target.y - link.source.y,
        link.target.z - link.source.z,
    );
    iconObj.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
}

export function geometryDifference(smallGeom, largeGeom, material){
    let smallBSP = new ThreeBSP(smallGeom);
    let largeBSP = new ThreeBSP(largeGeom);
    let intersectionBSP = largeBSP.subtract(smallBSP);
    return intersectionBSP.toMesh( material );
}


/**
 * Cylinder constructor parameters:
 * inner & outer arrays: [radiusAtTop, radiusAtBottom, height, segmentsAroundRadius, segmentsAlongHeight, top, bottom]
 */
export function d3Lyph([$thickness, $height, $radius, $top, $bottom],
                       [ thickness,  height,  radius,  top,  bottom], material){

    const a = 0.5;
    const b = 0.5 * (1 - a) ;
    let $tube      = new THREE.CylinderGeometry($thickness, $thickness, a * $height, 10, 4);
    let $cupTop    = new THREE.CylinderGeometry( $top? $thickness - $radius: $thickness, $thickness, b * $height, 10, 4);
    let $cupBottom = new THREE.CylinderGeometry($thickness, $bottom? $thickness - $radius: $thickness, b * $height, 10, 4);

    let tube       = new THREE.CylinderGeometry( thickness,  thickness,  a * height, 10, 4);
    let cupTop     = new THREE.CylinderGeometry( top? thickness - radius: thickness,  thickness,  b * height, 10, 4);
    let cupBottom  = new THREE.CylinderGeometry( thickness, bottom? thickness - radius: thickness,  b * height, 10, 4);

    let smallGeometry = mergedGeometry($tube, $cupTop, $cupBottom, (a + b) * 0.5 * $height);
    let largeGeometry = mergedGeometry(tube,   cupTop,  cupBottom, (a + b) * 0.5 * height);

    return geometryDifference(smallGeometry, largeGeometry, material);
}

function mergedGeometry(tube, cupTop, cupBottom, offset){
    let singleGeometry = new THREE.Geometry();
    let tubeMesh       = new THREE.Mesh(tube);
    let cupTopMesh     = new THREE.Mesh(cupTop);
    let cupBottomMesh  = new THREE.Mesh(cupBottom);
    cupTopMesh.translateY(offset);
    cupBottomMesh.translateY(-offset);
    cupTopMesh.updateMatrix();
    cupBottomMesh.updateMatrix();
    singleGeometry.merge(tubeMesh.geometry, tubeMesh.matrix);
    singleGeometry.merge(cupTopMesh.geometry, cupTopMesh.matrix);
    singleGeometry.merge(cupBottomMesh.geometry, cupBottomMesh.matrix);
    return singleGeometry;
}

export function d2Lyph(inner, outer, material){
    let layerGeometry = semiRoundedRect( inner, outer);
    return new THREE.Mesh( layerGeometry, material);
}

/**
 * Draw rounded rectangle shape
 * @returns {ShapeGeometry|*}
 */
function semiRoundedRect([$thickness, $height, $radius, $top, $bottom],
                         [ thickness,  height,  radius,  top,  bottom]) {
    const shape = new THREE.Shape();
    shape.moveTo( 0, 0);
    //draw top of the preceding layer geometry
    if ($thickness) {
        if ($top){
            shape.lineTo( 0, $height / 2 - $radius);
            shape.quadraticCurveTo( 0, $height / 2, -$radius,  $height / 2);
        } else {
            shape.lineTo( 0, $height / 2);
        }
        shape.lineTo( -$thickness, $height / 2);
        shape.lineTo( -$thickness, height / 2);
    }

    //top of the current layer
    shape.lineTo( 0, height / 2);
    if (top){
        shape.lineTo( thickness - radius, height / 2);
        shape.quadraticCurveTo( thickness,  height / 2, thickness,  height / 2 - radius);
    } else {
        shape.lineTo( thickness,  height / 2);
    }

    //bottom of the current layer
    if (bottom){
        shape.lineTo( thickness, -height / 2 + radius);
        shape.quadraticCurveTo( thickness, -height / 2, thickness - radius, -height / 2);
    } else {
        shape.lineTo( thickness, -height / 2);
    }
    shape.lineTo( 0, - height/2);

    //draw bottom of the preceding layer geometry
    if ($thickness){
        shape.lineTo( -$thickness, -height / 2);
        shape.lineTo( -$thickness, -$height / 2);
        if ($bottom){
            shape.lineTo( -$radius, -$height / 2);
            shape.quadraticCurveTo( 0, -$height / 2, 0,  -$height / 2 + $radius);
        } else {
            shape.lineTo( 0, -$height / 2);
        }
    }
    shape.lineTo( 0, 0);
    return new THREE.ShapeBufferGeometry(shape);
}

//Experiment with tube geometry to draw thick edges
export function testSpline(curve){
    let numPoints = 100;
    let tube = new THREE.TubeGeometry(curve, numPoints, 0.5, 20, false);
    let mesh = new THREE.Mesh(tube, new THREE.MeshNormalMaterial({
        opacity: 0.9,
        transparent: true
    }));

    return mesh;
}

