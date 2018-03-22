import {NgModule, Component, ViewChild, ElementRef, Output, EventEmitter} from '@angular/core';
import {StopPropagation} from './stopPropagation';
import {CommonModule} from '@angular/common';
import {FormsModule}  from '@angular/forms';

Object.unfreeze = function (o) {
    let oo = undefined;
    if (o instanceof Array) {
        oo = [];
        let clone = function (v) { oo.push(v) };
        o.forEach(clone)
    }
    else if (o instanceof String) {
        oo = new String(o).toString()
    }
    else if (typeof o == 'object') {
        oo = {}
        for (let property in o) {
            oo[property] = o[property]
        }
    }
    return oo
};

window.THREE = Object.unfreeze(require('three'));
// require('three/examples/js/renderers/Projector');

// require('three/examples/js/renderers/Projector');

// require('three/examples/js/renderers/CanvasRenderer');

const OrbitControls = require('three-orbit-controls')(THREE);


import ThreeForceGraph   from '../three/threeForceGraph';
import {
    forceX,
    forceY,
    forceZ,
    forceRadial
} from 'd3-force-3d';

const WindowResize = require('three-window-resize');

//TODO dataset toggle group should be external ideally and supply data services in constructor of this component
import {TestDataService}   from '../services/testDataService';
import {KidneyDataService} from '../services/kidneyDataService';

import {LINK_TYPES} from '../models/linkModel';
import {ModelInfoPanel} from './modelInfo';

@Component({
    selector: 'webGLScene',
    template: `
        <section class="w3-row">
            <section id="canvasContainer" class="w3-threequarter">
                <canvas #canvas></canvas>
            </section>
            <section stop-propagation class="w3-quarter">
                <section class="w3-content">
                    <!--<fieldset>-->
                        <!--<legend>Dataset:</legend>-->
                        <!--<input type="radio" name="dataset" (change)="toggleDataset('test')"/> Generated-->
                        <!--<input type="radio" name="dataset" (change)="toggleDataset('kidney')" checked/>-->
                        <!--Kidney-->
                    <!--</fieldset>-->

                    <fieldset>
                        <legend>Labels:</legend>
                        <input type="checkbox" name="node_label" (change)="toggleNodeLabels()" checked/> Node
                        <input type="checkbox" name="link_label" (change)="toggleLinkLabels()"/> Link
                        <input type="checkbox" name="lyph_label" (change)="toggleLyphLabels()"/> Lyph

                        <fieldset [disabled]="!_showNodeLabels">
                            <legend>Node label:</legend>
                            <input type="radio" name="node_label"
                                   (change)="updateLabelContent('node', 'id')" checked/> Id
                            <input type="radio" name="node_label"
                                   (change)="updateLabelContent('node', 'name')"/> Name
                            <input type="radio" name="node_label"
                                   (change)="updateLabelContent('node', 'external')"/> External
                        </fieldset>

                        <fieldset [disabled]="!_showLinkLabels">
                            <legend>Link label:</legend>
                            <input type="radio" name="link_label"
                                   (change)="updateLabelContent('link', 'id')" checked/> Id
                            <input type="radio" name="link_label"
                                   (change)="updateLabelContent('link', 'name')"/> Name
                            <input type="radio" name="link_label"
                                   (change)="updateLabelContent('link', 'external')"/> External
                        </fieldset>

                        <fieldset [disabled]="!_showLyphLabels">
                            <legend>Lyph label:</legend>
                            <input type="radio" name="lyph_label"
                                   (change)="updateLabelContent('lyph', 'id')" checked/> Id
                            <input type="radio" name="lyph_label"
                                   (change)="updateLabelContent('lyph', 'name')"/> Name
                            <input type="radio" name="lyph_label"
                                   (change)="updateLabelContent('lyph', 'external')"/> External
                        </fieldset>
                    </fieldset>


                    <!--<fieldset>-->
                        <!--<legend>Lyphs:</legend>-->
                        <!--<input type="checkbox" name="lyphs" (change)="toggleLyphs()" checked/> Lyphs-->
                        <!--<input [disabled]="!_showLyphs"-->
                               <!--type="checkbox" name="layers" (change)="toggleLayers()"/> Layers-->

                        <!--<fieldset [disabled]="!_showLyphs">-->
                            <!--<legend>Lyph icon:</legend>-->
                            <!--<input type="radio" name="linkIcon_view" (change)="toggleLyphIcon('2d')" checked/> 2D-->
                            <!--<input type="radio" name="linkIcon_view" (change)="toggleLyphIcon('3d')"/> 3D-->
                        <!--</fieldset>-->
                    <!--</fieldset>-->

                    <!--<fieldset>-->
                        <!--<legend>Dimensions:</legend>-->
                        <!--<input type="radio" name="num_dimensions" (change)="toggleDimensions(2)" checked/> 2D-->
                        <!--<input type="radio" name="num_dimensions" (change)="toggleDimensions(3)"/> 3D-->
                    <!--</fieldset>-->

                    <fieldset>
                        <legend>Helpers:</legend>
                        <input type="checkbox" name="planes" (change)="togglePlanes(['x-y'])"/> Grid x-y
                        <input type="checkbox" name="planes" (change)="togglePlanes(['x-z'])"/> Grid x-z
                        <input type="checkbox" name="planes" (change)="togglePlanes(['axis'])"/> Axis
                    </fieldset>
                </section>

                <section class="w3-padding-top" style="padding-right: 3px;">
                    <button class="w3-button w3-card w3-right w3-light-grey" (click)="update()">Update</button>
                </section>
                <section class="w3-clear">
                </section>

                <section class="w3-content w3-padding-top">
                    <modelInfoPanel *ngIf="!!_highlighted && !!_highlighted.__data" [model] = _highlighted.__data></modelInfoPanel>
                </section>

            </section>
        </section>
    `,
    styles: [`
        canvas {
            width:  100%;
            height:  100%;
        }
        button:focus {outline:0 !important;}
    `]
})
export class WebGLSceneComponent {
    @ViewChild('canvas') canvas: ElementRef;
    scene;
    camera;
    renderer;
    canvasContainer;
    controls;
    mouse;
    windowResize;
    width;
    height;
    _graphData = {};
    _kidneyDataService;
    _testDataService;
    _highlighted;

    graph;
    helpers = {};

    /**
     * @emits highlightedItemChange - the highlighted item changed
     */
    @Output() highlightedItemChange = new EventEmitter();


    constructor() {
        this._showLyphs  = true;
        this._showLayers = false; //true; //TODO uncomment for WebGL renderer
        this._showNodeLabels = true;
        this._showLinkLabels = false;
        this._showLyphLabels = false;
        this._numDimensions = 2;
    }

    ngAfterViewInit(){
        if (this.renderer) {return;} //already initialized

        this._kidneyDataService = new KidneyDataService();
        this._kidneyDataService.init();
        this._graphData = this._kidneyDataService.graphData;

        this.canvasContainer = document.getElementById('canvasContainer');
        this.width = this.canvasContainer.clientWidth;
        this.height = this.canvasContainer.clientHeight;

        // Switch here for WebGL to Canvas
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas.nativeElement});
        // this.renderer = new THREE.CanvasRenderer({canvas: this.canvas.nativeElement});

        this.renderer.setClearColor(0xffffff);

        this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 100);
        this.camera.position.set(0, 100, 500);

        //this.controls = new TrackballControls(this.camera, container);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.scene = new THREE.Scene();

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();


        // Lights
        const ambientLight = new THREE.AmbientLight(0xcccccc);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff);
        pointLight.position.set(300, 0, 300);
        this.scene.add(pointLight);

        this.mouse = new THREE.Vector2(0, 0);

        window.addEventListener( 'mousemove', evt => this.onMouseMove(evt), false );
        window.addEventListener( 'keydown',   evt => this.onKeyDown(evt)  , false );
        // this.windowResize = new WindowResize(this.renderer, this.camera)

        this.resizeCanvasToDisplaySize();
        this.createHelpers();
        this.createGraph();
        this.animate();
    }

    resizeCanvasToDisplaySize(force) {

        const canvas = this.renderer.domElement;
        const width  = this.canvasContainer.clientWidth;
        const height = this.canvasContainer.clientHeight;

        const dimension = function(){ return { width, height } }

        if (force || canvas.width !== width || canvas.height !== height) {
            this.windowResize = new WindowResize(this.renderer, this.camera, dimension);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.width = this.canvasContainer.clientWidth;
            this.height = this.canvasContainer.clientHeight;
            window.dispatchEvent(new Event('resize'));
        }
    }

    animate() {
        this.resizeCanvasToDisplaySize();
        if (this.graph){
            this.graph.tickFrame();
            this.highlightSelected();
        }
        this.controls.update();

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

    update(){
        this.graph.numDimensions(this._numDimensions);
    }

    highlightSelected(){
        let vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 1 );
        vector.unproject( this.camera );

        let ray = new THREE.Raycaster( this.camera.position, vector.sub( this.camera.position ).normalize() );

        let intersects = ray.intersectObjects( this.graph.children );
        if ( intersects.length > 0 ){
            // if the closest object intersected is not the currently stored intersection object
            if ( intersects[ 0 ].object !== this._highlighted ){
                // restore previous intersection object (if it exists) to its original color
                if ( this._highlighted ){
                    this._highlighted.material.color.setHex( this._highlighted.currentHex );
                    (this._highlighted.children || []).forEach(child => {
                        if (child.visible && child.material){
                            child.material.color.setHex( child.currentHex );
                        }
                    })
                }
                // store reference to closest object as current intersection object
                this._highlighted = intersects[ 0 ].object;

                // store color of closest object (for later restoration)
                this._highlighted.currentHex = this._highlighted.material.color.getHex();
                (this._highlighted.children || []).forEach(child => {
                    if (child.visible && child.material){
                        child.currentHex = child.material.color.getHex();
                    }
                });

                //const highlightColor = 0.5 * 0xffffff;
                const highlightColor = 0xff0000;

                // set a new color for closest object
                this._highlighted.material.color.setHex( highlightColor );
                (this._highlighted.children || []).forEach(child => {
                    if (child.visible && child.material){
                        child.material.color.setHex( highlightColor );
                    }
                });

                this.highlightedItemChange.emit(this._highlighted);
            }
        }
        else {
            // restore previous intersection object (if it exists) to its original color
            if ( this._highlighted ) {
                this._highlighted.material.color.setHex(this._highlighted.currentHex);
                (this._highlighted.children || []).forEach(child => {
                    if (child.visible && child.material){
                        child.material.color.setHex( child.currentHex );
                    }
                })
            }
            this._highlighted = null;
            this.highlightedItemChange.emit(this._highlighted);
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

    toggleLyphs(){
        this._showLyphs = !this._showLyphs;
        this.graph.showLyphs(this._showLyphs);
    }

    toggleLayers(){
        this._showLayers = !this._showLayers;
        this.graph.showLayers(this._showLayers);
    }

    toggleLyphIcon(value){
        this.graph.method(value);
    }

    toggleNodeLabels(){
        this._showNodeLabels = !this._showNodeLabels;
        this.graph.showNodeLabel(this._showNodeLabels);
    }

    toggleLinkLabels(){
        this._showLinkLabels = !this._showLinkLabels;
        this.graph.showLinkLabel(this._showLinkLabels);
    }

    toggleLyphLabels(){
        this._showLyphLabels = !this._showLyphLabels;
        this.graph.showLyphLabel(this._showLyphLabels);
    }

    toggleDimensions(numDimensions) {
        this._numDimensions = numDimensions;
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

@NgModule({
    imports     : [CommonModule, FormsModule],
    declarations: [WebGLSceneComponent, ModelInfoPanel, StopPropagation],
    exports     : [WebGLSceneComponent]
})
export class WebGLSceneModule {}
