import {NgModule, Component} from '@angular/core';
import {BrowserModule}       from '@angular/platform-browser';
import {WebGLSceneModule}    from '../components/webGLScene';
import {SVGSceneModule }     from '../components/svgScene';

import '../libs/provide-rxjs.js';

@Component({
	selector: 'test-app',
	template: `<h1>ApiNATOMY</h1>
        <!--Three.js scene-->
        <webGLScene *ngIf="_view === 'WebGL'"></webGLScene>
        <!--SVG scene-->
        <svgScene *ngIf="_view === 'SVG'"></svgScene>        
	`,
	styles: [`
		:host {
			padding:  0;
			margin:   0;
			width:  100%;
			height: 100%;
		}
		
		div.right-panel-bottom {
			position: fixed;
			bottom: 0;
			right: 0;
			margin: 0;
			padding: 0;
			width: 202px;
			border: solid 1px black;
			z-index: 10;
			pointer-events: none;
		}
		
		perfect-scrollbar.right-panel {
			margin: 0;
			padding: 0;
			position: absolute;
			top: 100px;
			right: 0;
			height: calc(100% - 100px);
			width:  202px;
			/*overflow-y: auto;*/
		}
		
		perfect-scrollbar.right-panel.color-picker-open {
			width: 100%;
		}
		
		div.right-panel-inner {
			position: absolute;
			top: 0;
			right: 0;
			margin: 0;
			padding: 0;
			width:  202px;
			border: 1px black;
			border-style: none solid;
			overflow: visible;
			background-color: white;
			min-height: 100%;
		}
		
		div.right-panel-inner > .model-section {
			width: 100%;
			padding-bottom: 5px;
			overflow: visible;
		}
		
		div.right-panel-inner > .model-section.animating {
			overflow: hidden;
		}
		
		div.right-panel-inner > .model-section > h2 {
			margin: 16px 0 6px 0;
			padding: 0 0 0 9px;
			font-family: sans-serif;
			font-size: 18px;
			border-bottom: solid 1px black;
		}
		
		div.right-panel-inner > .model-section > h2 > div {
			margin-bottom: -4px;
		}
		
		div.right-panel-inner > .model-section > .info-panel {
			margin: 2px 4px 0 4px;
		}
		
		div.right-panel-inner > .model-section > .info-panel.visible {
		    animation: slide-in 0.3s both;
		}
		
		div.right-panel-inner > .model-section > .info-panel:not(.visible) {
		    animation: slide-out 0.3s both;
		}
		
		@keyframes slide-in {
			  0% { transform: translateX(200px) }
			100% { transform: translateX(0)     }
		}
		
		@keyframes slide-out {
			  0% { transform: translateX(0)     }
			100% { transform: translateX(200px) }
		}
	`]
})
export class TestApp {
	_view = "WebGL"; //Set to 'SVG' to see the SVG based prototype (does not work)
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
