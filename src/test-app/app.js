import {NgModule, Component} from '@angular/core';
import {BrowserModule}       from '@angular/platform-browser';
import {WebGLSceneModule}    from '../components/webGLScene';

import '../libs/provide-rxjs.js';
import {KidneyDataService} from '../services/kidneyDataService';


@Component({
	selector: 'test-app',
	template: `<!--Three.js scene-->
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
    _graphData;

    constructor(){
        this._kidneyDataService = new KidneyDataService();
        this._kidneyDataService.init();
        this._graphData = this._kidneyDataService.graphData;
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
