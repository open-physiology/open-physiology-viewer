import { NgModule, Component } from '@angular/core';
import {BrowserModule}       from '@angular/platform-browser';
import {WebGLSceneModule}    from '../components/webGLScene';

import '../libs/provide-rxjs.js';
import { DataService } from '../services/dataService';

import 'font-awesome/css/font-awesome.css';

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

		<section style="margin-top:40px;"></section>
	    <webGLScene [graphData]="_graphData"></webGLScene>
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

    constructor(){
        this._dataService = new DataService();
        this._dataService.init();
        this._graphData = this._dataService.graphData;
    }

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
