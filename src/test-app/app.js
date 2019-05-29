import { NgModule, Component, ViewChild, ElementRef, ErrorHandler } from '@angular/core';
import { BrowserModule }    from '@angular/platform-browser';
import { cloneDeep, isArray, isObject, keys } from "lodash-bound";

//Angular Material
import 'hammerjs';
import {MatSnackBarModule, MatDialogModule, MatDialog, MatRadioModule} from '@angular/material';
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
import { modelClasses } from '../model/modelClasses';
import { Graph, schema } from '../model/graphModel';

//Styles
import 'font-awesome/css/font-awesome.css';
import 'jsoneditor/dist/jsoneditor.min.css';
import "@angular/material/prebuilt-themes/deeppurple-amber.css";
import "./styles/material.scss";

import * as XLSX from 'xlsx';

let consoleHolder = console;
/**
 * Helper function to toggle console logging
 * @param bool - boolean flag that indicates whether to print log messages to the console
 * @param msgCount - optional object to count various types of messages (needed to notify the user about errors or warnings)
 */
function debug(bool, msgCount = {}){
    if(!bool){
        consoleHolder = console;
        console = {};
        consoleHolder::keys().forEach(function(key){
            console[key] = function(){
                if (!msgCount[key]) {
                    msgCount[key] = 0;
                } else {
                    msgCount[key]++;
                }
            };
        })
    }else{
        console = consoleHolder;
    }
}

let msgCount = {};
debug(true, msgCount);

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
				<a href="http://open-physiology.org/demo/open-physiology-viewer/docs/"><i class="fa fa-home"> </i></a>
            </span>
        </header>
        

        <!--Left toolbar-->

        <section id="left-toolbar" class="w3-sidebar w3-bar-block">
            <input #fileInput
                    type   = "file"
                    accept = ".json,.xlsx"
                   [style.display] = "'none'"
                   (change) = "load(fileInput.files)"
            />
            <button class="w3-bar-item w3-hover-light-grey" (click)="newModel()" title="Create model">
                <i class="fa fa-plus"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" (click)="fileInput.click()" title="Load model">
                <i class="fa fa-folder"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="!_showResourceEditor && !_showJSONEditor"
                    (click)="openResourceEditor()" title="Open model editor">
                <i class="fa fa-wpforms"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="!_showJSONEditor && !_showResourceEditor" 
                    (click)="openEditor()" title="Open JSON editor">
                <i class="fa fa-edit"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor || _showResourceEditor"
                    (click)="closeEditor()" title="Close editor">
                <i class="fa fa-window-close"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor || _showResourceEditor" (click)="preview()"
                    title="Apply changes">
                <i class="fa fa-check"> </i>
            </button>
            <button *ngIf="!showRelGraph" class="w3-bar-item w3-hover-light-grey"
                    (click)="toggleRelGraph()" title="Show resource relationships">
                <i class="fa fa-crosshairs"> </i>
            </button>
            <button *ngIf="showRelGraph" class="w3-bar-item w3-hover-light-grey"
                    (click)="toggleRelGraph()" title="Show ApiNATOMY model">
                <i class="fa fa-heartbeat"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" (click)="save()" title="Export model">
                <i class="fa fa-save"> </i>
            </button>
        </section>

        <!--Editor and canvas-->
        
        <section class="main-panel">
            <section class="w3-row" *ngIf="_showResourceEditor">
                <resourceEditor 
                        [modelClasses]   = "modelClasses"
                        [modelResources] = "_graphData.entitiesByID || {}"
                        [resource]       = "_model"
                        className        = "Graph"
                >
                </resourceEditor>
            </section>
            <section class="w3-row">
                <section #jsonEditor id="json-editor" [hidden] = "!_showJSONEditor" class ="w3-quarter"> </section>
                <relGraph *ngIf = "showRelGraph" 
                          [class.w3-threequarter] = "_showJSONEditor" 
                          [graphData] = "_graphData" 
                > 
                </relGraph>
                <webGLScene [hidden] = "showRelGraph"
                        [class.w3-threequarter] = "_showJSONEditor"
                        [modelClasses]          = "modelClasses"
                        [graphData]             = "_graphData"
                        (selectedItemChange)    = "onSelectedItemChange($event)"
                        (highlightedItemChange) = "onHighlightedItemChange($event)"
                        (editResource)          = "onEditResource($event)" >
                </webGLScene>
            </section>
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
        #left-toolbar{
            width : 48px; 
            left  : 0;
            top   : 40px; 
            bottom: 30px;
        }
        
        #json-editor{
            height: 100vh;    
        }
        
        .main-panel{            
            margin-left: 48px; 
            width      : calc(100% - 48px);
            margin-top : 40px;
        }
        
        footer{
            margin-top: 10px;
        }
	`]
})
export class TestApp {
    _graphData;
    _showJSONEditor     = false;
    _showResourceEditor = false;
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
        this.model = {};
    }

	load(files) {
        if (files && files[0]){
            this._fileName = files[0].name;
            let [fileName, extension]  = files[0].name.split('.').slice(0,2);
            extension = extension.toLowerCase();

            const reader = new FileReader();
            reader.onload = () => {
                let model = {};
                if (extension === "xlsx"){
                    let wb  = XLSX.read(reader.result, {type: "binary"});
                    wb.SheetNames.forEach(sheetName => {
                        let roa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1});
                        if(roa.length) { model[sheetName] = roa; }
                    });
                    model["id"] = fileName;
                    this.model = Graph.excelToJSON(model, this.modelClasses);
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

        if (msgCount["error"] || msgCount["warn"]){
            throw new Error(`Detected ${msgCount["error"]} error(s), ${msgCount["warn"]} warning(s), 
                may affect the model layout, check console messages for more detail!`);
        }
        msgCount = {};
	}

    openResourceEditor(){
        this._showResourceEditor = true;
    }

    closeResourceEditor(){
        this._showResourceEditor = false;
    }

    openEditor(){
        this._showJSONEditor = true;
	}

	closeEditor(){
        this._showJSONEditor = this._showResourceEditor = false;
	}

	preview(){
        if (this._showJSONEditor){
            this._showJSONEditor = false;
            this.model = this._editor.get();
        }
        if (this._showResourceEditor){
            this._showResourceEditor = false;
            this.model = this._model;
        }
    }

    save(){
        let result = JSON.stringify(this._model, null, 4);
        const blob = new Blob([result], {type: 'text/plain'});
        FileSaver.saveAs(blob, 'apinatomy-model.json');
    }

    onSelectedItemChange(item){}

	onHighlightedItemChange(item){}

	set model(model){
        this._model = model;
        try{
            this._graphData = Graph.fromJSON(this._model, this.modelClasses);
        } catch(err){
            console.error(err.stack);
            throw new Error("Failed to process the model: " +  err);
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
            return;
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
            if (result){
                parent[key] = result;
                this.model = this._model;
            }
        });
    }

    toggleRelGraph(){
        this.showRelGraph = !this.showRelGraph;
    }
}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports     : [ BrowserModule, WebGLSceneModule, MatSnackBarModule, MatDialogModule, BrowserAnimationsModule, ResourceEditorModule, RelGraphModule],
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
