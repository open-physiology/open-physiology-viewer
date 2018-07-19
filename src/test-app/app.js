import { NgModule, Component, ViewChild, ElementRef } from '@angular/core';
import { BrowserModule }       from '@angular/platform-browser';
import { WebGLSceneModule }    from '../components/webGLScene';
import FileSaver from 'file-saver';
import JSONEditor from "jsoneditor/dist/jsoneditor.min.js";
import '../libs/provide-rxjs.js';
import { DataService } from '../services/dataService';

import 'font-awesome/css/font-awesome.css';
import 'jsoneditor/dist/jsoneditor.min.css';

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
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="!_showJSONEditor" (click)="openEditor()" title="Edit model">
                <i class="fa fa-edit"></i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" *ngIf="_showJSONEditor" (click)="closeEditor()" title="Hide model">
                <i class="fa fa-eye-slash"></i>
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
    _json = {};
    _editor;

    @ViewChild('jsonEditor') _container: ElementRef;

    constructor(){
        this._dataService = new DataService();
        this._dataService.init({});
        this._graphData = this._dataService.graphData;
    }

    ngAfterViewInit(){
        this._editor = new JSONEditor(this._container.nativeElement, {});
    }

	load(files) {
		const reader = new FileReader();
		reader.onload = () => {
            this._json = JSON.parse(reader.result);
			this._dataService.init(this._json);
            this._graphData = this._dataService.graphData;
            this._editor.set(this._json);
		};
		reader.readAsText(files[0]);
	}

	openEditor(){
        this._showJSONEditor = !this._showJSONEditor;
	}

	closeEditor(){
        this._showJSONEditor = !this._showJSONEditor;
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
