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
    _graphData = {};
    _kidneyDataService;
    _testDataService;

    graph;
    planes = [];

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

        this.resizeCanvasToDisplaySize(true);

        this.raycaster = new THREE.Raycaster();

        this.createPlanes();
        this.createGraph();
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
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(_ => this.animate());
    }

    createPlanes() {
        let gridColor = new THREE.Color(0xcccccc);
        let axisColor = new THREE.Color(0xaaaaaa);

        // x-y plane
        let gridHelper1 = new THREE.GridHelper(1000, 10, axisColor, gridColor);
        gridHelper1.geometry.rotateX( Math.PI / 2 );
        this.scene.add(gridHelper1);
        this.planes.push(gridHelper1);

        // x-z plane
        let gridHelper2 = new THREE.GridHelper(1000, 10, axisColor, gridColor);
        this.scene.add(gridHelper2);
        this.planes.push(gridHelper2);

        this.togglePlanes();
        // let axisHelper = new THREE.AxisHelper( 510 );
        // this.scene.add( axisHelper );
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


    //Toggle scene elements

    togglePlanes(){
        this.planes.forEach(plane => {plane.visible = !plane.visible});
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
        switch(target){
            case 'node': { this.graph.nodeLabel(property); return; }
            case 'link': { this.graph.linkLabel(property); return; }
            case 'lyph': { this.graph.iconLabel(property); }
        }
    }
}