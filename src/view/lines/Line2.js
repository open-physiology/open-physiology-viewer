/**
 * based on thick line implementation by WestLangley / http://github.com/WestLangley
 */

import {THREE} from '../util/utils';
import './LineSegments2.js';
import './LineSegmentsGeometry.js';
import './LineGeometry.js';
import './LineMaterial.js';

import { GeometryFactory } from '../util/geometryFactory'

/**
 * Extends three.js with Line2 type to enable thick lines
 * @param geometry
 * @param material
 * @constructor
 */
THREE.Line2 = function ( geometry, material ) {

	THREE.LineSegments2.call( this );

	this.type = 'Line2';

	this.geometry = geometry !== undefined ? geometry : GeometryFactory.instance().createLineGeometry();

	this.material = material !== undefined ? material : new THREE.LineMaterial( { color: Math.random() * 0xffffff } );

};

/**
 * Extends three.js with Line2 constructor to enable thick lines
 * @type {LineSegments2 & {constructor: (THREE.Line2|*), isLine2: boolean, raycast: *}}
 */
THREE.Line2.prototype = Object.assign( Object.create( THREE.LineSegments2.prototype ), {

	constructor: THREE.Line2,

	isLine2: true,

	raycast: ( function () {

		let inverseMatrix = new THREE.Matrix4();
		let ray = new THREE.Ray();
		let sphere = new THREE.Sphere();

		return function raycast( raycaster, intersects ) {

			//let precisionSq =  raycaster.linePrecision *  raycaster.linePrecision;
            let precisionSq =  raycaster.params.Line.threshold * raycaster.params.Line.threshold;

			let geometry = this.geometry;
			let matrixWorld = this.matrixWorld;

			// Checking boundingSphere distance to ray

			if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

			sphere.copy( geometry.boundingSphere );
			sphere.applyMatrix4( matrixWorld );

			if ( raycaster.ray.intersectsSphere( sphere ) === false ) return;

			//inverseMatrix.getInverse( matrixWorld ); //different version?
			inverseMatrix.copy(matrixWorld).invert();
			ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );

			let vStart = GeometryFactory.instance().createVector3();
			let vEnd   = GeometryFactory.instance().createVector3();
			let interSegment = GeometryFactory.instance().createVector3();
			let interRay = GeometryFactory.instance().createVector3();
			let step = (this && this.isLineSegments) ? 2 : 1;

			if ( geometry.isBufferGeometry ) {

				let attributes = geometry.attributes;
                let instanceStart = attributes.instanceStart.data.array;

				if ( instanceStart !== null) {
					let nPoints = Math.round(instanceStart.length / 3);

					for ( let i = 0, l = nPoints - 1; i < l; i += step ) {

						vStart.fromArray( instanceStart, i * 3 );
						vEnd.fromArray( instanceStart, (i + 1) * 3 );

						let distSq = ray.distanceSqToSegment( vStart, vEnd, interRay, interSegment );

						if ( distSq > precisionSq ) continue;

						interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

						let distance = raycaster.ray.origin.distanceTo( interRay );

						if ( distance < raycaster.near || distance > raycaster.far ) continue;

						intersects.push( {

							distance: distance,
							// What do we want? intersection point on the ray or on the segment??
							// point: raycaster.ray.at( distance ),
							point: interSegment.clone().applyMatrix4( this.matrixWorld ),
							index: i,
							face: null,
							faceIndex: null,
							object: this
						} );

					}

				} else {
                    //TODO test (NK) - 'positions' was undefined
					let positions  = geometry.position.array;

                    for ( let i = 0, l = positions.length / 3 - 1; i < l; i += step ) {

						vStart.fromArray( positions, 3 * i );
						vEnd.fromArray( positions, 3 * i + 3 );

						let distSq = ray.distanceSqToSegment( vStart, vEnd, interRay, interSegment );

						if ( distSq > precisionSq ) continue;

						interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

						let distance = raycaster.ray.origin.distanceTo( interRay );

						if ( distance < raycaster.near || distance > raycaster.far ) continue;

						intersects.push( {

							distance: distance,
							// What do we want? intersection point on the ray or on the segment??
							// point: raycaster.ray.at( distance ),
							point: interSegment.clone().applyMatrix4( this.matrixWorld ),
							index: i,
							face: null,
							faceIndex: null,
							object: this
						} );
					}
				}

			} else if ( geometry.isGeometry ) {
				let vertices = geometry.vertices;
				let nbVertices = vertices.length;

				for ( let i = 0; i < nbVertices - 1; i += step ) {

					let distSq = ray.distanceSqToSegment( vertices[ i ], vertices[ i + 1 ], interRay, interSegment );

					if ( distSq > precisionSq ) continue;

					interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

					let distance = raycaster.ray.origin.distanceTo( interRay );

					if ( distance < raycaster.near || distance > raycaster.far ) continue;

					intersects.push( {

						distance: distance,
						// What do we want? intersection point on the ray or on the segment??
						// point: raycaster.ray.at( distance ),
						point: interSegment.clone().applyMatrix4( this.matrixWorld ),
						index: i,
						face: null,
						faceIndex: null,
						object: this

					} );

				}

			}

		};

	}() ),
} );
