import * as THREE from 'three';
import * as TWEEN from 'es6-tween'
import TrackballControls from 'three-trackballcontrols';
import ThreeForceGraph from '../three/threeForceGraph';
import {coreGraphData}   from '../data/data';
import { linkExtension } from './lyphModel';
import {
    forceX,
    forceY,
    forceZ,
    forceRadial
} from 'd3-force-3d';

export class WebGLRenderService {
    scene    : THREE.Scene;
    camera   : THREE.PerspectiveCamera;
    renderer : THREE.WebGLRenderer;
    controls : TrackballControls;
    raycaster: THREE.Raycaster;
    graph;
    planes = [];
    nodeLabelVisible = true;

    init(container: HTMLElement) {
        if (this.renderer) {return;} //already initialized

        const width = window.innerWidth;
        const height = window.innerHeight - 90;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width / height);
        this.camera.position.set(0, 100, 500);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.renderer = new THREE.WebGLRenderer({antialias: true});

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0xffffff);
        container.appendChild(this.renderer.domElement);

        this.controls = new TrackballControls(this.camera, container);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xcccccc);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff);
        pointLight.position.set(300, 0, 300);
        this.scene.add(pointLight);

        this.raycaster = new THREE.Raycaster();

        this.createPlanes();
        this.createGraph();
        this.animate();
    }


    animate() {
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
            .graphData(coreGraphData)
            .linkExtension(linkExtension)
            .showNodeLabel(this.nodeLabelVisible)
            .axisLength(axisLength)
            .linkExtensionParams({method: "3d"});

        this.graph.d3Force("x", forceX().x(d => (d.layout && d.layout.x)? d.layout.x * scaleFactor: 0)
            .strength(d => (d.radialDistance)? 0: 0.9)
        );

        this.graph.d3Force("y", forceY().y(d => (d.layout && d.layout.y)? d.layout.y * scaleFactor: 0)
                .strength(d => (d.radialDistance)? 0: 0.9)
        );

        this.graph.d3Force("z", forceZ().z(d => (d.layout && d.layout.z)? d.layout.z * scaleFactor:
                (d.coalescence)? 25 * scaleFactor: 0) //25%
                .strength(d => (d.radialDistance && !d.coalescence)? 0: 0.9)
        );

        this.graph.d3Force("radial", forceRadial( d => { return (d.radialDistance || 0) * scaleFactor;})
            .strength(d => (d.radialDistance && !d.coalescence)? 5: 0));


        this.scene.add(this.graph);
    }

    togglePlanes(){
        this.planes.forEach(plane => {plane.visible = !plane.visible});
    }

    toggleLinkIcon(method){
        this.graph.linkExtensionParams({method: method});
    }

    toggleLyphs(){
        if (this.graph.linkExtension()){
            this.graph.linkExtension(null)
        } else {
            this.graph.linkExtension(linkExtension);
        }
    }

    toggleLabels(){
        this.nodeLabelVisible = !this.nodeLabelVisible;
        this.graph.showNodeLabel(this.nodeLabelVisible);

    }

    toggleDimensions(numDimensions) {
        this.graph.numDimensions(numDimensions);
    };
}