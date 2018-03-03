import * as THREE from 'three';
import * as TWEEN from 'es6-tween'
import ThreeForceGraph   from '../three/threeForceGraph';
import {
    forceX,
    forceY,
    forceZ,
    forceRadial
} from 'd3-force-3d';
import {TestDataService}   from './testDataService';
import {KidneyDataService} from './kidneyDataService';
import {LINK_TYPES} from '../models/linkModel';

const OrbitControls = require('three-orbit-controls')(THREE);

export class WebGLRenderService {
    scene    : THREE.Scene;
    camera   : THREE.PerspectiveCamera;
    renderer : THREE.WebGLRenderer;
    controls;
    mouse;
    _graphData = {};
    _kidneyDataService;
    _testDataService;

    graph;
    helpers = {};


    init(container: HTMLElement) {
        if (this.renderer) {return;} //already initialized

        this._kidneyDataService = new KidneyDataService();
        this._kidneyDataService.init();
        this._graphData = this._kidneyDataService.graphData;

        this.width  = window.innerWidth * 0.75;
        this.height = window.innerHeight ;

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0xffffff);
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(45, this.width /  this.height);
        this.camera.position.set(0, 100, 500);

        //this.controls = new TrackballControls(this.camera, container);
        this.controls = new OrbitControls(this.camera, container);

        this.scene = new THREE.Scene();
        // Lights
        const ambientLight = new THREE.AmbientLight(0xcccccc);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff);
        pointLight.position.set(300, 0, 300);
        this.scene.add(pointLight);

        this.mouse = new THREE.Vector2(0, 0);

        window.addEventListener( 'mousemove', evt => this.onMouseMove(evt), false );
        window.addEventListener( 'keydown',   evt => this.onKeyDown(evt)  , false );

        this.resizeCanvasToDisplaySize(true);
        this.createHelpers();
        this.createGraph();
        console.log("Graph scene contains objects:", this.graph.children.length);
        this.animate();
    }

    resizeCanvasToDisplaySize(force) {
        const canvas = this.renderer.domElement;
        const width  = canvas.clientWidth;
        const height = canvas.clientHeight;
        console.log("Size", width, height);
        if (force || canvas.width !== this.width ||canvas.height !== this.height) {
            // you must pass false here or three.js sadly fights the browser
            this.width  = width;
            this.height = height;
            this.renderer.setSize(this.width, this.height, false);
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
        }
    }

    animate() {
        this.resizeCanvasToDisplaySize();
        if (this.graph){
            this.graph.tickFrame();
            this.highlightSelected();
        }
        this.controls.update();
        TWEEN.update();

        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(_ => this.animate());
    }

    createHelpers() {
        let gridColor = new THREE.Color(0xcccccc);
        let axisColor = new THREE.Color(0xaaaaaa);

        // x-y plane
        let gridHelper1 = new THREE.GridHelper(1000, 10, axisColor, gridColor);
        gridHelper1.geometry.rotateX( Math.PI / 2 );
        this.scene.add(gridHelper1);
        this.helpers["x-y"] = gridHelper1;

        // x-z plane
        let gridHelper2 = new THREE.GridHelper(1000, 10, axisColor, gridColor);
        this.scene.add(gridHelper2);
        this.helpers["x-z"] = gridHelper2;

        let axisHelper = new THREE.AxisHelper( 510 );
        this.scene.add( axisHelper );
        this.helpers["axis"] = axisHelper;

        this.togglePlanes(["x-y", "x-z", "axis"]);
    }

    createGraph() {
        //Create
        this.graph = new ThreeForceGraph()
            .graphData(this._graphData);

        this.graph.d3Force("x", forceX().x(d => ('x' in d.layout)? d.layout.x: 0)
            .strength(d => ('x' in d.layout)? 1: 0)
        );

        this.graph.d3Force("y", forceY().y(d => ('y' in d.layout)? d.layout.y: 0)
            .strength(d => ('y' in d.layout)? 1: 0)
        );

        this.graph.d3Force("z", forceZ().z(d => ('z' in d.layout)? d.layout.z: 0)
            .strength(d => ('z' in d.layout)? 1: 0)
        );

        this.graph.d3Force("radial", forceRadial( d => {
            return (('r' in d.layout)? d.layout.r: 0);
        }).strength(d => ('r' in d.layout)? 5: 0));

        this.graph.d3Force("link")
            .distance(d => d.length)
            .strength(d => (d.type === LINK_TYPES.CONTAINER)? 0: 1);

        this.scene.add(this.graph);
    }

    highlightSelected(){
        let vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 1 );
        vector.unproject( this.camera );

        let ray = new THREE.Raycaster( this.camera.position, vector.sub( this.camera.position ).normalize() );

        let intersects = ray.intersectObjects( this.graph.children );
        if ( intersects.length > 0 ){
            // if the closest object intersected is not the currently stored intersection object
            if ( intersects[ 0 ].object !== this.INTERSECTED ){
                // restore previous intersection object (if it exists) to its original color
                if ( this.INTERSECTED ){
                    this.INTERSECTED.material.color.setHex( this.INTERSECTED.currentHex );
                    (this.INTERSECTED.children || []).forEach(child => {
                        if (child.visible && child.material){
                            child.material.color.setHex( child.currentHex );
                        }
                    })
                }
                // store reference to closest object as current intersection object
                this.INTERSECTED = intersects[ 0 ].object;

                // store color of closest object (for later restoration)
                this.INTERSECTED.currentHex = this.INTERSECTED.material.color.getHex();
                (this.INTERSECTED.children || []).forEach(child => {
                    if (child.visible && child.material){
                        child.currentHex = child.material.color.getHex();
                    }
                });

                // set a new color for closest object
                this.INTERSECTED.material.color.setHex( 0xff0000 );
                (this.INTERSECTED.children || []).forEach(child => {
                    if (child.visible && child.material){
                        child.material.color.setHex( 0xff0000 );
                    }
                })
            }
        }
        else {
            // restore previous intersection object (if it exists) to its original color
            if ( this.INTERSECTED ) {
                this.INTERSECTED.material.color.setHex(this.INTERSECTED.currentHex);
                (this.INTERSECTED.children || []).forEach(child => {
                    if (child.visible && child.material){
                        child.material.color.setHex( child.currentHex );
                    }
                })
            }
            this.INTERSECTED = null;
        }
    }

    set graphData(newGraphData){
        this._graphData = newGraphData;
        if (this.graph) {
            this.graph.graphData(this._graphData);
        }
    }

    onKeyDown(evt){
        let keyCode = evt.which;
        if (evt.ctrlKey){
            evt.preventDefault();
            switch(keyCode){
                case 37: // Left arrow
                    break;
                case 39: // Right arrow
                    break;
                case 40: // Down arrow
                    this.zoom(-10);
                    break;
                case 38: // Up arrow
                    this.zoom(10);
            }
        } else {
            if (evt.shiftKey){
                evt.preventDefault();
                switch(keyCode){
                    case 37: // Left arrow
                        this.rotateScene(-10, 0);
                        break;
                    case 39: // Right arrow
                        this.rotateScene(10, 0);
                        break;
                    case 40: // Down arrow
                        this.rotateScene(0, 10);
                        break;
                    case 38: // Up arrow
                        this.rotateScene(0, -10);
                }
            }
        }
    }


    onMouseMove(evt) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        this.mouse.x =   ( evt.clientX / this.width  ) * 2 - 1;
        this.mouse.y = - ( evt.clientY / this.height ) * 2 + 1;
    }

    zoom(delta){
        this.camera.position.z += delta;
        this.camera.lookAt(this.scene.position);
    }

    rotateScene(deltaX, deltaY) {
        this.camera.position.x += deltaX;
        this.camera.position.y += deltaY;
        this.camera.lookAt(this.scene.position);
    }

    //Toggle scene elements

    togglePlanes(keys){
        keys.filter(key => this.helpers[key]).forEach(key => {this.helpers[key].visible = !this.helpers[key].visible});
    }

    toggleLyphs(value){
        this.graph.showLyphs(value);
    }

    toggleLayers(value){
        this.graph.showLayers(value);
    }

    toggleLyphIcon(value){
        this.graph.method(value);
    }

    toggleNodeLabels(value){
        this.graph.showNodeLabel(value);
    }

    toggleLinkLabels(value){
        this.graph.showLinkLabel(value);
    }

    toggleLyphLabels(value){
        this.graph.showLyphLabel(value);
    }

    toggleDimensions(numDimensions) {
        this.graph.numDimensions(numDimensions);
    };

    toggleDataset(name){
        if (name === "kidney"){
            this.graphData = this._kidneyDataService.graphData;
        } else {
            if (!this._testDataService){
                this._testDataService = new TestDataService();
                this._testDataService.init();
            }
            this.graphData = this._testDataService.graphData;
        }
    }

    updateLabelContent(target, property){
        switch(target){
            case 'node': { this.graph.nodeLabel(property); return; }
            case 'link': { this.graph.linkLabel(property); return; }
            case 'lyph': { this.graph.iconLabel(property); }
        }
    }
}