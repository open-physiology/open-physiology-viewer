import {Component, Inject} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA,
} from '@angular/material';

@Component({
    selector: 'fieldEditorDialog',
    template:`
        <h1 *ngIf = "data.title" mat-dialog-title>{{data.title}}</h1>
        <div mat-dialog-content>
            <fieldEditor
                    [expanded] = true
                    [value] = "data.value"
                    [label] = "data.key"
                    [spec]  = "data.spec">
            </fieldEditor>
        </div>
        <div mat-dialog-actions>
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="data.value" cdkFocusInitial>OK</button>
        </div>
    `
})
export class FieldEditorDialog {
    dialogRef;
    data;

    constructor( dialogRef: MatDialogRef<FieldEditorDialog>, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
    }

    onNoClick(){
        this.dialogRef.close();
    }
}
