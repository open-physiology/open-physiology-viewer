/**
 * Renderer that places CSS object to Three.js scenes
 * Example: https://threejs.org/examples/css3d_periodictable.html
 */

import * as three from 'three';
const THREE = window.THREE || three;

export function CSS3DObject ( element ) {

    THREE.Object3D.call( this );

    this.element = element;
    this.element.style.position = 'absolute';

    this.addEventListener( 'removed', function () {
        if ( this.element.parentNode !== null ) {
            this.element.parentNode.removeChild( this.element );
        }
    } );

}

CSS3DObject.prototype = Object.create( THREE.Object3D.prototype );
CSS3DObject.prototype.constructor = CSS3DObject;

export function CSS3DSprite ( element ) {
    CSS3DObject.call( this, element );
}

CSS3DSprite.prototype = Object.create( CSS3DObject.prototype );
CSS3DSprite.prototype.constructor = CSS3DSprite;

export function CSS3DRenderer () {

    let _width, _height;
    let _widthHalf, _heightHalf;

    let matrix = new THREE.Matrix4();

    let cache = {
        camera: { fov: 0, style: '' },
        objects: {}
    };

    let domElement = document.createElement( 'div' );
    domElement.style.overflow = 'hidden';

    this.domElement = domElement;

    let cameraElement = document.createElement( 'div' );

    cameraElement.style.WebkitTransformStyle = 'preserve-3d';
    cameraElement.style.MozTransformStyle = 'preserve-3d';
    cameraElement.style.transformStyle = 'preserve-3d';

    domElement.appendChild( cameraElement );

    let isIE = /Trident/i.test( navigator.userAgent );

    this.setClearColor = function () {};

    this.getSize = function () {

        return {
            width: _width,
            height: _height
        };

    };

    this.setSize = function ( width, height ) {

        _width = width;
        _height = height;
        _widthHalf = _width / 2;
        _heightHalf = _height / 2;

        domElement.style.width = width + 'px';
        domElement.style.height = height + 'px';

        cameraElement.style.width = width + 'px';
        cameraElement.style.height = height + 'px';

    };

    function epsilon( value ) {
        return Math.abs( value ) < 1e-10 ? 0 : value;
    }

    function getCameraCSSMatrix( matrix ) {
        let elements = matrix.elements;

        return 'matrix3d(' +
            epsilon( elements[ 0 ] ) + ',' +
            epsilon( - elements[ 1 ] ) + ',' +
            epsilon( elements[ 2 ] ) + ',' +
            epsilon( elements[ 3 ] ) + ',' +
            epsilon( elements[ 4 ] ) + ',' +
            epsilon( - elements[ 5 ] ) + ',' +
            epsilon( elements[ 6 ] ) + ',' +
            epsilon( elements[ 7 ] ) + ',' +
            epsilon( elements[ 8 ] ) + ',' +
            epsilon( - elements[ 9 ] ) + ',' +
            epsilon( elements[ 10 ] ) + ',' +
            epsilon( elements[ 11 ] ) + ',' +
            epsilon( elements[ 12 ] ) + ',' +
            epsilon( - elements[ 13 ] ) + ',' +
            epsilon( elements[ 14 ] ) + ',' +
            epsilon( elements[ 15 ] ) +
            ')';

    }

    function getObjectCSSMatrix( matrix, cameraCSSMatrix ) {

        let elements = matrix.elements;
        let matrix3d = 'matrix3d(' +
            epsilon( elements[ 0 ] ) + ',' +
            epsilon( elements[ 1 ] ) + ',' +
            epsilon( elements[ 2 ] ) + ',' +
            epsilon( elements[ 3 ] ) + ',' +
            epsilon( - elements[ 4 ] ) + ',' +
            epsilon( - elements[ 5 ] ) + ',' +
            epsilon( - elements[ 6 ] ) + ',' +
            epsilon( - elements[ 7 ] ) + ',' +
            epsilon( elements[ 8 ] ) + ',' +
            epsilon( elements[ 9 ] ) + ',' +
            epsilon( elements[ 10 ] ) + ',' +
            epsilon( elements[ 11 ] ) + ',' +
            epsilon( elements[ 12 ] ) + ',' +
            epsilon( elements[ 13 ] ) + ',' +
            epsilon( elements[ 14 ] ) + ',' +
            epsilon( elements[ 15 ] ) +
            ')';

        if ( isIE ) {

            return 'translate(-50%,-50%)' +
                'translate(' + _widthHalf + 'px,' + _heightHalf + 'px)' +
                cameraCSSMatrix +
                matrix3d;

        }

        return 'translate(-50%,-50%)' + matrix3d;

    }

    function renderObject( object, camera, cameraCSSMatrix ) {

        if ( object instanceof CSS3DObject ) {

            let style;

            if ( object instanceof CSS3DSprite ) {

                matrix.copy( camera.matrixWorldInverse );
                matrix.transpose();
                matrix.copyPosition( object.matrixWorld );
                matrix.scale( object.scale );

                matrix.elements[ 3 ] = 0;
                matrix.elements[ 7 ] = 0;
                matrix.elements[ 11 ] = 0;
                matrix.elements[ 15 ] = 1;

                style = getObjectCSSMatrix( matrix, cameraCSSMatrix );

            } else {

                style = getObjectCSSMatrix( object.matrixWorld, cameraCSSMatrix );

            }

            let element = object.element;
            let cachedStyle = cache.objects[ object.id ] && cache.objects[ object.id ].style;

            if ( cachedStyle === undefined || cachedStyle !== style ) {

                element.style.WebkitTransform = style;
                element.style.MozTransform = style;
                element.style.transform = style;

                cache.objects[ object.id ] = { style: style };

                if ( isIE ) {

                    cache.objects[ object.id ].distanceToCameraSquared = getDistanceToSquared( camera, object );

                }

            }

            if ( element.parentNode !== cameraElement ) {

                cameraElement.appendChild( element );

            }

        }

        for ( let i = 0, l = object.children.length; i < l; i ++ ) {

            renderObject( object.children[ i ], camera, cameraCSSMatrix );

        }

    }

    let getDistanceToSquared = function () {

        let a = new THREE.Vector3();
        let b = new THREE.Vector3();

        return function ( object1, object2 ) {

            a.setFromMatrixPosition( object1.matrixWorld );
            b.setFromMatrixPosition( object2.matrixWorld );

            return a.distanceToSquared( b );

        };

    }();

    function zOrder( scene ) {

        let order = Object.keys( cache.objects ).sort( function ( a, b ) {

            return cache.objects[ a ].distanceToCameraSquared - cache.objects[ b ].distanceToCameraSquared;

        } );
        let zMax = order.length;

        scene.traverse( function ( object ) {

            let index = order.indexOf( object.id + '' );

            if ( index !== - 1 ) {

                object.element.style.zIndex = zMax - index;

            }

        } );

    }

    this.render = function ( scene, camera ) {

        let fov = camera.projectionMatrix.elements[ 5 ] * _heightHalf;

        if ( cache.camera.fov !== fov ) {

            domElement.style.WebkitPerspective = fov + 'px';
            domElement.style.MozPerspective = fov + 'px';
            domElement.style.perspective = fov + 'px';

            cache.camera.fov = fov;

        }

        scene.updateMatrixWorld();

        if ( camera.parent === null ) {
            camera.updateMatrixWorld();
        }

        let cameraCSSMatrix = 'translateZ(' + fov + 'px)' +
            getCameraCSSMatrix( camera.matrixWorldInverse );

        let style = cameraCSSMatrix +
            'translate(' + _widthHalf + 'px,' + _heightHalf + 'px)';

        if ( cache.camera.style !== style && ! isIE ) {

            cameraElement.style.WebkitTransform = style;
            cameraElement.style.MozTransform = style;
            cameraElement.style.transform = style;

            cache.camera.style = style;

        }

        renderObject( scene, camera, cameraCSSMatrix );

        if ( isIE ) {

            // IE10 and 11 does not support 'preserve-3d'.
            // Thus, z-order in 3D will not work.
            // We have to calc z-order manually and set CSS z-index for IE.
            // FYI: z-index can't handle object intersection
            zOrder( scene );

        }

    };

}




