import {Component, Inject} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA
} from '@angular/material';

@Component({
    selector: 'resourceEditorDialog',
    template:`
        <h1 *ngIf="data.title" mat-dialog-title>{{data.title}}</h1>
        <div mat-dialog-content>
            <mat-radio-group *ngIf="!!data.actionType" class="action" [(ngModel)]="data.actionType">
                <mat-radio-button class="action w3-margin" *ngFor="let actionType of _actions" [value]="actionType">
                    {{actionType}}
                </mat-radio-button>
            </mat-radio-group>

            <!--Include existing resource-->
            <section [hidden]="!data.actionType || data.actionType === 'Create'">
                <searchBar [selected] = "_selectedName" 
                           [searchOptions] = "_searchOptions"
                           (selectedItemChange) = "selectBySearch($event)">
                </searchBar>
            </section>
            
            <!--Create resource-->
            <resourceEditor [expanded]       = "true"
                            [modelClasses]   = "data.modelClasses"
                            [modelResources] = "data.modelResources"
                            [resource]       = "data.resource"
                            [className]      = "data.className"
                            [disabled]       = "data.disabled || data.actionType === 'Include'"
            >
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
    _actions = ['Create', 'Include'];
    _searchOptions = [];

    constructor( dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
        this._searchOptions = (this.data.modelResources||[])
            .filter(e => e.class === this.data.className).map(e => (e.name? `${e.id} : ${e.name}`: e.id));
    }

    onNoClick(){
        this.dialogRef.close();
    }

    selectBySearch(name) {
        if (name !== this._selectedName) {
            //this._selectedName = name;
            let resource = (this.data.modelResources||[]).find(e => (e.name? `${e.id} : ${e.name}`: e.id) === name);
            this.data.resource = resource.JSON || resource; //show original user definition instead of the expanded version if available
        }
    }

}

