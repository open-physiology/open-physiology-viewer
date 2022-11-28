import { NgModule, Component, ViewChild, ElementRef, ErrorHandler, ChangeDetectionStrategy } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { cloneDeep, isArray, isObject, keys, merge, mergeWith, pick} from 'lodash-bound';

import {MatDialogModule, MatDialog} from '@angular/material/dialog';
import {MatTabsModule} from '@angular/material/tabs';
import {MatListModule} from '@angular/material/list'
import {MatFormFieldModule} from '@angular/material/form-field';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import FileSaver  from 'file-saver';
import JSONEditor from "jsoneditor/dist/jsoneditor.min.js";

import {MainToolbarModule} from "../components/mainToolbar";
import {SnapshotToolbarModule} from "../components/snapshotToolbar";
import {StateToolbarModule} from "../components/stateToolbar";
import {ResourceEditorModule} from '../components/gui/resourceEditor';
import {ResourceEditorDialog} from '../components/gui/resourceEditorDialog';
import {LayoutEditorModule} from "../components/layoutEditor";
import {RelGraphModule} from "../components/relationGraph";
import {ModelRepoPanelModule} from "../components/modelRepoPanel";
import {GlobalErrorHandler} from '../services/errorHandler';
import {
    modelClasses,
    schema,
    loadModel,
    joinModels,
    isGraph,
    isScaffold,
    isSnapshot,
    generateFromJSON,
    jsonToExcel,
    processImports,
    $SchemaClass
} from '../model/index';

import 'hammerjs';
import initModel from '../data/graph.json';

import "./styles/material.scss";
import 'jsoneditor/dist/jsoneditor.min.css';
import "@fortawesome/fontawesome-free/js/all.js";
import "@fortawesome/fontawesome-free/css/all.css";
import "@fortawesome/fontawesome-free/js/v4-shims";
import "@fortawesome/fontawesome-free/css/v4-shims.css";

import {$Field, findResourceByID, getGenID, getGenName, mergeResources} from "../model/utils";
import {$LogMsg, logger} from "../model/logger";
import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {ImportDialog} from "../components/gui/importDialog";
import {WebGLSceneModule} from '../components/webGLScene';
import {enableProdMode} from '@angular/core';

import { removeDisconnectedObjects } from '../../src/view/render/autoLayout'

enableProdMode();

const ace = require('ace-builds');
const fileExtensionRe = /(?:\.([^.]+))?$/;

@Component({
	selector: 'test-app',
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
            <span class="w3-bar-item">
                Model: {{_modelName}}
            </span>
            <span *ngIf="_snapshot" class="w3-bar-item">
                Snapshot model: {{_snapshot.name}}
            </span>
            <snapshot-toolbar id="snapshot-toolbar"
                (onCreateSnapshot) = "createSnapshot()"
                (onLoadSnapshot)   = "loadSnapshot($event)"
                (onSaveSnapshot)   = "saveSnapshot()"                              
            >
            </snapshot-toolbar>
            <state-toolbar id="state-toolbar"
                [activeIndex]      = "_snapshot?.activeIndex"
                [total]            = "_snapshot?.length || 0"         
                [unsavedState]     = "!!_unsavedState"                           
                (onPreviousState)  = "previousState()"  
                (onNextState)      = "nextState()" 
                (onAddState)       = "saveState()"
                (onDeleteState)    = "removeState()"
                (onHomeState)      = "homeState()"
           >
            </state-toolbar>
            <span class="w3-bar-item w3-right" title="NIH-SPARC MAP-CORE Project">
				<a href="https://projectreporter.nih.gov/project_info_description.cfm?aid=9538432">
					<i class="fa fa-external-link"> </i>
				</a>  
			</span>
            <span class="w3-bar-item w3-right" title="Learn more">
				<a href="http://open-physiology-viewer-docs.surge.sh"><i class="fa fa-home"> </i></a>
            </span>
        </header>

        <!--Left toolbar-->

        <section>
            <main-toolbar
                [showRepoPanel]     = "showRepoPanel"
                (onCreateModel)     = "create()"
                (onLoadModel)       = "load($event)"
                (onJoinModel)       = "join($event)"
                (onMergeModel)      = "merge($event)"
                (onExportModel)     = "save($event)"
                (onImportExcelModel)= "load($event)" 
                (onToggleRepoPanel) = "toggleRepoPanel()"   
            >
            </main-toolbar>
        </section>

        <!--Views-->

        <section id="main-panel">
            <section id="repo-panel" *ngIf="showRepoPanel" class="w3-quarter w3-gray w3-border-right w3-border-white">
                <section class="w3-padding-small">
                    <i class="fa fa-database"> </i> Model Repository 
                </section>
                <modelRepoPanel (onModelLoad)="loadFromRepo($event)">
                </modelRepoPanel>
            </section>

            <mat-tab-group animationDuration="0ms">
                <!--Viewer-->
                <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel">
                    <ng-template mat-tab-label><i class="fa fa-heartbeat"></i> Viewer </ng-template>
                    <webGLScene #webGLScene
                            [modelClasses]="modelClasses"
                            [graphData]="_graphData"
                            [config]="_config"    
                            (onImportExternal)="importExternal($event)"    
                            (selectedItemChange)="onSelectedItemChange($event)"
                            (highlightedItemChange)="onHighlightedItemChange($event)"
                            (editResource)="onEditResource($event)"
                            (scaffoldUpdated)="onScaffoldUpdated($event)">
                    </webGLScene>
                </mat-tab> 

                <!--Relationship graph-->
                <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel" #relGraphTab>
                    <ng-template mat-tab-label><i class="fa fa-diagram-project"></i> Relationship graph</ng-template>
                    <relGraph 
                            [graphData]="_graphData"
                            [isActive]="relGraphTab.isActive"> 
                    </relGraph>
                </mat-tab>

                <!--Resource editor-->
<!--                <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel">-->
<!--                    <ng-template mat-tab-label><i class="fa fa-wpforms"></i> Resources</ng-template>-->
<!--                    <section class="w3-sidebar w3-bar-block w3-right vertical-toolbar" style="right:0">-->
<!--                        <button class="w3-bar-item w3-hover-light-grey" (click)="applyChanges()"-->
<!--                                title="Apply changes">-->
<!--                            <i class="fa fa-check"> </i>-->
<!--                        </button>-->
<!--                    </section>-->
<!--                    <section id="resource-editor">-->
<!--                        <resourceEditor-->
<!--                                [modelClasses]="modelClasses"-->
<!--                                [modelResources]="_graphData.entitiesByID || {}"-->
<!--                                [resource]="_model"-->
<!--                                [className]="className">-->
<!--                        </resourceEditor>-->
<!--                    </section>-->
<!--                </mat-tab>-->
                
                <!--Layout editor-->
                <mat-tab *ngIf="!!_model?.scaffolds" class="w3-margin" [class.w3-threequarter]="showRepoPanel">
                    <ng-template mat-tab-label><i class="fa fa-wpforms"> </i>Layout</ng-template>
                    <section class="w3-sidebar w3-bar-block w3-right vertical-toolbar" style="right:0">
                        <button class="w3-bar-item w3-hover-light-grey" (click)="applyChanges()"
                                title="Apply changes">
                            <i class="fa fa-check"> </i>
                        </button>
                    </section>
                    <section id="layout-editor">
                        <layoutEditor
                                [modelClasses]="modelClasses"
                                [modelResources]="_graphData.entitiesByID || {}"
                                [resource]="_model">                            
                        </layoutEditor>
                    </section>
                </mat-tab>

                <!--Code editor-->
                <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel">
                    <ng-template mat-tab-label><i class="fa fa-edit"></i> Code </ng-template>
                    <section class="w3-sidebar w3-bar-block w3-right vertical-toolbar" style="right:0">
                        <button class="w3-bar-item w3-hover-light-grey" (click)="applyJSONEditorChanges()"
                                title="Apply changes">
                            <i class="fa fa-check"> </i>
                        </button>
                    </section>
                    <section #jsonEditor id="json-editor">                        
                    </section>
                </mat-tab>               
            </mat-tab-group>
        </section>

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
        .vertical-toolbar{
            width : 48px;
        }
                
        #main-panel{            
            margin-top : 40px;
            margin-left: 48px; 
            width : calc(100% - 48px);
            height : 90vh
        }

        #main-panel mat-tab-group{            
            height : inherit;
        }

        #viewer-panel {
            width : 100%;
        }

        #json-editor{
            height : 100vh;
            width  : calc(100% - 48px);
        }
        
        #resource-editor, #layout-editor{
            height : 100%;
            overflow : auto;
            width  : calc(100% - 48px);
        }
        
        #repo-panel{
            height : 95vh;
        }

        footer{
            position: absolute;
            bottom: 0;
            width: 100%;
        }
	`]
})
export class TestApp {
    modelClasses = modelClasses;
    showRepoPanel = false;
    _graphData;
    _config = {};
    _model = {};
    _modelName;
    _dialog;
    _editor;
    _flattenGroups;
    _counter = 1;
    _scaffoldUpdated = false;

    _snapshot;
    _snapshotCounter = 1;
    _unsavedState;

    @ViewChild('webGLScene') _webGLScene: ElementRef;
    @ViewChild('jsonEditor') _container: ElementRef;

    constructor(dialog: MatDialog){
        this.model = initModel;
        this._dialog = dialog;
        this._flattenGroups = false;
    }

    ngAfterViewInit(){
        if (!this._container) { return; }
        this._editor = new JSONEditor(this._container.nativeElement, {
            mode  : 'code',
            modes : ['code', 'tree', 'view'],
            ace   : ace,
            schema: schema
        });
        this._editor.set(this._model);
    }

    // noinspection JSMethodCanBeStatic
    get currentDate(){
        let today = new Date();
        let [yyyy, mm, dd] = [today.getFullYear(), (today.getMonth()+1), today.getDate()];
        if (dd < 10) { dd = '0' + dd; }
        if (mm < 10) { mm = '0' + mm; }
        return [yyyy,mm,dd].join("-");
    }

    get className(){
        return isScaffold(this._model)? $SchemaClass.Scaffold: $SchemaClass.Graph;
    }

    toggleRepoPanel(){
        this.showRepoPanel = !this.showRepoPanel;
    }

    create(){
        logger.clear();
        this.model = {
            [$Field.name]        : "newModel-" + this._counter++,
            [$Field.created]     : this.currentDate,
            [$Field.lastUpdated] : this.currentDate
        };
        this._flattenGroups = false;
    }

    // Load the imports of a model
    loadImports(modelURL) {
        let that = this;
        fetch(modelURL)
        .then(res2 => res2.json())
        .then(model => {
            let snapshots = [model].filter(m => isSnapshot(m));
            let groups = [model].filter(m => isGraph(m));
            let scaffolds = [model].filter(m => isScaffold(m));

            processImports(that._model, [model]);
            if (groups.length > 0 || scaffolds.length > 0) {
                that.model = that._model;
            }
            if (snapshots.length > 0){
                that.loadSnapshot(snapshots[0]);
                if (snapshots.length > 1){
                    logger.warn($LogMsg.SNAPSHOT_IMPORT_MULTI);
                }
            }
            model.imports?.length > 0 && that.loadImports(model.imports[0]);
        });
    }

    load(newModel) {
        this.model = newModel;
        this._flattenGroups = false;
        // Load imports if model has any
        newModel.imports && this.loadImports(newModel.imports[0]);
    }

    importExternal(){
        if (this._model.imports && this._model.imports.length > 0) {
            //Model contains external inputs
            let dialogRef = this._dialog.open(ImportDialog, {
                width: '75%', data: {
                    imports: this._model.imports || []
                }
            });
            dialogRef.afterClosed().subscribe(result => {
                if (result !== undefined && result::isArray()) {
                    let scaffolds = result.filter(m => isScaffold(m));
                    let groups = result.filter(m => isGraph(m));
                    let snapshots = result.filter(m => isSnapshot(m));
                    logger.clear();
                    processImports(this._model, result);
                    if (groups.length > 0 || scaffolds.length > 0) {
                        this.model = this._model;
                    }
                    if (snapshots.length > 0){
                        this.loadSnapshot(snapshots[0]);
                        if (snapshots.length > 1){
                            logger.warn($LogMsg.SNAPSHOT_IMPORT_MULTI);
                        }
                    }
                }
            });
        }
    }

    applyScaffold(modelA, modelB){
        const applyScaffold = (model, scaffold) => {
            model.scaffolds = model.scaffolds || [];
            if (!model.scaffolds.find(s => s.id === scaffold.id)){
                model.scaffolds.push(scaffold);
            } else {
                throw new Error("Scaffold with such identifier is already attached to the model!");
            }
            this.model = model;
        };

        if (isScaffold(modelA)){
            applyScaffold(modelB, modelA);
        } else {
            applyScaffold(modelA, modelB);
        }
    }

    join(newModel) {
        if (this._model.id === newModel.id){
            throw new Error("Cannot join models with the same identifiers: " + this._model.id);
        }
        if (isScaffold(this._model) !== isScaffold(newModel)){
            this.model = removeDisconnectedObjects(this._model, newModel);
            this.applyScaffold(this._model, newModel);
        } else {
            //FIXME (NK for MetaCell) As I understand, removeDisconnectedObjects works on scaffold applied to model
            //The code below joins 2 connectivity models or 2 scaffolds, your method breaks the join
            //this.model = removeDisconnectedObjects(this._model, newModel);
            let jointModel = joinModels(this._model, newModel, this._flattenGroups);
            //NK config property is deprecated, merging with it was a bug caused by Master+Metacell conflict resolution mistake
            jointModel::merge({[$Field.created]: this.currentDate, [$Field.lastUpdated]: this.currentDate});
            this.model = jointModel;
            this._flattenGroups = true;
        }
    }

    merge(newModel) {
        if (isScaffold(this._model) !== isScaffold(newModel)){
            this.applyScaffold(this._model, newModel);
        } else {
            this.model = {
                [$Field.created]: this.currentDate,
                [$Field.lastUpdated]: this.currentDate
            }::merge(this._model::mergeWith(newModel, mergeResources));
        }
    }

    save(format){
        if (format === "excel"){
            jsonToExcel(this._model);
        } else {
            if (this._scaffoldUpdated) {
                this.saveScaffoldUpdates();
                this._scaffoldUpdated = false;
            }
            let result = JSON.stringify(this._model, null, 4);
            const blob = new Blob([result], {type: 'text/plain'});
            FileSaver.saveAs(blob, this._model.id + '-model.json');
        }
    }

    loadFromRepo({fileName, fileContent}){
        let [name, extension]  = fileExtensionRe.exec(fileName);
        extension = extension.toLowerCase();
        this.model = loadModel(fileContent, name, extension);
    }

    applyJSONEditorChanges() {
        if (this._editor){
            logger.clear();
            this._graphData = generateFromJSON({"id":"Empty"});
            this._graphData.logger.clear();
            this.model = this._editor.get()::merge({[$Field.lastUpdated]: this.currentDate});
        }
    }

    applyChanges(){
        logger.clear();
        this._graphData = generateFromJSON({"id": "Empty"});
        this.model = this._model::merge({[$Field.lastUpdated]: this.currentDate});
    }

    onSelectedItemChange(item){}

	onHighlightedItemChange(item){}

	set model(model){
        this._model = model;
        //try{
            this._modelName = this._model.name || this._model.id || "?";
            this._graphData = generateFromJSON(this._model);
        // } catch(err){
        //    throw new Error(err);
        // }
        this._snapshot = undefined;
        if (this._editor){
            this._editor.set(this._model);
        }
    }

    get graphData(){
	    return this._graphData;
    }

    onEditResource(resource){
        function findResourceDef(obj, parent, key) {
            if (!obj) { return; }
            let result = null;
            if (obj::isArray()) {
                result = obj.find((item, i) => findResourceDef(obj[i], obj, i))
            }
            else {
                if (obj::isObject()){
                    if (obj.id === resource.id) { return [parent, key]; }
                    result = obj::keys().find(prop => findResourceDef(obj[prop], obj, prop));
                }
            }
            return result;
        }

        let res = findResourceDef(this._model);
        if (!res) {
            throw new Error("Failed to locate the resource in the input model! Generated or unidentified resources cannot be edited!");
        }
        let [parent, key] = res;
        let obj = parent[key]::cloneDeep();
        const dialogRef = this._dialog.open(ResourceEditorDialog, {
            width: '75%',
            data: {
                title             : `Update resource?`,
                modelClasses      : modelClasses,
                modelResources    : this._graphData.entitiesByID || {},
                resource          : obj,
                className         : resource.class
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result !== undefined){
                parent[key] = result;
                this.model = this._model;
            }
        });
    }

    onScaffoldUpdated(){
        this._scaffoldUpdated = true;
    }

    saveScaffoldUpdates(){
        if (this._model && this._graphData){
            if (isScaffold(this._model)){
                this._graphData.update(this._model);
            } else {
                (this._graphData.scaffolds || []).forEach(scaffold => {
                    const srcScaffold = findResourceByID(this._model.scaffolds, scaffold.id);
                    if (!srcScaffold) {
                        throw new Error("Failed to find scaffold definition in input model: " + scaffold.id);
                    }
                    scaffold.update(srcScaffold);
                })
            }
        }
    }

    saveState(){
        if (!this._snapshot) {
            this.createSnapshot();
        }
        this._snapshot.addState(this.getCurrentState());
        this._unsavedState = null;
    }

    homeState(){
        if (this._unsavedState){
            this.loadState(this._unsavedState);
            if (this._snapshot){
                this._snapshot.activeIndex = -1;
            }
        }
    }

    getCurrentState(){
        let state_json =  {
            [$Field.id]: getGenID(this._snapshot.id, "state", (this._snapshot.states||[]).length),
            [$Field.camera]: {
                position: this._webGLScene.camera.position::pick(["x", "y", "z"]),
                up      : this._webGLScene.camera.up::pick(["x", "y", "z"])
            },
            [$Field.layout]: this._config.layout::cloneDeep(),
            [$Field.showLabels]: this._config.showLabels::cloneDeep(),
            [$Field.labelContent]: this._config.labels::cloneDeep()
        }::merge(this._graphData.getCurrentState());
        return this.modelClasses.State.fromJSON(state_json, this.modelClasses, this._graphData.entitiesByID);
    }

    restoreState(){
        this._unsavedState = this.getCurrentState();
        this.loadState(this._snapshot.active);
    }

    loadState(activeState){
        if (activeState.visibleGroups){
            this._graphData.showGroups(activeState.visibleGroups);
        }
        if (activeState.camera) {
            this._webGLScene.resetCamera(activeState.camera.position, activeState.camera.up);
        }
        this._config = {};
        if (activeState.layout) {
            this._config.layout = activeState.layout;
        }
        if (activeState.showLabels) {
            this._config.showLabels = activeState.showLabels;
        }
        if (activeState.labelContent) {
            this._config.labelContent = activeState.labelContent;
        }
        if (isScaffold(this._model)){
            this._graphData.loadState(activeState);
        } else {
            (activeState.scaffolds || []).forEach(scaffold => {
                const modelScaffold = (this._graphData.scaffolds || []).find(s => s.id === scaffold.id);
                if (modelScaffold) {
                    modelScaffold.loadState(scaffold);
                } else {
                    this._graphData.logger.info($LogMsg.SNAPSHOT_NO_SCAFFOLD, scaffold.id);
                }
            })
        }
        this._webGLScene.updateGraph();
    }

    previousState(){
        if (this._snapshot) {
            this._snapshot.switchToPrev();
            this.restoreState();
        }
    }

    nextState(){
        if (this._snapshot) {
            this._snapshot.switchToNext();
            this.restoreState();
        }
    }

    removeState(){
        if (this._snapshot){
            this._snapshot.removeActive();
            this.restoreState();
        }
    }

    createSnapshot(){
        this._snapshot = this.modelClasses.Snapshot.fromJSON({
            [$Field.id]: getGenID("snapshot", this._model.id, this._snapshotCounter),
            [$Field.name]: getGenName("Snapshot for", this._modelName, this._snapshotCounter),
            [$Field.model]: this._model.id
        }, this.modelClasses, this._graphData.entitiesByID);
        this._snapshotCounter += 1;
        const annotationProperties = schema.definitions.AnnotationSchema.properties::keys();
        this._snapshot.annotation = this._model::pick(annotationProperties);
    }

    loadSnapshot(value){
        let newSnapshot = this.modelClasses.Snapshot.fromJSON(value, this.modelClasses, this._graphData.entitiesByID);
        const match = newSnapshot.validate(this._graphData);
        if (match < 0) {
            throw new Error("Snapshot is not applicable to the model!");
        } else {
            if (match === 0){
                throw new Error("Snapshot corresponds to a different version of the model!");
            }
        }
        this._snapshot = newSnapshot;
    }

    saveSnapshot(){
        if (this._snapshot) {
            let result = JSON.stringify(this._snapshot.toJSON(2, {
                [$Field.states]: 4
            }), null, 2);
            const blob = new Blob([result], {type: 'application/json'});
            FileSaver.saveAs(blob, this._snapshot.id + '.json');
        }
    }
}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports     : [BrowserModule, WebGLSceneModule, BrowserAnimationsModule, ResourceEditorModule,
        RelGraphModule, ModelRepoPanelModule, MainToolbarModule, SnapshotToolbarModule, StateToolbarModule, LayoutEditorModule,
        MatDialogModule, MatTabsModule, MatListModule, MatFormFieldModule, MatSnackBarModule],
	declarations: [TestApp, ImportDialog, ResourceEditorDialog],
    bootstrap: [TestApp],
    entryComponents: [ImportDialog, ResourceEditorDialog],
    providers   : [
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
export class TestAppModule {}
