import * as three from 'three';
export const THREE = window.THREE || three;
import {MaterialFactory} from './materialFactory';
import {defaults} from 'lodash-bound';
import tinycolor from 'tinycolor2';
import {CSG} from 'three-csg-ts';

export function random_rgba() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function stddev (array) {
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}
export const avg = array => array.reduce((a, b) => a + b) / array.length;
/**
 * Get a point on a curve
 * @param curve  - THREE.js curve
 * @param s      - start point at the curve
 * @param t      - stop point atthe curve
 * @param offset - curve length fraction to find a point at (e.g., 0.25, 0.5, 0.75, etc.)
 * @returns {*}  - coordinates of a point on a curve
 */
export const getPoint = (curve, s, t, offset) => (curve && curve.getPoint)
    ? curve.getPoint(offset)
    : (s && t)? s.clone().add(t.clone().sub(s).multiplyScalar(offset)): new THREE.Vector3();

/**
 * Checks that the angle is between given angles
 * @param from  - start of the range
 * @param to    - end of the range
 * @param angle - current angle
 * @returns {boolean}
 */
export function isInRange(from, to, angle){
    while ( from < 0 ) { from += 360; }
    while ( to < 0 )  { to += 360; }
    from = from % 360;
    to = to % 360;
    return(( angle > from) && (angle < to));
}

/**
 * Copy coordinates from source object to target
 * @param target
 * @param source
 */
export function copyCoords(target, source){
    if (!source) { return; }
    if (!target) { return; }
    ["x", "y", "z"].forEach(dim => {
        if (source.hasOwnProperty(dim)) {
            target[dim] = source[dim] || 0
        }
    });
}

/**
 * Helper function to produce a merged layer geometry given a tube shape and two cups representing open or closed borders
 * @param tube       - core layer tube
 * @param cupTop     - top border
 * @param cupBottom  - bottom border
 * @param offset     - distance to shift cups wrt the tube center
 * @param params     - material parameters
 * @returns {Mesh}
 */
export function mergeGeometry(tube, cupTop, cupBottom, offset, params){
    let material = MaterialFactory.createMeshBasicMaterial(params);
    let tubeMesh      = new THREE.Mesh(tube, material);
    let cupTopMesh    = new THREE.Mesh(cupTop, material);
    let cupBottomMesh = new THREE.Mesh(cupBottom, material);
    cupTopMesh.translateY(offset);
    cupBottomMesh.translateY(-offset);
    cupTopMesh.updateMatrix();
    cupBottomMesh.updateMatrix();
    return CSG.union(tubeMesh, CSG.union(cupTopMesh, cupBottomMesh));
}

/**
 * Draws layer of a lyph in 3d. Closed borders are drawn as cylinders because sphere approximation is quite slow
 * @param inner - Inner lyph dimensions [thickness, height, radius, top, bottom], where:
 * thickness is axial border distance from the rotational axis
 * height is axial border height
 * radius is the radius for the circle for closed border
 * top is a boolean value indicating whether top axial border is closed
 * bottom is a boolean value indicating whether bottom axial border is closed
 * @param outer - Outer lyph dimensions
 * @param params - object material params
 * @returns {THREE.Mesh} - a mesh representing layer (tube, bag or cyst)
 * @example
 * d3Layer([ layer.width * i + 1,       layer.height, layer.width / 2, ...layer.border.radialTypes],
 *         [ layer.width * (i + 1) + 1, layer.height, layer.width / 2, ...layer.border.radialTypes], layer.material);
 */
export function d3Layer(inner, outer, params) {
    const innerLyph = d3Lyph(inner, params);
    const outerLyph = d3Lyph(outer, params);
    return CSG.subtract(outerLyph, innerLyph);
}

/**
 * Creates a mesh representing 3d lyph
 * @param dimensions - lyph dimensions
 * @param params     - material parameters
 * @returns {Mesh}   - mesh in the shape of 3d lyph
 */
export function d3Lyph(dimensions, params) {
    const [thickness, height, radius, top, bottom] = dimensions;
    let geometry;
    if (top || bottom) {
        const a = 0.5;
        const b = 0.5 * (1 - a);
        let tube = new THREE.CylinderGeometry(thickness, thickness, a * height, 10, 4);
        let cupTop = new THREE.CylinderGeometry(top ? thickness - radius : thickness, thickness, b * height, 10, 4);
        let cupBottom = new THREE.CylinderGeometry(thickness, bottom ? thickness - radius : thickness, b * height, 10, 4);
        return mergeGeometry(tube, cupTop, cupBottom, (a + b) * 0.5 * height, params);
    } else {
        geometry = new THREE.CylinderGeometry(thickness, thickness, height, 10, 4);
    }
    return new THREE.Mesh(geometry, MaterialFactory.createMeshBasicMaterial(params));
}

/**
 * Create lyph layer shape
 * @param {Array} inner - preceding (inner) lyph border shape parameters (@see lyphShape)
 * @param {Array} outer - current (outer) lyph border shape parameters
 * @returns {Shape}     - lyph layer shape (rectangle with or without rounded corners depending on its topology)
 */
export function layerShape(inner, outer) {
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
 * Create lyph shape
 * @param {Array} params - lyph border shape parameters (thickness and height, corner radius, and boolean values to mark radial border topology: "false" for open and "true" for closed)
 * @returns {Shape}      - lyph shape (rectangle with or without rounded corners depending on its topology)
 */
export function lyphShape(params) {
    let [thickness, height, radius, top, bottom] = params;

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
 * Create a 3d object with border
 * @param {Shape}  shape  - object shape
 * @param {Object} [params = {}] - object and border material params
 * @param includeBorder - Boolean flag to indicate whether to create a shape border
 * @returns {Mesh}   3d object with child object that models its border
 */
export function createMeshWithBorder(shape, params = {}, includeBorder = true) {
    let geometry = new THREE.ShapeBufferGeometry(shape);
    let obj = new THREE.Mesh(geometry, MaterialFactory.createMeshBasicMaterial(params));
    if (includeBorder) {
        let borderGeometry = new THREE.BufferGeometry();
        shape.getPoints().forEach(point => point.z = 0);
        borderGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(shape.getPoints() * 3), 3));
        let borderParams = params::defaults({
            color   : tinycolor(params.color).darken(25), //darker border than surface
            opacity : 0.5,
            polygonOffsetFactor: params.polygonOffsetFactor - 1
        });
        let borderObj = new THREE.Line(borderGeometry, MaterialFactory.createLineBasicMaterial(borderParams));
        obj.add(borderObj);
    }
    return obj;
}

/**
 * Create a curve path resembling a semi-rectangle with rounded corners
 * @param {Object} startV                  - start coordinates
 * @param {Object} endV                    - end coordinates
 * @returns {CurvePath<Vector> | CurvePath} - curve path
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
 * Draw a 2d elliptic curve given 2 points on it and the center
 * @param startV - 2d point on the ellipse
 * @param endV - 2d point on the ellipse
 * @param centerV - center of the ellipse
 * @returns {EllipseCurve}
 */
export function arcCurve(startV, endV, centerV = new THREE.Vector3()){
    let p = startV.clone().sub(centerV);
    let q = endV.clone().sub(centerV);
    let dx2 = Math.abs(p.x*p.x - q.x*q.x);
    let dy2 = Math.abs(q.y*q.y - p.y*p.y);
    let a2, b2;
    const epsilon = 0.001;
    if (dx2 < epsilon && dy2 < epsilon){
        //Ellipse is not uniquely defined, the same as if only one point was given, create a circular segment
        a2 = b2 = p.length() * p.length();
    } else {
        if (dx2 < epsilon && dy2 > epsilon || dx2 > epsilon && dy2 < epsilon){
            //Elliptic curve is not possible
            return new THREE.Line3(startV, endV);
        }
        a2 = Math.abs(p.x * p.x * q.y * q.y - q.x * q.x * p.y * p.y) / dy2;
        b2 = Math.abs(p.x * p.x * q.y * q.y - q.x * q.x * p.y * p.y) / dx2;
    }
    if (a2 < epsilon || b2 < epsilon){
        //Elliptic curve is not possible
        return new THREE.Line3(startV, endV);
    }
    let sAngle = Math.acos(new THREE.Vector2(1,0).dot(p) / p.length());
    let tAngle = Math.acos(new THREE.Vector2(1,0).dot(q) / q.length());
    if (p.y < 0){
        sAngle = 2*Math.PI - sAngle;
    }
    if (q.y < 0){
        tAngle = 2*Math.PI - tAngle;
    }
    return new THREE.EllipseCurve(centerV.x, centerV.y, Math.sqrt(a2), Math.sqrt(b2), sAngle, tAngle, false);
}


/**
 * Create a cubic Bezier curve resembling a semicircle
 * @param {Object} startV      - start coordinates
 * @param {Object} endV        - end coordinates
 * @returns {CubicBezierCurve3} - cubic Bezier curve
 */
export function semicircleCurve(startV, endV){
    let edgeV   = endV.clone().sub(startV);
    let pEdgeV  = edgeV.clone().applyAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2);
    let insetV  = edgeV.multiplyScalar(0.05);
    let offsetV = pEdgeV.multiplyScalar(2/3);

    return new THREE.CubicBezierCurve3(
        startV.clone(),
        startV.clone().add(insetV).add(offsetV),
        endV.clone().sub(insetV).add(offsetV),
        endV.clone());
}

/**
 * Create a vector from an object that contains coordinate fields x, y, and z
 * @param {Object} source - object with fields x, y, and z
 * @returns {Object}     - 3d vector
 */
export function extractCoords(source){
    if (source) {
        return new THREE.Vector3(source.x || 0, source.y || 0, source.z || 0);
    } else {
        return new THREE.Vector3();
    }
}

/**
 * Align an object along its axis (link)
 * @param {{source: Vector3, target: Vector3}} link  - link between two points
 * @param {Object3D} obj                             - three.js visual object to align alone the line
 * @param {boolean} [reversed=false]  indicates whether the object should be aligned in reversed direction
 */
export function align(link, obj, reversed = false){
    if (!obj || !link) { return; }
    let axis = direction(link.source, link.target).normalize();
    if (reversed){ axis.multiplyScalar(-1); }
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
}

/**
 * Compute the angle between two 3d vectors
 * @param {Object} v1 first vector
 * @param {Object} v2 second vector
 * @returns {number} computed angle between the given vectors
 */
export function angle(v1, v2){
   let dot = v1.dot(v2);
   return Math.acos( dot / (v1.length() * v2.length()) );
}

/**
 * Create a vector between two 3d points
 * @param {Object} source  source coordinates
 * @param {Object} target  target coordinates
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
 * Return the center of mass given a set of control points
 * @param {Array<Vector3>} points   control points
 * @returns {Object}               coordinates of the center of mass
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
 * Find coordinates of the central point of the given mesh
 * @param {Mesh} mesh three.js mesh object
 * @returns {Object} coordinates of the mesh center
 */
export function getCenterPoint(mesh) {
    let boundingBox = getBoundingBox(mesh);
    let center = new THREE.Vector3();
    if (boundingBox) { boundingBox.getCenter(center); }
    mesh.localToWorld(center);
    return center;
}

/**
 /**
 * Computes a default control point for quadratic Bezier curve
 * @param startV
 * @param endV
 * @param curvature
 * @returns {Vector3}
 */
export function getDefaultControlPoint(startV, endV, curvature){
    if (!startV || !endV){
        return new THREE.Vector3();
    }
    let edgeV  = endV.clone().sub(startV);
    let pEdgeV = edgeV.clone().applyAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2);
    let center = startV.clone().add(endV).multiplyScalar(0.5);
    let offset = curvature >= -100 && curvature <= 100? curvature / 100: 0.25;
     return center.add(pEdgeV.multiplyScalar(offset));
}

/**
 * Get bounding box for a mesh geometry
 * @param {Mesh} mesh  triangular polygon mesh based object
 * @returns {Box3}     bounding box for the mesh geometry
 */
export function getBoundingBox(mesh) {
    if (!mesh.geometry){ return null; }
    if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
    }
    return mesh.geometry.boundingBox;
}
