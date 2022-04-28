import {Component, Inject} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import {HttpClient} from "@angular/common/http";

@Component({
    selector: 'importDialog',
    template:`
        <h1 mat-dialog-title>The model wants to import external resources:</h1>
        <div mat-dialog-content>
            <section >
                <mat-selection-list #urls>
                    <mat-list-option *ngFor="let url of _urls; let i = index;" [selected]="_selected[i]">
                        <section matLine>
                            {{url}}
                            <section class="w3-right">
                                <i *ngIf="_status[i] === 'ERROR'" class="fa fa-exclamation-triangle" style="color:red"> </i>
                                <i *ngIf="_status[i] === 'OK'"    class="fa fa-check-circle" style="color:green"> </i>
                                <i *ngIf="_status[i] === 'NEW'"   class="fa fa-question-circle-o"> </i>
                            </section>
                        </section>
                    </mat-list-option> 
                </mat-selection-list>
            </section>
                       
            <section>{{_statusInfo}}</section>
            <section class="w3-right"> 
                <button title="Import selected resources" class="w3-hover-light-grey" (click)="getImports()">
                    <i class="fa fa-download"> </i>
                </button>
            </section> 
            
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button title="Cancel" (click)="onNoClick()">Cancel</button>
            <button mat-button title="Include to the model?" [mat-dialog-close]="imported_models" cdkFocusInitial>OK</button>
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
    _status = [];
    _selected = [];
    _statusInfo = "";
    imported_models = {};

    constructor(http: HttpClient, dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.http  = http;
        this.dialogRef = dialogRef;
        this._urls = data.imports;
        this._status = new Array(this._urls.length).fill("NEW");
        this._selected = new Array(this._urls.length).fill(true);
        this._statusInfo = "";
    }

    updateSelected(i){
        this._selected[i] = !this._selected[i];
    }

    getImports(){
        this.imported_models = [];
        let counter = 0;
        const updateInfo = (res, i) => {
              this.imported_models.push(res);
              this._status[i] = "OK";
              counter += 1;
              this._statusInfo = `Successfully downloaded ${counter} out of ${this._urls.length} resources!`;
        }
        (this._urls||[]).forEach((url, i) => {
            this._status[i] = "NEW";
            if (this._selected[i]){
                this.http.get(url).subscribe(res => {
                    if (res !== undefined) {
                        if (res.download_url) {
                            this.http.get(res.download_url).subscribe(res2 => updateInfo(res2, i))
                        } else {//raw url, already downloaded
                            updateInfo(res, i);
                        }
                    } else {
                        this._status[i] = "ERROR";
                    }
                },
                e => {
                    this._status[i] = "ERROR";
                })
            }
        });
    }

    onNoClick(){
        this.dialogRef.close();
    }
}

