import {Component, Inject} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import {HttpClient} from "@angular/common/http";

@Component({
    selector: 'importDialog',
    template:`
        <h1 mat-dialog-title>The model wants to import external models:</h1>
        <div mat-dialog-content>
            <section >
                <mat-selection-list #urls>
                    <mat-list-option *ngFor="let url of _urls; let i = index;">
                        <h3 matLine> {{url}} </h3>
                    </mat-list-option>
                </mat-selection-list>
            </section>
            
            <section class="w3-right"> 
                <button title="Import" class="w3-hover-light-grey" (click)="getImports()">
                    <i class="fa fa-download"> </i>
                </button>
            </section> 
            
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="imported_models" cdkFocusInitial>OK</button>
        </div>
    `,
    styles: [`
        .full-width {
          width: 100%;
        }
    `]
})
export class ImportDialog {
    dialogRef;
    _urls = [];
    imported_models = {};
    skip = new Set()

    constructor(http: HttpClient, dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.http  = http;
        this.dialogRef = dialogRef;
        this._urls = data.imports;
    }

    updateSelected(i){
        if (this.skip.has(i)){
            this.skip.delete(i);
        } else {
            this.skip.add(i);
        }
    }

    isChecked(i) {
        return !this.skip.has(i);
    }

    getImports(){
        this.imported_models = [];
        (this._urls||[]).forEach((url, i) => {
            if (this.isChecked(i)){
                this.http.get(url).subscribe(res => {
                    if (res !== undefined && res.download_url) {
                        this.http.get(res.download_url).subscribe(res2 => {
                            this.imported_models.push(res2);
                        })
                    }
                })
            }
        });
    }

    onNoClick(){
        this.dialogRef.close();
    }
}

