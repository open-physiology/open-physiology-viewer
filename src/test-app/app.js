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
import {WebGLSceneModule} from '../components/webGLScene';
import {ResourceEditorModule} from '../components/gui/resourceEditor';
import {ResourceEditorDialog} from '../components/gui/resourceEditorDialog';
import {LayoutEditorModule} from "../components/layoutEditor";
//import {RelGraphModule} from "../components/relationGraph";
import {ModelRepoPanelModule} from "../components/modelRepoPanel";
import {GlobalErrorHandler} from '../services/errorHandler';
import {modelClasses, schema, fromJSON, loadModel, joinModels, isScaffold, $SchemaClass} from '../model/index';

import 'hammerjs';
import initModel from '../data/graph_reduced.json';

import 'font-awesome/css/font-awesome.css';
import 'jsoneditor/dist/jsoneditor.min.css';
import "@angular/material/prebuilt-themes/deeppurple-amber.css";
import "./styles/material.scss";

import {$Field, findResourceByID, getGenID, getGenName, mergeResources} from "../model/utils";
import {$LogMsg} from "../model/logger";
import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {ImportDialog} from "../components/gui/importDialog";
import { enableProdMode } from '@angular/core';

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
                (onExportModel)     = "save()"
                (onImportExcelModel)= "load($event)" 
                (onToggleRepoPanel) = "toggleRepoPanel()"   
            >
            </main-toolbar>
        </section>

        <!--Views-->

        <section id="main-panel">
            <section id="repo-panel" *ngIf="showRepoPanel" class="w3-quarter w3-gray w3-border-right w3-border-white">
                <section class="w3-padding-small">
                    <i class="fa fa-database"> Model Repository </i>
                </section>
                <modelRepoPanel (onModelLoad)="loadFromRepo($event)">
                </modelRepoPanel>
            </section>

            <mat-tab-group animationDuration="0ms">
                <!--Viewer-->
                <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel">
                    <ng-template mat-tab-label><i class="fa fa-heartbeat"> Viewer </i></ng-template>
                    <webGLScene #webGLScene
                            [modelClasses]="modelClasses"
                            [graphData]="_graphData"
                            (onImportExternal)="importExternal($event)"    
                            (selectedItemChange)="onSelectedItemChange($event)"
                            (highlightedItemChange)="onHighlightedItemChange($event)"
                            (editResource)="onEditResource($event)"
                            (scaffoldUpdated)="onScaffoldUpdated($event)">
                    </webGLScene>
                </mat-tab>

                <!--Relationship graph-->
<!--                <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel">-->
<!--                    <ng-template mat-tab-label><i class="fa fa-project-diagram"> Relationship graph </i></ng-template>-->
<!--                    <relGraph [graphData]="_graphData"> -->
<!--                    </relGraph>-->
<!--                </mat-tab>-->

                <!--Resource editor-->
                <mat-tab class="w3-margin" [class.w3-threequarter]="showRepoPanel">
                    <ng-template mat-tab-label><i class="fa fa-wpforms"> Resources </i></ng-template>
                    <section class="w3-sidebar w3-bar-block w3-right vertical-toolbar" style="right:0">
                        <button class="w3-bar-item w3-hover-light-grey" (click)="applyChanges()"
                                title="Apply changes">
                            <i class="fa fa-check"> </i>
                        </button>
                    </section>
                    <section id="resource-editor">
                        <resourceEditor
                                [modelClasses]="modelClasses"
                                [modelResources]="_graphData.entitiesByID || {}"
                                [resource]="_model"
                                [className]="className">
                        </resourceEditor>
                    </section>
                </mat-tab>
                
                <!--Layout editor-->
                <mat-tab *ngIf="!!_model?.scaffolds" class="w3-margin" [class.w3-threequarter]="showRepoPanel">
                    <ng-template mat-tab-label><i class="fa fa-wpforms"> Layout </i></ng-template>
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
                    <ng-template mat-tab-label><i class="fa fa-edit"> Code </i></ng-template>
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
            width : calc(100%);
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
            height : 100vh;
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
        this.model = {
            [$Field.name]        : "newModel-" + this._counter++,
            [$Field.created]     : this.currentDate,
            [$Field.lastUpdated] : this.currentDate
        };
        this._flattenGroups = false;
    }

    load(newModel) {
        this.model = newModel;
        this._flattenGroups = false;
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
                if (result !== undefined) {
                    this._model.scaffolds = this._model.scaffolds || [];
                    this._model.groups = this._model.groups || [];
                    result.forEach(newModel => {
                        if (isScaffold(newModel)) {
                            const scaffoldIdx = this._model.scaffolds.findIndex(s => s.id === newModel.id);
                            if (scaffoldIdx === -1) {
                                this._model.scaffolds.push(newModel);
                            } else {
                                this._model.scaffolds[scaffoldIdx] = newModel;
                            }
                        } else {
                            const groupIdx = this._model.groups.findIndex(s => s.id === newModel.id);
                            if (groupIdx === -1) {
                                this._model.groups.push(newModel);
                            } else {
                                this._model.groups[groupIdx] = newModel;
                            }
                        }
                    });
                    this.model = this._model;
                }
            });
        }
    }

    removeDisconnectedObjects(model, joinModel) {
        const wiredTo = joinModel.chains.map((c) => c.wiredTo);
        const hostedBy = joinModel.chains.map((c) => c.hostedBy);

        const connected = wiredTo
                        .concat(model.anchors
                        .map((c) => c.hostedBy))
                        .concat(hostedBy)
                        .filter((c) => c !== undefined);


        // All cardinal nodes
        const anchorsUsed = [];
        model.anchors.forEach( anchor => { 
            anchor.cardinalNode ? anchorsUsed.push(anchor.id) : null
        });
        
        // Wires of F and D, the outer layers of the TOO map
        const outerWires = model.components.find( wire => wire.id === "wires-f");
        outerWires.wires.concat(model.components.find( wire => wire.id === "wires-d")).wires;
        outerWires.wires = outerWires.wires.filter( wireId => {
            const foundWire = model.wires.find( w => w.id === wireId );
            return anchorsUsed.indexOf(foundWire?.source) > -1 && anchorsUsed.indexOf(foundWire?.target) > -1
        });

        const connectedWires = wiredTo.concat(hostedBy);
        // Other anchors used by the connectivity model lyphs and chains
        connectedWires.forEach( wireId => {
           if ( wireId !== undefined ){
            const wire = model.wires.find( wire => wireId === wire.id );
            if ( wire ) {
              if ( anchorsUsed.indexOf(wire.source) == -1 ){
                  anchorsUsed.push(wire.source);
              }
              if ( anchorsUsed.indexOf(wire.target) == -1 ){
                  anchorsUsed.push(wire.target);
              }
            }
          }
        });

        const updatedModel = Object.assign(model, 
            { 
                regions: model.regions.filter((r) => connected.indexOf(r.id) > -1 ),
                wires:  model.wires.filter((r) => connected.indexOf(r.id) > -1 || outerWires.wires.indexOf(r.id) > -1),
                anchors : model.anchors.filter((r) => (anchorsUsed.indexOf(r.id) > -1 ))
            }
        );
  
        return updatedModel;
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
          this.model = this.removeDisconnectedObjects(this._model, newModel);
          this.applyScaffold(this._model, newModel);         
        } else {
          this.model = this.removeDisconnectedObjects(this._model, newModel);
          let jointModel = joinModels(this._model, newModel, this._flattenGroups);
          jointModel.config::merge({[$Field.created]: this.currentDate, [$Field.lastUpdated]: this.currentDate});
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

    save(){
        if (this._scaffoldUpdated){
            this.saveScaffoldUpdates();
            this._scaffoldUpdated = false;
        }
        let result = JSON.stringify(this._model, null, 4);
        const blob = new Blob([result], {type: 'text/plain'});
        FileSaver.saveAs(blob, (this._model.id? this._model.id: 'mainGraph') + '-model.json');
    }

    loadFromRepo({fileName, fileContent}){
        let [name, extension]  = fileExtensionRe.exec(fileName);
        extension = extension.toLowerCase();
        this.model = loadModel(fileContent, name, extension);
    }

    applyJSONEditorChanges() {
        if (this._editor){
            this._graphData = fromJSON({});
            this.model = this._editor.get()::merge({[$Field.lastUpdated]: this.currentDate});
        }
    }

    applyChanges(){
        this._graphData = fromJSON({});
        this.model = this._model::merge({[$Field.lastUpdated]: this.currentDate});
    }

    onSelectedItemChange(item){}

	onHighlightedItemChange(item){}

	set model(model){
        this._model = model;
        //try{
            this._modelName = this._model.name || "?";
            this._graphData = fromJSON(this._model);
        // } catch(err){
        //    throw new Error(err);
        // }
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
        const scaleFactor = 10;

        const updateScaffold = (scaffold, srcScaffold) => {
            (scaffold.anchors || []).forEach(anchor => {
                const srcAnchor = findResourceByID(srcScaffold.anchors, anchor.id);
                if (srcAnchor) {
                    srcAnchor.layout = srcAnchor.layout || {};
                    if (anchor.layout) {
                        ["x", "y"].forEach(dim => srcAnchor.layout[dim] = anchor.layout[dim] / scaleFactor);
                    } else {
                        if (anchor.hostedBy && anchor.offset !== undefined){
                            srcAnchor.offset = anchor.offset;
                        }
                    }
                }
            });
            (scaffold.regions || []).forEach(region => {
                const srcRegion = findResourceByID(srcScaffold.regions, region.id);
                if (srcRegion) {
                    if (srcRegion.points) {
                        (srcRegion.points || []).forEach((target, i) => {
                            ["x", "y"].forEach(dim => target[dim] = region.points[i][dim] / scaleFactor);
                        })
                    } else {
                        (srcRegion.borderAnchors||[]).forEach((srcAnchor, i) => {
                            if (srcAnchor::isObject()){
                                srcAnchor.layout = srcAnchor.layout || {};
                                ["x", "y"].forEach(dim => srcAnchor.layout[dim] = region.points[i][dim] / scaleFactor);
                            }
                        });
                    }
                }
            });
            (scaffold.wires || []).forEach(wire => {
                //Update ellipse radius
                if (wire.geometry === this.modelClasses.Wire.WIRE_GEOMETRY.ELLIPSE) {
                    const srcWire = findResourceByID(srcScaffold.wires, wire.id);
                    if (srcWire && srcWire::isObject()) {
                        srcWire.radius = srcWire.radius || {};
                        ["x", "y"].forEach(dim => srcWire.radius[dim] = wire.radius[dim] / scaleFactor);
                    }
                }
            })
        }

        if (this._model && this._graphData){
            if (isScaffold(this._model)){
                updateScaffold(this._graphData, this._model);
            } else {
                (this._graphData.scaffolds || []).forEach(scaffold => {
                    const srcScaffold = findResourceByID(this._model.scaffolds, scaffold.id);
                    if (!srcScaffold) {
                        throw new Error("Failed to find scaffold definition in input model: " + scaffold.id);
                    }
                    updateScaffold(scaffold, srcScaffold);
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
            [$Field.visibleGroups]: this._graphData.visibleGroups.map(g => g.id),
            [$Field.camera]: {
                position: this._webGLScene.camera.position::pick(["x", "y", "z"]),
                up      : this._webGLScene.camera.up::pick(["x", "y", "z"])
            }
        }
        state_json.scaffolds = [];
        (this._graphData.scaffolds||[]).forEach(s => {
            let scaffold_json = {
                [$Field.id]: s.id,
                [$Field.hidden]: s.hidden,
                [$Field.visibleComponents]: s.visibleComponents.map(c => c.id)
            }
            scaffold_json.anchors = [];
            (s.anchors||[]).forEach(a => {
                if (a.layout) {
                    scaffold_json.anchors.push({
                        [$Field.id]: a.id,
                        [$Field.layout]: {"x": a.layout.x, "y": a.layout.y}
                    })
                } else {
                    if (a.hostedBy && a.offset !== undefined){
                        scaffold_json.anchors.push({
                            [$Field.id]: a.id,
                            [$Field.offset]: a.offset
                        })
                    }
                }
            })
            state_json.scaffolds.push(scaffold_json)
        })

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

        (activeState.scaffolds||[]).forEach(scaffold => {
            const modelScaffold = (this._graphData.scaffolds||[]).find(s => s.id === scaffold.id);
            if (modelScaffold){
                modelScaffold.hidden = scaffold.hidden;
                (scaffold.anchors || []).forEach(anchor => {
                    const modelAnchor = (modelScaffold.anchors||[]).find(a => a.id === anchor.id);
                    if (modelAnchor){
                        if (anchor.layout) {
                            modelAnchor.layout = {
                                x: anchor.layout.x,
                                y: anchor.layout.y
                            }
                        } else {
                            if (anchor.offset !== undefined){
                                modelAnchor.offset = anchor.offset;
                            }
                        }
                    } else {
                        this._graphData.logger.info($LogMsg.SNAPSHOT_NO_ANCHOR, anchor.id, scaffold.id);
                    }
                })
                if (!modelScaffold.hidden){
                    modelScaffold.show();
                }
                if (scaffold.visibleComponents){
                    modelScaffold.showGroups(scaffold.visibleComponents);
                }
                if (modelScaffold.hidden){
                    modelScaffold.hide();
                }
            } else {
                this._graphData.logger.info($LogMsg.SNAPSHOT_NO_SCAFFOLD, scaffold.id);
            }
        })
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
	imports     : [BrowserModule, WebGLSceneModule, MatDialogModule, BrowserAnimationsModule, ResourceEditorModule, MatSnackBarModule,
        //RelGraphModule,
        MatTabsModule, ModelRepoPanelModule, MainToolbarModule, SnapshotToolbarModule, StateToolbarModule, LayoutEditorModule, MatListModule,
    MatFormFieldModule],
	declarations: [TestApp, ResourceEditorDialog, ImportDialog],
    bootstrap: [TestApp],
    entryComponents: [ResourceEditorDialog, ImportDialog],
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
