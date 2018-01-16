import * as THREE from 'three';
import * as TWEEN from 'es6-tween'
import TrackballControls from 'three-trackballcontrols';
import ThreeForceGraph from '../three/ThreeForceGraph';
import {dataSetOne} from '../data/graph';

export class MainSceneRenderService {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer; //CSS3DRenderer;
    controls: TrackballControls;
    raycaster: THREE.Raycaster;
    graph;
    planes = [];

    init(container: HTMLElement) {
        const width = window.innerWidth;
        const height = window.innerHeight - 90;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width / height);
        this.camera.position.set(0, 0, 100);
        this.camera.aspect = window.innerWidth / window.innerHeight;

        this.renderer = new THREE.WebGLRenderer({antialias: true});

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x000000);
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
        this.animate();
    }


    animate() {
        if (this.graph){
            this.graph.tickFrame();
        }
        this.controls.update();
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(_ => this.animate());
    }

    createPlanes() {
        let gridHelper1 = new THREE.GridHelper(1000, 10, new THREE.Color(0x666666));
        this.scene.add(gridHelper1);
        this.planes.push(gridHelper1);

        let gridHelper2 = new THREE.GridHelper(1000, 10, new THREE.Color(0x666666));
        let parent = new THREE.Object3D();
        gridHelper2.applyMatrix(new THREE.Matrix4().makeTranslation(0, 45, 0));
        parent.add(gridHelper2);
        parent.rotation.x = 1;
        this.scene.add(parent);
        this.planes.push(gridHelper2);
    }

    createGraph() {
        //Create
        this.graph = new ThreeForceGraph()
            .nodeRelSize(0.8)
            .nodeAutoColorBy('color')
            .graphData(dataSetOne);

        this.scene.add(this.graph);
            // if (label == "C") {
            //     this.planes[1].add(this.graphs[label]);
            // } else {
            //     this.planes[0].add(this.graphs[label]);
            // }
    }

    togglePlanes(){
        this.planeMaterial.visible = !this.planeMaterial.visible;
    }

    toggleGraph(label){
            //Toggle graph category visibility
            //this.graphs[label].visible = !this.graphs[label].visible;

    }

    toggleDimensions(numDimensions) {
        this.graph.numDimensions(numDimensions);
    };
}