import { schemePaired } from 'd3-scale-chromatic';
import * as three from 'three';
const THREE = window.THREE || three;

/**
 * Autoset attribute colorField by colorByAccessor property
 * If an object has already a color, don't set it
 * Objects can be nodes or links
 * @param objects
 * @param colorByAccessor
 * @param colorField
 */
function autoColorObjects(objects, colorByAccessor, colorField) {
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

function createBezierSemicircle(startV, endV){
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

function copyCoords(target, source){
    if (!source || !target) return;
    target.x = source.x || 0;
    target.y = source.y || 0;
    target.z = source.z || 0;
}

function alignIcon(iconObj, link){
    if (!iconObj) {return; }
    let axis = new THREE.Vector3(0, 1, 0);
    let vector = new THREE.Vector3(
        link.target.x - link.source.x,
        link.target.y - link.source.y,
        link.target.z - link.source.z,
    );
    iconObj.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
}

export { autoColorObjects, createBezierSemicircle, copyCoords, alignIcon};
