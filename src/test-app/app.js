import {NgModule, Component} from '@angular/core';
import {BrowserModule}       from '@angular/platform-browser';
import {SceneModule}         from '../components/scene';

import '../libs/provide-rxjs.js';

@Component({
	selector: 'test-app',
	template: `<h1>ApiNatomy</h1>
		<scene [container]="container"></scene>
		<div #container></div>
	`
})
export class TestApp {
	constructor( ) {}
}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports: [ BrowserModule, SceneModule ],
	declarations: [ TestApp ],
    bootstrap: [TestApp]
})
export class TestAppModule {}
