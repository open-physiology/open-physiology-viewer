import {THREE} from '../utils';

/**
 * Creates a line segment with given geometry and material
 * @param geometry
 * @param material
 * @constructor
 */
THREE.LineSegments2 = function (geometry, material) {
    THREE.Mesh.call(this);
    this.type = 'LineSegments2';
    this.geometry = geometry !== undefined ? geometry : new THREE.LineSegmentsGeometry();
    this.material = material !== undefined ? material : new THREE.LineMaterial({color: Math.random() * 0xffffff});
};

/**
 * Extends three.js with with LineSegment2 type
 * @type {Mesh & {constructor: (THREE.LineSegments2|*), isLineSegments2: boolean, computeLineDistances: *}}
 */
THREE.LineSegments2.prototype = Object.assign(Object.create(THREE.Mesh.prototype), {
    constructor: THREE.LineSegments2,
    isLineSegments2: true,
    computeLineDistances: ( function () { // for backwards-compatability, but could be a method of LineSegmentsGeometry...
        let start = new THREE.Vector3();
        let end   = new THREE.Vector3();
        return function computeLineDistances() {
            let geometry = this.geometry;
            let instanceStart = geometry.attributes.instanceStart;
            let instanceEnd = geometry.attributes.instanceEnd;
            let lineDistances = new Float32Array(2 * instanceStart.data.count);

            for (let i = 0, j = 0, l = instanceStart.data.count; i < l; i++, j += 2) {
                start.fromBufferAttribute(instanceStart, i);
                end.fromBufferAttribute(instanceEnd, i);
                lineDistances[j] = ( j === 0 ) ? 0 : lineDistances[j - 1];
                lineDistances[j + 1] = lineDistances[j] + start.distanceTo(end);
            }

            let instanceDistanceBuffer = new THREE.InstancedInterleavedBuffer(lineDistances, 2, 1); // d0, d1

            geometry.setAttribute('instanceDistanceStart',
                new THREE.InterleavedBufferAttribute(instanceDistanceBuffer, 1, 0)); // d0
            geometry.setAttribute('instanceDistanceEnd',
                new THREE.InterleavedBufferAttribute(instanceDistanceBuffer, 1, 1)); // d1
            return this;
        };
    }())
});
