import * as THREE from 'three';
import * as TWEEN from 'es6-tween'
import TrackballControls from 'three-trackballcontrols';
import ThreeForceGraph from 'three-forcegraph';
import {dataSet} from '../data/graph';
//import {CSS3DObject, CSS3DRenderer} from '../libs/CSS3DRenderer';

export class MainSceneRenderService {
    scene      : THREE.Scene;
    camera     : THREE.PerspectiveCamera;
    renderer   : THREE.WebGLRenderer; //CSS3DRenderer;
    controls   : TrackballControls;
    raycaster  : THREE.Raycaster;
    graphs = {};
    planes = [];

    init(container: HTMLElement) {
        const width = window.innerWidth;
        const height = window.innerHeight - 90;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width/height);
        this.camera.position.set(0, 0, 100);
        this.camera.aspect = window.innerWidth/window.innerHeight;

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        //this.renderer = new CSS3DRenderer();
        //this.renderer.domElement.style.position = 'absolute';

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

        this.generateRandomGraph();
        this.createStars(1000);
        this.createPlanes();
        this.animate();
    }

    createStars(starsCount: number) {
        const stars = new THREE.Geometry();
        const starMaterial = new THREE.PointCloudMaterial({color: 0xffffff});
        for (let i = 0; i < starsCount; i++) {
            let x = Math.random() * 2000 - 1000;
            let y = Math.random() * 2000 - 1000;
            let z = Math.random() * 2000 - 1000;
            let star = new THREE.Vector3(x, y, z);
            stars.vertices.push(star);
        }

        let pointCloud = new THREE.PointCloud(stars, starMaterial);
        this.scene.add(pointCloud);
    }

    animate() {
        Object.values(this.graphs).forEach(graph => graph.tickFrame());
        this.controls.update();
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(_ => this.animate());
    }

    createPlanes() {
        let material = new THREE.MeshBasicMaterial({
            opacity: 0.5,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            color: 0xc0c0c0
        });

        let planeGeometry1 = new THREE.PlaneGeometry(300, 300);
        let planeMesh1 = new THREE.Mesh(planeGeometry1, material);
        this.scene.add(planeMesh1);
        this.planes.push(planeMesh1);

        let planeGeometry2 = new THREE.PlaneGeometry(300, 300);
        let planeMesh2 = new THREE.Mesh(planeGeometry2, material);
        let parent = new THREE.Object3D();
        planeMesh2.applyMatrix(new THREE.Matrix4().makeTranslation(0, 45, 0));
        parent.add(planeMesh2);
        parent.rotation.x = 1;
        this.scene.add(parent);
        this.planes.push(planeMesh2);

        this.planeMaterial = material;
    }

    //TODO
    createAxis(){
        // Sphere
        let material = new THREE.MeshBasicMaterial( { opacity: 0.05,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            color: 0xFF0000 } );

        // let sphereGeometry = new THREE.SphereGeometry(3, 50, 50);
        // this.sphere = new THREE.Mesh(sphereGeometry, material);
        // this.scene.add(this.sphere);
    }

    generateRandomGraph(){
        const N = 300;
        dataSet["Random"] = {
            nodes: [...Array(N).keys()].map(i => ({ id: i })),
            links: [...Array(N).keys()]
                .filter(id => id)
                .map(id => ({
                    source: id,
                    target: Math.round(Math.random() * (id-1))
                }))
        };
    }

    togglePlanes(){
        this.planeMaterial.visible = !this.planeMaterial.visible;
    }

    toggleGraph(label){
        //Create
        if (!this.graphs[label]){
            this.graphs[label] = new ThreeForceGraph()
                .nodeRelSize(0.8)
                .nodeAutoColorBy('color')
                .graphData(dataSet[label]);

            if (label === "Random"){
                this.scene.add(this.graphs[label]);
            } else {
                if (label == "C"){
                    this.planes[1].add(this.graphs[label]);
                } else {
                    this.planes[0].add(this.graphs[label]);
                }
            }
        } else {
            //Toggle visibility
            this.graphs[label].visible = !this.graphs[label].visible;
        }
    }

    toggleDimensions(numDimensions) {
        Object.keys(this.graphs).forEach(key => this.graphs[key].numDimensions(numDimensions));
    };
}