import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

export interface DialogData {
    className;
    spec;
    resource;
}

@Component({
    selector: 'resource-new',
    template:`
        <h1 mat-dialog-title>Create new {{data.className}}</h1>
        <div mat-dialog-content>
        </div>
        <div mat-dialog-actions>
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="data.resource" cdkFocusInitial>OK</button>
        </div>
    `
})
export class ResourceNewDialog {

    constructor(
        dialogRef: MatDialogRef<ResourceNewDialog >,
    @Inject(MAT_DIALOG_DATA) data: DialogData) {}

    onNoClick(): void {
        this.dialogRef.close();
    }
}