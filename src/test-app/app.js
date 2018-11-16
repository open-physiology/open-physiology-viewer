import { NgModule, Component, ViewChild, ElementRef, ErrorHandler } from '@angular/core';
import { BrowserModule }    from '@angular/platform-browser';

//Local
import * as schema from '../data/graphScheme.json';
import initModel from '../data/graph.json';
import { WebGLSceneModule } from '../components/webGLScene';
import { ResourceEditorModule } from '../components/resourceEditor';
import { DataService } from '../services/dataService';
import { GlobalErrorHandler } from '../services/errorHandler';

import { debug } from '../models/utils';

//JSON Editor
import FileSaver  from 'file-saver';
import JSONEditor from "jsoneditor/dist/jsoneditor.min.js";

const ace = require('ace-builds');

//Angular Material
import 'hammerjs';
import { MatSnackBarModule } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

//import {NgxSmartModalModule, NgxSmartModalService} from 'ngx-smart-modal';
//import 'ngx-smart-modal/ngx-smart-modal.css';

//Styles
import 'font-awesome/css/font-awesome.css';
import 'jsoneditor/dist/jsoneditor.min.css';
import "@angular/material/prebuilt-themes/pink-bluegrey.css";

let msgCount = {};
debug(true, msgCount);

@Component({
	selector: 'test-app',
	template: `<!--Three.js scene-->
		<!-- Top container -->
		<header class="w3-bar w3-top w3-dark-grey" style="z-index:10;">
            <span class="w3-bar-item">
				<i class="fa fa-heartbeat w3-margin-right"></i>ApiNATOMY
			</span>
            <span class="w3-bar-item" title="About ApiNATOMY">
				<a href="https://youtu.be/XZjldom8CQM"><i class="fa fa-youtube"></i></a>
			</span>
            <span class="w3-bar-item" title="Source code">
				<a href="https://github.com/open-physiology/open-physiology-viewer"><i class="fa fa-github"></i></a>
			</span>
            <span class="w3-bar-item w3-right" title="NIH-SPARC MAP-CORE Project">
				<a href="https://projectreporter.nih.gov/project_info_description.cfm?aid=9538432">
					<i class="fa fa-external-link"></i>
				</a>
			</span>
            <span class="w3-bar-item w3-right" title="Learn more">
				<a href="http://open-physiology.org/"><i class="fa fa-home"></i></a>
            </span>
        </header>

        <!--Left toolbar-->
        <section id="left-toolbar" class="w3-sidebar w3-bar-block">
            <input #fileInput
                   [type]          = "'file'"
                   [accept]        = "'.json'"
                   [style.display] = "'none'"
                   (change)        = "load(fileInput.files)"
            />
            <button class="w3-bar-item w3-hover-light-grey" (click)="newModel()" title="Create model">
                <i class="fa fa-plus"></i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" (click)="fileInput.click()" title="Load model">
                <i class="fa fa-folder"></i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="!_showJSONEditor" (click)="openEditor()" title="Edit">
                <i class="fa fa-edit"></i>
            </button>
            <!--<button class="w3-bar-item w3-hover-light-grey" *ngIf="!_showJSONEditor" -->
                    <!--(click)="export()" title="Export layout">-->
                <!--<i class="fa fa-image"></i>-->
            <!--</button>-->
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor" (click)="closeEditor()" title="Hide">
                <i class="fa fa-eye-slash"></i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor" (click)="preview()" title="Apply changes">
                <i class="fa fa-check"></i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor" (click)="save()" title="Export model">
                <i class="fa fa-save"></i>
            </button>
        </section>

        <!--Editor and canvas-->
        <section class="main-panel">
            <section class="w3-row">
                <section [hidden] = "!_showJSONEditor" #jsonEditor id="json-editor" class ="w3-quarter"></section>
                <webGLScene [graphData]="_graphData" [class.w3-threequarter] = "_showJSONEditor"
                            (selectedItemChange)="onSelectedItemChange($event)"
                            (highlightedItemChange)="onHighlightedItemChange($event)"></webGLScene>
            </section>
        </section>
   
        <!-- Footer -->
		<footer class="w3-container w3-grey">
            <span class="w3-right">
				<i class="fa fa-code w3-padding-small"></i>natallia.kokash@gmail.com
			</span>
			<span class="w3-right w3-margin-right">
				<i class="fa fa-envelope w3-padding-small"></i>bernard.de.bono@gmail.com
			</span>
        </footer>

        <!--<ngx-smart-modal #myModal identifier="myModal">-->
            <!--<div>-->
                <!--<div class="w3-container w3-light-gray">-->
                    <!--<h4>Export bond graph layout?</h4>-->
                <!--</div>-->
                <!--<div class="w3-content w3-padding">-->
                    <!--<b>Include entities: </b>-->
                    <!--<p> {{bondGraphMsg }} </p>-->
                <!--</div>-->
                <!--<div class="w3-container w3-light-gray">-->
                    <!--<div class="w3-right">-->
                        <!--<button (click)="exportCancel()">Cancel</button>-->
                        <!--<button (click)="exportConfirm()">OK</button>-->
                    <!--</div>-->
                <!--</div>-->
            <!--</div>-->
        <!--</ngx-smart-modal>-->
	`,
    styles: [`
        #left-toolbar{
            width : 48px; 
            left  : 0px;
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
    _dataService;
    _graphData;
    _showJSONEditor = false;
    _model = {};
    _editor;

    @ViewChild('jsonEditor') _container: ElementRef;
    //@ViewChild('myModal') _myModal;

    constructor(){ //(modalService: NgxSmartModalService){
        //this._modalService = modalService;
        this._dataService = new DataService();
        this.update(initModel);
    }
    ngAfterViewInit(){
        this._editor = new JSONEditor(this._container.nativeElement, {
            mode: 'code',
            modes: ['code', 'tree', 'view'],
            ace: ace,
            schema: schema
        });
        this._editor.set(this._model);
    }

    newModel(){
        try {
            this._model = {};
            this.update(this._model);
            this._editor.set(this._model);
        } catch(err){
            throw new Error("Failed to create a new model: " +  err);
        }
    }

	load(files) {
        const reader = new FileReader();
		reader.onload = () => {
            try {
                this._model = JSON.parse(reader.result);
                this.update(this._model);
                this._editor.set(this._model);
            } catch(err){
                throw new Error("Cannot load the model: " +  err);
            }
        };

        if (files && files[0]){
            try {
                reader.readAsText(files[0]);
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

	openEditor(){
        this._showJSONEditor = true;
	}

	closeEditor(){
        this._showJSONEditor = false;
	}

	preview(){
        this._showJSONEditor = false;
        this.update(this._editor.get());
    }

    save(){
        this._model = this._editor.get();
        let result = JSON.stringify(this._model, null, 4);
        const blob = new Blob([result], {type: 'text/plain;charset=utf-8'});
        FileSaver.saveAs(blob, 'apinatomy-model.json');
    }

    // export() {
    //     this._modalService.getModal('myModal').open();
    // }

    get bondGraphGroup() {
        if (!this._graphData) {return []; }
        let bondGroup = (this._graphData.groups||[]).find(e => e.id.startsWith("bond"));
        return bondGroup? (bondGroup.entities||[]).map(e => e.id): [];
    }

    get bondGraphMsg() {
        return this.bondGraphGroup.join(', ');
    }

    exportCancel(){
        this._myModal.close();
    }

    exportConfirm(){
        this._myModal.close();
        let result = JSON.stringify(this._dataService.export(this.bondGraphGroup), null, 2);
        const blob = new Blob([result], {type: 'text/plain;charset=utf-8'});
        FileSaver.saveAs(blob, 'apinatomy-layout.json');
    }

    onSelectedItemChange(item){}

	onHighlightedItemChange(item){}

	update(model){
        this._model = model;
        this._dataService.init(this._model);
        this._graphData = this._dataService.graphData;
    }

}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports     : [ BrowserModule, WebGLSceneModule,
        MatSnackBarModule, BrowserAnimationsModule, ResourceEditorModule], //, NgxSmartModalModule.forRoot()
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
