import { NgModule, Component, ViewChild, ElementRef, ErrorHandler } from '@angular/core';
import { BrowserModule }    from '@angular/platform-browser';
import { cloneDeep, isArray, isObject, keys, merge } from "lodash-bound";

import {MatSnackBarModule, MatDialogModule, MatDialog, MatTabsModule} from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

//JSON Editor
import FileSaver  from 'file-saver';
import JSONEditor from "jsoneditor/dist/jsoneditor.min.js";

const ace = require('ace-builds');

//Local
import initModel from '../data/graph.json';
import { WebGLSceneModule } from '../components/webGLScene';
import { ResourceEditorModule } from '../components/gui/resourceEditor';
import { ResourceEditorDialog } from '../components/gui/resourceEditorDialog';
import { RelGraphModule } from "../components/relationGraph";
import { StopPropagation } from "../components/stopPropagation";
import { GlobalErrorHandler } from '../services/errorHandler';
import { modelClasses, schema } from '../model/index';

//TEST import external Graph
//TODO add to package.json "open-physiology-model": "github:open-physiology/open-physiology-model",
//import * as external from 'open-physiology-model'; // /dist/open-physiology-model-minimal
import 'hammerjs';

import 'font-awesome/css/font-awesome.css';
import 'jsoneditor/dist/jsoneditor.min.css';
import "@angular/material/prebuilt-themes/deeppurple-amber.css";
import "./styles/material.scss";

import * as XLSX from 'xlsx';
import {$Field} from "../model/utils";
const {Graph} = modelClasses;

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
                Model: {{_fileName || _graphData?.name || "?"}}
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

        <section class="w3-sidebar w3-bar-block vertical-toolbar">
            <input #fileInput type  = "file" accept = ".json,.xlsx" [style.display] = "'none'" 
                   (change) = "load(fileInput.files)"/>
            <input #fileInput1 type = "file" accept = ".json" [style.display] = "'none'"
                   (change) = "join(fileInput1.files)"/>
            <button class="w3-bar-item w3-hover-light-grey" (click)="newModel()" title="Create model">
                <i class="fa fa-plus"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" (click)="fileInput.click()" title="Load model">
                <i class="fa fa-folder"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" (click)="fileInput1.click()" title="Join model">
                <i class="fa fa-handshake-o"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" (click)="save()" title="Export model">
                <i class="fa fa-save"> </i>
            </button>
        </section>

        <!--Views-->
        
        <section id="main-panel">
            <mat-tab-group animationDuration="0ms">
                <!--Viewer-->
                <mat-tab class="w3-margin">
                    <ng-template mat-tab-label>
                        <i class="fa fa-heartbeat"> Viewer </i>
                    </ng-template>
                    <webGLScene
                            [modelClasses]          = "modelClasses"
                            [graphData]             = "_graphData"
                            (selectedItemChange)    = "onSelectedItemChange($event)"
                            (highlightedItemChange) = "onHighlightedItemChange($event)"
                            (editResource)          = "onEditResource($event)" >
                    </webGLScene>
                </mat-tab>

                <!--Table editor-->
                <mat-tab class="w3-margin">
                    <ng-template mat-tab-label>
                        <i class="fa fa-wpforms"> Resources </i>
                    </ng-template>
                    <section class="w3-sidebar w3-bar-block w3-right vertical-toolbar" style="right:0">
                        <button class="w3-bar-item w3-hover-light-grey" (click)="applyTableEditorChanges()" title="Apply changes">
                            <i class="fa fa-check"> </i>
                        </button>
                    </section>
                    <section id="resource-editor">
                        <resourceEditor
                            [modelClasses]   = "modelClasses"
                            [modelResources] = "_graphData.entitiesByID || {}"
                            [resource]       = "_model"
                            className        = "Graph"
                        >
                        </resourceEditor>
                    </section>
                </mat-tab>

                <!--Code editor-->
                <mat-tab class="w3-margin" label="Code editor">
                    <ng-template mat-tab-label>
                        <i class="fa fa-edit"> Code </i>
                    </ng-template>
                    <section class="w3-sidebar w3-bar-block w3-right vertical-toolbar" style="right:0">
                        <button class="w3-bar-item w3-hover-light-grey" (click)="applyJSONEditorChanges()" title="Apply changes">
                            <i class="fa fa-check"> </i>
                        </button>
                    </section>
                    <section #jsonEditor id="json-editor" > </section>
                </mat-tab>

                <!--Relationship graph-->
                <mat-tab class="w3-margin">
                    <ng-template mat-tab-label>
                        <i class="fa fa-crosshairs"> Relationship graph </i>
                    </ng-template>
                    <relGraph [graphData] = "_graphData"></relGraph>
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
            margin-left: 48px; 
            width      : calc(100% - 48px);
            margin-top : 40px;
        }

        #json-editor{
            height : 100vh;
            width  : calc(100% - 48px);
        }
        
        #resource-editor{
            height : 100vh;
            width  : calc(100% - 48px);
        }

        footer{
            margin-top: 10px;
        }
	`]
})
export class TestApp {
    _graphData;
    _model = {};
    _dialog;
    _editor;
    modelClasses = modelClasses;
    @ViewChild('jsonEditor') _container: ElementRef;

    constructor(dialog: MatDialog){
        this.model = initModel;
        this._dialog = dialog;
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

    newModel(){
        this._fileName = "";
        this.model = {};
    }

	load(files) {
        if (files && files[0]){
            this._fileName = files[0].name;
            let [fileName, extension]  = files[0].name.split('.').slice(0,2);
            extension = extension.toLowerCase();

            const reader = new FileReader();
            reader.onload = () => {
                if (extension === "xlsx"){
                    let model = {};
                    let wb  = XLSX.read(reader.result, {type: "binary"});
                    wb.SheetNames.forEach(sheetName => {
                        let roa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1});
                        if(roa.length) { model[sheetName] = roa; }
                    });
                    model[$Field.id] = fileName;
                    this.model = modelClasses.Graph.excelToJSON(model, this.modelClasses);
                } else {
                    if (extension === "json") {
                        this.model = JSON.parse(reader.result);
                    }
                }
            };

            try {
                if (extension === "json"){
                    reader.readAsText(files[0]);
                } else {
                    if (extension === "xlsx"){
                        reader.readAsBinaryString(files[0]);
                    }
                }
            } catch (err){
                throw new Error("Failed to open the input file: " + err);
            }
        }
	}

    join(files) {
        if (files && files[0]){
            const reader = new FileReader();
            reader.onload = () => {

                let newModel = JSON.parse(reader.result);
                let newConfig = (this._model.config||{})::merge(newModel.config);
                schema.definitions.Graph.properties::keys().forEach(property => {
                    delete newModel[property];
                    delete this._model[property];
                });
                this.model = {"groups": [this._model, newModel], "config": newConfig};
            };
            try {
                reader.readAsText(files[0]);
            } catch (err){
                throw new Error("Failed to open the input file: " + err);
            }
        }
    }

    applyJSONEditorChanges() {
        if (this._editor){
            this._graphData = Graph.fromJSON({}, this.modelClasses);
            this.model = this._editor.get();
        }12345678910
    }

    applyTableEditorChanges(){
        this._graphData = Graph.fromJSON({}, this.modelClasses);
        this.model = this._model;
    }

    save(){
        let result = JSON.stringify(this._model, null, 4);
        const blob = new Blob([result], {type: 'text/plain'});
        FileSaver.saveAs(blob, (this._model.id? this._model.id: 'mainGraph') + '-model.json');
    }

    onSelectedItemChange(item){}

	onHighlightedItemChange(item){}

	set model(model){
        this._model = model;
        try{
            this._graphData = Graph.fromJSON(this._model, this.modelClasses);
        } catch(err){
            throw new Error(err);
        }
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
}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports     : [ BrowserModule, WebGLSceneModule, MatSnackBarModule, MatDialogModule,
        BrowserAnimationsModule, ResourceEditorModule, RelGraphModule, MatTabsModule],
	declarations: [ TestApp, StopPropagation ],
    bootstrap   : [ TestApp ],
    providers   : [
        {
            provide: ErrorHandler,
            useClass: GlobalErrorHandler
        }
    ]
})
export class TestAppModule {}
