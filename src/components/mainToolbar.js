import {Component, Output, EventEmitter, Input, NgModule, ChangeDetectionStrategy} from '@angular/core';

import {loadModel} from '../model';
import {ImportExcelModelDialog} from "./gui/importExcelModelDialog";
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
           <input #fileInput type="file" accept=".json,.xlsx" [style.display]="'none'" 
                   (change)="load(fileInput, onLoadModel)"/>
           <input #fileInput1 type="file" accept=".json,.xlsx" [style.display]="'none'"
                   (change)="load(fileInput1, onJoinModel)"/>
           <input #fileInput2 type="file" accept=".json,.xlsx" [style.display]="'none'"
                   (change)="load(fileInput2, onMergeModel)"/>
           <button id="createBtn" class="w3-bar-item w3-hover-light-grey" (click)="create()" title="Create model">
                <i class="fa fa-plus"> </i>
           </button>
           <button id="loadBtn" class="w3-bar-item w3-hover-light-grey" (click)="fileInput.click()" title="Load model">
                <i class="fa fa-folder"> </i>
           </button>
           <button id="joinBtn" class="w3-bar-item w3-hover-light-grey" (click)="fileInput1.click()" title="Join model">
                <i class="fa fa-object-ungroup"> </i>
           </button>
           <button id="mergeBtn" class="w3-bar-item w3-hover-light-grey" (click)="fileInput2.click()" title="Merge with model">
                <i class="fa fa-object-group"> </i>
           </button>
           <button id="showRepoBtn" *ngIf="!showRepoPanel" class="w3-bar-item w3-hover-light-grey"
                    (click)="toggleRepoPanel()" title="Show model repository">
                <i class="fa fa-database"> </i>
           </button>
           <button id="hideRepoBtn" *ngIf="showRepoPanel" class="w3-bar-item w3-hover-light-grey"
                    (click)="toggleRepoPanel()" title="Hide model repository">
                <i class="fa fa-window-close"> </i>
           </button> 
           <button id="importExcelBtn" class="w3-bar-item w3-hover-light-grey" (click)="importExcel()" title="Import Excel model from URI">
               <i class="fa fa-file-excel-o"> </i>
           </button>
           <button id="exportExcelBtn" class="w3-bar-item w3-hover-light-grey" (click)="exportExcel()" title="Export Excel model">
                <i class="fa fa-table"> </i> 
           </button>
           <button id="saveBtn" class="w3-bar-item w3-hover-light-grey" (click)="save()" title="Save model">
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
    @Input()  showRepoPanel;
    @Output() onCreateModel      = new EventEmitter();
    @Output() onLoadModel        = new EventEmitter();
    @Output() onJoinModel        = new EventEmitter();
    @Output() onMergeModel       = new EventEmitter();
    @Output() onExportModel      = new EventEmitter();
    @Output() onToggleRepoPanel  = new EventEmitter();
    @Output() onImportExcelModel = new EventEmitter();

    constructor(http: HttpClient, dialog: MatDialog){
        this._http = http;
        this._dialog = dialog;
    }

    toggleRepoPanel(){
        this.onToggleRepoPanel.emit();
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

    create(){
        this.onCreateModel.emit();
    }

    load(fileInput, event) {
        let files = fileInput.files;
        if (files && files[0]){
            let [name, extension] = fileExtensionRe.exec(files[0].name);
            extension = extension.toLowerCase();

            const reader = new FileReader();
            reader.onload = () => {
                let model = loadModel(reader.result, name, extension);
                event.emit(model);
            }
            try {
                if (extension === "json"){
                    reader.readAsText(files[0]);
                } else {
                    if (extension === "xlsx"){
                        reader.readAsBinaryString(files[0]);
                    }
                }
            } catch (err){
                throw new Error("Failed to open the input file: " + err);
            }
        }
        fileInput.value = '';
    }

    save(){
        this.onExportModel.emit("json");
    }

    exportExcel(){
        this.onExportModel.emit("excel");
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
