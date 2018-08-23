import {NgModule, Component, ViewChild, ElementRef, Input, Output, EventEmitter} from '@angular/core';
import {StopPropagation} from './stopPropagation';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {keys} from 'lodash-bound';
import * as THREE from 'three';

import ThreeForceGraph   from '../three/threeForceGraph';
import {
    forceX,
    forceY,
    forceZ
} from 'd3-force-3d';
import {LINK_TYPES} from '../models/linkModel';
import {NODE_TYPES} from '../models/nodeModel';

import {ModelInfoPanel} from './gui/modelInfo';
import {SelectNameSearchBar} from './gui/selectNameSearchBar';

const OrbitControls = require('three-orbit-controls')(THREE);
const WindowResize = require('three-window-resize');

@Component({
    selector: 'webGLScene',
    template: `
        <section id="viewPanel" class="w3-row">
            <section id="canvasContainer" [class.w3-twothird]="showPanel">
                <section class="w3-padding-right" style="position:relative;">
                    <section class="w3-right" style="position:absolute; right: 4px; top: 4px;">
                        <button class="w3-hover-light-grey"(click)="update()">
                            <i class="fa fa-refresh"></i>
                        </button>
                        <button class="w3-hover-light-grey" (click)="toggleSettingPanel()">
                            <i *ngIf="showPanel"  class="fa fa-angle-right"></i>
                            <i *ngIf="!showPanel" class="fa fa-angle-left"></i>
                        </button>
                    </section>
                    <canvas #canvas class="w3-card w3-round"></canvas>
                </section>
            </section>
            <section *ngIf="showPanel" id="settingsPanel" stop-propagation class="w3-third">
                <section class="w3-padding-small">
                    <section class="w3-center w3-card w3-grey">
                        <h4>Control panel</h4>
                    </section>
                    <fieldset *ngIf="!!_highlighted && !!_highlighted.__data" class="w3-card w3-round w3-margin-small">
                        <legend>Highlighted</legend>
                        <modelInfoPanel [model]=_highlighted.__data></modelInfoPanel>
                    </fieldset>                    
                    <fieldset class="w3-card w3-round w3-margin-small">
                        <legend>Layout</legend>
                        <input type="checkbox" class="w3-check" name="lyphs" (change)="toggleLyphs()" checked/> Lyphs
                        <span *ngIf="_showLyphs">
                            <input type="checkbox" class="w3-check" name="layers"
                                   (change)="toggleLayers()" [checked]="_showLayers"/> Layers
                        </span>
                        <br/>
                        <span *ngFor="let group of graphData.groups">
                            <input type="checkbox" name="switch" class="w3-check"
                                   (change)="toggleGroup(group)" [checked]="showGroup(group)"/> {{group.name}}
                        </span>
                    </fieldset>
                    <fieldset class="w3-card w3-round w3-margin-small">
                        <legend>Labels</legend>
                        <span *ngFor="let labelClass of _labelClasses">
                            <input type="checkbox" class="w3-check"
                                   [name]="labelClass"
                                   [checked]="_showLabels[labelClass]"
                                   (change)="toggleLabels(labelClass)"/> {{labelClass}}
                        </span>
                        <span *ngFor="let labelClass of _labelClasses">
                            <fieldset *ngIf="_showLabels[labelClass]" class="w3-card w3-round w3-margin-small">
                                <legend>{{labelClass}} label</legend>
                                <span *ngFor="let labelProp of _labelProps">
                                    <input type="radio" class="w3-radio"
                                           [name]="labelClass"
                                           [checked]="_labels[labelClass] === labelProp"
                                           (change)="updateLabelContent(labelClass, labelProp)"> {{labelProp}}
                                </span>
                            </fieldset>
                        </span>
                    </fieldset>
                    <fieldset class="w3-card w3-round w3-margin-small">
                        <legend>Helpers</legend>
                        <input type="checkbox" name="planes" class="w3-check" (change)="togglePlanes(['x-y'])"/> Grid
                        x-y
                        <input type="checkbox" name="planes" class="w3-check" (change)="togglePlanes(['x-z'])"/> Grid
                        x-z
                        <input type="checkbox" name="planes" class="w3-check" (change)="togglePlanes(['axis'])"/> Axis
                    </fieldset>
                    <fieldset class="w3-card w3-round w3-margin-small-small">
                        <legend>Select lyph</legend>
                        <selectNameSearchBar [selectedName]="_selectedLyphName" [namesAvailable]="_namesAvailable"
                                             (selectedBySearchEvent)="selectBySearchEventHandler($event)"></selectNameSearchBar>
                    </fieldset>
                    <fieldset *ngIf="!!_selected && !!_selected.__data" class="w3-card w3-round w3-margin-small">
                        <legend>Selected</legend>
                        <modelInfoPanel [model]=_selected.__data></modelInfoPanel>
                    </fieldset>
                </section>
            </section>
        </section>
    `,
    styles: [`
        #viewPanel {
            z-index: 5;
        }

        :host >>> fieldset {
            border: 1px solid grey;
            margin: 2px;
        }

        :host >>> legend {
            padding: 0.2em 0.5em;
            border: 1px solid grey;
            color: grey;
            font-size: 90%;
            text-align: right;
        }

        button:focus {
            outline: 0 !important;
        }        
    `]
})
export class WebGLSceneComponent {
    @ViewChild('canvas') canvas: ElementRef;

    showPanel = false;
    scene;
    camera;
    renderer;
    canvasContainer;
    settingsPanel;
    controls;
    mouse;
    windowResize;

    _highlighted = null;
    _selected    = null;

    _namesAvailable;
    _selectedLyphName = "";

    highlightColor = 0xff0000;
    selectColor    = 0x00ff00;
    defaultColor   = 0x000000;

    graph;
    helpers = {};
    axisLength = 1000;

    @Input('graphData') set graphData(newGraphData) {
        if (this._graphData !== newGraphData) {
            this._graphData = newGraphData;
            this._hideGroups = new Set([...this._graphData.groups]);
            this._graphData.hideGroups([...this._hideGroups]);
            this._namesAvailable = this._graphData.lyphs.map(lyph => lyph.name);

            /*Map initial positional constraints to match the scaled image*/

            this._graphData.nodes.forEach(node => node.layout::keys().forEach(key => {node.layout[key] *= this.axisLength * 0.01; }));
            this._graphData.links.filter(link => link.length).forEach(link => link.length *= 2 * this.axisLength * 0.01);

            if (this.graph) { this.graph.graphData(this._graphData); }
        }
    }

    @Input('highlighted') set highlighted(obj) {
        if (this.highlighted === obj){ return; }
        if (this.highlighted !== this.selected){
            this.unhighlight(this._highlighted);
        } else {
            this.highlight(this.selected, this.selectColor, false);
        }
        this.highlight(obj, this.highlightColor, obj !== this._selected);
        this._highlighted = obj;
        this.highlightedItemChange.emit(obj);
    }

    @Input('selected') set selected(obj){
        if (this.selected === obj){ return; }
        this.unhighlight(this._selected);
        this.highlight(obj, this.selectColor, obj !== this.highlighted);
        this._selected = obj;
        this._selectedLyphName = obj && obj.__data && (obj.__data.constructor.name === "Lyph")? obj.__data.name: "";
        this.selectedItemChange.emit(obj);
    }

    /**
     * @emits highlightedItemChange - the highlighted item changed
     */
    @Output() highlightedItemChange = new EventEmitter();

    /**
     * @emits selectedItemChange - the selected item changed
     */
    @Output() selectedItemChange = new EventEmitter();

    get graphData() {
        return this._graphData;
    }

    constructor() {

        this._showLyphs = true;
        this._showLayers = true;
        this._showLabels = {
            "Node": true,
            "Link": false,
            "Lyph": false
        };
        this._labelClasses = (this._showLabels)::keys();
        this._labelProps   = ["id", "name", "external"];
        this._labels       = {Node: "id", Link: "id", Lyph: "id"};

        this._hideGroups = new Set();
    }

    ngAfterViewInit() {
        if (this.renderer) {  return; }

        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas.nativeElement});
        this.renderer.setClearColor(0xffffff);

        this.canvasContainer = document.getElementById('canvasContainer');
        this.settingsPanel   = document.getElementById('settingsPanel');

        let width = this.canvasContainer.clientWidth;
        let height = this.canvasContainer.clientHeight;

        this.camera = new THREE.PerspectiveCamera(70, width / height, 100);
        this.camera.position.set(0, 100, 1000);
        this.camera.aspect = width / height;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera.updateProjectionMatrix();

        // Lights
        const ambientLight = new THREE.AmbientLight(0xcccccc);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff);
        pointLight.position.set(300, 0, 300);
        this.scene.add(pointLight);

        this.mouse = new THREE.Vector2(0, 0);
        this.createEventListeners(); // keyboard / mouse events
        this.resizeCanvasToDisplaySize();
        this.createHelpers();
        this.createGraph();
        this.animate();
    }

    createEventListeners() {
        window.addEventListener('mousemove', evt => this.onMouseMove(evt), false);
        window.addEventListener('mousedown', evt => this.onMouseDown(evt), false );
        window.addEventListener('keydown'  , evt => this.onKeyDown(evt), false);
    }

    resizeCanvasToDisplaySize(force) {

        const canvas = this.renderer.domElement;
        const width  = this.canvasContainer.clientWidth;
        const height = this.canvasContainer.clientHeight;

        const dimensions = function(){
            return { width, height }
        };

        if (force || canvas.width !== width || canvas.height !== height) {
            this.windowResize = new WindowResize(this.renderer, this.camera, dimensions);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            window.dispatchEvent(new Event('resize'));
        }
    }

    animate() {
        this.resizeCanvasToDisplaySize();
        if (this.graph) {
            this.graph.tickFrame();
        }
        this.controls.update();

        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(_ => this.animate());
    }

    createHelpers() {
        let gridColor = new THREE.Color(0xcccccc);
        let axisColor = new THREE.Color(0xaaaaaa);

        // x-y plane
        let gridHelper1 = new THREE.GridHelper(2 * this.axisLength, 10, axisColor, gridColor);
        gridHelper1.geometry.rotateX(Math.PI / 2);
        this.scene.add(gridHelper1);
        this.helpers["x-y"] = gridHelper1;

        // x-z plane
        let gridHelper2 = new THREE.GridHelper(2 * this.axisLength, 10, axisColor, gridColor);
        this.scene.add(gridHelper2);
        this.helpers["x-z"] = gridHelper2;

        let axesHelper = new THREE.AxesHelper(this.axisLength + 20);
        this.scene.add(axesHelper);
        this.helpers["axis"] = axesHelper;

        this.togglePlanes(["x-y", "x-z", "axis"]);
    }

    createGraph() {
        //Create
        this.graph = new ThreeForceGraph()
            .graphData(this._graphData || {});

        //TODO check if setting strength is necessary
        this.graph.d3Force("x", forceX().x(d => ('x' in d.layout) ? d.layout.x : 0)
            .strength(d => ('x' in d.layout) ? ((d.type === NODE_TYPES.CORE) ? 1 : 0.5) : 0)
        );

        this.graph.d3Force("y", forceY().y(d => ('y' in d.layout) ? d.layout.y : 0)
            .strength(d => ('y' in d.layout) ? ((d.type === NODE_TYPES.CORE) ? 1 : 0.5) : 0)
        );

        this.graph.d3Force("z", forceZ().z(d => ('z' in d.layout) ? d.layout.z : 0)
            .strength(d => ('z' in d.layout) ? ((d.type === NODE_TYPES.CORE) ? 1 : 0.5) : 0)
        );

        this.graph.d3Force("link")
            .distance(d => d.length)
            .strength(d => (d.strength ? d.strength :
                (d.type === LINK_TYPES.CONTAINER) ? 0 : 1));

        this.graph.showLabels(this._showLabels);
        this.scene.add(this.graph);
    }

    update() {
        if (this.graph){
            this.graph.graphData(this._graphData);
        }
    }

    toggleSettingPanel() {
        this.showPanel = !this.showPanel;
    }

    // Also search internally for internal layers
    getMousedOverObject() {
        let vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 1);
        vector.unproject(this.camera);
        let ray = new THREE.Raycaster(this.camera.position, vector.sub(this.camera.position).normalize());

        let intersects = ray.intersectObjects(this.graph.children);
        if (intersects.length > 0) {
            if (!intersects[0].object.__data || intersects[0].object.__data.inactive) { return; }
            //Refine selection to layers
            if (intersects[0].object.__data.layers) {
                let layerMeshes = intersects[0].object.__data.layers.map(layer => layer.viewObjects["main"]);
                let layerIntersects = ray.intersectObjects(layerMeshes);
                if (layerIntersects.length > 0) {
                    return layerIntersects[0].object;
                }
            }
            return intersects[0].object;
        }
    }

    get highlighted(){
        return this._highlighted;
    }

    get selected(){
        return this._selected;
    }

    highlight(obj, color, rememberColor = true){
        if (obj && obj.material) {
            // store color of closest object (for later restoration)
            if (rememberColor){
                obj.currentHex = obj.material.color.getHex();
                (obj.children || []).filter(child => child.material).forEach(child => {
                    child.currentHex = child.material.color.getHex();
                });
            }

            // set a new color for closest object
            obj.material.color.setHex(color);
            (obj.children || []).filter(child => child.material).forEach(child => {
                child.material.color.setHex(color);
            });
        }
    }

    unhighlight(obj){
        // restore previous intersection object (if it exists) to its original color
        if (obj){
            if (obj.material){
                obj.material.color.setHex( obj.currentHex || this.defaultColor);
            }
            (obj.children || []).filter(child => child.material && child.currentHex).forEach(child => {
                child.material.color.setHex( child.currentHex || this.defaultColor);
            })
        }
    }

    selectBySearchEventHandler(name) {
        if (this.graph && (name !== this._selectedLyphName)) {
            let lyph = this._graphData.lyphs(lyph => lyph.name === name);
            this.selected = lyph? lyph.viewObjects["main"]: null;
        }
    }

    onMouseDown(_) {
        this.selected = this.getMousedOverObject();
    }

    onMouseMove(evt) {
        // calculate mouse position in normalized device coordinates
        let rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ( ( evt.clientX - rect.left ) / ( rect.width - rect.left ) ) * 2 - 1;
        this.mouse.y = -( ( evt.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;

        this.highlighted = this.getMousedOverObject();
    }

    onKeyDown(evt) {

        let keyCode = evt.which;
        if (evt.ctrlKey) {
            evt.preventDefault();
            switch (keyCode) {
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
            if (evt.shiftKey) {
                // I comment this out so that I can do cmd+shft+R (Hard refresh) during coding
                // evt.preventDefault();
                switch (keyCode) {
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

    zoom(delta) {
        this.camera.position.z += delta;
        this.camera.lookAt(this.scene.position);
    }

    rotateScene(deltaX, deltaY) {
        this.camera.position.x += deltaX;
        this.camera.position.y += deltaY;
        this.camera.lookAt(this.scene.position);
    }

    /* Toggle scene elements */

    togglePlanes(keys) {
        keys.filter(key => this.helpers[key]).forEach(key => {
            this.helpers[key].visible = !this.helpers[key].visible
        });
    }

    toggleLyphs() {
        this._showLyphs = !this._showLyphs;
        this.graph.showLyphs(this._showLyphs);
    }

    toggleLayers() {
        this._showLayers = !this._showLayers;
        this.graph.showLayers(this._showLayers);
    }

    toggleLyphIcon(value) {
        this.graph.method(value);
    }

    toggleLabels(labelClass) {
        this._showLabels[labelClass] = !this._showLabels[labelClass];
        if (this.graph){
            this.graph.showLabels(this._showLabels);
        }
    }

    updateLabelContent(target, property) {
        this._labels[target] = property;
        this.graph.labels(this._labels);
    }

    showGroup(group){
        return !this._hideGroups.has(group);
    }

    toggleGroup(group) {
        if (this._hideGroups.has(group)){
            this._hideGroups.delete(group);
        } else {
            this._hideGroups.add(group);
        }
        this._graphData.hideGroups([...this._hideGroups]);
        if (this.graph) { this.graph.graphData(this._graphData); }
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    declarations: [WebGLSceneComponent, ModelInfoPanel, SelectNameSearchBar, StopPropagation ],
    exports: [WebGLSceneComponent]
})
export class WebGLSceneModule {
}
