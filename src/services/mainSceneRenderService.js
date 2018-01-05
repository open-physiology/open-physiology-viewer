import * as THREE from 'three';
let TrackballControls = require('three-trackballcontrols');
import {Stats} from 'three-stats';

export class MainSceneRenderService {
    stats: Stats;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: TrackballControls;

    init(container: HTMLElement) {
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.z = 500;
        this.controls = new TrackballControls(this.camera, container);
        this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.8;
        this.controls.noZoom = false;
        this.controls.noPan = false;
        this.controls.staticMoving = true;
        this.controls.dynamicDampingFactor = 0.3;
        this.controls.keys = [65, 83, 68];
        this.controls.addEventListener('change', this.render);

        // world
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xcccccc);
        this.scene.fog = new THREE.FogExp2(0xcccccc, 0.002);
        let geometry = new THREE.CylinderGeometry(0, 10, 30, 4, 1);
        let material = new THREE.MeshPhongMaterial({color: 0xffffff});
        for (let i = 0; i < 500; i++) {
            let mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = ( Math.random() - 0.5 ) * 1000;
            mesh.position.y = ( Math.random() - 0.5 ) * 1000;
            mesh.position.z = ( Math.random() - 0.5 ) * 1000;
            mesh.updateMatrix();
            mesh.matrixAutoUpdate = false;
            this.scene.add(mesh);
        }
        // lights
        let light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1);
        this.scene.add(light);

        light = new THREE.DirectionalLight(0x002288);
        light.position.set(-1, -1, -1);
        this.scene.add(light);

        light = new THREE.AmbientLight(0x222222);
        this.scene.add(light);
        this.renderer = new THREE.WebGLRenderer({antialias: false});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);
        this.stats = new Stats();
        container.appendChild(this.stats.dom);
        window.addEventListener('resize', this.onWindowResize, false);
        this.render();
    }

    animate = () => {
        window.requestAnimationFrame(this.animate);
        this.controls.update();
    };

    onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.controls.handleResize();
        this.render();
    };

    render = () => {
        this.renderer.render(this.scene, this.camera);
        this.stats.update();
    }
}