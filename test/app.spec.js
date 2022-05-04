import { BrowserDynamicTestingModule,
    platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

import {TestBed} from '@angular/core/testing';

import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect,
} from './test.helper';

import {BrowserModule} from "@angular/platform-browser";
import {MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSliderModule} from "@angular/material/slider";

import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";

import {LogInfoModule} from "../src/components/gui/logInfoDialog";
import {SettingsPanelModule} from "../src/components/settingsPanel";
import {WebGLSceneComponent} from "../src/components/webGLScene";

import {MainToolbar} from "../src/components/mainToolbar";
import {ImportExcelModelDialog} from "../src/components/gui/importExcelModelDialog";
import {HttpClientModule} from "@angular/common/http";
import {HotkeyModule, HotkeysCheatsheetComponent} from 'angular2-hotkeys';

describe("MainToolbar component", () => {
    let toolbar;
    let fixture;
    beforeEach(() => {
        TestBed.resetTestEnvironment();
        TestBed.initTestEnvironment(BrowserDynamicTestingModule,
            platformBrowserDynamicTesting());

        TestBed.configureTestingModule({
            imports     : [CommonModule, FormsModule, BrowserModule, MatDialogModule, MatFormFieldModule, MatInputModule, HttpClientModule],
            declarations: [
                MainToolbar, ImportExcelModelDialog
            ],
            providers: [
                {provide: MatDialogRef, useValue: {close: (dialogResult) => {} }}
            ],
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
            //TODO expectations - onCreateModel.emit called with {} as parameter
        });
    });

    it("Load model from file button works", () => {
        const button = fixture.nativeElement.querySelector('#loadBtn');
        button.dispatchEvent(new Event('click'));
        //TODO expectations - onLoadModel.emit called with parsed JSON model as parameter
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
            // const hideBtn = fixture.nativeElement.querySelector('#hideRepoBtn');
            // hideBtn.dispatchEvent(new Event('click'));
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


describe("ModelRepoPanel component", () => {
});

describe("RelationshipGraph component", () => {
});

describe("SettingsPanel component", () => {
});

//FIXME
describe("WebGLScene component", () => {
    let viewer;
    let fixture;
    beforeEach(() => {
        TestBed.resetTestEnvironment();
        TestBed.initTestEnvironment(BrowserDynamicTestingModule,
            platformBrowserDynamicTesting());

        TestBed.configureTestingModule({
            imports     : [CommonModule, FormsModule, BrowserModule, MatSliderModule, MatDialogModule, LogInfoModule, SettingsPanelModule,
                BrowserAnimationsModule, HotkeyModule.forRoot()],
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

