import { NgModule, Component, ViewChild, ElementRef } from '@angular/core';
import { BrowserModule }       from '@angular/platform-browser';
import { WebGLSceneModule }    from '../components/webGLScene';
import FileSaver from 'file-saver';
import JSONEditor from "jsoneditor/dist/jsoneditor.min.js";
import '../libs/provide-rxjs.js';
import { DataService } from '../services/dataService';
import * as schema from '../data/manifest.json';

import 'font-awesome/css/font-awesome.css';
import 'jsoneditor/dist/jsoneditor.min.css';

//const Ajv = require('ajv');
const ace = require('ace-builds');

@Component({
	selector: 'test-app',
	template: `<!--Three.js scene-->
		<!-- Top container -->
		<header class="w3-bar w3-top w3-dark-grey">
            <span class="w3-bar-item">
				<i class="fa fa-heartbeat w3-margin-right"></i>ApiNATOMY Lyph Viewer
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

		<section class="w3-sidebar w3-top w3-bar-block" style="width:auto; left: 0px; top: 40px;">
            <input #fileInput
                   [type]          = "'file'"
                   [accept]        = "'.json'"
                   [style.display] = "'none'"
                   (change)        = "load(fileInput.files)"
            />
			<button class="w3-bar-item w3-hover-light-grey" (click)="fileInput.click()" title="Load model">
				<i class="fa fa-folder"></i>
				</button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="!_showJSONEditor" (click)="openEditor()" title="Edit">
                <i class="fa fa-edit"></i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor" (click)="closeEditor()" title="Hide">
                <i class="fa fa-eye-slash"></i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor" (click)="preview()" title="Preview">
                <i class="fa fa-check"></i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor" (click)="save()" title="Export">
                <i class="fa fa-save"></i>
            </button>
        </section>

		<section style="margin-top:40px;"></section>
		
        <section [hidden] = "!_showJSONEditor" 
				 #jsonEditor id="jsonEditor" class="w3-sidebar w3-animate-zoom" 
				 style="margin-left:48px; width:calc(100% - 48px); opacity:0.95;"></section>

    	<webGLScene [graphData]="_graphData" [selected]="_selected" 
					(selectedItemChange)="onSelectedItemChange($event)"
                    (highlightedItemChange)="onHighlightedItemChange($event)"></webGLScene>
		<section class="w3-clear" style="margin-bottom:10px;"></section>

	       <!-- Footer -->
		<footer class="w3-container w3-grey">
            <span class="w3-right">
				<i class="fa fa-code w3-padding-small"></i>natallia.kokash@gmail.com
			</span>
			<span class="w3-right w3-margin-right">
				<i class="fa fa-envelope w3-padding-small"></i>bernard.de.bono@gmail.com
			</span>
        </footer>
	`
})
export class TestApp {
    _dataService;
    _graphData;
    _showJSONEditor = false;
    _model = {};
    _editor;

    @ViewChild('jsonEditor') _container: ElementRef;

    constructor(){
        this._dataService = new DataService();
        this._dataService.init({});
        this._graphData = this._dataService.graphData;
    }

    ngAfterViewInit(){
        this._editor = new JSONEditor(this._container.nativeElement, {
            mode: 'code',
            modes: ['code', 'tree', 'view'],
            onError: function (err) {
                alert(err.toString());
            },
            //ajv: Ajv({ allErrors: true, verbose: true }),
            ace: ace,
            schema: schema
        });
    }

	load(files) {
		const reader = new FileReader();
		reader.onload = () => {
            try {
                this._model = JSON.parse(reader.result);
            }
            catch(err){
                console.error("Cannot parse the input file: ", err)
            }
            try{
                this._editor.set(this._model);
                this._dataService.init(this._model);
                this._graphData = this._dataService.graphData;
            }
            catch(err){
                console.error("Cannot display the model: ", err);
            }
        };
		try {
            reader.readAsText(files[0]);
        } catch (err){
		    console.error("Failed to open the input file: ", err);
        }
	}

	openEditor(){
        this._showJSONEditor = true;
	}

	closeEditor(){
        this._showJSONEditor = false;
	}

	preview(){
        this._showJSONEditor = false;
        this._model = this._editor.get();
        this._dataService.init(this._model);
        this._graphData = this._dataService.graphData;
    }

    save(){
        this._model = this._editor.get();
        let result = JSON.stringify(this._model, null, 4);
        const blob = new Blob([result], {type: 'text/plain;charset=utf-8'});
        FileSaver.saveAs(blob, 'apinatomy-model.json');
    }

    onSelectedItemChange(item){}

	onHighlightedItemChange(item){}

}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports: [ BrowserModule, WebGLSceneModule ],
	declarations: [ TestApp ],
    bootstrap: [TestApp]
})
export class TestAppModule {}
