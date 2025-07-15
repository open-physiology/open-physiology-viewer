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
            <button *ngIf="!lockControls" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleControls.emit(true)" title="Lock controls">
                <i class="fa fa-lock"> </i>
            </button>
            <button *ngIf="lockControls" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleControls.emit(false)" title="Unlock controls">
                <i class="fa fa-unlock"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey"
                    (click)="onResetCamera.emit()" title="Reset controls">
                <i class="fa fa-compass"> </i>
            </button>
            <button *ngIf="!antialias" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleAntialias.emit(true)" title="Enable antialiasing">
                <i class="fa fa-paper-plane-o"> </i>
            </button>
            <button *ngIf="antialias" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleAntialias.emit(false)" title="Disable antialiasing">
                <i class="fa fa-paper-plane"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey" 
                    (click)="onUpdateGraph.emit()" title="Update layout">
                <i class="fa fa-refresh"> </i>
            </button>
            <button *ngIf="!showPanel" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleShowPanel.emit()" title="Show settings">
                <i class="fa fa-cog"> </i>
            </button>
            <button *ngIf="showPanel" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleShowPanel.emit()" title="Hide settings">
                <i class="fa fa-window-close"> </i>
            </button>
            <button *ngIf="showImports" id="importBtn" class="w3-bar-item w3-hover-light-grey"
                    (click)="onImportExternal.emit()" title="Download external models">
                <i class="fa fa-download"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey"
                    (click)="onProcessQuery.emit()" title="Show query result as group">
                <i class="fa fa-question-circle-o"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey"
                    (click)="onExportResource.emit('json')" title="Export json">
                <i class="fa fa-file-code-o"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey"
                    (click)="onExportResource.emit('mapLD')" title="Export json-ld resource map">
                <i class="fa fa-file-text"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey"
                    (click)="onExportResource.emit('mapLDFlat')" title="Export flattened json-ld resource map">
                <i class="fa fa-file-text-o"> </i>
            </button>
            <button class="w3-bar-item w3-hover-light-grey"
                    (click)="onExportResource.emit('bond')" title="Export Bond Graph for visible network">
                <i>bg</i>
            </button>
            <button *ngIf="loggerColor === 'red'" class="w3-bar-item w3-hover-light-grey"
                    (click)="onShowReport.emit()" title="Show logs">
                <i class="fa fa-exclamation-triangle" style="color:red"> </i>
            </button>
            <button *ngIf="loggerColor === 'yellow'" class="w3-bar-item w3-hover-light-grey"
                    (click)="onShowReport.emit()" title="Show logs">
                <i class="fa fa-exclamation-triangle" style="color:yellow"> </i>
            </button>
            <button *ngIf="loggerColor === 'green'" class="w3-bar-item w3-hover-light-grey"
                    (click)="onShowReport.emit()" title="Show logs">
                <i class="fa fa-check-circle" style="color:green"> </i>
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
    @Input() antialias;
    @Input() loggerColor;

    @Output() onToggleControls = new EventEmitter();
    @Output() onToggleAntialias = new EventEmitter();
    @Output() onToggleShowPanel = new EventEmitter();
    @Output() onResetCamera = new EventEmitter();
    @Output() onUpdateGraph = new EventEmitter();
    @Output() onImportExternal = new EventEmitter();
    @Output() onProcessQuery = new EventEmitter();
    @Output() onExportResource = new EventEmitter();
    @Output() onShowReport = new EventEmitter();
}

@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatListModule, MatSelectModule],
    declarations: [ModelToolbar],
    exports: [ModelToolbar]
})
export class ModelToolbarModule {
}
