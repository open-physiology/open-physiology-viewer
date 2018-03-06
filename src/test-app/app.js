import {NgModule, Component} from '@angular/core';
import {BrowserModule}       from '@angular/platform-browser';
import {WebGLSceneModule}    from '../components/webGLScene';

import '../libs/provide-rxjs.js';

@Component({
	selector: 'test-app',
	template: `<!--Three.js scene-->
		<webGLScene></webGLScene>
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
export class TestApp {}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports: [ BrowserModule, WebGLSceneModule ],
	declarations: [ TestApp ],
    bootstrap: [TestApp]
})
export class TestAppModule {}
