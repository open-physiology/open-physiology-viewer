import { BrowserDynamicTestingModule,
    platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import {OverlayContainer} from '@angular/cdk/overlay';

import {TestBed, inject} from '@angular/core/testing';

import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect, after,
} from './test.helper';

import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatListModule} from "@angular/material/list";
import {MatDialogModule, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";

import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {CommonModule} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

import {HttpClientModule} from "@angular/common/http";

import {SearchBar} from "../src/components/gui/searchBar";
import {ExternalSearchBar} from "../src/components/gui/externalSearchBar";
import {ExternalSelectDialog} from "../src/components/gui/externalSelectDialog";

import basalGanglia from './data/basalGanglia.json';
import {modelClasses} from "../src/model";
import {CSG} from 'three-csg-ts';
import {THREE} from "../src/view/utils";
import {By} from "@angular/platform-browser";

describe("Solid constructive geometry works", () => {
    beforeEach(() => {});

    it("Operations on meshes performed correctly", () => {
        const objA = new THREE.CylinderGeometry(10, 10, 20, 10, 4);
        const objB = new THREE.CylinderGeometry(5, 10, 10, 10, 4);
        const meshA = new THREE.Mesh(objA);
        const meshB = new THREE.Mesh(objB);
        const meshC = CSG.intersect(meshA, meshB);
        const meshD = CSG.subtract(meshA, meshB);
        const meshE = CSG.union(meshA, meshB);
        expect(meshC).to.be.an('object');
        expect(meshD).to.be.an('object');
        expect(meshE).to.be.an('object');
    });

    afterEach(() => {});
});

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
    let resourceNames;
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses);
        resourceNames = (graphData.resources||[]).filter(e => e.name).map(e => e.name);
    });

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
        let inputElement = fixture.debugElement.query(By.css('input'));
        inputElement.triggerEventHandler('focus', {});
        inputElement.triggerEventHandler('focusin', {});
        inputElement.triggerEventHandler('input', {target:{value: ""}});
        inputElement.triggerEventHandler('keydown', {});
        inputElement.triggerEventHandler('input', {target:{value: text}});
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

    after(() => {
        graphData.logger.clear();
    });
});




