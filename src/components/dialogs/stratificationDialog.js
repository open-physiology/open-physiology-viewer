import {Component, Inject, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from "@angular/material/checkbox";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'stratificationDialog',
    template: `
        <h1 mat-dialog-title>Select stratification</h1>
        <div mat-dialog-content class="dialog-content">
            <div class="search-bar">
                <img src="./styles/images/search.svg"/>
                <input type="text" class="search-input"
                       placeholder="Search for a stratification"
                       name="searchTerm" [(ngModel)]="searchTerm"
                       (input)="search($event.target.value)"/>
                <span class="search-count" *ngIf="searchTerm !== ''">
                    {{filteredStratifiedTemplates.length}} matches
                </span>
                <img *ngIf="searchTerm !== ''" src="./styles/images/close.svg" class="input-clear"
                     (click)="clearSearch()"/>
            </div>
            <div class="list">
                <button mat-button *ngFor="let st of filteredStratifiedTemplates"
                        class="option-button"
                        [class.selected]="st === selected"
                        (click)="select(st)">
                    <svg class="option-viz" [attr.width]="st.vizWidth" [attr.height]="vizHeight">
                        <rect *ngFor="let r of st.vizStrata"
                              [attr.x]="r.x"
                              [attr.y]="r.y"
                              [attr.width]="r.w"
                              [attr.height]="r.h"
                              [attr.fill]="r.color"/>
                    </svg>
                    <span class="label">{{st.name || st.id}}</span>
                </button>
            </div>
            <mat-checkbox [(ngModel)]="reversed" style="margin-top: 8px;">Reverse</mat-checkbox>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [disabled]="!selected" (click)="onOkClick()" cdkFocusInitial>OK</button>
        </div>
    `,
    styles: [`
        .dialog-content {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 300px;
        }

        .list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 400px;
            overflow: auto;
        }

        .option-button {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 8px;
            text-align: left;
            width: 100%;
            height: auto;
            line-height: normal;
        }

        .option-viz {
            margin-right: 12px;
            border: 1px solid #ccc;
            flex-shrink: 0;
        }

        .selected {
            background-color: rgba(0, 0, 0, 0.04);
            font-weight: 600;
        }

        .label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .search-bar {
            flex-grow: 1;
            position: relative;
        }

        .search-bar .search-input {
            background: #FFFFFF;
            border: 0.067rem solid #E0E0E0;
            box-sizing: border-box;
            border-radius: 0.134rem;
            margin: 0;
            display: block;
            width: 100%;
            height: 2.134rem;
            color: #797979;
            padding: 0 5.5rem 0 1.734rem;
            font-size: 0.75rem;
        }

        .search-bar img {
            z-index: 10;
            position: absolute;
            left: 0.534rem;
            top: 50%;
            transform: translateY(-50%);
            color: #797979;
            font-size: 0.934rem;
        }

        .search-bar img.input-clear {
            right: 0.534rem;
            cursor: pointer;
            left: auto;
        }

        .search-bar .search-input:focus {
            outline: none;
            border-color: #613DB0;
            box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
        }

        .search-bar .search-input::placeholder {
            color: #C0C0C0;
        }

        .search-count {
            position: absolute;
            right: 2.2rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.7rem;
            color: #797979;
            pointer-events: none;
        }
    `]
})
export class StratificationDialog {
    dialogRef;
    data;
    stratifiedTemplates = [];
    filteredStratifiedTemplates = [];
    selected;
    reversed = false;
    searchTerm = '';

    vizRectWidth = 20;
    vizHeight = 30;

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data || {};
        this.stratifiedTemplates =  (this.data.stratifications || []).map((st, index) => {
            const strata = st.strata || [];
            const vizStrata = strata.map((stratum, i) => ({
                x: i * this.vizRectWidth,
                y: 0,
                w: this.vizRectWidth,
                h: this.vizHeight,
                color: stratum.color || "#cccccc"
            }));

            if (vizStrata.length === 0) {
                vizStrata.push({
                    x: 0,
                    y: 0,
                    w: this.vizRectWidth,
                    h: this.vizHeight,
                    color: "#eeeeee"
                });
            }

            return {
                id: st.id,
                name: st.name,
                index: index,
                vizStrata,
                vizWidth: vizStrata.length * this.vizRectWidth
            };
        });
        this.filteredStratifiedTemplates = this.stratifiedTemplates;
        this.selected = this.stratifiedTemplates.length > 0 ? this.stratifiedTemplates[0] : undefined;
    }

    search(value) {
        this.searchTerm = value;
        this.filteredStratifiedTemplates = this.stratifiedTemplates.filter((st) =>
            (st.name && st.name.toLowerCase().includes(value?.toLowerCase())) ||
            (st.id && st.id.toLowerCase().includes(value?.toLowerCase()))
        );
    }

    clearSearch() {
        this.searchTerm = '';
        this.filteredStratifiedTemplates = this.stratifiedTemplates;
    }

    select(st){
        this.selected = st
    }

    onNoClick(){
        this.dialogRef.close();
    }

    onOkClick(){
        this.dialogRef.close({
            stratification: this.data.stratifications[this.selected.index],
            reversed: this.reversed
        });
    }
}

@NgModule({
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatCheckboxModule, FormsModule],
    declarations: [StratificationDialog],
    exports: [StratificationDialog]
})
export class StratificationDialogModule {}
