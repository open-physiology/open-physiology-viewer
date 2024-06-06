import {Component, Inject} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA
} from '@angular/material/dialog';

@Component({
    selector: 'resourceEditorDialog',
    template:`
        <h1 *ngIf="data.title" mat-dialog-title>{{data.title}}</h1>
        <div mat-dialog-content>
            <!--Create resource-->
            <resourceEditor [expanded]          = "true"
                            [modelClasses]      = "data.modelClasses"
                            [modelResources]    = "data.modelResources"
                            [resource]          = "data.resource"
                            [className]         = "data.className"
                            [disabled]          = "data.disabled"
            >
            </resourceEditor>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="data.resource" cdkFocusInitial>OK</button>
        </div>
    `
})
export class ResourceEditorDialog {
    dialogRef;
    data;

    constructor( dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
    }

    onNoClick(){
        this.dialogRef.close();
    }
}

