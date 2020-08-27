import { BrowserDynamicTestingModule,
    platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

import {OverlayContainer} from '@angular/cdk/overlay';

import {TestBed, inject} from '@angular/core/testing';

import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect,
} from './test.helper';

import sinon from 'sinon';

import {BrowserModule} from "@angular/platform-browser";
import {
    MatAutocompleteModule,
    MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSliderModule
} from "@angular/material";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {CommonModule} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

import {LogInfoModule} from "../src/components/gui/logInfoDialog";
import {SettingsPanelModule} from "../src/components/settingsPanel";
import {HttpClientModule} from "@angular/common/http";

import {SearchBar} from "../src/components/gui/searchBar";
import {ExternalSearchBar} from "../src/components/gui/externalSearchBar";
import {WebGLSceneComponent} from "../src/components/webGLScene";

import basalGanglia from './data/basalGanglia.json';
import {modelClasses} from "../src/model";
import {MainToolbar} from "../src/components/mainToolbar";

let graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses);

describe("Search bar component", () => {
    let searchBar;
    let fixture;
    let container;
    let containerElement;
    let resourceNames = (graphData.resources||[]).filter(e => e.name).map(e => e.name);

    beforeEach(() => {
        TestBed.resetTestEnvironment();
        TestBed.initTestEnvironment(BrowserDynamicTestingModule,
            platformBrowserDynamicTesting());

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, ReactiveFormsModule, BrowserAnimationsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
            declarations: [ SearchBar ]
        });
        fixture = TestBed.createComponent(SearchBar);
        searchBar = fixture.componentInstance;

        searchBar.searchOptions = resourceNames;
        searchBar.ngOnInit();
        fixture.detectChanges();

        inject([OverlayContainer], (oc) => {
            container = oc;
            containerElement = oc.getContainerElement();
        })();
    });

    function sendInput(text: string) {
        let inputElement;
        inputElement = fixture.nativeElement.querySelector('input');
        inputElement.dispatchEvent(new Event('focus'));
        inputElement.dispatchEvent(new Event('focusin'));
        inputElement.dispatchEvent(new Event('input'));
        inputElement.dispatchEvent(new Event('keydown'));
        inputElement.value = text;
        inputElement.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        return fixture.whenStable();
    }

    it("SearchBar is created", () => {
        expect(searchBar).to.be.an('object');
    });

    it("SearchBar finds Cytosol", () => {
        sendInput('Cyto').then(() => {
            let options = Array.from(containerElement.querySelectorAll('mat-option'));
            expect(options.length).to.equal(resourceNames.filter(e => e.includes('Cyto')).length);
        });
    });

    it("SearchBar finds Plasma", () => {
        sendInput('Plasma').then(() => {
            let options = Array.from(containerElement.querySelectorAll('mat-option'));
            expect(options.length).to.equal(resourceNames.filter(e => e.includes('Plasma')).length);
        });
    });

    afterEach(() => {});
});

describe("External search bar component", () => {
    let searchBar;
    let fixture;
    beforeEach(() => {
        TestBed.resetTestEnvironment();
        TestBed.initTestEnvironment(BrowserDynamicTestingModule,
            platformBrowserDynamicTesting());

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, ReactiveFormsModule, BrowserAnimationsModule,  MatAutocompleteModule, MatFormFieldModule, MatInputModule, HttpClientModule],
            declarations: [ ExternalSearchBar ]
        });
        fixture = TestBed.createComponent(ExternalSearchBar);
        searchBar = fixture.componentInstance;
    });

    it("ExternalSearchBar is created", () => {
        expect(searchBar).to.be.an('object');
        //fixture.detectChanges();
        //add conditions
    });

    afterEach(() => {});
});

describe("Model viewer component", () => {
    let viewer;
    let fixture;
    beforeEach(() => {
        TestBed.resetTestEnvironment();
        TestBed.initTestEnvironment(BrowserDynamicTestingModule,
            platformBrowserDynamicTesting());

        TestBed.configureTestingModule({
            imports     : [CommonModule, FormsModule, BrowserModule, MatSliderModule, MatDialogModule, LogInfoModule, SettingsPanelModule,
                BrowserAnimationsModule],
            declarations: [
                WebGLSceneComponent
            ]
        });

        fixture = TestBed.createComponent(WebGLSceneComponent);
        viewer = fixture.componentInstance;
    });

    it("ApiNATOMY viewer created", () => {
        expect(viewer).to.be.an('object');

        //add conditions
    });

    afterEach(() => {});
});

describe("Main toolbar component", () => {
    let toolbar;
    let fixture;
    beforeEach(() => {
        TestBed.resetTestEnvironment();
        TestBed.initTestEnvironment(BrowserDynamicTestingModule,
            platformBrowserDynamicTesting());

        TestBed.configureTestingModule({
            imports     : [CommonModule, FormsModule, BrowserModule],
            declarations: [
                MainToolbar
            ]
        });

        fixture = TestBed.createComponent(MainToolbar);
        toolbar = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("Main toolbar created", () => {
        expect(toolbar).to.be.an('object');
    });

    it("Create new model button works", () => {
        const button = fixture.nativeElement.querySelector('#createBtn');
        button.dispatchEvent(new Event('click'));
        fixture.detectChanges();
        fixture.whenStable().then(() => {
            //TODO expectations
        });
    });

    it("Load model from file button works", () => {
        const button = fixture.nativeElement.querySelector('#loadBtn');
        button.dispatchEvent(new Event('click'));
        //TODO expectations
    });

    it("Join models button works", () => {
        const button = fixture.nativeElement.querySelector('#joinBtn');
        button.dispatchEvent(new Event('click'));
        //TODO expectations
    });

    it("Merge models button works", () => {
        const button = fixture.nativeElement.querySelector('#mergeBtn');
        button.dispatchEvent(new Event('click'));
        //TODO expectations
    });

    it("Toggle model repo buttons work", () => {
        const showBtn = fixture.nativeElement.querySelector('#showRepoBtn');
        showBtn.dispatchEvent(new Event('click'));
        //TODO expectations
        fixture.detectChanges();
        fixture.whenStable().then(() => {
            const hideBtn = fixture.nativeElement.querySelector('#hideRepoBtn');
            hideBtn.dispatchEvent(new Event('click'));
            //TODO expectations
        });
    });

    it("Export model button works", () => {
        const button = fixture.nativeElement.querySelector('#saveBtn');
        button.dispatchEvent(new Event('click'));
        //TODO expectations
    });

    afterEach(() => {});
});


