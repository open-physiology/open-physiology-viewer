import {NgModule, Component, ViewChild, ElementRef, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatSliderModule} from '@angular/material/slider';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';

import {keys, values, isObject, cloneDeep, defaults} from 'lodash-bound';
import * as THREE from 'three';
import ThreeForceGraph from '../view/threeForceGraph';
import {forceX, forceY, forceZ} from 'd3-force-3d';

import {LogInfoModule, LogInfoDialog} from "./gui/logInfoDialog";
import {SettingsPanelModule} from "./settingsPanel";

import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {$Field, $SchemaClass} from "../model";
import {QuerySelectModule, QuerySelectDialog} from "./gui/querySelectDialog";
import {HotkeyModule, HotkeysService, Hotkey} from 'angular2-hotkeys';
import {$LogMsg} from "../model/logger";

const WindowResize = require('three-window-resize');

/**
 * @ignore
 */
@Component({
    selector: 'webGLScene',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <hotkeys-cheatsheet></hotkeys-cheatsheet>
        <section id="apiLayoutPanel" class="w3-row">            
            <section id="apiLayoutContainer" [class.w3-threequarter]="showPanel">
                <section class="w3-padding-right" style="position:relative;">
                    <section class="w3-bar-block w3-right" style="position:absolute; right:0">
                        <button *ngIf="!lockControls" class="w3-bar-item w3-hover-light-grey"
                                (click)="toggleLockControls()" title="Lock controls">
                            <i class="fa fa-lock"> </i>
                        </button>
                        <button *ngIf="lockControls" class="w3-bar-item w3-hover-light-grey"
                                (click)="toggleLockControls()" title="Unlock controls">
                            <i class="fa fa-unlock"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="resetCamera()" title="Reset controls">
                            <i class="fa fa-compass"> </i>
                        </button>
                        <button *ngIf="!antialias" class="w3-bar-item w3-hover-light-grey"
                                (click)="toggleAntialias()" title="Enable antialiasing">
                            <i class="fa fa-paper-plane-o"> </i>
                        </button>
                        <button *ngIf="antialias" class="w3-bar-item w3-hover-light-grey"
                                (click)="toggleAntialias()" title="Disable antialiasing">
                            <i class="fa fa-paper-plane"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey" (click)="graph?.graphData(graphData)"
                                title="Update layout">
                            <i class="fa fa-refresh"> </i>
                        </button>
                        <button *ngIf="!showPanel" class="w3-bar-item w3-hover-light-grey"
                                (click)="showPanel = !showPanel" title="Show settings">
                            <i class="fa fa-cog"> </i>
                        </button>
                        <button *ngIf="showPanel" class="w3-bar-item w3-hover-light-grey"
                                (click)="showPanel = !showPanel" title="Hide settings">
                            <i class="fa fa-window-close"> </i>
                        </button>
                        <button id="importBtn" class="w3-bar-item w3-hover-light-grey" 
                                *ngIf ="graphData?.imports"
                                (click)="onImportExternal.emit()" title="Download external models">
                            <i class="fa fa-download"> </i>
                        </button>
                        <mat-slider vertical class="w3-grey"
                                    [min]="0.02 * scaleFactor" [max]="0.4 * scaleFactor"
                                    [step]="0.05 * scaleFactor" tickInterval="1"
                                    [value]="labelRelSize" title="Label size"
                                    (change)="onScaleChange($event.value)">
                        </mat-slider>
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="processQuery()" title="Show query result as group">
                            <i class="fa fa-question-circle-o"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="exportJSON()" title="Export json">
                            <i class="fa fa-file-code-o"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="exportResourceMapLD()" title="Export json-ld resource map">
                            <i class="fa fa-file-text"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="exportResourceMapLDFlat()" title="Export flattened json-ld resource map">
                            <i class="fa fa-file-text-o"> </i>
                        </button>
                        <button *ngIf="graphData?.logger.status === graphData.logger.statusOptions.ERROR" class="w3-bar-item w3-hover-light-grey"
                                (click)="showReport()" title="Show logs">
                            <i class="fa fa-exclamation-triangle" style="color:red"> </i>
                        </button>
                        <button *ngIf="graphData?.logger.status === graphData.logger.statusOptions.WARNING" class="w3-bar-item w3-hover-light-grey"
                                (click)="showReport()" title="Show logs">
                            <i class="fa fa-exclamation-triangle" style="color:yellow"> </i>
                        </button>
                        <button *ngIf="graphData?.logger.status === graphData.logger.statusOptions.OK" class="w3-bar-item w3-hover-light-grey"
                                (click)="showReport()" title="Show logs">
                            <i class="fa fa-check-circle" style="color:green"> </i>
                        </button>
                    </section>
                </section>
                <canvas #canvas> </canvas>
            </section>
            <section id="apiLayoutSettingsPanel" *ngIf="showPanel && isConnectivity" class="w3-quarter">
                <settingsPanel
                        [config]="_config"
                        [selected]="_selected"
                        [highlighted]="_highlighted"
                        [helperKeys]="_helperKeys"
                        [groups]="graphData?.activeGroups"
                        [dynamicGroups]="graphData?.dynamicGroups"
                        [scaffolds]="graphData?.scaffoldComponents"
                        [graphData]="graphData"
                        [searchOptions]="_searchOptions"
                        [modelId]="graphData?.fullID || graphData?.id"
                        (onSelectBySearch)="selectByName($event)"
                        (onOpenExternal)="openExternal($event)"
                        (onEditResource)="editResource.emit($event)"
                        (onUpdateShowLabels)="graph?.showLabels($event)"
                        (onUpdateLabelContent)="graph?.labels($event)"
                        (onToggleMode)="graph?.numDimensions($event)"
                        (onToggleLayout)="toggleLayout($event)"
                        (onToggleGroup)="toggleGroup($event)"
                        (onToggleHelperPlane)="this.helpers[$event].visible = !this.helpers[$event].visible"
                > </settingsPanel>
            </section>
        </section> 
    `,
    styles: [` 

        #apiLayoutPanel {
            height: 85vh;
        }
        
        #apiLayoutSettingsPanel{
          height: 100%;
          overflow-y: scroll;
          overflow-x: auto;
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
    `]
})
/**
 * @class
 * @property {Object} helpers
 * @property {Object} defaultConfig
 * @property {Object} camera
 */
export class WebGLSceneComponent {
    @ViewChild('canvas') canvas: ElementRef;
    showPanel = false;
    scene;
    camera;
    renderer;
    container;
    controls;
    ray;
    mouse;
    windowResize;
    antialias = true;

    _highlighted = null;
    _selected    = null;

    _searchOptions;
    _helperKeys = [];

    graph;
    helpers   = {};
    highlightColor = 0xff0000;
    selectColor    = 0x00ff00;
    defaultColor   = 0x000000;
    scaleFactor    = 10;
    labelRelSize   = 0.02 * this.scaleFactor;
    lockControls   = false;
    isConnectivity = true;

    queryCounter = 0;

    @Input() visibleGroups = [];

    @Input() modelClasses;

    @Input('graphData') set graphData(newGraphData) {
        if (this._graphData !== newGraphData) {
            this._graphData = newGraphData;
            this._searchOptions = (this._graphData.resources||[]).filter(e => e.name).map(e => e.name);
            this.selected = null;
            this._graphData.scale(this.scaleFactor);
            if (this._graphData.neurulator) {
                this._graphData.neurulator();
            }
            if (this.graph) {
                this.graph.graphData(this._graphData);
            }
        }
    }

    @Input('config') set config(newConfig) {
        this._config = newConfig::defaults(this.defaultConfig);
        if (this.graph){
            this.graph.showLabels(this._config.showLabels);
            this.graph.labels(this._config.labels);
            this._config.layout::keys().forEach(prop => this.graph[prop](this._config.layout[prop]))
        }
    }

    @Input('highlighted') set highlighted(entity) {
        if (this._highlighted === entity){ return; }
        if (this._highlighted !== this._selected){
            this.unhighlight(this._highlighted);
        } else {
            this.highlight(this._selected, this.selectColor, false);
        }
        this.highlight(entity, this.highlightColor, entity !== this._selected);
        this._highlighted = entity;
        this.highlightedItemChange.emit(entity);

        if (this.graph) {
            const obj = entity && entity.viewObjects? entity.viewObjects["main"]: null;
            this.graph.enableDrag = this.lockControls;
            this.graph.select(obj);
        }
    }

    @Input('selected') set selected(entity){
        if (this.selected === entity){ return; }
        this.unhighlight(this._selected);
        this.highlight(entity, this.selectColor, entity !== this.highlighted);
        this._selected = entity;
        this.selectedItemChange.emit(entity);
    }

    /**
     * @emits highlightedItemChange - the highlighted item changed
     */
    @Output() highlightedItemChange = new EventEmitter();

    /**
     * @emits selectedItemChange - the selected item changed
     */
    @Output() selectedItemChange = new EventEmitter();

    /**
     * @emits editResource - a resource was edited
     */
    @Output() editResource = new EventEmitter();

    /**
     * @emits scaffoldUpdated - scaffold was graphically altered
     * @type {EventEmitter<any>}
     */
    @Output() scaffoldUpdated = new EventEmitter();

    /**
     * @emits onImportExternal - import of external models is requested
     * @type {EventEmitter<any>}
     */
    @Output() onImportExternal = new EventEmitter();

    constructor(dialog: MatDialog, hotkeysService: HotkeysService) {
        this.dialog = dialog;
        this.hotkeysService = hotkeysService ;
        this.defaultConfig = {
            layout: {
                showLyphs       : true,
                showLayers      : true,
                showLyphs3d     : false,
                showCoalescences: false,
                numDimensions   : 3
            },
            showLabels: {
                [$SchemaClass.Wire]  : false,
                [$SchemaClass.Anchor]: true,
                [$SchemaClass.Node]  : false,
                [$SchemaClass.Link]  : false,
                [$SchemaClass.Lyph]  : false,
                [$SchemaClass.Region]: false
            },
            labels:{
                [$SchemaClass.Wire]  : $Field.id,
                [$SchemaClass.Anchor]: $Field.id,
                [$SchemaClass.Node]  : $Field.id,
                [$SchemaClass.Link]  : $Field.id,
                [$SchemaClass.Lyph]  : $Field.id,
                [$SchemaClass.Region]: $Field.id
            },
            groups      : true,
            highlighted : true,
            selected    : true
        };
        this._config = this.defaultConfig::cloneDeep();
        this.hotkeysService.add(new Hotkey('shift+meta+r', (event: KeyboardEvent): boolean => {
          this.resetCamera();
          return false; // Prevent bubbling
        }, undefined, 'Reset camera'));
        this.hotkeysService.add(new Hotkey('shift+meta+u', (event: KeyboardEvent): boolean => {
          this.updateGraph();
          return false; // Prevent bubbling
        }, undefined, 'Update graph'));
        this.hotkeysService.add(new Hotkey('shift+meta+t', (event: KeyboardEvent): boolean => {
          this.toggleLockControls();
          return false; // Prevent bubbling
        }, undefined, 'Toggle Lock controls'));
        this.hotkeysService.add(new Hotkey('shift+meta+a', (event: KeyboardEvent): boolean => {
          this.toggleAntialias();
          return false; // Prevent bubbling
        }, undefined, 'Toggle Anti Alias'));
        this.hotkeysService.add(new Hotkey('shift+meta+l', (event: KeyboardEvent): boolean => {
          this.togglelayout();
          return false; // Prevent bubbling
        }, undefined, 'Toggle Layout'));
        this.hotkeysService.add(new Hotkey('shift+meta+p', (event: KeyboardEvent): boolean => {
          this.showReport();
          return false; // Prevent bubbling
        }, undefined, 'Show Report'));
        this.hotkeysService.add(new Hotkey('shift+meta+d', (event: KeyboardEvent): boolean => {
          this.resizeToDisplaySize();
          return false; // Prevent bubbling
        }, undefined, 'Resize to Display Size'));
        this.hotkeysService.add(new Hotkey('shift+meta+up', (event: KeyboardEvent): boolean => {
          this.moveCamera('up');
          return false; // Prevent bubbling
        }, undefined, 'Rotate camera up'));
        this.hotkeysService.add(new Hotkey('shift+meta+down', (event: KeyboardEvent): boolean => {
          this.moveCamera('down');
          return false; // Prevent bubbling
        }, undefined, 'Rotate camera down'));
        this.hotkeysService.add(new Hotkey('shift+meta+left', (event: KeyboardEvent): boolean => {
          this.moveCamera('left');
          return false; // Prevent bubbling
        }, undefined, 'Rotate camera left'));
        this.hotkeysService.add(new Hotkey('shift+meta+right', (event: KeyboardEvent): boolean => {
          this.moveCamera('right');
          return false; // Prevent bubbling
        }, undefined, 'Rotate camera right'));
    }

    onScaleChange(newLabelScale){
        this.labelRelSize = newLabelScale;
        if (this.graph){ this.graph.labelRelSize(this.labelRelSize); }
    }

    get graphData() {
        return this._graphData;
    }

    ngAfterViewInit() {
        if (this.renderer) {  return; }

        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas.nativeElement, antialias: this.antialias, alpha: true});
        this.renderer.setClearColor(0xffffff, 0.5);

        this.container = document.getElementById('apiLayoutContainer');
        let width = this.container.clientWidth;
        let height = this.container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(70, width / height, 10, 4000);
        this.camera.aspect = width / height;
        this.resetCamera();

        this.ray = new THREE.Raycaster();
        this.scene = new THREE.Scene();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.controls.minDistance = 10;
        this.controls.maxDistance = 4000 - 100 * this.scaleFactor;

        this.controls.minZoom = 0;
        this.controls.maxZoom = 10;

        this.controls.enablePan = true;
        this.controls.minPolparAngle = 0;
        this.controls.maxPolarAngle = Math.PI/2;
        this.controls.enabled = !this.lockControls;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xcccccc);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff);
        pointLight.position.set(300, 0, 300);
        this.scene.add(pointLight);

        this.mouse = new THREE.Vector2(0, 0);
        this.createEventListeners(); // keyboard / mouse events
        this.resizeToDisplaySize();
        this.createHelpers();
        this.createGraph();
        this.animate();
    }

    processQuery(){
        let config = {
            parameterValues: [this.selected? (this.selected.externals||[""])[0]: "UBERON:0005453"],
            baseURL : "http://sparc-data.scicrunch.io:9000/scigraph"
        };
        let dialogRef = this.dialog.open(QuerySelectDialog, { width: '60%', data: config });
        dialogRef.afterClosed().subscribe(result => {
            if (result && result.response){
                this.queryCounter++;
                const nodeIDs  = (result.response.nodes||[]).filter(e => (e.id.indexOf(this.graphData.id) > -1)).map(r => (r.id||"").substr(r.id.lastIndexOf("/") + 1));
                const edgeIDs =  (result.response.edges||[]).filter(e => (e.sub.indexOf(this.graphData.id) > -1)).map(r => (r.sub||"").substr(r.sub.lastIndexOf("/") + 1));
                const nodes = (this.graphData.nodes||[]).filter(e => nodeIDs.includes(e.id));
                const links = (this.graphData.links||[]).filter(e => edgeIDs.includes(e.id));
                const lyphs = (this.graphData.lyphs||[]).filter(e => edgeIDs.includes(e.id));
                if (nodes.length || links.length || lyphs.length) {
                    this.graphData.createDynamicGroup(this.queryCounter, result.query || "?", {nodes, links, lyphs}, this.modelClasses);
                } else {
                    this.graphData.logger.error($LogMsg.GRAPH_QUERY_EMPTY_RES, nodeIDs, edgeIDs);
                }
            }
        })
    }

    exportJSON(){
        if (this._graphData){
            let result = JSON.stringify(this._graphData.toJSON(3, {
                [$Field.border]   : 3,
                [$Field.borders]  : 3,
                [$Field.villus]   : 3,
                [$Field.scaffolds]: 5
            }), null, 2);
            const blob = new Blob([result], {type: 'application/json'});
            FileSaver.saveAs(blob, this._graphData.id + '-generated-' + this._graphData.uuid + '.json');
        }
    }

    exportResourceMapLD(){
        if (this._graphData){
            let result = JSON.stringify(this._graphData.entitiesToJSONLD(), null, 2);
            const blob = new Blob([result], {type: 'application/ld+json'});
            FileSaver.saveAs(blob, this._graphData.id + '-resourceMap-' + this._graphData.uuid + '.jsonld');
        }
    }

    exportResourceMapLDFlat(){
        if (this._graphData){
            let filename = this._graphData.id + '-resourceMap-flattened-'  + this._graphData.uuid + '.jsonld';
            const callback = res => {
                let result = JSON.stringify(res, null, 2);
                const blob = new Blob([result], {type: 'application/ld+json'});
                FileSaver.saveAs(blob, filename);
            };
            this._graphData.modelClasses.Graph.entitiesToJSONLDFlat(this._graphData.entitiesToJSONLD(), callback);
        }
    }

    showReport(){
        const dialogRef = this.dialog.open(LogInfoDialog, {
            width : '75%',
            data  : this.graphData.logger.print()
        });

        dialogRef.afterClosed().subscribe(res => {
            if (res !== undefined){
                let result = JSON.stringify(res, null, 2);
                const blob = new Blob([result], {type: 'application/txt'});
                FileSaver.saveAs(blob, this._graphData.id + '-log-' + this._graphData.uuid + '.json');
            }
        });
    }

    resizeToDisplaySize() {
        const delta = 5;
        const width  = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (Math.abs(this.renderer.domElement.width - width) > delta
            || Math.abs(this.renderer.domElement.height - height) > delta) {
            const dimensions = function(){ return { width, height } };
            this.windowResize = new WindowResize(this.renderer, this.camera, dimensions);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            window.dispatchEvent(new Event('resize'));
        }
    }

    animate() {
        this.resizeToDisplaySize();
        if (this.graph) {
            this.graph.tickFrame();
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(() => this.animate());
    }

    createHelpers() {
        let gridColor = new THREE.Color(0xcccccc);
        let axisColor = new THREE.Color(0xaaaaaa);
        let axisLength = 100 * this.scaleFactor;

        // x-y plane
        let gridHelper1 = new THREE.GridHelper(2 * axisLength, 10, axisColor, gridColor);
        gridHelper1.geometry.rotateX(Math.PI / 2);
        this.scene.add(gridHelper1);
        this.helpers["Grid x-y"] = gridHelper1;

        // x-z plane
        let gridHelper2 = new THREE.GridHelper(2 * axisLength, 10, axisColor, gridColor);
        this.scene.add(gridHelper2);
        this.helpers["Grid x-z"] = gridHelper2;

        let axesHelper = new THREE.AxesHelper(axisLength + 10);
        this.scene.add(axesHelper);
        this.helpers["Axis"] = axesHelper;
        this.helpers::values().forEach(value => value.visible = false);

        this._helperKeys = this.helpers::keys();
    }

    createGraph() {
        this.graph = new ThreeForceGraph()
            .canvas(this.canvas.nativeElement)
            .scaleFactor(this.scaleFactor)
            .onAnchorDragEnd((obj, delta) => {
                obj.userData.relocate(delta);
                this.graph.graphData(this.graphData);
                this.scaffoldUpdated.emit(obj);
            })
            .onWireDragEnd((obj, delta) => {
                obj.userData.relocate(delta);
                this.graph.graphData(this.graphData);
                this.scaffoldUpdated.emit(obj);
            })
            .onRegionDragEnd((obj, delta) => {
                obj.userData.relocate(delta);
                this.graph.graphData(this.graphData);
                this.scaffoldUpdated.emit(obj);
            })
            .graphData(this.graphData);

        const isLayoutDimValid = (layout, key) => layout::isObject() && (key in layout) && (typeof layout[key] !== 'undefined');
        const forceVal = (d, key) => isLayoutDimValid(d.layout, key)? d.layout[key] : 0;
        const forceStrength = (d, key) => isLayoutDimValid(d.layout, key) ? 1 : 0;

        this.graph.d3Force("x", forceX().x(d => forceVal(d, "x")).strength(d => forceStrength(d, "x")));
        this.graph.d3Force("y", forceY().y(d => forceVal(d, "y")).strength(d => forceStrength(d, "y")));
        this.graph.d3Force("z", forceZ().z(d => forceVal(d, "z")).strength(d => forceStrength(d, "z")));

        this.graph.d3Force("link")
            .distance(d => d.length )
            .strength(d => (d.strength ? d.strength :
                (d.source && d.source.fixed && d.target && d.target.fixed || !d.length) ? 0 : 1));

        this.graph.labelRelSize(this.labelRelSize);
        this.graph.showLabels(this._config.showLabels);
        this.graph.labels(this._config.labels);
        this.scene.add(this.graph);
    }

    moveCamera(direction){
      const delta = 10 ;
      switch(direction)
      {
        case 'left': 
          this.camera.position.x = this.camera.position.x - delta;
          this.camera.updateProjectionMatrix();
        break;
        case 'up' : 
          this.camera.position.z = this.camera.position.z - delta;
          this.camera.updateProjectionMatrix();
        break;
        case 'right' : 
          this.camera.position.x = this.camera.position.x + delta;
          this.camera.updateProjectionMatrix();
        break;
        case 'down' : 
          this.camera.position.z = this.camera.position.z + delta;
          this.camera.updateProjectionMatrix();
        break;
      }
    }

    resetCamera(positionPoint, lookupPoint) {
        let position = [0, -100, 120 * this.scaleFactor];
        let lookup =  [0, 0, 1];
        ["x", "y", "z"].forEach((dim, i) => {
            if (lookupPoint && lookupPoint.hasOwnProperty(dim)) {
                lookup[i] = lookupPoint[dim];
            }
            if (positionPoint && positionPoint.hasOwnProperty(dim)) {
                position[i] = positionPoint[dim];
            }
        })
        this.camera.position.set(...position);
        this.camera.up.set(...lookup);
        this.camera.updateProjectionMatrix();
    }

    updateGraph(){
        if (this.graph) {
            this.graph.graphData(this._graphData);
        }
    }

    openExternal(resource){
        if (!resource || !this._graphData.localConventions){
            return;
        }
        (resource.external||[]).forEach(external => {
            if (external.fullID) {
                let parts = external.fullID.split(":");
                if (parts.length === 2) {
                    let [prefix, suffix] = parts;
                    let localConvention = this._graphData.localConventions.find(obj => obj.prefix === prefix);
                    if (localConvention) {
                        let url = localConvention.namespace + suffix;
                        window.open(url, '_blank').focus();
                    }
                }
            }
        })
    }

    toggleLockControls(){
        this.lockControls = !this.lockControls;
        this.controls.enabled = !this.lockControls;
    }

    toggleAntialias(){
        this.antialias = !this.antialias;
        this.renderer.antialias = this.antialias;
    }

    getMouseOverEntity() {
        if (!this.graph) { return; }
        this.ray.setFromCamera( this.mouse, this.camera );

        const selectLayer = (entity) => {
            //Refine selection to layers
            if (entity && entity.layers && this._config.layout.showLayers) {
                let layerMeshes = entity.layers.map(layer => layer.viewObjects["main"]);
                let layerIntersects = this.ray.intersectObjects(layerMeshes);
                if (layerIntersects.length > 0) {
                    return selectLayer(layerIntersects[0].object.userData);
                }
            }
            return entity;
        };

        let intersects = this.ray.intersectObjects(this.graph.children);
        if (intersects.length > 0) {
            let entity = intersects[0].object.userData;
            if (!entity || entity.inactive) { return; }
            return selectLayer(entity);
        }
    }

    get highlighted(){
        return this._highlighted;
    }

    get selected(){
        return this._selected;
    }

    highlight(entity, color, rememberColor = true){
        if (!entity || !entity.viewObjects) { return; }
        let obj = entity.viewObjects["main"];
        if (obj && obj.material) {
            // store color of closest object (for later restoration)
            if (rememberColor){
                obj.currentHex = obj.material.color.getHex();
                (obj.children || []).forEach(child => {
                    if (child.material) {
                        child.currentHex = child.material.color.getHex();
                    }
                });
            }
            // set a new color for closest object
            obj.material.color.setHex(color);
            (obj.children || []).forEach(child => {
                if (child.material) {
                    child.material.color.setHex(color);
                }
            });
        }
    }

    unhighlight(entity){
        if (!entity || !entity.viewObjects) { return; }
        let obj = entity.viewObjects["main"];
        if (obj){
            if (obj.material){
                obj.material.color.setHex( obj.currentHex || this.defaultColor);
            }
            (obj.children || []).forEach(child => {
                if (child.material) {
                    child.material.color.setHex(child.currentHex || this.defaultColor);
                }
            })
        }
    }

    selectByName(name) {
        let options = (this.graphData.resources||[]).filter(e => e.name === name);
        if (options.length > 0){
            //prefer visible lyphs over templates
            let res = options.find(e => !e.isTemplate);
            this.selected = res? res: options[0];
        }
        else {
            this.selected = undefined;
        }
    }

    onDblClick() {
        this.selected = this.getMouseOverEntity();
    }

    createEventListeners() {
        window.addEventListener('mousemove', evt => this.onMouseMove(evt), false);
        window.addEventListener('dblclick', () => this.onDblClick(), false );
    }

    onMouseMove(evt) {
        // calculate mouse position in normalized device coordinates
        let rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x =  ( ( evt.clientX - rect.left ) / rect.width  ) * 2 - 1;
        this.mouse.y = -( ( evt.clientY - rect.top  ) / rect.height ) * 2 + 1;
        this.highlighted = this.getMouseOverEntity();
    }

    toggleLayout(prop){
        if (this.graph){ this.graph[prop](this._config.layout[prop]); }
    }

    toggleGroup(group) {
        if (!this._graphData){ return; }
        if (group.hidden){
            group.show();
        } else {
            group.hide();
        }
        if (this.graph) { this.graph.graphData(this.graphData); }
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatSliderModule, MatDialogModule, LogInfoModule, SettingsPanelModule, QuerySelectModule, HotkeyModule.forRoot()],
    declarations: [WebGLSceneComponent],
    entryComponents: [LogInfoDialog, QuerySelectDialog],
    exports: [WebGLSceneComponent]
})
export class WebGLSceneModule {
}
