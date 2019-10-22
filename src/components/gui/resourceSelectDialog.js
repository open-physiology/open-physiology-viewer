import {Component, Inject} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA
} from '@angular/material';
import {values} from 'lodash-bound';

@Component({
    selector: 'resourceSelectDialog',
    template:`
        <h1 *ngIf="data.title" mat-dialog-title>{{data.title}}</h1>
        <div mat-dialog-content>
            <!--Include existing resource-->
            <searchBar [selected]           = "_selectedName" 
                       [searchOptions]      = "_searchOptions"
                       (selectedItemChange) = "selectBySearch($event)"
            >
            </searchBar>

            <mat-form-field>
                <input matInput class = "w3-input"
                       placeholder = "id"
                       matTooltip  = "Identifier of a resource to include"
                       [(ngModel)] = "data.ids"
                >
            </mat-form-field>
            
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="data.ids" cdkFocusInitial>OK</button>
        </div>
    `
})
export class ResourceSelectDialog {
    dialogRef;
    data;
    _searchOptions = [];

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
        this.data.ids = this.data.multiSelect? (this.data.resource || []).join(","): this.data.resource;
        this._searchOptions = (this.data.modelResources::values()||[])
            .filter(e => e.class === this.data.className)
            .filter(e => !(this.data.filteredResources||[]).includes(e.id))
            .map(e => (e.name? `${e.id} : ${e.name}`: e.id));
    }

    onNoClick(){
        this.dialogRef.close();
    }

    selectBySearch(name) {
        let resource = (this.data.modelResources::values()||[]).find(e => (e.name? `${e.id} : ${e.name}`: e.id) === name);
        if (this.data.multiSelect){
            let newIds = this.data.ids.split(",").filter(x => !!x);
            newIds.push(resource.id);
            this.data.ids = newIds.join(",");
        } else {
            this.data.ids = resource.id; //show original user definition instead of the expanded version if available
        }
    }
}

