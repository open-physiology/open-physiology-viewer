import {
    NgModule,
    Component,
    ViewChild,
    ElementRef,
    Input,
    Output,
    EventEmitter,
    ChangeDetectionStrategy
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatSliderModule} from '@angular/material/slider';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';

import FileSaver from 'file-saver';
import {keys, values, isObject, cloneDeep, defaults, union} from 'lodash-bound';
import * as THREE from 'three';
import ThreeForceGraph from '../view/threeForceGraph';
import {forceX, forceY, forceZ} from 'd3-force-3d';

import {LogInfoModule, LogInfoDialog} from "./dialogs/logInfoDialog";
import {SettingsPanelModule} from "./settingsPanel";

import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {$Field, $SchemaClass} from "../model";
import {QuerySelectModule, QuerySelectDialog} from "./dialogs/querySelectDialog";
import {HotkeyModule, HotkeysService, Hotkey} from 'angular2-hotkeys';
import {$LogMsg} from "../model/logger";
import {getFullID, VARIANCE_PRESENCE} from "../model/utils";
import {SearchOptions} from "./utils/searchOptions";
import {CoalescenceDialog} from "./dialogs/coalescenceDialog";
import {LyphDialog} from "./dialogs/lyphDialog";
import {ModelToolbarModule} from "./toolbars/modelToolbar";
import {MatSnackBar} from "@angular/material/snack-bar";

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
                    <section style="position:absolute; right:0;">
                        <model-toolbar
                                [showPanel]="showPanel"
                                [showImports]="graphData?.imports"
                                [lockControls]="lockControls"
                                [loggerColor]="loggerColor"
                                [showAssistant]="showAssistant"
                                (onToggleControls)="toggleLockControls()"
                                (onToggleShowPanel)="showPanel = !showPanel"
                                (onResetCamera)="resetCamera()"
                                (onUpdateGraph)="graph?.graphData(graphData)"
                                (onImportExternal)="onImportExternal.emit()"
                                (onProcessQuery)="processQuery()"
                                (onExportResource)="exportResource($event)"
                                (onShowReport)="showReport()"
                                (onToggleAssistant)="onToggleAssistant.emit()"
                        >
                        </model-toolbar>
                        <mat-slider vertical class="w3-grey"
                                    [min]="0.1 * scaleFactor" [max]="0.4 * scaleFactor"
                                    [step]="0.05 * scaleFactor" tickInterval="1"
                                    [value]="labelRelSize" title="Label size"
                                    (change)="onScaleChange($event.value)">
                        </mat-slider>
                    </section>
                </section>
                <canvas #canvas></canvas>
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
                        [searchOptions]="searchOptions"
                        [varianceDisabled]="graphData?.variance"
                        [clade]="graphData?.clade"
                        [clades]="graphData?.clades"
                        [modelId]="graphData?.fullID || graphData?.id"
                        (onSelectBySearch)="selectByName($event)"
                        (onOpenExternal)="openExternal($event)"
                        (onUpdateShowLabels)="graph?.showLabels($event)"
                        (onUpdateLabelContent)="graph?.labels($event)"
                        (onUpdateCoalescenceLayout)="graph?.coalescenceLayout($event)"
                        (onToggleMode)="graph?.numDimensions($event)"
                        (onToggleLayout)="toggleLayout($event)"
                        (onToggleGroup)="toggleGroup($event)"
                        (onToggleHelperPlane)="helpers[$event].visible = !helpers[$event].visible"
                        (onCladeChange)="updateVariance($event)"
                        (onCladeReset)="resetVariance()"
                        (onEditResource)="editResource.emit($event)"
                ></settingsPanel>
            </section>
        </section>
    `,
    styles: [`
        #apiLayoutPanel {
            min-height: 90vh;
            height: 100%;
        }

        #apiLayoutSettingsPanel {
            height: 100%;
            overflow-y: scroll;
            overflow-x: auto;
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
    // Assistant visibility is controlled by parent; propagate to toolbar
    @Input() showAssistant;
    @Output() onToggleAssistant = new EventEmitter();
    scene;
    camera;
    renderer;
    container;
    controls;
    ray;
    mouse;
    windowResize;

    _highlighted = null;
    _selected = null;

    _helperKeys = [];

    searchOptions;
    graph;
    helpers = {};
    highlightColor = 0xff0000;
    selectColor = 0x00ff00;
    defaultColor = 0x000000;
    scaleFactor = 10;
    labelRelSize = 0.1 * this.scaleFactor;
    lockControls = false;
    isConnectivity = true;

    queryCounter = 0;

    @Input() visibleGroups = [];

    @Input() modelClasses;

    @Input('graphData') set graphData(newGraphData) {
        if (this._graphData !== newGraphData) {
            this._graphData = newGraphData;
            this.searchOptions = SearchOptions.all(this._graphData);

            this.selected = null;
            this._graphData.scale(this.scaleFactor);
            if (this._graphData.neurulator) {
                this._graphData.neurulator();
            }
            this.updateGraph();
            this.loggerColor = this._graphData.logger?.color;
        }
    }

    @Input('config') set config(newConfig) {
        this._config = newConfig::defaults(this.defaultConfig);
        this.updateSettings();
    }

    @Input('highlighted') set highlighted(entity) {
        if (this._highlighted === entity) return;
        if (this._highlighted !== this._selected) {
            this.unhighlight(this._highlighted);
        } else {
            this.highlight(this._selected, this.selectColor, false);
        }
        this.highlight(entity, this.highlightColor, entity !== this._selected);
        this._highlighted = entity;
        this.highlightedItemChange.emit(entity);

        if (this.graph) {
            const obj = entity && entity.viewObjects ? entity.viewObjects["main"] : null;
            this.graph.enableDrag = this.lockControls;
            this.graph.select(obj);
        }
    }

    @Input('selected') set selected(entity) {
        if (this.selected === entity) {
            return;
        }
        this.unhighlight(this._selected);
        this.highlight(entity, this.selectColor, entity !== this.highlighted);
        this._selected = entity;
        this.selectedItemChange.emit(entity);
    }

    @Input('showChain') set showChain(obj) {
        if (!obj || !obj.id) return;
        if (this._graphData) {
            let chain = obj;
            if (!obj.class) {
                const fullID = getFullID(this._graphData.namespace, obj.id);
                chain = this._graphData.entitiesByID[fullID];
            }
            (this._graphData.groups || []).forEach(g => g.hide());
            if (chain?.group) {
                chain.group.show();
                (chain.generatedChains || []).forEach(c => {
                    if (c?.group) {
                        c.group.show();
                    }
                });
                this.updateGraph();
            }
        }
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
     * @emits varianceUpdated - Species variance was changed
     * @type {EventEmitter<T> | EventEmitter<any>}
     */
    @Output() varianceUpdated = new EventEmitter();

    /**
     *
     * @emits varianceReset - Species removal of variance
     * @type {EventEmitter<T> | EventEmitter<any>}
     */
    @Output() varianceReset = new EventEmitter();

    /**
     * @emits onImportExternal - import of external models is requested
     * @type {EventEmitter<any>}
     */
    @Output() onImportExternal = new EventEmitter();

    constructor(dialog: MatDialog, hotkeysService: HotkeysService, snackBar: MatSnackBar) {
        this.dialog = dialog;
        this.hotkeysService = hotkeysService;
        this.defaultConfig = {
            layout: {
                showLyphs: true,
                showLayers: true,
                showLyphs3d: false,
                showCoalescences: false,
                numDimensions: 3,
                coalescenceLayout: { startX: -50, baseY: 25, groupYOffset: 5, distance: 5 }
            },
            showLabels: {
                [$SchemaClass.Wire]: false,
                [$SchemaClass.Anchor]: true,
                [$SchemaClass.Node]: false,
                [$SchemaClass.Link]: false,
                [$SchemaClass.Lyph]: false,
                [$SchemaClass.Region]: false
            },
            labels: {
                [$SchemaClass.Wire]: $Field.id,
                [$SchemaClass.Anchor]: $Field.id,
                [$SchemaClass.Node]: $Field.id,
                [$SchemaClass.Link]: $Field.id,
                [$SchemaClass.Lyph]: $Field.id,
                [$SchemaClass.Region]: $Field.id
            },
            groups: true,
            highlighted: true,
            selected: true
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
        this._snackBar = snackBar;
    }

    showError(message) {
        this._snackBar.open(message, "OK", {
            panelClass: ['w3-panel', 'w3-red'],
            duration: 2000
        });
    }

    updateSettings() {
        if (this.graph) {
            this.graph.showLabels(this._config.showLabels);
            this.graph.labels(this._config.labels);
            this._config.layout::keys().forEach(prop => {
                const fn = this.graph && this.graph[prop];
                if (typeof fn === 'function') {
                    fn.call(this.graph, this._config.layout[prop]);
                }
            });
            this.graphData.showGroups(this._graphData.visibleGroups.map(g => g.id));
        }
    }

    onScaleChange(newLabelScale) {
        this.labelRelSize = newLabelScale;
        if (this.graph) {
            this.graph.labelRelSize(this.labelRelSize);
        }
    }

    get graphData() {
        return this._graphData;
    }

    ngAfterViewInit() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas.nativeElement,
            antialias: true,
            alpha: true
        });
        this.renderer.setClearColor(0xffffff, 0.5);

        this.container = document.getElementById('apiLayoutContainer');
        let width = this.container.clientWidth;
        let height = this.container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(70, width / height, 10, 10000);
        this.camera.aspect = width / height;
        this.resetCamera();

        this.ray = new THREE.Raycaster();
        this.scene = new THREE.Scene();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.controls.minDistance = 10;
        this.controls.maxDistance = 10000 - 100 * this.scaleFactor;

        this.controls.minZoom = 0;
        this.controls.maxZoom = 10;

        this.controls.enablePan = true;
        this.controls.minPolparAngle = 0;
        this.controls.maxPolarAngle = Math.PI / 2;
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

    processQuery() {
        const config = {
            parameterValues: [this.selected ? (this.selected.externals || [""])[0] : "UBERON:0005453"],
            baseURL: "http://sparc-data.scicrunch.io:9000/scigraph"
        };
        const dialogRef = this.dialog.open(QuerySelectDialog, {width: '60%', data: config});
        dialogRef.afterClosed().subscribe(result => {
            if (result && result.response) {
                this.queryCounter++;
                const nodeIDs = (result.response.nodes || []).filter(e => (e.id.indexOf(this.graphData.id) > -1)).map(r => (r.id || "").substr(r.id.lastIndexOf("/") + 1));
                const edgeIDs = (result.response.edges || []).filter(e => (e.sub.indexOf(this.graphData.id) > -1)).map(r => (r.sub || "").substr(r.sub.lastIndexOf("/") + 1));
                const nodes = (this.graphData.nodes || []).filter(e => nodeIDs.includes(e.id));
                const links = (this.graphData.links || []).filter(e => edgeIDs.includes(e.id));
                const lyphs = (this.graphData.lyphs || []).filter(e => edgeIDs.includes(e.id));
                if (nodes.length || links.length || lyphs.length) {
                    this.graphData.createDynamicGroup(this.queryCounter, result.query || "?", {
                        nodes,
                        links,
                        lyphs
                    }, this.modelClasses);
                } else {
                    this.graphData.logger.error($LogMsg.GRAPH_QUERY_EMPTY_RES, nodeIDs, edgeIDs);
                }
            }
        })
    }

    exportResource(target) {
        switch (target) {
            case 'json':
                this.exportJSON();
                break;
            case 'mapLD':
                this.exportResourceMapLD();
                break;
            case 'mapLDFlat':
                this.exportResourceMapLDFlat();
                break;
            case 'bond':
                this.exportBondGraph();
                break;
        }
    }

    exportJSON() {
        if (this._graphData) {
            let result = JSON.stringify(this._graphData.toJSON(3, {
                [$Field.border]: 3,
                [$Field.borders]: 3,
                [$Field.villus]: 3,
                [$Field.scaffolds]: 5
            }), null, 2);
            const blob = new Blob([result], {type: 'application/json'});
            FileSaver.saveAs(blob, this._graphData.id + '-generated-' + this._graphData.uuid + '.json');
        }
    }

    exportResourceMapLD() {
        if (this._graphData) {
            const filename = this._graphData.id + '-resourceMap-' + this._graphData.uuid + '.jsonld';
            const result = JSON.stringify(this._graphData.entitiesToJSONLD(), null, 2);
            const blob = new Blob([result], {type: 'application/ld+json'});
            FileSaver.saveAs(blob, filename);
        }
    }

    exportResourceMapLDFlat() {
        if (this._graphData) {
            const filename = this._graphData.id + '-resourceMap-flattened-' + this._graphData.uuid + '.jsonld';
            const callback = res => {
                let result = JSON.stringify(res, null, 2);
                const blob = new Blob([result], {type: 'application/ld+json'});
                FileSaver.saveAs(blob, filename);

            }
            const errorCallBack = err => {
                this.showError("Failed to export flattened JSON-LD!");
            }
            const result = this._graphData.entitiesToJSONLD();
            this._graphData.modelClasses.Graph.entitiesToJSONLDFlat(result, callback, errorCallBack);
        }
    }

    exportBondGraph() {
        if (this._graphData) {
            const structure = this._graphData.generateBondGraph();
            let blob = new Blob([structure], {type: 'text/turtle'});
            // FileSaver.saveAs(blob, this._graphData.id + '-bg-components-' + this._graphData.uuid + '.ttl');
            FileSaver.saveAs(blob, this._graphData.id + '-bg-components.ttl');
        }
    }

    showReport() {
        const dialogRef = this.dialog.open(LogInfoDialog, {
            width: '75%',
            data: this.graphData.logger.print()
        });

        dialogRef.afterClosed().subscribe(res => {
            if (res !== undefined) {
                let result = JSON.stringify(res, null, 2);
                const blob = new Blob([result], {type: 'application/txt'});
                FileSaver.saveAs(blob, this._graphData.id + '-log-' + this._graphData.uuid + '.json');
            }
        });
    }

    resizeToDisplaySize() {
        const delta = 5;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (Math.abs(this.renderer.domElement.width - width) > delta
            || Math.abs(this.renderer.domElement.height - height) > delta) {
            const dimensions = function () {
                return {width, height}
            };
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
        const forceVal = (d, key) => isLayoutDimValid(d.layout, key) ? d.layout[key] : 0;
        const forceStrength = (d, key) => isLayoutDimValid(d.layout, key) ? 1 : 0;

        this.graph.d3Force("x", forceX().x(d => forceVal(d, "x")).strength(d => forceStrength(d, "x")));
        this.graph.d3Force("y", forceY().y(d => forceVal(d, "y")).strength(d => forceStrength(d, "y")));
        this.graph.d3Force("z", forceZ().z(d => forceVal(d, "z")).strength(d => forceStrength(d, "z")));

        this.graph.d3Force("link")
            .distance(d => d.length)
            .strength(d => (d.strength ? d.strength :
                (d.source && d.source.fixed && d.target && d.target.fixed || !d.length) ? 0 : 1));

        this.graph.labelRelSize(this.labelRelSize);
        this.graph.showLabels(this._config.showLabels);
        this.graph.labels(this._config.labels);
        this.scene.add(this.graph);
    }

    moveCamera(direction) {
        const delta = 10;
        switch (direction) {
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

    resetCamera(positionPoint, lookupPoint, targetPoint) {
        let position = [0, -100, 120 * this.scaleFactor];
        let lookup = [0, 0, 1];
        ["x", "y", "z"].forEach((dim, i) => {
            if (lookupPoint && lookupPoint.hasOwnProperty(dim)) {
                lookup[i] = lookupPoint[dim];
            }
            if (positionPoint && positionPoint.hasOwnProperty(dim)) {
                position[i] = positionPoint[dim];
            }
        });
        this.camera.position.set(...position);
        this.camera.up.set(...lookup);

        // If a target is provided, update OrbitControls target and align camera
        if (targetPoint && this.controls && this.controls.target) {
            const target = [this.controls.target.x, this.controls.target.y, this.controls.target.z];
            ["x", "y", "z"].forEach((dim, i) => {
                if (targetPoint.hasOwnProperty(dim)) {
                    target[i] = targetPoint[dim];
                }
            });
            this.controls.target.set(...target);
            this.camera.lookAt(this.controls.target);
            this.controls.update && this.controls.update();
        }

        this.camera.updateProjectionMatrix();
    }

    updateGraph() {
        if (this.graph) {
            this.graph.graphData(this._graphData);
            this.updateSettings();
        }
    }

    openExternal(resource) {
        if (!resource || !this._graphData.localConventions) {
            return;
        }
        (resource.external || []).forEach(external => {
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

    toggleLockControls() {
        this.lockControls = !this.lockControls;
        this.controls.enabled = !this.lockControls;
    }

    getMouseOverEntity() {
        if (!this.graph) return;

        this.ray.setFromCamera(this.mouse, this.camera);

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
            if (!entity || entity.inactive) {
                return;
            }
            return selectLayer(entity);
        }
    }

    get highlighted() {
        return this._highlighted;
    }

    get selected() {
        return this._selected;
    }

    highlight(entity, color, rememberColor = true) {
        if (!entity || !entity.viewObjects) return;
        let obj = entity.viewObjects["main"];
        if (obj && obj.material) {
            // store color of closest object (for later restoration)
            if (rememberColor) {
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

    unhighlight(entity) {
        if (!entity || !entity.viewObjects) {
            return;
        }
        let obj = entity.viewObjects["main"];
        if (obj) {
            if (obj.material) {
                obj.material.color.setHex(obj.currentHex || this.defaultColor);
            }
            (obj.children || []).forEach(child => {
                if (child.material) {
                    child.material.color.setHex(child.currentHex || this.defaultColor);
                }
            })
        }
    }

    selectByName(nodeLabel) {
        if (!nodeLabel) {
            return;
        }
        let nodeID = nodeLabel.substring(
            nodeLabel.indexOf("(") + 1,
            nodeLabel.lastIndexOf(")")
        );
        if (this._graphData && (nodeID !== this.selected?.id)) {
            this.selected = (this._graphData.resources || []).find(e => e.id === nodeID);
        } else {
            this.selected = undefined;
        }
    }

    onDblClick() {
        this.selected = this.getMouseOverEntity();
        if (this.selected instanceof this.modelClasses.Lyph) {
            if (this.selected.inCoalescences?.length > 0) {
                this.selected.inCoalescences.forEach(cls => {
                    if (cls.group) {
                        this.toggleGroup(cls.group);
                    }
                });
            } else {
                const dialogRef = this.dialog.open(LyphDialog, {
                    width: '40%', height: '40%', data: {
                        lyph: this.selected
                    }
                });
            }
        }
        if (this.selected?.representsCoalescence) {
            //Show coalescence dialog
            this.openCoalescenceNodeId = this.selected.id;
            const dialogRef = this.dialog.open(CoalescenceDialog, {
                width: '50%', height: '65%', data: {
                    coalescence: this.selected.representsCoalescence
                }
            });
            dialogRef.afterOpened().subscribe(() => {
                const componentInstance = dialogRef.componentInstance;
                componentInstance.resizeDialog.subscribe((maximize: boolean) => {
                    dialogRef.updateSize(
                        maximize ? '100vw' : '50%',
                        maximize ? '100vh' : '65%'
                    );
                });
            });
            dialogRef.afterClosed().subscribe(() => {
                if (this.openCoalescenceNodeId === (this.selected && this.selected.id)) {
                    this.openCoalescenceNodeId = undefined;
                }
            });
        }
    }

    createEventListeners() {
        window.addEventListener('mousemove', evt => this.onMouseMove(evt), false);
        window.addEventListener('dblclick', () => this.onDblClick(), false);
    }

    openCoalescenceByResourceId(nodeId) {
        if (!nodeId) return;
        const node = (this._graphData?.resources || []).find(e => e.id === nodeId);
        if (!node || !node.representsCoalescence) {
            return;
        }
        this.openCoalescenceNodeId = node.id;
        const dialogRef = this.dialog.open(CoalescenceDialog, {
            width: '50%', height: '65%', data: {
                coalescence: node.representsCoalescence
            }
        });
        dialogRef.afterOpened().subscribe(() => {
            const componentInstance = dialogRef.componentInstance;
            componentInstance.resizeDialog.subscribe((maximize: boolean) => {
                dialogRef.updateSize(
                    maximize ? '100vw' : '50%',
                    maximize ? '100vh' : '65%'
                );
            });
        });
        dialogRef.afterClosed().subscribe(() => {
            if (this.openCoalescenceNodeId === node.id) {
                this.openCoalescenceNodeId = undefined;
            }
        });
    }

    onMouseMove(evt) {
        // calculate mouse position in normalized device coordinates
        let rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        this.highlighted = this.getMouseOverEntity();
    }

    toggleLayout(prop) {
        if (this.graph) {
            const fn = this.graph && this.graph[prop];
            if (typeof fn === 'function') {
                fn.call(this.graph, this._config.layout[prop]);
            }
        }
    }

    toggleGroup(group) {
        if (!group) return;
        if (group.hidden) {
            group.show();
        } else {
            group.hide();
        }
        this.updateGraph();
    }

    resetVariance() {
        delete this._graphData.variance;
        delete this._graphData.clade;
        this.varianceReset.emit();
    }

    updateVariance(clade) {
        //The current model is general, we can alter it without regeneration
        if (this._graphData) {
            //We find the first variance with given clade and presence set to 'absent'
            let variance = (this._graphData.varianceSpecs || []).find(vs =>
                vs.presence && vs.presence === VARIANCE_PRESENCE.ABSENT
                && (vs.clades || []).find(c => c === clade || c.id && c.id === clade));
            if (!variance) {
                return;
            }
            this._graphData.variance = variance;
            this._graphData.clade = clade;

            let relevantLyphs = [];
            (this._graphData.lyphs || []).forEach(lyph => {
                if ((lyph.varianceSpecs || []).find(vs => vs.id === variance.id)) {
                    relevantLyphs.push(lyph);
                }
            });
            let lyphsToRemove = {
                templates: [],
                layers: [],
                lyphs: []
            }
            let removed = [];

            relevantLyphs.forEach(lyph => {
                if (lyph.isTemplate) {
                    lyphsToRemove.templates.push(lyph);
                } else {
                    if (lyph.layerIn) {
                        lyphsToRemove.layers.push(lyph);
                    } else {
                        lyphsToRemove.lyphs.push(lyph);
                    }
                }
            });

            if (lyphsToRemove.templates.length > 0) {
                this.graphData.logger.error($LogMsg.VARIANCE_REMOVED_TEMPLATES, lyphsToRemove.templates.map(e => e.fullID));
            }
            if (lyphsToRemove.layers.length > 0) {
                //There will be  problem as we do not update lyph visuals
                this.graphData.logger.error($LogMsg.VARIANCE_REMOVED_LAYERS, lyphsToRemove.templates.map(e => e.fullID));
            }

            lyphsToRemove.lyphs.forEach(lyph => {
                removed = removed::union(this._graphData.removeLyph(lyph));
            });
            this.graphData.logger.info($LogMsg.VARIANCE_REMOVED_LYPHS, lyphsToRemove.lyphs.map(e => e.fullID));
            this.graphData.logger.info($LogMsg.VARIANCE_ALL_REMOVED_LYPHS, removed.map(e => e.fullID));

            if ((this.scene.children || []).length > 0) {
                removed.forEach(lyph => {
                    (lyph.viewObjects || {})::values().forEach(viewObj => {
                        const object = this.scene.getObjectByProperty('uuid', viewObj.uuid);
                        if (object) {
                            object.visible = false;
                            object.geometry.dispose();
                            object.material.dispose();
                            this.scene.remove(object);
                        } else {
                            this.graphData.logger.error("Failed to locate view object", viewObj.uuid);
                        }
                    });
                });
                this.renderer.dispose();
            }
            this.updateGraph();
            this.varianceUpdated.emit(clade, variance);
        }
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatSliderModule, MatDialogModule, LogInfoModule, SettingsPanelModule, QuerySelectModule,
        ModelToolbarModule, HotkeyModule.forRoot()],
    declarations: [WebGLSceneComponent],
    entryComponents: [LogInfoDialog, QuerySelectDialog, CoalescenceDialog, LyphDialog],
    exports: [WebGLSceneComponent]
})
export class WebGLSceneModule {
}
