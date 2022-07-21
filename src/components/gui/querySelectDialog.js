import {Component, Inject, NgModule} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDialogRef,MAT_DIALOG_DATA,MatDialogModule} from '@angular/material/dialog';
import {MatSelectModule} from '@angular/material/select';

import querySpec from "../../data/queries";
import {keys} from 'lodash-bound';

const QUERY_PREFIX = "/dynamic/demos/apinat/";

@Component({
    selector: 'querySelectDialog',
    template:`
        <h1 *ngIf="data.title" mat-dialog-title>{{data.title}}</h1>
        <div mat-dialog-content>
            <mat-form-field class="full-width">
                <mat-select
                        placeholder="Select a query"
                        matTooltip="Query"
                        [value]="selectedDescription"
                        (selectionChange)="selectQuery($event.value)">
                    <mat-option *ngFor="let description of descriptions; let i = index" [value]="i">
                        {{description}}
                    </mat-option>
                </mat-select>
            </mat-form-field>

            <div *ngFor="let parameter of parameters; let i = index">
                <mat-form-field class="full-width">
                    <input matInput class="w3-input"
                           [placeholder]="parameter?.name"
                           matTooltip="parameter?.description"
                           type="text"
                           [ngModel]="parameterValues[i]"
                    >
                </mat-form-field>
            </div>
            
            <mat-form-field class="full-width">
                <input matInput class="w3-input"
                       placeholder="Query"
                       matTooltip="Execute query"
                       type="text"
                       [ngModel]="selectedQuery"
                >
            </mat-form-field>

            <section *ngIf="status === 'ERROR'">
                <i class="fa fa-exclamation-triangle" style="color:red"> </i>
                {{statusInfo}}
            </section>
            <section *ngIf="status === 'OK'">
                <i class="fa fa-check-circle" style="color:green"> </i>
                {{statusInfo}}
            </section>
            <section *ngIf="status === 'NEW'">
                <i class="fa fa-question-circle"> </i>
                {{statusInfo}} 
            </section>
            
            <section class="w3-right">
                <button title="Search" class="w3-hover-light-grey" (click)="executeQuery()">
                    <i class="fa fa-search"> </i>
                </button>
            </section>

        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="response" cdkFocusInitial>OK</button>
        </div>
    `,
    styles: [`
        .full-width {
          width: 100%; 
        }
    `]
})
export class QuerySelectDialog {
    queries = [];
    selectedIndex = -1;
    descriptions = [];
    parameters = [];
    parameterValues = [];

    response = {};
    dialogRef;
    data;
    status = "NEW";
    statusInfo = "";

    //TODO load queries from http://sparc-data.scicrunch.io:9000/scigraph/swagger.json

    constructor(http: HttpClient, dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.http  = http;
        this.dialogRef = dialogRef;
        this.data = data;
        if (!this.data){
            throw Error("Cannot create query component without input data!")
        }
        if (!this.data.baseURL){
            throw Error("External repository URL is not defined!")
        }
        this.queries = querySpec::keys().filter(key => key.startsWith(QUERY_PREFIX));
        this.descriptions = this.queries.map(key => key.replace(QUERY_PREFIX, "") + ": " + querySpec[key].get && querySpec[key].get.summary);
    }

    onNoClick(){
        this.dialogRef.close();
    }

    selectQuery(index){
        this.selectedIndex = index;
        this.status = "NEW";
        this.statusInfo = "";
        let spec = querySpec[this.queries[this.selectedIndex]];
        this.parameters = (spec.get && spec.get.parameters) || [];
        const n = this.parameters.length;
        this.parameterValues = new Array(n);
        for (let i = 0; i < Math.min(n, (this.data.parameterValues || []).length); i++) {
            this.parameterValues[i] = this.data.parameterValues[i];
        }
    }

    get isIndexValid(){
        return this.selectedIndex > -1 && this.selectedIndex < this.descriptions.length;
    }

    get selectedDescription(){
        return this.isIndexValid? this.descriptions[this.selectedIndex]: "";
    }

    get selectedQuery(){
        if (!this.isIndexValid){
            return "";
        }
        let url = this.data.baseURL + this.queries[this.selectedIndex];
        for (let i = 0; i < this.parameters.length; i++){
            if (url.indexOf(this.parameters[i].name) > -1){
                url = url.replace(`{${this.parameters[i].name}}`, this.parameterValues[i] || "");
            }
        }
        return url;
    }

    executeQuery() {
        let url = this.selectedQuery;
        if (url){
            this.http.get(url).subscribe(
                res => {
                    this.status = res ? "OK" : "ERROR";
                    if (res !== undefined) {
                        this.response = {query: this.selectedDescription, response: res};
                        this.statusInfo = "Retrieved subgraph with: " + (res.nodes||[]).length + " nodes and " + (res.edges||[]).length + " edges";
                    }
                },
                err => {
                    this.status = "ERROR";
                    this.statusInfo = err.message;
                }
            )
        }
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
    declarations: [QuerySelectDialog],
    exports: [QuerySelectDialog]
})
export class QuerySelectModule {
}