import {NgModule, Component, ViewChild, ElementRef, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatSliderModule, MatDialog, MatDialogModule} from '@angular/material'
import FileSaver  from 'file-saver';
import {keys, values, defaults, isObject, cloneDeep, isArray} from 'lodash-bound';
import * as THREE from 'three';
import ThreeForceGraph   from '../view/threeForceGraph';
import {forceX, forceY, forceZ} from 'd3-force-3d';

import {LogInfoModule, LogInfoDialog} from "./gui/logInfoDialog";
import {SettingsPanelModule} from "./settingsPanel";

import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {$Field, getNewID} from "../model/utils";
import {QuerySelectModule, QuerySelectDialog} from "./gui/querySelectDialog";

const WindowResize = require('three-window-resize');

/**
 * @ignore
 */
@Component({
    selector: 'webGLScene',
    template: `
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
                        <mat-slider vertical class="w3-grey"
                                    [min]="0.1 * scaleFactor" [max]="0.4 * scaleFactor"
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
                        <button *ngIf="graphData?.logger" class="w3-bar-item w3-hover-light-grey"
                                (click)="showReport()" title="Show logs">
                            <i *ngIf="graphData.logger.status === graphData.logger.statusOptions.ERROR"
                               class="fa fa-exclamation-triangle" style="color:red"> </i>
                            <i *ngIf="graphData.logger.status === graphData.logger.statusOptions.WARNING"
                               class="fa fa-exclamation-triangle" style="color:yellow"> </i>
                            <i *ngIf="graphData.logger.status === graphData.logger.statusOptions.OK"
                               class="fa fa-check-circle" style="color:green"> </i>
                        </button>
                    </section>

                    <!--Main content-->
                    <canvas #canvas> </canvas>
                </section>
            </section>
            <section id="apiLayoutSettingsPanel" *ngIf="showPanel && isConnectivity" class="w3-quarter">
                <settingsPanel
                        [config]="config"
                        [selected]="_selected"
                        [highlighted]="_highlighted"
                        [helperKeys]="_helperKeys"
                        [groups]="graphData?.activeGroups"
                        [scaffolds]="graphData?.scaffolds"
                        [searchOptions]="_searchOptions"
                        (onSelectBySearch)="selectByName($event)"
                        (onEditResource)="editResource.emit($event)"
                        (onUpdateLabels)="graph?.showLabels($event)"
                        (onToggleMode)="graph?.numDimensions($event)"
                        (onToggleLayout)="toggleLayout($event)"
                        (onToggleGroup)="toggleGroup($event)"
                        (onToggleScaffold)="toggleScaffold($event)"
                        (onUpdateLabelContent)="graph?.labels($event)"
                        (onToggleHelperPlane)="this.helpers[$event].visible = !this.helpers[$event].visible"
                > </settingsPanel>
            </section>
        </section> 
    `,
    styles: [` 

        #apiLayoutPanel {
            height: 100vh;
        }
        
        #apiLayoutSettingsPanel{
            height: 100vh;
            overflow-y: scroll;
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

    _highlighted = null;
    _selected    = null;

    _searchOptions;
    _helperKeys = [];

    graph;
    helpers   = {};
    highlightColor = 0xff0000;
    selectColor    = 0x00ff00;
    defaultColor   = 0x000000;
    scaleFactor    = 8; //TODO make this a graph parameter with complete layout update on change
    labelRelSize   = 0.1 * this.scaleFactor;
    lockControls   = false;
    isConnectivity = true;

    @Input() modelClasses;

    @Input('graphData') set graphData(newGraphData) {
        if (this._graphData !== newGraphData) {
            this._graphData = newGraphData;
            let newConfig = (this._graphData.config||{})::defaults(this.defaultConfig);

            //Add to the default set of visible groups groups from given identifiers
            if (!newConfig.showGroups || !newConfig.showGroups::isArray()) { newConfig.showGroups = []; }
            let ids = newConfig.showGroups;
            ids.forEach(id  => {
                let genIDs = (this._graphData.activeGroups || []).filter(g => (g.generatedFrom||{}).id === id);
                if (genIDs){
                    newConfig.showGroups.push(...genIDs);
                }
            });
            this.config = newConfig;

            this._searchOptions = (this._graphData.resources||[]).filter(e => e.name).map(e => e.name);
            this._graphData.showGroups(this.config.showGroups);
            /*Map initial positional constraints to match the scaled image*/
            this._graphData.scale(this.scaleFactor);
            this.selected = null;
            if (this.graph) { this.graph.graphData(this._graphData); }
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

    @Output() editResource = new EventEmitter();

    constructor(dialog: MatDialog) {
        this.dialog = dialog;
        this.defaultConfig = {
            "layout": {
                "showLyphs"       : true,
                "showLayers"      : true,
                "showLyphs3d"     : false,
                "showCoalescences": false,
                "numDimensions"   : 3
            },
            "groups": true,
            "labels": {
                "Wire"  : false,
                "Anchor": false,
                "Node"  : false,
                "Link"  : false,
                "Lyph"  : false,
                "Region": false
            },
            "highlighted": true,
            "selected"   : true
        };
        this.config = this.defaultColor::cloneDeep();
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

        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas.nativeElement});
        this.renderer.setClearColor(0xffffff);

        this.container = document.getElementById('apiLayoutContainer');
        let width = this.container.clientWidth;
        let height = this.container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(70, width / height, 10, 4000);
        this.camera.position.set(200, 0, 100 * this.scaleFactor );
        this.camera.aspect = width / height;
        this.camera.up.set( 0, 0, 1 );
        this.camera.updateProjectionMatrix();

        this.ray = new THREE.Raycaster();
        this.scene = new THREE.Scene();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.controls.minDistance = 10;
        this.controls.maxDistance = 4000 - 100 * this.scaleFactor;

        this.controls.minZoom = 0;
        this.controls.maxZoom = 10;

        this.controls.enablePan = true;

        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI/2;

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


    queryCounter = 0;

    processQuery(){
        let config = {
            parameterValues: [this.selected? (this.selected.externals||[""])[0]: "UBERON:0005453"],
            baseURL : "http://sparc-data.scicrunch.io:9000/scigraph"
        };
        let dialogRef = this.dialog.open(QuerySelectDialog, { width: '75%', data: config });
        dialogRef.afterClosed().subscribe(result => {
            if (result !== undefined){
                this.queryCounter++;
                this.createDynamicGroup(result);
            }
        })
    }

    createDynamicGroup(queryRes){
        let nodeIDs  = (queryRes.nodes||[]).map(r => (r.id||"").substr(r.id.indexOf(":") + 1));
        let linkIDs =  (queryRes.edges||[]).map(r => (r.sub||"").substr(r.sub.indexOf(":") + 1));
        if (this.graphData){
            let nodes  = (this.graphData.nodes||[]).filter(e => nodeIDs.includes(e.id));
            let links = (this.graphData.links||[]).filter(e => linkIDs.includes(e.id));
            if (nodes.length || links.length){
                (links||[]).forEach(lnk => {
                    if (!nodes.find(node => node.id === lnk.source.id)){
                        nodes.push(lnk.source);
                    }
                    if (!nodes.find(node => node.id === lnk.target.id)){
                        nodes.push(lnk.target);
                    }
                });
                //Add new group
                let group = this.modelClasses.Group.fromJSON({
                    "id"   : "query" + this.queryCounter,
                    "name" : "Query response " + this.queryCounter,
                    "nodes": nodes,
                    "links": links
                }, this.modelClasses);
                this.graphData.groups = this.graphData.groups || [];
                this.graphData.groups.push(group);
            }
        }
    }

    exportJSON(){
        if (this._graphData){
            let result = JSON.stringify(this._graphData.toJSON(3, {
                    [$Field.border]: 3,
                    [$Field.borders]: 3,
                    [$Field.villus]: 3,
                    [$Field.scaffolds]: 5
            }), null, 2);
            const blob = new Blob([result], {type: 'application/json'});
            FileSaver.saveAs(blob, this._graphData.id + '-generated.json');
        }
    }

    exportResourceMapLD(){
        if (this._graphData){
            let result = JSON.stringify(this._graphData.entitiesToJSONLD(), null, 2);
            const blob = new Blob([result], {type: 'application/ld+json'});
            FileSaver.saveAs(blob, this._graphData.id + '-resourceMap.jsonld');
        }
    }

    exportResourceMapLDFlat(){
        if (this._graphData){
            let filename = this._graphData.id + '-resourceMap-flattened.jsonld';
            const callback = res => {
                let result = JSON.stringify(res, null, 2);
                const blob = new Blob([result], {type: 'application/ld+json'});
                FileSaver.saveAs(blob, filename);
            };
            this._graphData.entitiesToJSONLDFlat(callback);
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
                FileSaver.saveAs(blob, this._graphData.id + '-log.json');
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
        this.graph = new ThreeForceGraph().graphData(this.graphData);

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
        this.graph.showLabels(this.config["labels"]);
        this.scene.add(this.graph);
    }

    toggleLockControls(){
        this.lockControls = !this.lockControls;
        this.controls.enabled = !this.lockControls;
    }

    getMouseOverEntity() {
        if (!this.graph) { return; }
        this.ray.setFromCamera( this.mouse, this.camera );

        const selectLayer = (entity) => {
            //Refine selection to layers
            if (entity && entity.layers) {
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

    unhighlight(entity){
        if (!entity || !entity.viewObjects) { return; }
        let obj = entity.viewObjects["main"];
        if (obj){
            if (obj.material){
                obj.material.color.setHex( obj.currentHex || this.defaultColor);
            }
            (obj.children || []).filter(child => child.material).forEach(child => {
                child.material.color.setHex( child.currentHex || this.defaultColor);
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
        if (this.graph){ this.graph[prop](this.config.layout[prop]); }
    }

    toggleGroup(showGroups) {
        if (!this._graphData){ return; }
        let ids = [...showGroups].map(g => g.id);
        this._graphData.showGroups(ids);
        if (this.graph) { this.graph.graphData(this.graphData); }
    }

    toggleScaffold(showScaffolds) {
        if (!this._graphData){ return; }
        let ids = [...showScaffolds].map(g => g.id);
        (this._graphData.scaffolds||[]).forEach(g => {
            if (ids.includes(g.id)){
                g.show();
            } else {
                g.hide();
            }
        });
        if (this.graph) { this.graph.graphData(this.graphData); }
    }

}

@NgModule({
    imports: [CommonModule, FormsModule, MatSliderModule, MatDialogModule, LogInfoModule, SettingsPanelModule, QuerySelectModule],
    declarations: [WebGLSceneComponent],
    entryComponents: [LogInfoDialog, QuerySelectDialog],
    exports: [WebGLSceneComponent]
})
export class WebGLSceneModule {
}
