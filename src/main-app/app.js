import {NgModule, Component, ViewChild, ElementRef, ErrorHandler, ChangeDetectionStrategy} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {merge} from 'lodash-bound';

import {MatDialogModule, MatDialog} from '@angular/material/dialog';
import {MatTabsModule} from '@angular/material/tabs';
import {MatListModule} from '@angular/material/list'
import {MatFormFieldModule} from '@angular/material/form-field';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

import JSONEditor from "jsoneditor/dist/jsoneditor.min.js";

import {MainToolbarModule} from "../components/toolbars/mainToolbar";
import {SnapshotToolbarModule} from "../components/toolbars/snapshotToolbar";
import {StateToolbarModule} from "../components/toolbars/stateToolbar";
// import {LayoutEditorModule} from "../components/layoutEditor";
import {RelGraphModule} from "../components/relationGraph";
import {ModelRepoPanelModule} from "../components/modelRepoPanel";
import {GlobalErrorHandler} from '../services/errorHandler';
import {AppCommon} from '../components/appCommon';

import {
    schema,
    generateFromJSON,
    $SchemaClass
} from '../model/index';

import 'hammerjs';

import "./styles/material.scss";
import 'jsoneditor/dist/jsoneditor.min.css';
import "@fortawesome/fontawesome-free/js/all.js";
import "@fortawesome/fontawesome-free/css/all.css";
import "@fortawesome/fontawesome-free/js/v4-shims";
import "@fortawesome/fontawesome-free/css/v4-shims.css";

import {$Field} from "../model";
import {logger} from "../model/logger";
import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {ImportDialog} from "../components/dialogs/importDialog";
import {WebGLSceneModule} from '../components/webGLScene';
import {enableProdMode} from '@angular/core';

import {MaterialEditorModule} from "../components/editors/materialEditor";
import {LyphEditorModule} from "../components/editors/lyphEditor";
import {ChainEditorModule} from "../components/editors/chainEditor";
import {CoalescenceEditorModule} from "../components/editors/coalescenceEditor";
import {AssistantPanelModule} from "../components/assistantPanel";
import {MaterialEditorComponent} from "../components/editors/materialEditor";
import {LyphEditorComponent} from "../components/editors/lyphEditor";
import {ChainEditorComponent} from "../components/editors/chainEditor";
import {CoalescenceEditorComponent} from "../components/editors/coalescenceEditor";
import {HttpClient, HttpClientModule} from '@angular/common/http';

enableProdMode();

const ace = require('ace-builds');

const TAB_INDEX = {
    viewer: 0,
    relation: 1,
    code: 2,
    material: 3,
    lyph: 4,
    chain: 5,
    coalescence: 6
}

@Component({
    selector: 'main-app',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `

        <!-- Header -->

        <header class="w3-bar w3-top w3-dark-grey" style="z-index:10;">
            <span class="w3-bar-item"><i class="fa fa-heartbeat w3-margin-right"> </i>ApiNATOMY
			</span>
            <span class="w3-bar-item" title="About ApiNATOMY">
				<a href="https://youtu.be/XZjldom8CQM"><i class="fa fa-youtube"> </i></a>
			</span>
            <span class="w3-bar-item" title="Source code">
				<a href="https://github.com/open-physiology/open-physiology-viewer"><i class="fa fa-github"> </i></a>
			</span>
            <span *ngIf="version" class="w3-bar-item w3-right">{{ version }}</span>
            <span class="w3-bar-item">
                Model: {{ _modelName }}
            </span>
            <span *ngIf="_snapshot" class="w3-bar-item">
                Snapshot model: {{ _snapshot.name }}
            </span>
            <snapshot-toolbar id="snapshot-toolbar"
                              (onCreateSnapshot)="createSnapshot()"
                              (onLoadSnapshot)="loadSnapshot($event)"
                              (onSaveSnapshot)="saveSnapshot()"
            >
            </snapshot-toolbar>
            <state-toolbar id="state-toolbar"
                           [activeIndex]="_snapshot?.activeIndex"
                           [total]="_snapshot?.length || 0"
                           [unsavedState]="!!_unsavedState"
                           (onPreviousState)="previousState()"
                           (onNextState)="nextState()"
                           (onAddState)="saveState()"
                           (onDeleteState)="removeState()"
                           (onHomeState)="homeState()"
            >
            </state-toolbar>
            <span class="w3-bar-item w3-right" title="ApiNATOMY">
				<a href="https://apinatomy.net/">
					<i class="fa fa-external-link"> </i>
				</a>  
			</span>
            <span class="w3-bar-item w3-right" title="Learn more">
				<a href="http://open-physiology-viewer-docs.surge.sh"><i class="fa fa-home"> </i></a>
            </span>
        </header>

        <!--Left toolbar-->

        <main-toolbar
                [showRepoPanel]="showRepoPanel"
                (onCreateModel)="create()"
                (onLoadModel)="load($event)"
                (onJoinModel)="join($event)"
                (onMergeModel)="merge($event)"
                (onExportModel)="save($event)"
                (onModelCommit)="commit($event)"
                (onImportExcelModel)="load($event)"
                (onToggleRepoPanel)="toggleRepoPanel()"
        >
        </main-toolbar>

        <!--Views-->

        <section id="main-panel">
            <section id="repo-panel" *ngIf="showRepoPanel" class="w3-quarter w3-gray w3-border-right w3-border-white">
                <section class="w3-padding-small">
                    <i class="fa fa-database"> </i> Model Repository
                </section>
                <modelRepoPanel (onModelLoad)="loadFromRepo($event)">
                </modelRepoPanel>
            </section>

            <section id="content-split" class="content-split">
                <section class="main-content">
                    <mat-tab-group animationDuration="0ms" #tabGroup>
                        <!--Viewer-->
                        <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel">
                            <ng-template mat-tab-label><i class="fa fa-heartbeat"></i> Viewer</ng-template>
                            <webGLScene #webGLScene
                                        [modelClasses]="modelClasses"
                                        [graphData]="_graphData"
                                        [config]="_config"
                                        [showChain]="_showChain"
                                        (onImportExternal)="importExternal($event)"
                                        (selectedItemChange)="onSelectedItemChange($event)"
                                        (highlightedItemChange)="onHighlightedItemChange($event)"
                                        (scaffoldUpdated)="onScaffoldUpdated($event)"
                                        (varianceReset)="applyChanges()"
                                        (editResource)="onEditResource($event)"
                            >
                            </webGLScene>
                        </mat-tab>

                        <!--Relationship graph-->
                        <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel" #relGraphTab>
                            <ng-template mat-tab-label><i class="fa fa-diagram-project"></i> Relationship graph
                            </ng-template>
                            <relGraph
                                    [graphData]="_graphData"
                                    [isActive]="relGraphTab.isActive">
                            </relGraph>
                        </mat-tab>

                        <!--Layout editor-->
<!--                        TODO Needs fixing-->
<!--                        <mat-tab *ngIf="!!_model?.scaffolds" class="w3-margin" [class.w3-threequarter]="showRepoPanel">-->
<!--                            <ng-template mat-tab-label><i class="fa fa-wpforms"> </i>Layout</ng-template>-->
<!--                            <div class="code-tab-container">-->
<!--                                <section class="code-toolbar w3-bar-block vertical-toolbar">-->
<!--                                    <button class="w3-bar-item w3-hover-light-grey" (click)="applyChanges()"-->
<!--                                            title="Apply changes">-->
<!--                                        <i class="fa fa-check"> </i>-->
<!--                                    </button>-->
<!--                                </section>-->
<!--                                <section id="layout-editor">-->
<!--                                    <layoutEditor-->
<!--                                            [modelClasses]="modelClasses"-->
<!--                                            [modelResources]="_graphData.entitiesByID || {}"-->
<!--                                            [resource]="_model">-->
<!--                                    </layoutEditor>-->
<!--                                </section>-->
<!--                            </div>-->
<!--                        </mat-tab>-->

                        <!--Code editor-->
                        <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel">
                            <ng-template mat-tab-label><i class="fa fa-edit"></i> Code</ng-template>
                            <div class="code-tab-container">
                                <section class="code-toolbar w3-bar-block vertical-toolbar">
                                    <button class="w3-bar-item w3-hover-light-grey" (click)="applyJSONEditorChanges()"
                                            title="Apply changes">
                                        <div style="display: flex">
                                            <i class="fa fa-check"> </i>
                                            <span *ngIf="codeChanged" style="color: red">*</span>
                                        </div>
                                    </button>
                                </section>
                                <section #jsonEditor id="json-editor" (change)="codeChanged = true">
                                </section>
                            </div>
                        </mat-tab>

                        <!--Material editor-->
                        <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel" #matEditTab>
                            <ng-template mat-tab-label><i class="fa fa-cube"></i> Material editor</ng-template>
                            <materialEditor #materialEd
                                    [model]="_model"
                                    [selectedNode]="_selectedResources['material']"
                                    (onChangesSave)="applyEditorChanges($event, 'material')"
                                    (onSwitchEditor)="switchEditor($event)"
                            >
                            </materialEditor>
                        </mat-tab>

                        <!--Lyph editor-->
                        <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel" #lyphEditTab>
                            <ng-template mat-tab-label><i class="fa fa-cubes"></i> Lyph editor</ng-template>
                            <lyphEditor #lyphEd
                                    [model]="_model"
                                    [selectedNode]="_selectedResources['lyph']"
                                    (onChangesSave)="applyEditorChanges($event, 'lyph')"
                                    (onSwitchEditor)="switchEditor($event)"
                            >
                            </lyphEditor>
                        </mat-tab>

                        <!--Chain editor-->
                        <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel" #chainEditTab>
                            <ng-template mat-tab-label><i class="fa fa-chain"></i> Chain editor</ng-template>
                            <chainEditor #chainEd
                                    [model]="_model"
                                    [selectedNode]="_selectedResources['chain']"
                                    (onChangesSave)="applyEditorChanges($event, 'chain')"
                                    (onSwitchEditor)="switchEditor($event)"
                                    (onShowInTheViewer)="showSelectedChain($event)"
                            >
                            </chainEditor>
                        </mat-tab>

                        <!--Coalescence editor-->
                        <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel" #clsEditTab>
                            <ng-template mat-tab-label><i class="fa fa-ring"></i> Coalescence editor</ng-template>
                            <coalescenceEditor #coalEd
                                    [model]="_model"
                                    [selectedNode]="_selectedResources['coalescence']"
                                    (onChangesSave)="applyEditorChanges($event, 'coalescence')"
                                    (onSwitchEditor)="switchEditor($event)">
                            </coalescenceEditor>
                        </mat-tab>
                    </mat-tab-group>
                </section>
                <div class="resizer" title="Drag to resize" (mousedown)="startResizing($event)"></div>
                <aside class="assistant-pane" [style.width.px]="assistantWidth">
                    <assistant-panel [model]="_model" 
                                     (onOpenEditor)="openEditor($event)" 
                                    (onResourceFromAI)="handleAIResource($event)">                        
                    </assistant-panel>
                </aside>
            </section>
        </section>
        <!-- Model loading progress bar -->
        <div *ngIf="loading" class="loading-overlay">
            <div class="loading-content">
                <mat-progress-spinner
                        color="primary"
                        mode="indeterminate"
                        diameter="50">
                </mat-progress-spinner>
                <p class="loading-text">Please, wait! Model is loading...</p>
            </div>
        </div>

        <!-- Footer -->

        <footer class="w3-container w3-grey">
            <span class="w3-row w3-right">
				<i class="fa fa-code w3-padding-small"> </i>natallia.kokash@gmail.com
			</span>
            <span class="w3-row w3-right">
				<i class="fa fa-envelope w3-padding-small"> </i>bernard.de.bono@gmail.com
			</span>
        </footer>
    `,
    styles: [`
        .vertical-toolbar {
            width: 48px;
        }

        /* Code tab scoped container so the Apply button stays at the right edge of the editor,
           and still to the left of the AI assistant pane */
        .code-tab-container {
            position: relative;
            height: 100%;
        }

        .code-toolbar {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 48px;
        }

        #main-panel {
            margin-top: 40px;
            margin-left: 48px;
            width: calc(100% - 48px);
            height: 90vh
        }

        /* Split layout: editors/views on the left, assistant on the right */
        .content-split {
            display: flex;
            flex-direction: row;
            align-items: stretch;
            height: 100%;
            width: 100%;
            overflow: hidden;
        }

        .main-content {
            flex: 1 1 auto;
            min-width: 0; /* allow mat tabs to shrink within flex */
            height: 100%;
        }

        .assistant-pane {
            flex: 0 0 auto;
            height: 100%;
            max-width: 70vw;
            border-left: 1px solid #ddd;
            background: #fff;
            overflow: hidden;
        }

        .resizer {
            flex: 0 0 6px;
            cursor: col-resize;
            background: #f1f1f1;
            border-left: 1px solid #e0e0e0;
            border-right: 1px solid #e0e0e0;
        }

        .resizer:hover {
            background: #e7e7e7;
        }

        #main-panel mat-tab-group {
            height: inherit;
        }

        #json-editor {
            height: 100vh;
            width: calc(100% - 48px);
        }

        #resource-editor, #layout-editor {
            height: 100%;
            overflow: auto;
            width: calc(100% - 48px);
        }

        #repo-panel {
            height: 95vh;
        }

        .loading-overlay {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
            background: rgba(255, 255, 255, 0.8);
            z-index: 1000;
        }

        .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .loading-text {
            margin-top: 16px;
            font-size: 16px;
            color: #333;
            font-family: Arial, sans-serif;
        }

        footer {
            position: absolute;
            bottom: 0;
            width: 100%;
        }
    `]
})
export class MainApp extends AppCommon {

    @ViewChild('jsonEditor') _container: ElementRef;
    @ViewChild('tabGroup') _tabGroup: ElementRef;
    @ViewChild('materialEd') materialEd: MaterialEditorComponent;
    @ViewChild('lyphEd') lyphEd: LyphEditorComponent;
    @ViewChild('chainEd') chainEd: ChainEditorComponent;
    @ViewChild('coalEd') coalEd: CoalescenceEditorComponent;

    constructor(dialog: MatDialog, snackBar: MatSnackBar, http: HttpClient) {
        super(dialog, snackBar, http);
    }

    // Assistant pane sizing state
    assistantWidth = 380; // px
    minAssistantWidth = 24; // allow minimizing to a slim bar
    maxAssistantWidth = 700;
    _resizing = false;
    _startX = 0;
    _startWidth = 0;

    // Mouse move and up handlers bound as arrow functions to preserve context
    _onMouseMove = (e) => {
        if (!this._resizing) return;
        const deltaX = e.clientX - this._startX;
        const newWidth = this._startWidth - deltaX; // dragging right shrinks, left expands
        this.assistantWidth = this._clamp(newWidth, this.minAssistantWidth, this.maxAssistantWidth);
    };

    _onMouseUp = () => {
        if (!this._resizing) return;
        this._resizing = false;
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
    };

    startResizing(event) {
        this._resizing = true;
        this._startX = event.clientX;
        this._startWidth = this.assistantWidth;
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    ngOnDestroy() {
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
    }

    ngAfterViewInit() {
        if (!this._container) return;
        this._editor = new JSONEditor(this._container.nativeElement, {
            mode: 'code',
            modes: ['code', 'tree', 'view'],
            ace: ace,
            schema: schema
        });
        this._editor.set(this._model);

        this.create();
        // Uncomment to load by default a Git version of WBKG
        // const url = config.initModel;
        // this.http.get(url).subscribe(
        //     res => {
        //         this.model = res;
        //         this.showMessage("Successfully loaded WBKG from GitHub!")
        //     },
        //     err => {
        //         console.error(err);
        //         this.showErrorMessage("Failed to load WBKG from GitHub!");
        //     }
        // );
    }

    applyJSONEditorChanges() {
        if (this._editor) {
            logger.clear();
            this._graphData = generateFromJSON({"id": "Empty"});
            this._graphData.logger.clear();
            this.model = this._editor.get()::merge({[$Field.lastUpdated]: this.currentDate});
            this.codeChanged = false;
        }
    }

    onEditResource(resource) {
        let proto = resource.prototype;
        if (proto) {
            if (proto.class === $SchemaClass.Lyph) {
                this._selectedResources['lyph'] = proto.id;
                this._tabGroup.selectedIndex = TAB_INDEX['lyph'];
            } else if (proto.class === $SchemaClass.Material) {
                this._selectedResources['material'] = proto.id;
                this._tabGroup.selectedIndex = TAB_INDEX['material'];
            }
        } else {
            console.error("Undefined lyph: ", resource);
            throw new Error("Failed to locate prototype definition for the selected lyph!");
        }
    }

    applyEditorChanges({model, selected}, editor) {
        this._selectedResources[editor] = selected;
        this._model = model;
        this.applyChanges();
    }

    switchEditor({editor, node}) {
        this._selectedResources[editor] = node;
        if (['material', 'lyph', 'chain', 'coalescence'].includes(editor)) {
            this._tabGroup.selectedIndex = TAB_INDEX[editor];
        }
    }

    openEditor({editor}) {
        if (!editor) return;
        if (['material','lyph','chain','coalescence'].includes(editor)){
            this._selectedResources[editor] = null; // new item workflow
            this._tabGroup.selectedIndex = TAB_INDEX[editor];
        }
    }

    // Handle AI-produced resource definitions (single or batch)
    handleAIResource(payload) {
        const { mode } = payload || {};
        if (!mode) return;

        const ensureUniqueId = (arr, baseId, type) => {
            let candidate = baseId || {lyph:'newLyph1', material:'newMat1', chain:'newChain1', coalescence:'newCoalescence1'}[type];
            let idx = 1;
            while ((arr || []).some(x => x.id === candidate)) {
                const m = (candidate.match(/^(.*?)(\d+)$/) || []);
                if (m.length) {
                    candidate = `${m[1]}${parseInt(m[2],10)+1}`;
                } else {
                    idx += 1;
                    const prefix = {lyph:'newLyph', material:'newMat', chain:'newChain', coalescence:'newCoalescence'}[type];
                    candidate = `${prefix}${idx}`;
                }
            }
            return candidate;
        };

        const addOneToModel = (type, object) => {
            const plural = {lyph:'lyphs', material:'materials', chain:'chains', coalescence:'coalescences'}[type];
            if (!plural) return;
            this._model[plural] = this._model[plural] || [];
            const cls = {lyph:'Lyph', material:'Material', chain:'Chain', coalescence:'Coalescence'}[type];
            object._class = object._class || cls;
            object.id = ensureUniqueId(this._model[plural], object.id, type);
            this._model[plural].push(object);
            this._selectedResources[type] = object.id;
            this._tabGroup.selectedIndex = TAB_INDEX[type];
        };

        // MODE: add directly to model (supports mixed types and batches)
        if (mode === 'model') {
            try {
                if (payload.items && payload.items.length) {
                    let lastType = null;
                    for (const {type, object} of payload.items) {
                        addOneToModel(type, object);
                        lastType = type;
                    }
                    if (lastType) { this._tabGroup.selectedIndex = TAB_INDEX[lastType]; }
                } else {
                    const { type, object } = payload;
                    if (!type || !object) return;
                    addOneToModel(type, object);
                }
                this.applyChanges();
            } catch (e) {
                console.error('Failed to add AI resource(s) to model', e);
            }
            return;
        }

        // MODE: add via editors
        if (mode === 'editor') {
            try {
                if (payload.items && payload.items.length) {
                    const ht = payload.homogeneousType;
                    if (ht === 'material') {
                        this._tabGroup.selectedIndex = TAB_INDEX['material'];
                        for (const {object} of payload.items) {
                            if (this.materialEd?.createMaterial) this.materialEd.createMaterial(object);
                            else addOneToModel('material', object);
                        }
                        return;
                    }
                    if (ht === 'lyph') {
                        this._tabGroup.selectedIndex = TAB_INDEX['lyph'];
                        for (const {object} of payload.items) {
                            if (this.lyphEd?.createLyph) this.lyphEd.createLyph(object);
                            else addOneToModel('lyph', object);
                        }
                        return;
                    }
                    // If mixed or unsupported type for editor, fall back to model insertion
                    for (const {type, object} of payload.items) {
                        addOneToModel(type, object);
                    }
                    this.applyChanges();
                    return;
                }

                // Single resource via editor
                const { type, object } = payload;
                if (!type || !object) return;
                if (type === 'material' && this.materialEd && this.materialEd.createMaterial) {
                    this._tabGroup.selectedIndex = TAB_INDEX['material'];
                    this.materialEd.createMaterial(object);
                    return;
                }
                if (type === 'lyph' && this.lyphEd && this.lyphEd.createLyph) {
                    this._tabGroup.selectedIndex = TAB_INDEX['lyph'];
                    this.lyphEd.createLyph(object);
                    return;
                }
                if (type === 'chain' && this.chainEd && this.chainEd.createChain) {
                    this._tabGroup.selectedIndex = TAB_INDEX['chain'];
                    this.chainEd.createChain(object);
                    return;
                }
                if (type === 'coalescence' && this.coalEd && this.coalEd.createCoalescence) {
                    this._tabGroup.selectedIndex = TAB_INDEX['coalescence'];
                    this.coalEd.createCoalescence(object);
                    return;
                }
                // Fallback to model if no editor method
                addOneToModel(type, object);
                this.applyChanges();
            } catch (e) {
                console.error('Failed to add AI resource via editor, falling back to model', e);
                try {
                    if (payload.items && payload.items.length) {
                        for (const {type, object} of payload.items) addOneToModel(type, object);
                    } else if (payload.type && payload.object) {
                        addOneToModel(payload.type, payload.object);
                    }
                    this.applyChanges();
                } catch (err) {
                    console.error('Fallback also failed', err);
                }
            }
        }
    }

    showSelectedChain(node) {
        let chain = (this._model?.chains || []).find(x => x.id === node.id);
        if (chain) {
            this._tabGroup.selectedIndex = TAB_INDEX["viewer"];
            this._showChain = chain;
        }
    }
}

/**
 * The MainAppModule test module, which supplies the _excellent_ MainApp test application!
 */
@NgModule({
    imports: [BrowserModule, WebGLSceneModule, BrowserAnimationsModule,
        RelGraphModule, ModelRepoPanelModule, MainToolbarModule, SnapshotToolbarModule, StateToolbarModule,
        //LayoutEditorModule,
        MatDialogModule, MatTabsModule, MatListModule, MatFormFieldModule, MatSnackBarModule, MaterialEditorModule,
        LyphEditorModule, ChainEditorModule, CoalescenceEditorModule, AssistantPanelModule, MatProgressSpinnerModule, HttpClientModule],
    declarations: [MainApp, ImportDialog],
    bootstrap: [MainApp],
    entryComponents: [ImportDialog],
    providers: [
        {
            provide: MatSnackBar,
            useClass: MatSnackBar
        },
        {
            provide: ErrorHandler,
            useClass: GlobalErrorHandler
        }
    ]
})
export class MainAppModule {
}
