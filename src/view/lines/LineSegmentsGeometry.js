import {THREE} from '../util/utils'
import { GeometryFactory } from '../util/geometryFactory'

THREE.LineSegmentsGeometry = function () {

	THREE.InstancedBufferGeometry.call( this );

	this.type = 'LineSegmentsGeometry';

	let positions = [ - 1, 2, 0, 1, 2, 0, - 1, 1, 0, 1, 1, 0, - 1, 0, 0, 1, 0, 0, - 1, - 1, 0, 1, - 1, 0 ];
	let uvs = [ 0, 1, 1, 1, 0, .5, 1, .5, 0, .5, 1, .5, 0, 0, 1, 0 ];
	let index = [ 0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 5, 3, 4, 6, 5, 6, 7, 5 ];

	this.setIndex( index );
	this.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	this.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

};

THREE.LineSegmentsGeometry.prototype = Object.assign( Object.create( THREE.InstancedBufferGeometry.prototype ), {

	constructor: THREE.LineSegmentsGeometry,

	isLineSegmentsGeometry: true,

	applyMatrix: function ( matrix ) {

		let start = this.attributes.instanceStart;
		let end = this.attributes.instanceEnd;

		if ( start !== undefined ) {

			matrix.applyToBufferAttribute( start );

			matrix.applyToBufferAttribute( end );

			start.data.needsUpdate = true;

		}

		if ( this.boundingBox !== null ) {

			this.computeBoundingBox();

		}

		if ( this.boundingSphere !== null ) {

			this.computeBoundingSphere();

		}

		return this;

	},

	setPositions: function ( array ) {

		let lineSegments;

		if ( array instanceof Float32Array ) {

			lineSegments = array;

		} else if ( Array.isArray( array ) ) {

			lineSegments = new Float32Array( array );

		}

		let instanceBuffer = new THREE.InstancedInterleavedBuffer( lineSegments, 6, 1 ); // xyz, xyz

		this.setAttribute( 'instanceStart', new THREE.InterleavedBufferAttribute( instanceBuffer, 3, 0 ) ); // xyz
		this.setAttribute( 'instanceEnd', new THREE.InterleavedBufferAttribute( instanceBuffer, 3, 3 ) ); // xyz

		this.computeBoundingBox();
		this.computeBoundingSphere();

		return this;

	},

	setColors: function ( array ) {

		let colors;

		if ( array instanceof Float32Array ) {

			colors = array;

		} else if ( Array.isArray( array ) ) {

			colors = new Float32Array( array );

		}

		let instanceColorBuffer = new THREE.InstancedInterleavedBuffer( colors, 6, 1 ); // rgb, rgb

		this.setAttribute( 'instanceColorStart', new THREE.InterleavedBufferAttribute( instanceColorBuffer, 3, 0 ) ); // rgb
		this.setAttribute( 'instanceColorEnd', new THREE.InterleavedBufferAttribute( instanceColorBuffer, 3, 3 ) ); // rgb

		return this;

	},

	fromWireframeGeometry: function ( geometry ) {

		this.setPositions( geometry.attributes.position.array );

		return this;

	},

	fromEdgesGeometry: function ( geometry ) {

		this.setPositions( geometry.attributes.position.array );

		return this;

	},

	fromMesh: function ( mesh ) {

		this.fromWireframeGeometry( new THREE.WireframeGeometry( mesh.geometry ) );

		// set colors, maybe

		return this;

	},

	fromLineSegements: function ( lineSegments ) {

		let geometry = lineSegments.geometry;

		if ( geometry.isGeometry ) {

			this.setPositions( geometry.vertices );

		} else if ( geometry.isBufferGeometry ) {

			this.setPositions( geometry.position.array ); // assumes non-indexed

		}

		// set colors, maybe

		return this;

	},

	computeBoundingBox: function () {

		let box = new THREE.Box3();

		return function computeBoundingBox() {

			if ( this.boundingBox === null ) {

				this.boundingBox = new THREE.Box3();

			}

			let start = this.attributes.instanceStart;
			let end = this.attributes.instanceEnd;

			if ( start !== undefined && end !== undefined ) {

				this.boundingBox.setFromBufferAttribute( start );

				box.setFromBufferAttribute( end );

				this.boundingBox.union( box );

			}

		};

	}(),

	computeBoundingSphere: function () {

		let vector = GeometryFactory.instance().createVector3();

		return function computeBoundingSphere() {

			if ( this.boundingSphere === null ) {
				this.boundingSphere = new THREE.Sphere();
			}

			if ( this.boundingBox === null ) {
				this.computeBoundingBox();
			}

			let start = this.attributes.instanceStart;
			let end   = this.attributes.instanceEnd;

			if ( start !== undefined && end !== undefined ) {
				let center = this.boundingSphere.center;
				this.boundingBox.getCenter( center );
				let maxRadiusSq = 0;
				for ( let i = 0, il = start.count; i < il; i ++ ) {
					vector.fromBufferAttribute( start, i );
					maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( vector ) );

					vector.fromBufferAttribute( end, i );
					maxRadiusSq = Math.max( maxRadiusSq, center.distanceToSquared( vector ) );
				}

				this.boundingSphere.radius = Math.sqrt( maxRadiusSq );

				if ( isNaN( this.boundingSphere.radius ) ) {

					throw new Error( 'THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.');
				}
			}
		};
	}()
} );
