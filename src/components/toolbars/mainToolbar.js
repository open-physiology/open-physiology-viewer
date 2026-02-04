import {Component, Output, EventEmitter, Input, NgModule, ChangeDetectionStrategy} from '@angular/core';

import {loadModel} from '../../model';
import {ImportExcelModelDialog} from "../dialogs/importExcelModelDialog";
import {MatDialog,MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';

import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {HttpClient} from "@angular/common/http";
import {MatListModule} from "@angular/material/list";
import {MatSelectModule} from "@angular/material/select";

const fileExtensionRe = /(?:\.([^.]+))?$/;

@Component({
    selector: 'main-toolbar',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
       <section class="w3-sidebar w3-bar-block vertical-toolbar">
           <input #fileInput type="file" accept=".json,.xlsx" [style.display]="'none'" multiple 
                   (change)="load(fileInput, onLoadModel)"/>
           <input #fileInput1 type="file" accept=".json,.xlsx" [style.display]="'none'" multiple
                   (change)="load(fileInput1, onJoinModel)"/>
           <input #fileInput2 type="file" accept=".json,.xlsx" [style.display]="'none'" multiple
                   (change)="load(fileInput2, onMergeModel)"/>
           <button id="createBtn" *ngIf="!hidden('createBtn')" class="w3-bar-item w3-hover-light-grey" (click)="onCreateModel.emit()" title="Create model">
                <i class="fa fa-plus"> </i>
           </button>
           <button id="loadBtn" *ngIf="!hidden('loadBtn')" class="w3-bar-item w3-hover-light-grey" (click)="fileInput.click()" title="Load model">
                <i class="fa fa-folder"> </i>
           </button>
           <button id="importExcelBtn" *ngIf="!hidden('importExcelBtn')" class="w3-bar-item w3-hover-light-grey" (click)="importExcel()" title="Import Excel model from URI">
               <i class="fa fa-file-excel-o"> </i>
           </button>
           <button id="joinBtn" *ngIf="!hidden('joinBtn')" class="w3-bar-item w3-hover-light-grey" (click)="fileInput1.click()" title="Join model">
                <i class="fa fa-object-ungroup"> </i>
           </button>
           <button id="mergeBtn" *ngIf="!hidden('mergeBtn')" class="w3-bar-item w3-hover-light-grey" (click)="fileInput2.click()" title="Merge with model">
                <i class="fa fa-object-group"> </i>
           </button>
           <button id="showRepoBtn" *ngIf="!showRepoPanel && !hidden('showRepoBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleRepoPanel.emit()" title="Show model repository">
                <i class="fa fa-database"> </i>
           </button>
           <button id="hideRepoBtn" *ngIf="showRepoPanel && !hidden('hideRepoBtn')" class="w3-bar-item w3-hover-light-grey"
                    (click)="onToggleRepoPanel.emit()" title="Hide model repository">
                <i class="fa fa-window-close"> </i>
           </button> 
           <!-- Save changes -->
           <button id="commitBtn" *ngIf="!hidden('commitBtn')" class="w3-bar-item w3-hover-light-grey" (click)="onModelCommit.emit()" title="Commit changes">
               <i class="fa fa-code-commit"> </i>
           </button>
           <button id="exportExcelBtn" *ngIf="!hidden('exportExcelBtn')" class="w3-bar-item w3-hover-light-grey" (click)="onExportModel.emit('excel')" title="Export Excel model">
                <i class="fa fa-table"> </i> 
           </button>           
           <button id="exportJSONLDBtn" *ngIf="!hidden('exportJSONLDBtn')" class="w3-bar-item w3-hover-light-grey" (click)="onExportModel.emit('json-ld')" title="Export JSON-LD model">
                <i class="fa fa-file-text"> </i> 
           </button>
           <button id="saveBtn" *ngIf="!hidden('saveBtn')" class="w3-bar-item w3-hover-light-grey" (click)="onExportModel.emit('json')" title="Save JSON model">
                <i class="fa fa-save"> </i> 
           </button>
        </section>
    `,
    styles: [`
        .vertical-toolbar{
            width : 48px;  
        }
	`]
})
export class MainToolbar {
    @Input() showRepoPanel;
    @Output() onCreateModel      = new EventEmitter();
    @Output() onLoadModel        = new EventEmitter();
    @Output() onJoinModel        = new EventEmitter();
    @Output() onMergeModel       = new EventEmitter();
    @Output() onExportModel      = new EventEmitter();
    @Output() onToggleRepoPanel  = new EventEmitter();
    @Output() onImportExcelModel = new EventEmitter();
    @Output() onModelCommit      = new EventEmitter();

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

    constructor(http: HttpClient, dialog: MatDialog){
        this._http = http;
        this._dialog = dialog;
    }

    importExcel(){
        const dialogRef = this._dialog.open(ImportExcelModelDialog, {width: '75%'});

        dialogRef.afterClosed().subscribe(spreadsheetID => {
            if (spreadsheetID !== undefined){
                let url = `https://docs.google.com/spreadsheets/d/${spreadsheetID}/export?format=xlsx`;
                this._http.get(url,{responseType: 'arraybuffer'}).subscribe(
                    res => {
                        let model = loadModel(res, spreadsheetID, "xlsx");
                        this.onImportExcelModel.emit(model);
                    },
                    err => {
                        console.error(err);
                        throw new Error("Failed to import Google spreadsheet model!");
                    }
                );
            }
        });
    }


    load(fileInput, event) {
        let files = fileInput.files;
        if (files && files.length > 0){
            let modelFile = [...files].find(f => {
                let [name, extension] = fileExtensionRe.exec(f.name);
                return ["json", "xlsx"].includes(extension.toLowerCase());
            });

            if (!modelFile) {
                fileInput.value = '';
                return;
            }

            let [name, extension] = fileExtensionRe.exec(modelFile.name);
            extension = extension.toLowerCase();

            const reader = new FileReader();
            reader.onload = () => {
                let model = loadModel(reader.result, name, extension);
                event.emit(model);
            }
            try {
                if (extension === "json"){
                    reader.readAsText(modelFile);
                } else {
                    if (extension === "xlsx"){
                        reader.readAsBinaryString(modelFile);
                    }
                }
            } catch (err){
                throw new Error("Failed to open the input file: " + err);
            }
        }
        fileInput.value = '';
    }

}
@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatListModule, MatSelectModule],
    declarations: [MainToolbar, ImportExcelModelDialog],
    entryComponents: [ImportExcelModelDialog],
    exports: [MainToolbar]
})
export class MainToolbarModule {
}
