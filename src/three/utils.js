import { schemePaired } from 'd3-scale-chromatic';
import * as three from 'three';
const THREE = window.THREE || three;
const ThreeBSP = require('three-js-csg')(THREE);

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

/**
 * Computes difference between two geometries
 * @param smallGeom - inner geometry
 * @param largeGeom - outer geometry
 * @param material  - geometry material
 */
export function geometryDifference(smallGeom, largeGeom, material){
    let smallBSP = new ThreeBSP(smallGeom);
    let largeBSP = new ThreeBSP(largeGeom);
    let intersectionBSP = largeBSP.subtract(smallBSP);
    return intersectionBSP.toMesh( material );
}

/**
 * Draws layer of a lyph in 3d
 * @param $thickness - axial border distance from the rotational axis
 * @param $height    - axial border height
 * @param $radius    - radius for the circle for closed border
 * @param $top       - boolean value indicating whether top axial border is closed
 * @param $bottom    - boolean value indicating whether bottom axial border is closed
 * @param thickness  - non-axial border distance from the rotational axis
 * @param height     - non-axial border height
 * @param radius     - radius for the circle for closed border
 * @param top        - boolean value indicating whether top non-axial border is closed
 * @param bottom     - boolean value indicating whether bottom non-axial border is closed
 * @param material   - geometry material
 * @returns {THREE.Mesh} - a mesh representing layer (tube, bag or cyst)
 */
export function d3Lyph([$thickness, $height, $radius, $top, $bottom],
                       [ thickness,  height,  radius,  top,  bottom], material){

    const a = 0.5;
    const b = 0.5 * (1 - a) ;
    //Cylinder constructor parameters: [radiusAtTop, radiusAtBottom, height, segmentsAroundRadius, segmentsAlongHeight]
    //Closed borders are approximated by cylinders with smaller diameters for speed

    let $tube      = new THREE.CylinderGeometry( $thickness, $thickness, a * $height, 10, 4);
    let $cupTop    = new THREE.CylinderGeometry( $top? $thickness - $radius: $thickness, $thickness, b * $height, 10, 4);
    let $cupBottom = new THREE.CylinderGeometry( $thickness, $bottom? $thickness - $radius: $thickness, b * $height, 10, 4);

    let tube       = new THREE.CylinderGeometry( thickness,  thickness,  a * height, 10, 4);
    let cupTop     = new THREE.CylinderGeometry( top? thickness - radius: thickness,  thickness,  b * height, 10, 4);
    let cupBottom  = new THREE.CylinderGeometry( thickness, bottom? thickness - radius: thickness,  b * height, 10, 4);

    let smallGeometry = mergedGeometry($tube, $cupTop, $cupBottom, (a + b) * 0.5 * $height);
    let largeGeometry = mergedGeometry(tube,   cupTop,  cupBottom, (a + b) * 0.5 * height);

    return geometryDifference(smallGeometry, largeGeometry, material);
}

/**
 * Helper function to produce a merged layer geometry given a tube shape and two cups representing open or closed borders
 * @param tube       - core layer tube
 * @param cupTop     - top border
 * @param cupBottom  - bottom border
 * @param offset     - distance to shift cups wrt the tube center
 * @returns {Geometry|SEA3D.Geometry|*|THREE.Geometry}
 */
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
//TODO rename
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

export function align(axis, obj){
    if (!obj || !axis) { return; }
    let y = new THREE.Vector3(0, 1, 0);
    let vector = new THREE.Vector3(
        axis.target.x - axis.source.x,
        axis.target.y - axis.source.y,
        axis.target.z - axis.source.z,
    );
    obj.quaternion.setFromUnitVectors(y, vector.clone().normalize());
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

