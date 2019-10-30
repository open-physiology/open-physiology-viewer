import {Component, Inject} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA
} from '@angular/material';
import {isArray} from 'lodash-bound';
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
                        <h3 matLine> {{getName(obj)}} </h3>
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

    updateSelected(obj){
        let key = obj[this.data.mapping.id];
        if (!this.selected[key]){
            this.selected[key] = obj;
        } else {
            delete this.selected[key];
        }
    }

    getName(obj){
        let res = obj[this.data.mapping.id];
        let name = obj[this.data.mapping.name];
        if (name) {
            res += " : " + (name::isArray()? name[0]: name);
        }
        return res;
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
            ? `${this.data.baseURL}vocabulary/autocomplete/${this.searchTerm}?prefix=${this.data.type}`
            : option === "exact"
                ? `${this.data.baseURL}vocabulary/term/${this.searchTerm}?prefix=${this.data.type}`
                : `${this.data.baseURL}vocabulary/search/${this.searchTerm}?prefix=${this.data.type}`;

        this.http.get(url).subscribe(res => {
                this._annotations = res.map(x => x.concept? x.concept: x); //TODO place this to the annotations
                let key = this.data.mapping.id;
                //select annotations with unique identifiers
                this._annotations = this._annotations.filter((x, i ) => this._annotations.findIndex(y => y[key] === x[key]) === i);
                this.selected = {};
            }
        )
    }
}

