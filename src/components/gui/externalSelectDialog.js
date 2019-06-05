import {Component, Inject} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA
} from '@angular/material';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'externalSelectDialog',
    template:`
        <h1 *ngIf="data.title" mat-dialog-title>{{data.title}}</h1>
        <div mat-dialog-content>
            <mat-form-field class="full-width">
                <input matInput class="w3-input"
                       placeholder="Search"
                       matTooltip="Describe resource you want to find"
                       type="text"
                       aria-label="Number"
                       [(ngModel)]="searchTerm"
                >
            </mat-form-field>

            <section class="w3-right">
                <button title="Search" class="w3-hover-light-grey" (click)="getAnnotations('search')">
                    <i class="fa fa-search"> </i>
                </button>
                <button title="Autocomplete" class="w3-hover-light-grey" (click)="getAnnotations('auto')">
                    <i class="fa fa-search-plus"> </i>
                </button>
                <button title="Search exact" class="w3-hover-light-grey" (click)="getAnnotations('exact')">
                    <i class="fa fa-search-minus"> </i>
                </button>
            </section>

            <section>
                {{_annotations?.length}} external resources found for the term <b>{{searchTerm}}</b>
                <mat-selection-list #annotations>
                    <mat-list-option *ngFor="let obj of _annotations" (click)="updateSelected(obj)">
                        <h3 matLine> {{obj.curie + (obj.labels ? " : " + obj.labels[0] : "")}} </h3>
                        <p matLine>
                            {{print(resource, " ", 2)}}
                        </p>
                    </mat-list-option>
                </mat-selection-list>

            </section>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="selected" cdkFocusInitial>OK</button>
        </div>
    `,
    styles: [`
        .full-width {
          width: 100%;
        }
    `]
})
export class ExternalSelectDialog {
    searchTerm = null;
    selected = {};
    dialogRef;
    data;

    constructor(http: HttpClient, dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.http  = http;
        this.dialogRef = dialogRef;
        this.data = data;
    }

    onNoClick(){
        this.dialogRef.close();
    }

    updateTerm(name){
        this.searchTerm = name;
    }

    updateSelected(obj){
        let key = obj.curie;
        if (!this.selected[key]){
            this.selected[key] = obj;
        } else {
            delete this.selected[key];
        }
    }

    getAnnotations(option) {
        if (!this.searchTerm){
            throw Error ("Cannot search for an empty term!");
        }

        if (!this.data || !this.data.type){
            throw Error("External repository type is not defined!");
        }

        if (!this.data.baseURL){
            throw Error("External repository URL is not defined!")
        }

        //Autocomplete
        let url = option === "auto"
            ? `${this.data.baseURL}autocomplete/${this.searchTerm}?prefix=${this.data.type}`
            : option === "exact"
                ? `${this.data.baseURL}term/${this.searchTerm}?prefix=${this.data.type}`
                : `${this.data.baseURL}search/${this.searchTerm}?prefix=${this.data.type}`;

        this.http.get(url).subscribe(res => {
                this._annotations = res;
                this.selected = {};
                console.info("HTTP Request succeeded: ", res);
            }
        )
    }

    print = JSON.stringify;
}

