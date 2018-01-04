import {NgModule, Component, ViewChild, ElementRef} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {init} from '../index';

//import '../libs/rxjs';


@Component({
	selector: 'test-app',
	template: `<h1>ApiNatomy</h1>
		<div #main style="width: 800px; height: 600px; background: #ccc"></div>
	`
})
export class TestApp {
    @ViewChild("main", {read: ElementRef}) container: ElementRef;

    /**
	 * The constructor of the component
     */
	constructor() {
	}

    ngAfterViewInit() {
		console.log(container);
		if (this.container){
			console.log(this.container.nativeElement);
			init(this.container.nativeElement);

		} else {
			console.log("No container");
		}
	}
}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
	imports: [
		BrowserModule,
	],
	declarations: [
		TestApp
	],
	bootstrap: [TestApp],
})
export class TestAppModule {}
