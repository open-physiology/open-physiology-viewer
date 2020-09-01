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

import {
    MatAutocompleteModule,
    MatFormFieldModule, MatInputModule, MatDialogModule, MatSelectModule, MatListModule, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material";

import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {CommonModule} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

import {HttpClientModule} from "@angular/common/http";

import {SearchBar} from "../src/components/gui/searchBar";
import {ExternalSearchBar} from "../src/components/gui/externalSearchBar";
import {ExternalSelectDialog} from "../src/components/gui/externalSelectDialog";

import basalGanglia from './data/basalGanglia.json';
import {modelClasses} from "../src/model";

let graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses);

describe("ExternalSearchBar component", () => {
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

    it("ExternalSearchBar gets annotations for 'blood'", () =>{
        //const query = "https://scigraph.olympiangods.org/scigraph/cypher/execute?cypherQuery=MATCH p=( o { label: 'blood'})-[r*]-(x) RETURN p";
        // searchBar.selected = {
        //     "id"  : "lyph_blood",
        //     "name": "blood"
        // };
        // const button = fixture.nativeElement.querySelector('button');
        // button.dispatchEvent(new Event('click'));
        // fixture.detectChanges();
        // fixture.whenStable().then(() => {
        //     console.log(searchBar.result);
        //     //TODO expectations - executeQuery called, http request executed, searchBar.result field set to show query results
        // });
    });

    afterEach(() => {});
});

describe("ExternalSelectDialog component", () => {
    let dialog;
    let fixture;
    beforeEach(() => {
        TestBed.resetTestEnvironment();
        TestBed.initTestEnvironment(BrowserDynamicTestingModule,
            platformBrowserDynamicTesting());

        TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, ReactiveFormsModule, BrowserAnimationsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatListModule, MatDialogModule, MatSelectModule, HttpClientModule],
            providers: [
                {provide: MatDialogRef, useValue: {close: (dialogResult) => {} }},
                {provide: MAT_DIALOG_DATA, useValue: {}},
            ],
            declarations: [ ExternalSelectDialog ]
        });
        fixture = TestBed.createComponent(ExternalSelectDialog);
        dialog = fixture.componentInstance;
    });

    it("ExternalSelectDialog is created", () => {
        expect(dialog).to.be.an('object');
        //fixture.detectChanges();
        //add conditions
    });

    afterEach(() => {});
});

describe("SearchBar component", () => {
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




