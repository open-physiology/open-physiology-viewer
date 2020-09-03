import {Component} from '@angular/core';
import {
    MatDialogRef
} from '@angular/material';

@Component({
    selector: 'importExcelModelDialog',
    template:`
        <h1 mat-dialog-title>Import model from Google spreadsheets</h1>
        <div mat-dialog-content>
            <mat-form-field class="full-width">
                <input matInput class="w3-input"
                       placeholder="spreadsheet-id"
                       matTooltip="Insert spreadsheet-id"
                       type="text"
                       aria-label="Spreadsheet identifier"
                       [(ngModel)]="spreadsheetID"
                >
            </mat-form-field>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="spreadsheetID" cdkFocusInitial>OK</button>
        </div>
    `,
    styles: [`
        .full-width {
          width: 100%;
        }
    `]
})
export class ImportExcelModelDialog {
    spreadsheetID = "1dy12y8mLp82Fe8NeWQa2NmxSiS5Ogy4ef1wbLU8-jGg";
    dialogRef;

    constructor(dialogRef: MatDialogRef) {
        this.dialogRef = dialogRef;
    }

    onNoClick(){
        this.dialogRef.close();
    }
}

