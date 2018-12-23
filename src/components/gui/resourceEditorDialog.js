import {Component, Inject, NgModule} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA,
    MatDialogModule,
} from '@angular/material';
import {ResourceEditorModule} from "./resourceEditor";

@Component({
    selector: 'resourceEditorDialog',
    template:`
        <h1 *ngIf = "data.title" mat-dialog-title>{{data.title}}</h1>
        <div mat-dialog-content>
            <resourceEditor 
                    [expanded]    = "true"
                    [resource]    = "data.resource" 
                    [className]   = "data.className" 
                    [modelClasses]= "data.modelClasses">
            </resourceEditor>
        </div>
        <div mat-dialog-actions>
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="data.resource" cdkFocusInitial>OK</button>
        </div>
    `
})
export class ResourceEditorDialog {
    dialogRef;
    data;

    constructor( dialogRef: MatDialogRef<ResourceEditorDialog>, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
    }

    onNoClick(){
        this.dialogRef.close();
    }
}

@NgModule({
    imports: [MatDialogModule, ResourceEditorModule],
    declarations: [ResourceEditorDialog],
    entryComponents: [ResourceEditorDialog],
    exports: [ResourceEditorDialog]
})
export class ResourceEditorDialogModule {

}