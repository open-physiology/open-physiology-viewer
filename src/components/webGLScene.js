import {
    NgModule,
    Component,
    ViewChild,
    ElementRef,
    Input,
    Output,
    EventEmitter,
    ChangeDetectionStrategy,
    NgZone
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

import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {$Field, $SchemaClass, isScaffold, isGraph} from "../model";
import {QuerySelectModule, QuerySelectDialog} from "./dialogs/querySelectDialog";
import {HotkeyModule, HotkeysService, Hotkey} from 'angular2-hotkeys';
import {$LogMsg} from "../model/logger";
import {getFullID, VARIANCE_PRESENCE} from "../model/utils";
import {SearchOptions} from "./utils/searchOptions";
import {CoalescenceDialog} from "./dialogs/coalescenceDialog";
import {SpriteText2D} from "../view/text/spriteText2D";
import {LyphDialog} from "./dialogs/lyphDialog";
import {MaterialTreeDialog, MaterialTreeDialogModule} from "./dialogs/materialTreeDialog";
import {StratificationDialog, StratificationDialogModule} from "./dialogs/stratificationDialog";
import {ModelToolbarModule} from "./toolbars/modelToolbar";
import {MatSnackBar} from "@angular/material/snack-bar";
import {buildTree} from "./structs/materialNode";
import {SettingsPanelGraphModule} from './panels/settingsPanelGraph';
import {SettingsPanelScaffoldModule} from './panels/settingsPanelScaffold';
import {BackgroundToolbarModule} from "./toolbars/backgroundToolbar";
import config from '../data/config.json';

const WindowResize = require('three-window-resize');

/**
 * Google Drive share links (drive.google.com/file/d/<id>/..., drive.google.com/open?id=<id>, uc?id=<id>)
 * do not serve CORS headers, so WebGL cannot use them as textures. Rewrite them to the Drive API
 * download endpoint, which does, authorized with the DRIVE_API_KEY from the environment.
 * @param url - image url
 * @returns {string} url that can be loaded as a cross-origin texture
 */
function toDriveDownloadUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    } catch (e) {
        return url;
    }
    if (parsed.hostname !== "drive.google.com") {
        return url;
    }
    const fileID = (parsed.pathname.match(/\/file\/d\/([^/]+)/) || [])[1] || parsed.searchParams.get("id");
    const apiKey = process.env.DRIVE_API_KEY;
    if (!fileID || !apiKey) {
        console.warn("Cannot convert Google Drive link to a downloadable url (missing file id or DRIVE_API_KEY): ", url);
        return url;
    }
    return `https://www.googleapis.com/drive/v3/files/${fileID}?alt=media&key=${apiKey}`;
}

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
                                [hasImported]="hasImported"
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
                                (onLoadImages)="loadImages($event)"
                        >
                        </model-toolbar>
                        <!--                                (onTestWebGLObjects)="testWebGLObjects()"-->
                        <section class="w3-bar-block vertical-toolbar">
                            <mat-slider
                                    *ngIf="isScaffold && (graphData?.stratifications?.length > 0 || graphData?.stratifiedRegions?.length > 0)"
                                    vertical class="w3-grey"
                                    [min]="0.2" [max]="1.0"
                                    [step]="0.2" tickvInterval="1"
                                    [value]="stratifiedRegionSize" title="Stratified region size"
                                    (change)="onStratifiedRegionSizeChange($event.value)">
                            </mat-slider>
                            <mat-slider vertical class="w3-grey"
                                        [min]="0.1 * scaleFactor" [max]="0.4 * scaleFactor"
                                        [step]="0.05 * scaleFactor" tickInterval="1"
                                        [value]="labelRelSize" title="Label size"
                                        (change)="onScaleChange($event.value)">
                            </mat-slider>
                        </section>
                        <background-toolbar
                                *ngIf="_backgroundMeshes.length"
                                [offsetX]="_backgroundOffsetX"
                                [offsetY]="_backgroundOffsetY"
                                [offsetZ]="_backgroundOffsetZ"
                                [scale]="_backgroundScale"
                                [scaleX]="_backgroundScaleX"
                                [scaleY]="_backgroundScaleY"
                                [rotate]="_backgroundRotate"
                                [flipX]="_backgroundFlipX"
                                [flipY]="_backgroundFlipY"
                                [extent]="viewExtent"
                                (onUpdateOffsetX)="updateBackgroundOffsetX($event)"
                                (onUpdateOffsetY)="updateBackgroundOffsetY($event)"
                                (onUpdateOffsetZ)="updateBackgroundOffsetZ($event)"
                                (onUpdateScale)="updateBackgroundScale($event)"
                                (onUpdateScaleX)="updateBackgroundScaleX($event)"
                                (onUpdateScaleY)="updateBackgroundScaleY($event)"
                                (onUpdateRotate)="updateBackgroundRotate($event)"
                                (onUpdateFlipX)="updateBackgroundFlipX($event)"
                                (onUpdateFlipY)="updateBackgroundFlipY($event)"
                                (onApply)="onBackgroundUpdated.emit($event)"
                        >
                        </background-toolbar>
                    </section>
                </section>
                <div class="scene-tooltips" #auxTips></div>
                <canvas #canvas></canvas>
            </section>
            <section id="apiLayoutSettingsPanel" *ngIf="showPanel" class="w3-quarter">
                <settingsPanelGraph
                        *ngIf="!isScaffold"
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
                        [viewExtent]="viewExtent"
                        (onUpdateViewExtent)="updateViewExtent($event)"
                        (onCladeChange)="updateVariance($event)"
                        (onCladeReset)="resetVariance()"
                        (onEditResource)="editResource.emit($event)"
                ></settingsPanelGraph>
                <settingsPanelScaffold
                        *ngIf="isScaffold"
                        [config]="_config"
                        [selected]="_selected"
                        [highlighted]="_highlighted"
                        [helperKeys]="_helperKeys"
                        [components]="graphData?.components"
                        [searchOptions]="searchOptions"
                        (onSelectBySearch)="selectByName($event)"
                        (onUpdateShowLabels)="graph?.showLabels($event)"
                        (onUpdateLabelContent)="graph?.labels($event)"
                        (onToggleLayout)="toggleLayout($event)"
                        (onToggleComponent)="toggleGroup($event)"
                        (onToggleHelperPlane)="helpers[$event].visible = !helpers[$event].visible"
                        [viewExtent]="viewExtent"
                        (onUpdateViewExtent)="updateViewExtent($event)"
                        (onEditResource)="editResource.emit($event)"
                ></settingsPanelScaffold>
            </section>
    `,
    styles: [`

        .vertical-toolbar {
            width: 48px;
        }

        #apiLayoutPanel {
            min-height: 90vh;
            height: 100%;
        }

        #apiLayoutContainer {
            position: relative;
        }

        #apiLayoutSettingsPanel {
            height: 100%;
            overflow-y: scroll;
            overflow-x: auto;
        }

        .scene-tooltips {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
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
    auxTips = [];
    _auxTipNodes = [];
    @ViewChild('canvas') canvas: ElementRef;
    @ViewChild('auxTips') auxTipsRef: ElementRef;
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
    // Half-size of the scene coordinate system: the viewbox spans [-viewExtent, viewExtent] along each axis
    viewExtent = 100 * this.scaleFactor;
    stratifiedRegionSize = 1.0;
    lockControls = false;
    isConnectivity = true;
    isScaffold = false;

    _backgroundMeshes = [];
    _backgroundsMap = {};
    // Textures downloaded from remote URLs, ordered from least to most recently used
    _remoteBackgroundCache = new Map();
    _remoteBackgroundCacheSize = 5;
    _backgroundRequestId = 0;
    _backgroundScale = 0.6;
    // Stretch factors along x and y applied on top of the uniform background scale
    _backgroundScaleX = 1;
    _backgroundScaleY = 1;
    _backgroundOffsetX = -10;
    _backgroundOffsetY = 195;
    _backgroundOffsetZ = 0;
    _backgroundRotate = 0;
    _backgroundFlipX = false;
    _backgroundFlipY = false;
    _scaffoldCenter = new THREE.Vector2(0, 0);

    queryCounter = 0;

    @Input() visibleGroups = [];

    @Input() modelClasses;

    @Input('graphData') set graphData(newGraphData) {
        if (this._graphData !== newGraphData) {
            this._graphData = newGraphData;
            this.isConnectivity = isGraph(newGraphData);
            this.isScaffold = isScaffold(newGraphData);
            this.searchOptions = SearchOptions.all(this._graphData);

            this.defaultConfig = this.isScaffold ? config.defaultConfig.scaffold : config.defaultConfig.graph;
            this._config = this.defaultConfig::cloneDeep();

            this.selected = null;
            this._graphData.scale(this._graphData.scaleFactor ? this._graphData.scaleFactor : this.scaleFactor);
            // this._graphData.scale(this.scaleFactor);
            if (this._graphData.neurulator) {
                this._graphData.neurulator();
            }
            if (this.isScaffold) {
                this._computeScaffoldCenter();
                this.updateBackground();
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
            let obj = entity && entity.viewObjects ? (entity.viewObjects["main"] || entity.viewObjects["placeholder"]) : null;
            if (obj) {
                obj.class = entity.class;
            }
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

    loadImages(images) {
        this.ngZone.run(() => {
            this._backgroundsMap = images || {};
            this._computeScaffoldCenter();
            this.updateBackground();
        });
    }

    _computeScaffoldCenter() {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        (this._graphData.anchors || []).forEach(a => {
            if (a.layout && a.layout.x !== undefined && a.layout.y !== undefined) {
                sumX += a.layout.x;
                sumY += a.layout.y;
                count++;
            }
        });
        this._scaffoldCenter.x = count > 0 ? sumX / count : 0;
        this._scaffoldCenter.y = count > 0 ? sumY / count : 0;
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
    @Output() onBackgroundUpdated = new EventEmitter();

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
     * @emits stratificationSelected - user selected stratification for a wire
     */
    @Output() stratificationSelected = new EventEmitter();

    /**
     * @emits stratifiedRegionDeleted - user deleted stratification for a wire
     */
    @Output() stratifiedRegionDeleted = new EventEmitter();

    /**
     * @emits onImportExternal - import of external models is requested
     * @type {EventEmitter<any>}
     */
    @Output() onImportExternal = new EventEmitter();

    constructor(dialog: MatDialog, hotkeysService: HotkeysService, snackBar: MatSnackBar, ngZone: NgZone) {
        this.dialog = dialog;
        this.ngZone = ngZone;
        this.hotkeysService = hotkeysService;
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
            let visibleGroups = (this._graphData.visibleGroups || []).map(g => g.id);
            this.graphData.showGroups(visibleGroups);
        }
    }

    onScaleChange(newLabelScale) {
        this.labelRelSize = newLabelScale;
        if (this.graph) {
            this.graph.labelRelSize(this.labelRelSize);
        }
    }

    /**
     * Ratio of the current scene extent to the default one (100 * scaleFactor). Sizes chosen by the user
     * (stratified regions, background images) are relative to the default extent and get multiplied by it.
     */
    get _extentRatio() {
        return this.viewExtent / (100 * this.scaleFactor);
    }

    /**
     * Stratified region size passed to the renderer: the chosen proportion scaled to the scene extent
     */
    get _sceneStratifiedRegionSize() {
        return this.stratifiedRegionSize * this._extentRatio;
    }

    onStratifiedRegionSizeChange(newSize) {
        this.stratifiedRegionSize = newSize;
        if (this.graph) {
            this.graph.stratifiedRegionSize(this._sceneStratifiedRegionSize);
            this.graph.graphData(this.graphData);
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
        this.renderer.setClearColor(0xffffff, 1);

        this.container = document.getElementById('apiLayoutContainer');
        let width = this.container.clientWidth;
        let height = this.container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(70, width / height, 10, 10 * this.viewExtent);
        this.camera.aspect = width / height;
        this.resetCamera();

        this.ray = new THREE.Raycaster();
        this.scene = new THREE.Scene();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.controls.minDistance = 10;
        this.controls.maxDistance = 9 * this.viewExtent;

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
        // Run the Three.js render loop OUTSIDE Angular's zone so that requestAnimationFrame (which
        // zone.js patches) does not trigger Angular change detection on every frame. In-zone rendering
        // causes per-frame change detection and mid-frame DOM mutations that can interact badly with
        // the compositor on macOS/ANGLE. rAF callbacks scheduled here stay outside the zone.
        this.ngZone.runOutsideAngular(() => this.animate());
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

    get hasImported() {
        return (this._graphData?.source?.groups || []).some(g => g.imported) ||
            (this._graphData?.source?.scaffolds || []).some(s => s.imported);
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
        let axisLength = this.viewExtent;

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

    /**
     * Change the size of the scene coordinate system to [-extent, extent]: rescales camera far plane,
     * maximal zoom-out distance and helper grids/axes, then resets the camera to see the whole viewbox.
     * @param extent - half-size of the viewbox
     */
    updateViewExtent(extent) {
        if (!extent || extent <= 0 || extent === this.viewExtent) {
            return;
        }
        this.viewExtent = extent;
        this.camera.far = 10 * extent;
        this.controls.maxDistance = 9 * extent;

        // Rebuild helpers preserving their visibility
        const visible = {};
        this.helpers::keys().forEach(key => {
            const helper = this.helpers[key];
            visible[key] = helper.visible;
            this.scene.remove(helper);
            helper.geometry.dispose();
            (Array.isArray(helper.material) ? helper.material : [helper.material]).forEach(m => m.dispose());
        });
        const helperKeys = this._helperKeys;
        this.helpers = {};
        this.createHelpers();
        this.helpers::keys().forEach(key => this.helpers[key].visible = !!visible[key]);
        // Keep the same keys array so that settings panels do not reset helper toggles
        this._helperKeys = helperKeys;

        this._backgroundMeshes.forEach(mesh => this._applyBackgroundScale(mesh));
        if (this.graph) {
            this.graph.stratifiedRegionSize(this._sceneStratifiedRegionSize);
            this.graph.graphData(this.graphData);
        }
        this.resetCamera();
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
        this.graph.stratifiedRegionSize(this._sceneStratifiedRegionSize);
        this.graph.showLabels(this._config.showLabels);
        this.graph.labels(this._config.labels);
        this.scene.add(this.graph);
    }

    moveCamera(direction) {
        const delta = this.viewExtent / 100;
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
        let position = [0, -100, 1.2 * this.viewExtent];
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
        if (this.isScaffold) {
            this.updateBackground();
        }
    }

    /**
     * Background position parameters (offset, scale, rotation) are defined once on the main
     * scaffold component and shared by all background images.
     * @returns the shared background parameters object or undefined
     */
    _getBackgroundParams() {
        return this._graphData?.backgroundParams;
    }

    /**
     * Get the shared background parameters, creating the container on the main scaffold if needed.
     * @returns the shared background parameters object or undefined when there is no scaffold
     */
    _ensureBackgroundParams() {
        if (!this._graphData) { return undefined; }
        if (!this._graphData.backgroundParams) {
            this._graphData.backgroundParams = {};
        }
        return this._graphData.backgroundParams;
    }

    /**
     * Remove all background image meshes from the scene and dispose their resources.
     */
    _removeBackgrounds() {
        const cachedTextures = new Set(this._remoteBackgroundCache.values());
        (this._backgroundMeshes || []).forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            // Remote textures stay in the cache for reuse when the user toggles components back
            if (mesh.material.map && !cachedTextures.has(mesh.material.map)) {
                mesh.material.map.dispose();
            }
            mesh.material.dispose();
        });
        this._backgroundMeshes = [];
    }

    /**
     * Load a background image texture. Images loaded from a local folder (matched by path) take
     * precedence; otherwise the image is downloaded from the remote url of the external resource.
     * Up to _remoteBackgroundCacheSize downloaded textures are cached, evicting the least recently used one.
     * @param background - external resource describing the background image
     * @param onLoad     - callback receiving the loaded texture
     */
    _loadBackgroundTexture(background, onLoad) {
        const pathContent = background.path && this._backgroundsMap[background.path];
        if (pathContent) {
            new THREE.TextureLoader().load(pathContent, onLoad);
            return;
        }
        const url = background.url;
        if (!url) {
            console.warn("Background image is neither loaded from a local folder nor has a remote url: ",
                background.path || background.fullID || background.id);
            return;
        }
        const cached = this._remoteBackgroundCache.get(url);
        if (cached) {
            // Re-insert to mark the texture as most recently used
            this._remoteBackgroundCache.delete(url);
            this._remoteBackgroundCache.set(url, cached);
            onLoad(cached);
            return;
        }
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(toDriveDownloadUrl(url), (texture) => {
            this._remoteBackgroundCache.set(url, texture);
            if (this._remoteBackgroundCache.size > this._remoteBackgroundCacheSize) {
                const [lruUrl, lruTexture] = this._remoteBackgroundCache.entries().next().value;
                this._remoteBackgroundCache.delete(lruUrl);
                if (!this._backgroundMeshes.some(mesh => mesh.material.map === lruTexture)) {
                    lruTexture.dispose();
                }
            }
            onLoad(texture);
        }, undefined, (err) => console.error("Failed to download background image: ", url, err));
    }

    updateBackgroundOffsetX(value) {
        this._backgroundOffsetX = value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.offsetX = value;
        }
        this._backgroundMeshes.forEach(mesh => {
            mesh.position.x = this._scaffoldCenter.x + (this._backgroundOffsetX || 0);
        });
    }

    updateBackgroundOffsetY(value) {
        this._backgroundOffsetY = value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.offsetY = value;
        }
        this._backgroundMeshes.forEach(mesh => {
            mesh.position.y = this._scaffoldCenter.y + (this._backgroundOffsetY || 0);
        });
    }

    /**
     * Background scale is stored relative to the default scene extent (see _extentRatio), so images
     * grow with the scene: e.g., changing the extent from 1000 to 10000 makes them 10 times larger.
     * @param mesh - background image mesh
     */
    _applyBackgroundScale(mesh) {
        const scale = this._backgroundScale * this._extentRatio;
        // Negative scale mirrors the image (material is double-sided, so it stays visible)
        const scaleX = scale * (this._backgroundScaleX || 1);
        const scaleY = scale * (this._backgroundScaleY || 1);
        mesh.scale.set(this._backgroundFlipX ? -scaleX : scaleX, this._backgroundFlipY ? -scaleY : scaleY, 1);
    }

    updateBackgroundScale(value) {
        this._backgroundScale = value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.scale = value;
        }
        this._backgroundMeshes.forEach(mesh => {
            this._applyBackgroundScale(mesh);
        });
    }

    updateBackgroundScaleX(value) {
        this._backgroundScaleX = value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.scaleX = value;
        }
        this._backgroundMeshes.forEach(mesh => this._applyBackgroundScale(mesh));
    }

    updateBackgroundScaleY(value) {
        this._backgroundScaleY = value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.scaleY = value;
        }
        this._backgroundMeshes.forEach(mesh => this._applyBackgroundScale(mesh));
    }

    updateBackgroundFlipX(value) {
        this._backgroundFlipX = !!value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.flipX = this._backgroundFlipX;
        }
        this._backgroundMeshes.forEach(mesh => this._applyBackgroundScale(mesh));
    }

    updateBackgroundFlipY(value) {
        this._backgroundFlipY = !!value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.flipY = this._backgroundFlipY;
        }
        this._backgroundMeshes.forEach(mesh => this._applyBackgroundScale(mesh));
    }

    updateBackgroundRotate(value) {
        this._backgroundRotate = value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.rotate = value;
        }
        this._backgroundMeshes.forEach(mesh => {
            mesh.rotation.z = this._backgroundRotate;
        });
    }

    updateBackgroundOffsetZ(value) {
        this._backgroundOffsetZ = value;
        const params = this._ensureBackgroundParams();
        if (params) {
            params.offsetZ = value;
        }
        this._backgroundMeshes.forEach(mesh => {
            const visibleComponents = (this._graphData.components || [])
                .filter(c => (c.class === $SchemaClass.Scaffold || c.class === $SchemaClass.Component) && !c.hidden);
            if (visibleComponents.length === 1) {
                const z = visibleComponents[0].getZ || 0;
                mesh.position.z = z + (this._backgroundOffsetZ || 0);
            }
        });
    }

    updateBackground() {
        if (!this.scene) return;

        const scaffold = this._graphData;
        const params = this._getBackgroundParams();

        // Position parameters are defined once on the main scaffold and shared by all images
        this.ngZone.run(() => {
            if (params) {
                if (params.offsetX  !== undefined) { this._backgroundOffsetX = params.offsetX; }
                if (params.offsetY  !== undefined) { this._backgroundOffsetY = params.offsetY; }
                if (params.offsetZ  !== undefined) { this._backgroundOffsetZ = params.offsetZ; }
                if (params.scale    !== undefined) { this._backgroundScale   = params.scale; }
                if (params.scaleX   !== undefined) { this._backgroundScaleX  = params.scaleX; }
                if (params.scaleY   !== undefined) { this._backgroundScaleY  = params.scaleY; }
                if (params.rotate   !== undefined) { this._backgroundRotate  = params.rotate; }
                if (params.flipX    !== undefined) { this._backgroundFlipX   = !!params.flipX; }
                if (params.flipY    !== undefined) { this._backgroundFlipY   = !!params.flipY; }
            }

            this._removeBackgrounds();
            // Ignore textures that arrive after the background has been updated again
            const requestId = ++this._backgroundRequestId;

            if (!scaffold || !this._config.layout.showBackground) { return; }

            // A background image is shown only when exactly one of the scaffold's components is visible
            const visibleComponents = (scaffold.components || [])
                .filter(c => (c.class === $SchemaClass.Scaffold || c.class === $SchemaClass.Component) && !c.hidden);
            if (visibleComponents.length !== 1) { return; }

            // Render the background image of that single visible component
            const components = visibleComponents.filter(c => c.background);
            if (components.length === 0) { return; }

            const z = visibleComponents[0].getZ || 0;

            components.forEach(component => {
                this._loadBackgroundTexture(component.background, (texture) => {
                    if (requestId !== this._backgroundRequestId) {
                        if (![...this._remoteBackgroundCache.values()].includes(texture)) {
                            texture.dispose();
                        }
                        return;
                    }
                    this.ngZone.run(() => {
                        const image = texture.image;
                        if (!image.width || !image.height) {
                            console.warn("Image dimensions not available immediately", image);
                        }
                        // Geometry uses the natural image size; scale is applied via mesh.scale
                        // so scale changes are cheap (no geometry rebuild / texture reload)
                        const geometry = new THREE.PlaneGeometry(image.width, image.height);
                        const material = new THREE.MeshBasicMaterial({
                            map: texture,
                            transparent: true,
                            side: THREE.DoubleSide,
                            depthWrite: false
                        });
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.renderOrder = -100;
                        this._applyBackgroundScale(mesh);
                        mesh.position.z = z + (this._backgroundOffsetZ || 0);
                        mesh.position.x = this._scaffoldCenter.x + (this._backgroundOffsetX || 0);
                        mesh.position.y = this._scaffoldCenter.y + (this._backgroundOffsetY || 0);
                        if (this._backgroundRotate) {
                            mesh.rotation.z = this._backgroundRotate;
                        }
                        this._backgroundMeshes.push(mesh);
                        this.scene.add(mesh);
                        if (this.graph) {
                            this.graph.tickFrame();
                        }
                    });
                });
            });
        });
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

    _clearAuxTips() {
        this.auxTips = [];
        this._auxTipNodes = [];
        const container = this.auxTipsRef && this.auxTipsRef.nativeElement;
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    }

    _setAuxTipsForCoalescence(node) {
        if (!node || !node.representsCoalescence) return;
        const container = this.auxTipsRef && this.auxTipsRef.nativeElement;
        if (!container) return;
        this._clearAuxTips();
        const width = this.renderer.domElement.clientWidth;
        const height = this.renderer.domElement.clientHeight;
        const links = node.getIncidentLinks ? (node.getIncidentLinks() || []) : [];

        let prevY = 0;
        links.forEach((link) => {
            let lyph = link.target.internalIn;
            if (!lyph) return;
            const div = document.createElement('div');
            div.className = 'aux-tip';
            div.textContent = lyph.name || lyph.id;
            //div.style.position = 'absolute';

            const W = new THREE.Vector3(link.target.x, link.target.y, link.target.z);
            const w = W.project(this.camera); // now x,y,z ∈ [-1,1]
            const x = (w.x * 0.5 + 0.5) * width;
            const sign = (link.target.y > node.y) ? 1 : -1;
            const delta = 20;
            let y = (1 - (w.y * 0.5 + 0.5)) * height - delta * sign;
            if (Math.abs(prevY - y) < 5) y -= delta * sign;
            prevY = y;

            div.style.left = x + 'px';
            div.style.top = y + 'px';
            container.appendChild(div);

            this.auxTips.push({div, node: lyph});
        });
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

        let intersects = this.ray.intersectObjects(this.graph.children, true);
        if (intersects.length > 0) {
            let hit = intersects[0].object;
            let entity = hit.userData;
            if (entity && entity.host && entity.stratum) {
                // If it's a stratum, return the stratum object but make sure it has viewObjects
                // Actually, the strata view objects are the meshes themselves.
                // We can return hit.userData, but it needs to behave like a Resource
                if (!entity.viewObjects) {
                    entity.viewObjects = {"main": hit};
                }
            } else if (hit.userData && hit.userData.class === $SchemaClass.Wire && hit !== hit.userData.viewObjects?.["main"]) {
                // If hit a placeholder of a wire, we return the wire entity
                entity = hit.userData;
                // Add a flag to indicate it's a placeholder if needed for tooltip or highlighting
                entity.__hitPlaceholder = true;
            }
            if (!entity || (entity.class !== $SchemaClass.Chain && entity.inactive)) {
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
        if (!entity) return;
        let obj = entity.viewObjects ? entity.viewObjects["main"] : null;
        let placeholder = entity.viewObjects ? entity.viewObjects["placeholder"] : null;

        if (obj && obj.material) {
            // store color of the closest object (for later restoration)
            if (rememberColor) {
                obj.currentHex = obj.material.color.getHex();
                (obj.children || []).forEach(child => {
                    if (child.material) {
                        child.currentHex = child.material.color.getHex();
                    }
                });
                if (placeholder && placeholder.material) {
                    placeholder.currentHex = placeholder.material.color.getHex();
                }
            }
            // set a new color for the closest object
            obj.material.color.setHex(color);
            (obj.children || []).forEach(child => {
                if (child.material) {
                    child.material.color.setHex(color);
                }
            });
            if (placeholder && placeholder.material) {
                placeholder.material.color.setHex(color);
            }

            this._highlightCoalescenceLinks(entity, color);
            if (entity?.representsCoalescence) {
                this._setAuxTipsForCoalescence(entity);
            }
        } else if (placeholder && placeholder.material) {
            if (rememberColor) {
                placeholder.currentHex = placeholder.material.color.getHex();
            }
            placeholder.material.color.setHex(color);
        }
    }

    unhighlight(entity) {
        if (!entity || !entity.viewObjects) {
            return;
        }
        let obj = entity.viewObjects["main"];
        let placeholder = entity.viewObjects["placeholder"];
        if (obj) {
            if (obj.material) {
                obj.material.color.setHex(obj.currentHex || this.defaultColor);
            }
            (obj.children || []).forEach(child => {
                if (child.material) {
                    child.material.color.setHex(child.currentHex || this.defaultColor);
                }
            });
            if (placeholder && placeholder.material) {
                placeholder.material.color.setHex(placeholder.currentHex || this.defaultColor);
            }
            this._unhighlightCoalescenceLinks(entity);
            if (entity?.representsCoalescence) {
                this._clearAuxTips();
            }
        } else if (placeholder && placeholder.material) {
            placeholder.material.color.setHex(placeholder.currentHex || this.defaultColor);
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

    onClick(evt) {
        if (evt.ctrlKey) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
            this.ray.setFromCamera(this.mouse, this.camera);
            const entity = this.getMouseOverEntity();
            if (entity) {
                const stratifiedRegion = entity.host || (entity instanceof this.modelClasses.StratifiedRegion ? entity : null);
                if (stratifiedRegion && stratifiedRegion instanceof this.modelClasses.StratifiedRegion) {
                    stratifiedRegion.reversed = !stratifiedRegion.reversed;
                    this.updateGraph();
                }
            }
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
                if (this.selected.layers?.length > 0) {
                    this.dialog.open(LyphDialog, {
                        width: '40%', height: '40%', data: {
                            lyph: this.selected
                        }
                    });
                }
            }
            // Show material hierarchy dialog for lyph materials
            if (this.selected.materials?.length > 0) {
                const entitiesByID = this._graphData?.entitiesByID || {};
                const roots = (this.selected.materials || [])
                    .map(m => buildTree(entitiesByID, m, true, true))
                    .filter(x => x);
                this.openMaterialTreeLyphId = this.selected.id;
                const dialogRef = this.dialog.open(MaterialTreeDialog, {
                    width: '80vw', maxWidth: '95vw', data: {
                        title: `Materials of ${this.selected.name || this.selected.id}`,
                        roots
                    }
                });
                this._materialTreeDialogRef = dialogRef;
                dialogRef.afterClosed().subscribe(() => {
                    if (this.openMaterialTreeLyphId === (this.selected && this.selected.id)) {
                        this.openMaterialTreeLyphId = undefined;
                    }
                    this._materialTreeDialogRef = undefined;
                });
            }

        }
        if (this.selected?.representsCoalescence) {
            //Show coalescence dialog
            this.openCoalescenceNodeId = this.selected.id;
            const dialogRef = this.dialog.open(CoalescenceDialog, {
                width: '60vw', height: '80vh', data: {
                    coalescence: this.selected.representsCoalescence
                }
            });
            this._coalescenceDialogRef = dialogRef;
            dialogRef.afterOpened().subscribe(() => {
                const componentInstance = dialogRef.componentInstance;
                componentInstance.resizeDialog.subscribe((maximize: boolean) => {
                    dialogRef.updateSize(
                        maximize ? '95vw' : '60vw',
                        maximize ? '95vh' : '80vh'
                    );
                });
            });
            dialogRef.afterClosed().subscribe(() => {
                if (this.openCoalescenceNodeId === (this.selected && this.selected.id)) {
                    this.openCoalescenceNodeId = undefined;
                }
                this._coalescenceDialogRef = undefined;
            });
        }
    }

    createEventListeners() {
        window.addEventListener('mousemove', evt => this.onMouseMove(evt), false);
        window.addEventListener('click', evt => this.onClick(evt), false);
        window.addEventListener('dblclick', () => this.onDblClick(), false);
        window.addEventListener('contextmenu', evt => this.onContextMenu(evt), false);
    }

    _unhighlightCoalescenceLinks(node) {
        if (node?.representsCoalescence) {
            let links = node.getIncidentLinks() || [];
            links.forEach(entity => {
                const color = entity.color || node.color;
                const hexColor = parseInt(color.slice(1), 16);
                this.highlight(entity, hexColor, false);
            });
        }
    }

    _highlightCoalescenceLinks(node, color) {
        if (node?.representsCoalescence) {
            let links = node.getIncidentLinks() || [];
            links.forEach(entity => {
                this.highlight(entity, color, true);
            });
        }
    }

    openCoalescenceByResourceId(nodeId) {
        if (!nodeId) return;
        const node = (this._graphData?.resources || []).find(e => e.id === nodeId);
        if (!node || !node.representsCoalescence) {
            return;
        }
        this.openCoalescenceNodeId = node.id;
        const dialogRef = this.dialog.open(CoalescenceDialog, {
            width: '60vw', height: '80vh', data: {
                coalescence: node.representsCoalescence
            }
        });
        this._coalescenceDialogRef = dialogRef;
        dialogRef.afterOpened().subscribe(() => {
            const componentInstance = dialogRef.componentInstance;
            componentInstance.resizeDialog.subscribe((maximize: boolean) => {
                dialogRef.updateSize(
                    maximize ? '95vw' : '60vw',
                    maximize ? '95vh' : '80vh'
                );
            });
        });
        dialogRef.afterClosed().subscribe(() => {
            if (this.openCoalescenceNodeId === node.id) {
                this.openCoalescenceNodeId = undefined;
            }
        });
    }

    closeCoalescenceDialog() {
        if (this._coalescenceDialogRef) {
            try {
                this._coalescenceDialogRef.close();
            } catch (e) { /* ignore */
            }
            this._coalescenceDialogRef = undefined;
        }
        this.openCoalescenceNodeId = undefined;
    }

    openMaterialTreeByLyphId(lyphId) {
        if (!lyphId) return;
        const lyph = (this._graphData?.lyphs || []).find(e => e.id === lyphId);
        if (!lyph) return;
        const entitiesByID = this._graphData?.entitiesByID || {};
        const roots = (lyph.materials || [])
            .map(m => buildTree(entitiesByID, m, true, true))
            .filter(x => x);
        this.openMaterialTreeLyphId = lyph.id;
        const dialogRef = this.dialog.open(MaterialTreeDialog, {
            width: '80vw', maxWidth: '95vw', data: {
                title: `Materials of ${lyph.name || lyph.id}`,
                roots
            }
        });
        this._materialTreeDialogRef = dialogRef;
        dialogRef.afterClosed().subscribe(() => {
            if (this.openMaterialTreeLyphId === lyph.id) {
                this.openMaterialTreeLyphId = undefined;
            }
            this._materialTreeDialogRef = undefined;
        });
    }

    closeMaterialTreeDialog() {
        if (this._materialTreeDialogRef) {
            try {
                this._materialTreeDialogRef.close();
            } catch (e) { /* ignore */
            }
            this._materialTreeDialogRef = undefined;
        }
        this.openMaterialTreeLyphId = undefined;
    }

    removeViewObjects(removed) {
        const dispose = (object) => {
            if (!object) return;
            object.visible = false;
            if (object.children) {
                object.children.forEach(child => dispose(child));
            }
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        };

        if ((this.scene.children || []).length > 0) {
            (removed || []).forEach(res => {
                (res.viewObjects || {})::values().forEach(viewObj => {
                    const object = this.scene.getObjectByProperty('uuid', viewObj.uuid);
                    if (object) {
                        dispose(object);
                        if (object.parent) {
                            object.parent.remove(object);
                        } else {
                            this.scene.remove(object);
                        }
                    } else {
                        this.graphData.logger.error("Failed to locate view object", viewObj.uuid);
                    }
                });
            });
        }
    }

    /**
     * Find the wire (and its stratified region) a stratum rectangle belongs to
     * @param stratumEntity - user data of a stratum rectangle, {host, stratum, viewObjects}
     * @returns {{wire, region}}
     */
    locateStratifiedWire(stratumEntity) {
        const {StratifiedRegion, Wire} = this.modelClasses;
        // Rectangles are children of the group created for the stratified region
        const group = stratumEntity.viewObjects?.["main"]?.parent;
        let region = stratumEntity.host instanceof StratifiedRegion ? stratumEntity.host
            : (group?.userData instanceof StratifiedRegion ? group.userData : undefined);

        let wire = region?.axisWire instanceof Wire ? region.axisWire : undefined;
        if (!wire) {
            const wires = (this._graphData?.entitiesByID || {})::values().filter(e => e instanceof Wire);
            wire = wires.find(w => w.stratifiedRegion && (
                (region && (w.stratifiedRegion === region || w.stratifiedRegion === region.id)) ||
                (group && (w.viewObjects?.['icon'] === group || w.stratifiedRegion.viewObjects?.["main"] === group))
            ));
        }
        if (!region && wire?.stratifiedRegion instanceof StratifiedRegion) {
            region = wire.stratifiedRegion;
        }
        return {wire, region};
    }

    onContextMenu(evt) {
        // Right-click handler: open stratification selection for a wire/placeholder
        evt.preventDefault && evt.preventDefault();
        if (!this.graph) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse = this.mouse || new THREE.Vector2(0, 0);
        this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

        this.ray.setFromCamera(this.mouse, this.camera);
        const entity = this.getMouseOverEntity();
        if (!entity) {
            return;
        }

        if (entity.host && entity.stratum) {
            // Stratum rectangles are not ApiNATOMY resources: locate the wire they are drawn on
            const {wire, region} = this.locateStratifiedWire(entity);
            if (!wire) {
                this.graphData?.logger?.error("Failed to locate the wire for the selected stratum");
                return;
            }
            const candidates = (this._graphData?.stratifications || []);
            const current = region?.supertype;
            const dialogRef = this.dialog.open(StratificationDialog, {
                width: '60%', data: {
                    stratifications: candidates,
                    selectedID: current?.id || current,
                    reversed: !!(region?.reversed || wire.reversed),
                    allowRemove: true
                }
            });
            dialogRef.afterClosed().subscribe(res => {
                if (!res) { return; }
                if (region) {
                    // Make sure the model update can reach the wire even if the reference is not resolved
                    region.axisWire = wire;
                    this.removeViewObjects([region]);
                    delete wire.viewObjects['icon'];
                    delete wire.viewObjects['iconLabel'];
                    this.stratifiedRegionDeleted.emit({stratifiedRegion: region});
                }
                if (res.remove) {
                    this.updateGraph();
                    return;
                }
                this.stratificationSelected.emit({
                    wire: wire,
                    stratification: res.stratification,
                    reversed: res.reversed,
                    callback: (st) => this.graph.addStratifiedRegion(st)
                });
            });
            return;
        }

        // Check if the entity is a Wire (or placeholder userData points to Wire)
        if (entity instanceof this.modelClasses.Wire) {
            const candidates = (this._graphData?.stratifications || []);
            const dialogRef = this.dialog.open(StratificationDialog, {
                width: '60%', data: {stratifications: candidates}
            });
            dialogRef.afterClosed().subscribe(res => {
                if (res) {
                    // Emit selection back to parent/consumers
                    this.stratificationSelected.emit({
                        wire: entity,
                        stratification: res.stratification,
                        reversed: res.reversed,
                        callback: (st) => this.graph.addStratifiedRegion(st)
                    });
                }
            });
        }
    }

    onMouseMove(evt) {
        let rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        const entity = this.getMouseOverEntity();
        if (entity && entity.__hitPlaceholder) {
            delete entity.__hitPlaceholder;
            this.highlighted = entity;
        } else {
            this.highlighted = entity;
        }
    }

    toggleLayout(prop) {
        if (this.graph) {
            const fn = this.graph && this.graph[prop];
            if (typeof fn === 'function') {
                fn.call(this.graph, this._config.layout[prop]);
            }
        }
        if (prop === 'showBackground') {
            this.updateBackground();
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
        if (this.isScaffold) {
            this.updateBackground();
        }
    }

    resetVariance() {
        delete this._graphData.variance;
        delete this._graphData.clade;
        this.varianceReset.emit();
    }

    updateVariance(clade) {
        //The current model is general, we can alter it without regeneration
        if (this._graphData) {
            //We find the first variance with a given clade and presence set to 'absent'
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

            this.removeViewObjects(removed);

            this.updateGraph();
            this.varianceUpdated.emit(clade, variance);
        }
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatSliderModule, MatDialogModule, LogInfoModule,
        SettingsPanelGraphModule, SettingsPanelScaffoldModule, QuerySelectModule, BackgroundToolbarModule,
        ModelToolbarModule, MaterialTreeDialogModule, StratificationDialogModule, HotkeyModule.forRoot()],
    declarations: [WebGLSceneComponent],
    entryComponents: [LogInfoDialog, QuerySelectDialog, CoalescenceDialog, LyphDialog, MaterialTreeDialog, StratificationDialog],
    exports: [WebGLSceneComponent]
})
export class WebGLSceneModule {
}
