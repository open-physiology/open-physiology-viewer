import {Component, Inject, NgModule} from '@angular/core';
import {
    MAT_DIALOG_DATA, MatDialogModule,
    MatDialogRef
} from '@angular/material/dialog';
import {CoalescencePanelModule} from "../gui/coalescencePanel";
import {LyphPanelModule} from "../gui/lyphPanel";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'coalescenceDialog',
    template: `
        <div>
            <b mat-dialog-title>{{coalescence?.name || coalescence?.id}}</b>
            <div mat-dialog-content #clsContainer id="clsContainer">
                <div *ngFor="let lyphPair of lyphPairs">
                    <coalescence-panel
                            [lyphPair]="lyphPair"
                            (onShowLyph)="showLyph($event)"
                    ></coalescence-panel>
                </div>
                <div *ngIf="selectedLyph" #lyphContainer class="lyphContainer">
                    <button mat-icon-button class="cross" (click)="selectedLyph = null">&cross;</button>
                    <lyphPanel [lyph]=selectedLyph></lyphPanel>
                </div>
            </div>
            <div mat-dialog-actions align="end">
                <button mat-button title="Cancel" (click)="onNoClick()">Close</button>
            </div>
        </div>
    `,
    styles: [`
        #clsContainer {
            width: 100%;
            height: 80%;
        }
        .lyphContainer {
            position: absolute;
            background-color: #f5f5f5;
            padding: 2px;
            border: 1px solid #666;
            left: 50px;
            top: 50px;
            width: 600px;
            height: 400px;
        }
        .cross {
            position: absolute;
            left: 94%;
            top: 0;
            border: 0;
            background-color: transparent;
        }
    `]
})
export class CoalescenceDialog {
    dialogRef;
    coalescence;
    lyphPairs = [];

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.coalescence = data.coalescence;
    }

    ngAfterViewInit() {
        this.lyphPairs = this.uniquePairs(this.coalescence.lyphs);
    }

    showLyph(lyph){
        this.selectedLyph = lyph;
    }

    uniquePairs(array) {
        if (!Array.isArray(array)) {
            return [];
        }

        if (array.length < 3) {
            return [array];
        }

        return array.reduce(
            (previousValue, currentValue, index) =>
                previousValue.concat(
                    array.slice(index + 1).map((value) => [currentValue, value]),
                ),
            [],
        );
    }

    onNoClick() {
        this.dialogRef.close();
    }
}

@NgModule({
    imports: [CommonModule, MatDialogModule, CoalescencePanelModule, LyphPanelModule],
    declarations: [CoalescenceDialog],
    exports: [CoalescenceDialog]
})
export class CoalescenceDialogModule {
}