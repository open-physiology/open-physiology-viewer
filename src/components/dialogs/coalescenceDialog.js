import {Component, Inject, NgModule, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {
    MAT_DIALOG_DATA, MatDialogModule,
    MatDialogRef
} from '@angular/material/dialog';
import {CoalescencePanelModule} from "../panels/coalescencePanel";
import {CommonModule} from "@angular/common";
import {MatTabsModule, MatTabGroup} from '@angular/material/tabs';

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
            <button mat-icon-button (click)='onNoClick()'>
                <i class="fa fa-window-close"> </i>
            </button>
        </div>
        <div style="height: 40px; overflow: hidden; padding-left: 10px;">
            <b mat-dialog-title>{{ coalescence?.name || coalescence?.id }}</b>
        </div>
        <div mat-dialog-content #contentContainer>
            <mat-tab-group animationDuration="0ms" #lyphPairTabGroup dynamicHeight>
                <mat-tab *ngIf="lyphPairs.length > 1" class="w3-margin w3-border">
                    <ng-template mat-tab-label>Overview</ng-template>
                    <div class="overview-container">
                        <div *ngFor="let lyphPair of lyphPairs; let i = index">
                            <coalescence-panel [lyphPair]="lyphPair" [tooltipRef]="tooltipRef"
                                               [width]="width"
                                               [showCells]="false"
                                               [label]="i+1"
                                               (onShowTab)="onShowTab(i+1)"
                            ></coalescence-panel>
                        </div>
                    </div>
                </mat-tab>

                <mat-tab *ngFor="let lyphPair of lyphPairs; let i = index" class="w3-margin w3-border">
                    <ng-template mat-tab-label>{{ i + 1 }}</ng-template>
                    <coalescence-panel [lyphPair]="lyphPair" [tooltipRef]="tooltipRef"
                                       [width]="width"
                                       [showCells]="true"
                    ></coalescence-panel>
                </mat-tab>
            </mat-tab-group>
        </div>
        <div #tooltip class="tooltip"></div>
    `,
    styles: [`
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

        #contentContainer {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
        }

        ::ng-deep .mat-tab-group {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-height: 0; /* important for flex children */
            height: 100%;
            width: 100%;
        }

        ::ng-deep .mat-tab-body-wrapper {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-height: 0;
            height: 100% !important;
            width: 100% !important;
        }

        ::ng-deep .mat-tab-body {
            flex: 1 1 auto;
            overflow: auto;
            display: block;
            width: 100%;
            height: 100%;
        }

        .mat-dialog-content {
            height: calc(100% - 50px);
            max-height: none;
            overflow: hidden !important;
            margin: 0;
            padding: 0;
        }

        .overview-container {
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .selected {
            border: 3px solid #000;
        }
    `]
})
export class CoalescenceDialog {
    dialogRef;
    coalescence;
    lyphPairs = [];
    @ViewChild('contentContainer') contentContainer: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;
    @ViewChild('lyphPairTabGroup') _tabGroup: MatTabGroup;

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.coalescence = data.coalescence;
    }

    @Output() resizeDialog = new EventEmitter();

    toggleSize() {
        this.isMaximized = !this.isMaximized;
        this.resizeDialog.emit(this.isMaximized);
        
        // Use a recursive timeout to catch any late transitions
        const update = (count) => {
            if (this.contentContainer) {
                this.width = this.contentContainer.nativeElement.clientWidth;
            }
            if (this._tabGroup) {
                this._tabGroup.realignInkBar();
            }
            window.dispatchEvent(new Event('resize'));
            if (count > 0) {
                setTimeout(() => update(count - 1), 100);
            }
        };
        setTimeout(() => update(3), 150);
    }

    ngAfterViewInit() {
        if (this.contentContainer) {
            this.width = this.contentContainer.nativeElement.clientWidth;
        }

        window.addEventListener('resize', () => {
            if (this.contentContainer) {
                this.width = this.contentContainer.nativeElement.clientWidth;
            }
        }, false);

        this.lyphPairs = this.uniquePairs(this.coalescence.lyphs);
    }

    onShowTab(index) {
        this._tabGroup.selectedIndex = index;
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
    imports: [CommonModule, MatDialogModule, MatTabsModule, CoalescencePanelModule],
    declarations: [CoalescenceDialog],
    exports: [CoalescenceDialog]
})
export class CoalescenceDialogModule {
}