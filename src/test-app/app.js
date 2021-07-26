import { NgModule, Component, ViewChild, ElementRef, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { cloneDeep, isArray, isObject, keys, merge, mergeWith} from 'lodash-bound';

import { MatSnackBarModule, MatDialogModule, MatDialog, MatTabsModule } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import FileSaver  from 'file-saver';
import JSONEditor from "jsoneditor/dist/jsoneditor.min.js";

import {MainToolbarModule} from "../components/mainToolbar";
import {WebGLSceneModule} from '../components/webGLScene';
import {ResourceEditorModule} from '../components/gui/resourceEditor';
import {ResourceEditorDialog} from '../components/gui/resourceEditorDialog';
import {LayoutEditorModule} from "../components/layoutEditor";
//import {RelGraphModule} from "../components/relationGraph";
import {ModelRepoPanelModule} from "../components/modelRepoPanel";
import {GlobalErrorHandler} from '../services/errorHandler';
import {modelClasses, schema, fromJSON, loadModel, joinModels, isScaffold, $SchemaClass} from '../model/index';

import 'hammerjs';
import initModel from '../data/graph.json';

import 'font-awesome/css/font-awesome.css';
import 'jsoneditor/dist/jsoneditor.min.css';
import "@angular/material/prebuilt-themes/deeppurple-amber.css";
import "./styles/material.scss";

import {$Field, findResourceByID, mergeResources} from "../model/utils";
import {copyCoords} from "../view/utils";
const ace = require('ace-builds');
const fileExtensionRe = /(?:\.([^.]+))?$/;

@Component({
	selector: 'test-app',
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

        <main-toolbar
            [shoRepoPanel]      = "showRepoPanel"
            (onCreateModel)     = "create()"
            (onLoadModel)       = "load($event)"
            (onJoinModel)       = "join($event)"
            (onMergeModel)      = "merge($event)"
            (onExportModel)     = "save()"
            (onImportExcelModel)= "load($event)" 
            (onToggleRepoPanel) = "toggleRepoPanel()">     
        </main-toolbar>

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
                    <webGLScene
                            [modelClasses]="modelClasses"
                            [graphData]="_graphData"
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
        
        #resource-editor{
            height : 100vh;
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
    _graphData;
    _model = {};
    _modelName;
    _dialog;
    _editor;
    _flattenGroups;
    _counter = 1;
    _scaffoldUpdated = false;
    modelClasses = modelClasses;
    showRepoPanel = false;

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
            this.applyScaffold(this._model, newModel);
        } else {
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
                obj.some((item, i) => {
                    result = findResourceDef(obj[i], obj, i);
                    return result;
                })
            }
            else {
                if (obj::isObject()){
                    if (obj.id === resource.id) { return [parent, key]; }
                    obj::keys().some(prop => {
                        result = findResourceDef(obj[prop], obj, prop);
                        return result;
                    });
                }
            }
            return result;
        }

        let [parent, key] = findResourceDef(this._model);

        if (!parent) {
            throw new Error("Failed to locate the resource in the input model! Generated or unidentified resources cannot be edited!");
        }
        let obj = parent[key]::cloneDeep();
        const dialogRef = this._dialog.open(ResourceEditorDialog, {
            width: '75%',
            data: {
                title          : `Update resource?`,
                modelClasses   : modelClasses,
                modelResources : this._graphData.entitiesByID || {},
                filteredResources : [],
                resource    : obj,
                className   : resource.class
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
                    ["x", "y"].forEach(dim => srcAnchor.layout[dim] = anchor.layout[dim] / scaleFactor);
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
                        //Currently, nested objects are not used in models, all anchors are defined in scaffolds and were updated by the loop above.
                        //  if (srcRegion.borderAnchors){
                        //     (srcRegion.borderAnchors||[]).forEach((srcAnchor, i) => {
                        //         if (srcAnchor::isObject()){
                        //             //Update inline region anchors
                        //         }
                        //     });
                        //  }
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
}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports     : [BrowserModule, WebGLSceneModule, MatSnackBarModule, MatDialogModule,
        BrowserAnimationsModule, ResourceEditorModule,
        //RelGraphModule,
        MatTabsModule, ModelRepoPanelModule, MainToolbarModule, LayoutEditorModule],
	declarations: [TestApp],
    bootstrap   : [TestApp],
    providers   : [
        {
            provide: ErrorHandler,
            useClass: GlobalErrorHandler
        }
    ]
})
export class TestAppModule {}
