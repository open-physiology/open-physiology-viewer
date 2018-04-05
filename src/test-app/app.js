import {NgModule, Component} from '@angular/core';
import {BrowserModule}       from '@angular/platform-browser';
import {WebGLSceneModule}    from '../components/webGLScene';

import '../libs/provide-rxjs.js';
import {TestDataService}   from '../services/testDataService';
import {KidneyDataService} from '../services/kidneyDataService';


@Component({
	selector: 'test-app',
	template: `<!--Three.js scene-->
		<!--<fieldset>-->
		<!--<legend>Dataset:</legend>-->
		<!--<input type="radio" name="dataset" (change)="toggleDataset('test')"/> Generated-->
		<!--<input type="radio" name="dataset" (change)="toggleDataset('kidney')" checked/>-->
		<!--Kidney-->
		<!--</fieldset>-->
		<webGLScene [graphData]="_graphData"></webGLScene>
	`,
	styles: [`
		:host {
			padding:  0;
			margin:   0;
			width:  100%;
			height: 100%;
		}
	`]
})
export class TestApp {
    _kidneyDataService;
    _testDataService;
    _graphData;

    constructor(){
        this._kidneyDataService = new KidneyDataService();
        this._kidneyDataService.init();
        this._graphData = this._kidneyDataService.graphData;
    }

    toggleDataset(name){
        if (name === "kidney"){
            this._graphData = this._kidneyDataService.graphData;
        } else {
            if (!this._testDataService){
                this._testDataService = new TestDataService();
                this._testDataService.init();
            }
            this._graphData = this._testDataService.graphData;
        }
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
