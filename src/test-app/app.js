import { NgModule, Component, ViewChild, ElementRef, ErrorHandler } from '@angular/core';
import { BrowserModule }    from '@angular/platform-browser';

//Local
import * as schema from '../data/graphScheme.json';
import initModel from '../data/graph.json';
import { WebGLSceneModule } from '../components/webGLScene';
import { ResourceEditorModule } from '../components/gui/resourceEditor';
import { GlobalErrorHandler } from '../services/errorHandler';
import { modelClasses } from '../models/modelClasses';
import { debug } from '../models/utils';
import { Graph } from '../models/graphModel';
//JSON Editor
import FileSaver  from 'file-saver';
import JSONEditor from "jsoneditor/dist/jsoneditor.min.js";

const ace = require('ace-builds');

//Angular Material
import 'hammerjs';
import { MatSnackBarModule, MatDialogModule } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

//Styles
import 'font-awesome/css/font-awesome.css';
import 'jsoneditor/dist/jsoneditor.min.css';
import "@angular/material/prebuilt-themes/deeppurple-amber.css";
import "./styles/material.scss";

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
                   [type]="'file'"
                   [accept]="'.json'"
                   [style.display]="'none'"
                   (change)="load(fileInput.files)"
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
                <webGLScene [class.w3-threequarter] = "_showJSONEditor"
                    [modelClasses]         = "modelClasses"
                    [graphData]             = "_graphData"
                    (selectedItemChange)    = "onSelectedItemChange($event)"
                    (highlightedItemChange) = "onHighlightedItemChange($event)">
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
    _editor;
    modelClasses = modelClasses;
    @ViewChild('jsonEditor') _container: ElementRef;


    constructor(){
        this.model = initModel;
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
        try {
            this.model = {};
        } catch(err){
            throw new Error("Failed to create a new model: " +  err);
        }
    }

	load(files) {
        const reader = new FileReader();
		reader.onload = () => {
            this.model = JSON.parse(reader.result);
        };

        if (files && files[0]){
            try {
                reader.readAsText(files[0]);
                this._fileName = files[0].name;
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
        const blob = new Blob([result], {type: 'text/plain;charset=utf-8'});
        FileSaver.saveAs(blob, 'apinatomy-model.json');
    }

    onSelectedItemChange(item){}

	onHighlightedItemChange(item){}

	set model(model){
        this._model = model;
        this._graphData = Graph.fromJSON(this._model, modelClasses);
        console.info("ApiNATOMY graph: ", this._graphData);
        if (this._editor){
            this._editor.set(this._model);
        }
    }

    get graphData(){
	    return this._graphData;
    }
}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports     : [ BrowserModule, WebGLSceneModule, MatSnackBarModule, MatDialogModule, BrowserAnimationsModule, ResourceEditorModule],
	declarations: [ TestApp ],
    bootstrap   : [ TestApp ],
    providers   : [
        {
            provide: ErrorHandler,
            useClass: GlobalErrorHandler
        }
    ]
})
export class TestAppModule {}
