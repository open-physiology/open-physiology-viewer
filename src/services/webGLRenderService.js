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
import {NODE_TYPES} from '../models/nodeModel';

const OrbitControls = require('three-orbit-controls')(THREE);

export class WebGLRenderService {
    scene    : THREE.Scene;
    camera   : THREE.PerspectiveCamera;
    renderer : THREE.WebGLRenderer;
    controls;
    raycaster;
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

        const width = window.innerWidth * 0.75;
        const height = window.innerHeight ;

        this.camera = new THREE.PerspectiveCamera(45, width / height);
        this.camera.position.set(0, 100, 500);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0xffffff);
        container.appendChild(this.renderer.domElement);

        //this.controls = new TrackballControls(this.camera, container);
        this.controls = new OrbitControls(this.camera, container);

        this.scene = new THREE.Scene();
        // Lights
        const ambientLight = new THREE.AmbientLight(0xcccccc);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff);
        pointLight.position.set(300, 0, 300);
        this.scene.add(pointLight);


        this.raycaster = new THREE.Raycaster();
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
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (force || canvas.width !== width ||canvas.height !== height) {
            // you must pass false here or three.js sadly fights the browser
            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();

            // set render target sizes here
        }
    }

    animate() {
        this.resizeCanvasToDisplaySize();
        if (this.graph){ this.graph.tickFrame(); }
        this.controls.update();
        TWEEN.update();

        //this.raycaster.setFromCamera( this.mouse, this.camera );
        //let intersects = this.raycaster.intersectObjects( this.graph.children );
        //console.log("Raycaster intersects", intersects);

        //for ( let i = 0; i < intersects.length; i++ ) {
        //    console.log(intersects[ i ].object.__data);
            //intersects[ i ].object.material.color.set( 0xff0000 );
        //}

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
        const axisLength = 400;
        const scaleFactor = axisLength * 0.01;
        this.graph = new ThreeForceGraph()
            .graphData(this._graphData);

        this.graph.d3Force("x", forceX().x(d => (d.layout && d.layout.x)? d.layout.x * scaleFactor: 0)
            .strength(d => (d.type === NODE_TYPES.CORE)? 0.9: 0)
        );

        this.graph.d3Force("y", forceY().y(d => (d.layout && d.layout.y)? d.layout.y * scaleFactor: 0)
            .strength(d => (d.type === NODE_TYPES.CORE)? 0.9: 0)
        );

        this.graph.d3Force("z", forceZ().z(d => (d.layout && d.layout.z)? d.layout.z * scaleFactor:
            (d.coalescence)? 25 * scaleFactor: 0) //coalescing links pop above the z axis, 25% of the axis size
            .strength(d => (d.type === NODE_TYPES.CORE || d.coalescence)? 0.9: 0)
        );

        this.graph.d3Force("radial", forceRadial( d => {
            return ((d.layout && d.layout.r)? d.layout.r: 0) * scaleFactor;
        })
        .strength(d => (d.layout && d.layout.r)? 5: 0));

        this.graph.d3Force("link")
            .distance(d => 0.02 * d.length * axisLength)
            .strength(d => (d.type === LINK_TYPES.CONTAINER)? 0: 1);

        this.scene.add(this.graph);
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
        this.mouse.x =   ( evt.clientX / window.innerWidth  ) * 2 - 1;
        this.mouse.y = - ( evt.clientY / window.innerHeight ) * 2 + 1;
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
        this.graph.showIcon(value);
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
        this.graph.showIconLabel(value);
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
        console.log("Changing link", target, property);
        switch(target){
            case 'node': { this.graph.nodeLabel(property); return; }
            case 'link': { this.graph.linkLabel(property); return; }
            case 'lyph': { this.graph.iconLabel(property); }
        }
    }
}