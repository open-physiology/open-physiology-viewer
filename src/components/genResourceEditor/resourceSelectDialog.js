import {Component, Inject} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA
} from '@angular/material/dialog';
import {values} from 'lodash-bound';
import {printFieldValue, parseFieldValue} from "../gui/utils";

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
                       [(ngModel)] = "data.refs"
                >
            </mat-form-field>
            
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="data.refs" cdkFocusInitial>OK</button>
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
        this.data.refs = printFieldValue(this.data.resource);
        this._searchOptions = (this.data.modelResources::values()||[])
            .filter(e => this.data.classNames.includes(e.class))
            .map(e => (e.name? `${e.id} : ${e.name}`: e.id));
    }

    onNoClick(){
        this.dialogRef.close();
    }

    selectBySearch(name) {
        let resource = (this.data.modelResources::values()||[]).find(e => (e.name? `${e.id} : ${e.name}`: e.id) === name);
        if (this.data.multiSelect){
            try {
                let res = parseFieldValue(this.data.refs);
                res.push(resource.id);
                this.data.refs = printFieldValue(res);
            } catch(err) {
                throw new Error("Error while selecting a value!");
            }
        } else {
            this.data.refs = resource.id;
        }
    }
}

