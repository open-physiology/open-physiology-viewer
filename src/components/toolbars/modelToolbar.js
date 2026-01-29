import {Component, Output, EventEmitter, Input, NgModule, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {MatDialogModule} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatListModule} from "@angular/material/list";
import {MatSelectModule} from "@angular/material/select";

@Component({
    selector: 'model-toolbar',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section class="w3-bar-block vertical-toolbar">
            <!-- AI Assistant toggle -->
            <button id="showAssistantBtn" *ngIf="!showAssistant && !hidden('showAssistantBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleAssistant.emit()" title="Show AI Assistant">
                <i class="fa fa-robot"> </i>
            </button>
            <button id="hideAssistantBtn" *ngIf="showAssistant && !hidden('hideAssistantBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleAssistant.emit()" title="Hide AI Assistant">
                <i class="fa fa-window-close"> </i>
            </button>
            <button id="lockBtn" *ngIf="!lockControls && !hidden('lockBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleControls.emit(true)" title="Lock controls">
                <i class="fa fa-lock"> </i>
            </button>
            <button id="unlockBtn" *ngIf="lockControls && !hidden('unlockBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleControls.emit(false)" title="Unlock controls">
                <i class="fa fa-unlock"> </i>
            </button>
            <button id="resetCameraBtn" *ngIf="!hidden('resetCameraBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onResetCamera.emit()" title="Reset controls">
                <i class="fa fa-compass"> </i>
            </button>
            <button id="updateGraphBtn" *ngIf="!hidden('updateGraphBtn')" class="w3-bar-item w3-hover-light-grey" 
                    (click)="onUpdateGraph.emit()" title="Update layout">
                <i class="fa fa-refresh"> </i>
            </button>
            <button id="showSettingsBtn" *ngIf="!showPanel && !hidden('showSettingsBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleShowPanel.emit()" title="Show settings">
                <i class="fa fa-cog"> </i>
            </button>
            <button id="hideSettingsBtn" *ngIf="showPanel && !hidden('hideSettingsBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleShowPanel.emit()" title="Hide settings">
                <i class="fa fa-window-close"> </i>
            </button>
            <button *ngIf="showImports && !hidden('importBtn')" id="importBtn" class="w3-bar-item w3-hover-light-grey"
                    (click)="onImportExternal.emit()" title="Download external models">
                <i class="fa fa-download"> </i>
            </button>
            <button id="processQueryBtn" *ngIf="!hidden('processQueryBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onProcessQuery.emit()" title="Show query result as group">
                <i class="fa fa-question-circle-o"> </i>
            </button>
            <button id="exportJsonBtn" *ngIf="!hidden('exportJsonBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onExportResource.emit('json')" title="Export json">
                <i class="fa fa-file-code-o"> </i>
            </button>
            <button id="exportMapLDBtn" *ngIf="!hidden('exportMapLDBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onExportResource.emit('mapLD')" title="Export json-ld resource map">
                <i class="fa fa-file-text"> </i>
            </button>
            <button id="exportMapLDFlatBtn" *ngIf="!hidden('exportMapLDFlatBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onExportResource.emit('mapLDFlat')" title="Export flattened json-ld resource map">
                <i class="fa fa-file-text-o"> </i>
            </button>
            <button id="exportBondBtn" *ngIf="!hidden('exportBondBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onExportResource.emit('bond')" title="Export Bond Graph for visible network">
                <i>bg</i>
            </button>
            <button id="showReportBtn" *ngIf="loggerColor === 'red' && !hidden('showReportBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onShowReport.emit()" title="Show logs">
                <i class="fa fa-exclamation-triangle" style="color:red"> </i>
            </button>
            <button id="showReportBtn" *ngIf="loggerColor === 'yellow' && !hidden('showReportBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onShowReport.emit()" title="Show logs">
                <i class="fa fa-exclamation-triangle" style="color:yellow"> </i>
            </button>
            <button id="showReportBtn" *ngIf="loggerColor === 'green' && !hidden('showReportBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onShowReport.emit()" title="Show logs">
                <i class="fa fa-check-circle" style="color:green"> </i>
            </button>
            <button id="testWebGLBtn" *ngIf="!hidden('testWebGLBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onTestWebGLObjects.emit()" title="Test WebGL Objects">
                <i class="fa fa-vial"> </i>
            </button>
        </section>
    `,
    styles: [`
        .vertical-toolbar {
            width: 48px;
        }
    `]
})
export class ModelToolbar {
    @Input() showPanel;
    @Input() showImports;
    @Input() lockControls;
    @Input() loggerColor;
    @Input() showAssistant;

    @Output() onToggleControls = new EventEmitter();
    @Output() onToggleShowPanel = new EventEmitter();
    @Output() onResetCamera = new EventEmitter();
    @Output() onUpdateGraph = new EventEmitter();
    @Output() onImportExternal = new EventEmitter();
    @Output() onProcessQuery = new EventEmitter();
    @Output() onExportResource = new EventEmitter();
    @Output() onShowReport = new EventEmitter();
    @Output() onToggleAssistant = new EventEmitter();
    @Output() onTestWebGLObjects = new EventEmitter();

    _skip = new Set();
    @Input() set skip(value){
        if (!value){ this._skip = new Set(); return; }
        if (value instanceof Set){ this._skip = new Set(value); return; }
        if (Array.isArray(value)){ this._skip = new Set(value); return; }
        if (typeof value === 'string'){ this._skip = new Set([value]); return; }
        try { this._skip = new Set(value); } catch(e){ this._skip = new Set(); }
    }
    get skip(){ return this._skip; }
    hidden(id){ return this._skip && this._skip.has(id); }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatListModule, MatSelectModule],
    declarations: [ModelToolbar],
    exports: [ModelToolbar]
})
export class ModelToolbarModule {
}
