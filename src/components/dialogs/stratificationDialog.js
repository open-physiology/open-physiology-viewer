import {Component, Inject, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';

@Component({
    selector: 'stratificationDialog',
    template: `
        <h1 mat-dialog-title>Select stratification</h1>
        <div mat-dialog-content class="dialog-content">
            <div class="list">
                <button mat-button *ngFor="let st of stratifications"
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
    `]
})
export class StratificationDialog {
    dialogRef;
    data;
    stratifications = [];
    selected;

    vizRectWidth = 20;
    vizHeight = 30;

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data || {};
        this.stratifications = (this.data.stratifications || []).map(st => {
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
                ...st,
                vizStrata,
                vizWidth: vizStrata.length * this.vizRectWidth
            };
        });
        this.selected = this.stratifications && this.stratifications.length > 0 ? this.stratifications[0] : undefined;
    }

    select(st){
        this.selected = st;
    }

    onNoClick(){
        this.dialogRef.close();
    }

    onOkClick(){
        this.dialogRef.close(this.selected);
    }
}

@NgModule({
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    declarations: [StratificationDialog],
    exports: [StratificationDialog]
})
export class StratificationDialogModule {}
