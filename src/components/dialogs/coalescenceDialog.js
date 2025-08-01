import {Component, Inject, NgModule, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {
    MAT_DIALOG_DATA, MatDialogModule,
    MatDialogRef
} from '@angular/material/dialog';
import {CoalescencePanelModule} from "../gui/coalescencePanel";
import {CommonModule} from "@angular/common";
import {MatTabsModule} from '@angular/material/tabs';
import * as d3 from "d3";

@Component({
    selector: 'coalescenceDialog',
    template: `
        <div class="w3-right">
            <button *ngIf="!isMaximized" mat-icon-button (click)="toggleSize()">
                <i class="fa fa-window-maximize"> </i>
            </button>
            <button *ngIf="isMaximized" mat-icon-button (click)="toggleSize()">
                <i class="fa fa-window-restore"> </i>
            </button>
           <button mat-icon-button (click)="onNoClick()">
                <i class="fa fa-window-close"> </i>
           </button>
        </div>
        <b mat-dialog-title>{{coalescence?.name || coalescence?.id}}</b>
        <div mat-dialog-content #clsContainer class="clsContainer">
            <mat-tab-group animationDuration="0ms" #lyphPairTabGroup>
                <mat-tab *ngFor="let lyphPair of lyphPairs; let i = index" class="w3-margin">
                    <ng-template mat-tab-label>{{i + 1}}</ng-template>
                    <coalescence-panel [lyphPair]="lyphPair" [tooltipRef]="tooltipRef" [width]="width"
                    ></coalescence-panel>
                </mat-tab>
            </mat-tab-group>
        </div>
        <div #tooltip class="tooltip"></div>        
    `,
    styles: [`
       .clsContainer {
          position: relative;
          width: 100%;
       }

        .tooltip {
            position: absolute;
            padding: 2px;
            background-color: #f5f5f5;
            font: 12px sans-serif;
            border: 1px solid #666;
            pointer-events: none;
            opacity: 0;
            z-index: 10000;
        }
        
        .cross {
            position: absolute;
            top: 4px;
            right: 4px;
            border: 0;
            background-color: transparent;
        }
        
        mat-tab-group {
            width: inherit;
        }
    `]
})
export class CoalescenceDialog {
    dialogRef;
    coalescence;
    lyphPairs = [];
    @ViewChild('clsContainer') clsContainer: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.coalescence = data.coalescence;
    }

    @Output() resizeDialog = new EventEmitter();

    toggleSize(){
        this.isMaximized = !this.isMaximized;
        this.resizeDialog.emit(this.isMaximized);
    }

    ngAfterViewInit() {
        let el = this.clsContainer.nativeElement;
        this.width = 0.9 * el.clientWidth;

        window.addEventListener('resize', () => {
             this.width = 0.9*el.clientWidth;
        }, false);

        this.lyphPairs = this.uniquePairs(this.coalescence.lyphs);
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
    imports: [CommonModule, MatDialogModule, CoalescencePanelModule, MatTabsModule],
    declarations: [CoalescenceDialog],
    exports: [CoalescenceDialog]
})
export class CoalescenceDialogModule {
}