import {Component, Output, EventEmitter, Input, NgModule} from '@angular/core';

import {MatDialog, MatDialogModule, MatFormFieldModule, MatInputModule} from '@angular/material';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {HttpClient} from "@angular/common/http";

const fileExtensionRe = /(?:\.([^.]+))?$/;

@Component({
    selector: 'snapshot-toolbar',
    template: `
       <section class="w3-sidebar w3-bar-block vertical-toolbar" title="Snapshot model">
           <input #fileInput type="file" accept=".json" [style.display]="'none'"
                   (change)="load(fileInput.files)"/>
           <button id="createBtn" class="w3-bar-item w3-hover-light-grey" (click)="create()" title="Create new snapshot model">
                <i class="fa fa-plus"> </i>
           </button>
           <button id="loadBtn" class="w3-bar-item w3-hover-light-grey" (click)="fileInput.click()" title="Load snapshot model">
                <i class="fa fa-folder"> </i>
           </button>
           <button id="snapshotBtn" class="w3-bar-item w3-hover-light-grey" (click)="saveState()" title="Save model state">
                <i class="fa fa-photo"> </i> 
           </button> 
           <button id="snapshotBtn" class="w3-bar-item w3-hover-light-grey" (click)="previousState()" title="Return to saved state">
                <i class="fa fa-step-backward"> </i> 
           </button> 
           <button id="snapshotBtn" class="w3-bar-item w3-hover-light-grey" (click)="nextState()" title="Return to saved state">
                <i class="fa fa-step-forward"> </i> 
           </button> 
           <button id="saveBtn" class="w3-bar-item w3-hover-light-grey" (click)="save()" title="Export snapshot model">
                <i class="fa fa-save"> </i> 
           </button>
        </section>
    `,
    styles: [`
        .vertical-toolbar{
            width : 48px; 
            margin-top: 280px;
        }
	`]
})
export class SnapshotToolbar {
    @Input()  showRepoPanel;

    @Output() onSaveState        = new EventEmitter();
    @Output() onPreviousState    = new EventEmitter();
    @Output() onNextState        = new EventEmitter();

    @Output() onCreateSnapshot   = new EventEmitter();
    @Output() onLoadSnapshot     = new EventEmitter();
    @Output() onSaveSnapshot     = new EventEmitter();

    constructor(http: HttpClient, dialog: MatDialog){
        this._http = http;
        this._dialog = dialog;
    }

    create(){
        this.onCreateSnapshot.emit();
    }

    load(files) {
        if (files && files[0]){
            let [name, extension] = fileExtensionRe.exec(files[0].name);
            extension = extension.toLowerCase();

            const reader = new FileReader();
            reader.onload = () => {
                let snapshot = JSON.parse(reader.result);
                this.onLoadSnapshot.emit(snapshot);
            };
            try {
                if (extension === "json"){
                    reader.readAsText(files[0]);
                }
            } catch (err){
                throw new Error("Failed to open the input file: " + err);
            }
        }
    }

    save(){
        this.onSaveSnapshot.emit();
    }

    saveState(){
        this.onSaveState.emit();
    }

    previousState(){
        this.onPreviousState.emit();
    }

    nextState(){
        this.onNextState.emit();
    }

}
@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
    declarations: [SnapshotToolbar],
    exports: [SnapshotToolbar]
})
export class SnapshotToolbarModule {
}
