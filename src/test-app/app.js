import {NgModule, Component} from '@angular/core';
import {BrowserModule}       from '@angular/platform-browser';
import {WebGLSceneModule}    from '../components/webGLScene';
import {SVGSceneModule }     from '../components/svgScene';

import '../libs/provide-rxjs.js';

@Component({
	selector: 'test-app',
	template: `<h1>ApiNATOMY</h1>
		<div class="scene_selector">
			<input type="radio" name="render_service" (change)="_view = 'SVG'"/> SVG
			<input type="radio" name="render_service" (change)="_view = 'WebGL'" checked/> WebGL
		</div>
        <!--Three.js scene-->
        <webGLScene *ngIf="_view === 'WebGL'"></webGLScene>
        <!--SVG scene-->
        <svgScene *ngIf="_view === 'SVG'"></svgScene>        
	`
})
export class TestApp {
	_view = "WebGL";
	constructor( ) {}

}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports: [ BrowserModule, WebGLSceneModule, SVGSceneModule ],
	declarations: [ TestApp ],
    bootstrap: [TestApp]
})
export class TestAppModule {}
