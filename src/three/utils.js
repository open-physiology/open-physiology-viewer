import * as three from 'three';
const THREE = window.THREE || three;
import {MaterialFactory} from './materialFactory';
import {merge} from 'lodash-bound';
import tinycolor from 'tinycolor2';

/**
 * Create shapes of lyph borders
 * @param width
 * @param height
 * @param radius
 * @param top
 * @param bottom
 * @returns {Array}
 */
export function d2LyphBorders([width,  height,  radius,  top,  bottom]){
    let borders = [0,1,2,3].map(x => new THREE.Shape());

    //Axial border
    borders[0].moveTo( 0, - height / 2);
    borders[0].lineTo( 0,   height / 2);
    borders[1].moveTo( 0,   height / 2);
    //Top radial border
    if (top){
        borders[1].lineTo( width - radius, height / 2);
        borders[1].quadraticCurveTo( width,  height / 2, width,  height / 2 - radius);
        borders[2].moveTo( width,  height / 2 - radius);
    } else {
        borders[1].lineTo( width,  height / 2);
        borders[2].moveTo( width,  height / 2);
    }
    //Non-axial border
    if (bottom){
        borders[2].lineTo( width, - height / 2 + radius);
        borders[2].quadraticCurveTo( width, -height / 2, width - radius, -height / 2);
        borders[3].moveTo( width - radius, -height / 2);
    } else {
        borders[2].lineTo( width, -height / 2);
        borders[3].moveTo( width, -height / 2);
    }

    //Finish Bottom radial border
    borders[3].lineTo( 0, - height / 2);
    return borders;
}

/**
 * Creates links (objects with fields 'source' and 'target') to define
 * sides of the lyph rectangle in the center of coordinates
 * @param width  - lyph/layer width
 * @param height - lyph/layer height
 * @param offset - layer offset
 * @returns {Array}
 */
export function d2LyphBorderLinks({width, height, offset = 0}){
    offset = 0; //Currently the lyph's "translate" operation takes care of
    // layer offset wrt its axis, so we do not need to shift borders here
    let borders = new Array(4);
    borders[0] = {
        source: new THREE.Vector3(offset, -height / 2, 0),
        target: new THREE.Vector3(offset,  height / 2, 0)};
    borders[1] = {
        source: borders[0].target.clone(),
        target: new THREE.Vector3(width + offset, height / 2, 0)};
    borders[2] = {
        source: borders[1].target.clone(),
        target: new THREE.Vector3(width + offset, -height / 2, 0)};
    borders[3] = {
        source: borders[2].target.clone(),
        target: new THREE.Vector3(offset, -height / 2, 0)};
    return borders;
}

/**
 * Draws layer of a lyph in 2d.
 * @param inner = [$thickness, $height, $radius, $top, $bottom], where:
 * $thickness is axial border distance from the rotational axis
 * $height is axial border height
 * $radius is the radius for the circle for closed border
 * $top is a boolean value indicating whether top axial border is closed
 * $bottom is a boolean value indicating whether bottom axial border is closed
 * @param outer = [thickness,  height,  radius,  top,  bottom], where
 * thickness is non-axial border distance from the rotational axis
 * height is non-axial border height
 * radius is the radius for the circle for closed border
 * top is a boolean value indicating whether top non-axial border is closed
 * bottom is a boolean value indicating whether bottom non-axial border is closed
 * @returns {THREE.Mesh} - a mesh representing layer (tube, bag or cyst)
 */
export function d2LayerShape(inner, outer) {
    const [$thickness, $height, $radius, $top, $bottom] = inner;
    const [thickness, height, radius, top, bottom] = outer;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    //draw top of the preceding layer geometry
    if ($thickness) {
        if ($top) {
            shape.lineTo(0, $height / 2 - $radius);
            shape.quadraticCurveTo(0, $height / 2, -$radius, $height / 2);
            shape.lineTo(-$thickness, $height / 2);
            shape.lineTo(-$thickness, height / 2);
        } else {
            shape.lineTo(0, height / 2);
        }
    }

    //top of the current layer
    shape.lineTo(0, height / 2);
    if (top) {
        shape.lineTo(thickness - radius, height / 2);
        shape.quadraticCurveTo(thickness, height / 2, thickness, height / 2 - radius);
    } else {
        shape.lineTo(thickness, height / 2);
    }

    //side and part of the bottom of the current layer
    if (bottom) {
        shape.lineTo(thickness, -height / 2 + radius);
        shape.quadraticCurveTo(thickness, -height / 2, thickness - radius, -height / 2);
    } else {
        shape.lineTo(thickness, -height / 2);
    }
    shape.lineTo(0, -height / 2);

    //draw bottom of the preceding layer geometry
    if ($thickness) {
        if ($bottom) {
            shape.lineTo(-$thickness, -height / 2);
            shape.lineTo(-$thickness, -$height / 2);
            shape.lineTo(-$radius, -$height / 2);
            shape.quadraticCurveTo(0, -$height / 2, 0, -$height / 2 + $radius);
        } else {
            shape.lineTo(0, -height / 2);
        }
    }
    shape.lineTo(0, 0);
    return shape;
}

/**
 * Draw lyph shape without repeating the shape of the previous layer
 * @param outer = [thickness,  height,  radius,  top,  bottom], where
 * thickness is non-axial border distance from the rotational axis
 * height is non-axial border height
 * radius is the radius for the circle for closed border
 * top is a boolean value indicating whether top non-axial border is closed
 * bottom is a boolean value indicating whether bottom non-axial border is closed
 * @returns {THREE.Mesh} - a mesh representing layer (tube, bag or cyst)
 */
export function d2LyphShape(outer) {
    let [thickness, height, radius, top, bottom] = outer;

    const shape = new THREE.Shape();

    //Axial border
    shape.moveTo(0, -height / 2);
    shape.lineTo(0, height / 2);

    //Top radial border
    if (top) {
        shape.lineTo(thickness - radius, height / 2);
        shape.quadraticCurveTo(thickness, height / 2, thickness, height / 2 - radius);
    } else {
        shape.lineTo(thickness, height / 2);
    }

    //Non-axial border
    if (bottom) {
        shape.lineTo(thickness, -height / 2 + radius);
        shape.quadraticCurveTo(thickness, -height / 2, thickness - radius, -height / 2);
    } else {
        shape.lineTo(thickness, -height / 2);
    }

    //Finish Bottom radial border
    shape.lineTo(0, -height / 2);
    return shape;
}

/**
 * Helper to create an object with border
 * @param shape - object shape
 * @param params - mesh and border material params
 * @returns {Raycaster.params.Mesh}
 */
export function createMeshWithBorder(shape, params = {}) {
    let geometry = new THREE.ShapeBufferGeometry(shape);
    let obj = new THREE.Mesh(geometry, MaterialFactory.createMeshBasicMaterial(params));

    // Create border
    let lineBorderGeometry = new THREE.Geometry();
    shape.getPoints().forEach(point => {
        point.z = 0;
        lineBorderGeometry.vertices.push(point);
    });
    let borderParams = params::merge({
        color   : tinycolor(params.color).darken(20), //20% darker color than surface
        opacity : 1,
        polygonOffsetFactor: params.polygonOffsetFactor - 1
    });
    let borderObj = new THREE.Line(lineBorderGeometry, MaterialFactory.createLineBasicMaterial(borderParams));
    obj.add(borderObj);
    return obj;
}

/**
 * Draw THREE.js rectangular line with rounded corners
 * @param startV
 * @param endV
 * @returns {THREE.CurvePath}
 */
export function rectangleCurve(startV, endV){
    let edgeV   = endV.clone().sub(startV);
    let pEdgeV  = edgeV.clone().applyAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2);

    let quarterX = edgeV.multiplyScalar(0.25);
    let quarter  = pEdgeV.clone().multiplyScalar(0.25);
    let half     = pEdgeV.clone().multiplyScalar(0.5);
    let p = [startV.clone(),
        startV.clone().add(quarter),
        startV.clone().add(half),
        startV.clone().add(half).add(quarterX),
        endV.clone().add(half).sub(quarterX),
        endV.clone().add(half),
        endV.clone().add(quarter),
        endV.clone()
    ];

    let curvePath = new THREE.CurvePath();
    curvePath.add(new THREE.LineCurve3(p[0], p[1]));
    curvePath.add(new THREE.QuadraticBezierCurve3(p[1], p[2], p[3]));
    curvePath.add(new THREE.LineCurve3(p[3], p[4]));
    curvePath.add(new THREE.QuadraticBezierCurve3(p[4], p[5], p[6]));
    curvePath.add(new THREE.LineCurve3(p[6], p[7]));

    return curvePath;
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
    //pEdgeV.z = 0;
    let insetV  = edgeV.multiplyScalar(0.05);
    let offsetV = pEdgeV.multiplyScalar(2/3);

    return new THREE.CubicBezierCurve3(
        startV.clone(),
        startV.clone().add(insetV).add(offsetV),
        endV.clone().sub(insetV).add(offsetV),
        endV.clone());
}

/**
 * Create a vector from an object that contains coordinate fields (x,y,z)
 * @param source
 * @returns {THREE.Vector3}
 */
export function extractCoords(source){
    if (!source) { return; }
    return new THREE.Vector3(source.x || 0, source.y || 0, source.z || 0);
}

/**
 * Align an object along its axis
 * @param axis
 * @param obj
 */
export function align(link, obj, reversed = false){
    if (!obj || !link) { return; }
    let axis = direction(link.source, link.target).normalize();
    if (reversed){ axis.multiplyScalar(-1); }
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
}

/**
 * Angle between two vectors
 * @param v1
 * @param v2
 * @returns {number}
 */
export function angle(v1, v2){
   let dot = v1.dot(v2);
   return Math.acos( dot / (v1.length() * v2.length()) );
}

/**
 * Vector between two 3d points
 * @param source
 * @param target
 * @returns {null}
 */
export function direction(source, target){
    if (!source || !target) { return new THREE.Vector3(0,0,0); }
    return (new THREE.Vector3(
        target.x - source.x,
        target.y - source.y,
        target.z - source.z
    ));
}

/**
 * Returns the center of mass given a set of control points
 * @param points - control points
 * @returns {THREE.Vector3} - center of mass
 */
export function getCenterOfMass(points){
    let middle = new THREE.Vector3(0, 0, 0);
    (points||[]).forEach(p => {
        middle.x += p.x;
        middle.y += p.y;
        middle.z += p.z
    });
    middle = middle.multiplyScalar(1.0 / ((points||[]).length || 1));
    return middle;
}

/**
 * Coordinates of the central point of the given mesh
 * @param mesh
 * @returns {*}
 */
export function getCenterPoint(mesh) {
    if (!mesh.geometry){ return null; }
    if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
    }
    let center = new THREE.Vector3();
    mesh.geometry.boundingBox.getCenter(center);
    mesh.localToWorld(center);
    return center;
}



