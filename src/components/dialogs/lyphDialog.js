import {Component, Inject, NgModule, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {
    MAT_DIALOG_DATA, MatDialogModule, MatDialogRef
} from '@angular/material/dialog';
import {LyphPanelModule} from "../gui/lyphPanel";
import {CommonModule} from "@angular/common";
import {collectLayerCells, drawLyph, drawCell, showElement, hideElement} from "../utils/svgDraw";
import * as d3 from "d3";
import {values} from "lodash-bound";

@Component({
    selector: 'lyphDialog',
    template: `
        <div class="w3-right">
            <button mat-icon-button (click)="onNoClick()">
                <i class="fa fa-window-close"> </i>
            </button>
        </div>
        <b mat-dialog-title>{{lyph?.name || lyph?.id}}</b>
        <div mat-dialog-content #contentContainer>
            <div class="w3-row w3-margin-bottom">
                <div class="w3-border" [class.w3-threequarter]="showCellList"
                     style="display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: flex-end;">
                        <div *ngIf="hasCells">
                            <button class="w3-bar-item w3-hover-light-grey"
                                    style="height: 42px; width: 48px; border:0;"
                                    (click)="showCellLayers()"
                                    title="Show cell layers">
                                <i class="fa fa-windows"></i>
                            </button>
                            <button *ngIf="!showCellList" class="w3-bar-item w3-hover-light-grey" title="Show cells"
                                    style="height: 42px; width: 48px; border:0;"
                                    (click)="toggleShowCellList()">
                                <i class="fa fa-cog"> </i>
                            </button>
                            <button *ngIf="showCellList" class="w3-bar-item w3-hover-light-grey" title="Hide cells"
                                    style="height: 42px; width: 48px; border:0;"
                                    (click)="toggleShowCellList()">
                                <i class="fa fa-window-close"> </i>
                            </button>
                        </div>
                    </div>
                    <svg #svg></svg>
                </div>
                <div *ngIf="showCellList" class="w3-small w3-padding-16" [class.w3-quarter]="showCellList">
                    <div class=" w3-margin-left">
                        <mat-checkbox *ngFor="let chain of cellChains; let i = index" [value]="i"
                                      [matTooltip]="chain.fullID"
                                      [checked]="checked[chain.fullID]"
                                      (change)="toggleChain(chain)">
                            {{chain.name || chain.fullID}}
                        </mat-checkbox>
                    </div>
                </div>
            </div>

            <div *ngIf="selectedLyphs" class="lyphContainer w3-border">
                <button mat-icon-button class="cross" (click)="selectedLyphs = null">&cross;</button>
                <lyphPanel [lyphs]=selectedLyphs [right]="right" [tooltipRef]="_tooltipRef"></lyphPanel>
            </div>
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

        #contentContainer {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
        }

        .cross {
            position: absolute;
            top: 4px;
            right: 4px;
            border: 0;
            background-color: transparent;
        }
    `]
})
export class LyphDialog {
    dialogRef;
    lyph;

    showCellList = false;

    cellMap = {};
    lyphCellMap = {};
    layerCellLevelMap = {};
    checked = {};
    lyphRectMap = {};
    layerSize = {width: 40, height: 60, spacing: 1, border: {x: 5, y: 16}};
    init = {x: 5, y: 20, width: 100};
    right = new Set();

    @ViewChild('svg') svgRef: ElementRef;
    @ViewChild('contentContainer') contentContainer: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.lyph = data.lyph;
    }

    ngAfterViewInit() {
        this.width = this.contentContainer.nativeElement.clientWidth;

        window.addEventListener('resize', () => {
            this.width = this.contentContainer.nativeElement.clientWidth;
        }, false);

        this.tooltip = d3.select(this.tooltipRef.nativeElement);
        this.svg = d3.select(this.svgRef.nativeElement);
        this.draw();
    }

    get cellChains() {
        return this.cellMap::values();
    }

    get hasCells() {
        return this.cellChains.length > 0;
    }


    showCellLayers() {
        let lyphs = collectLayerCells(this.layerCellLevelMap, this.lyph.layers);
        this.showLyphs(lyphs);
    }

    showLyphs(lyphs) {
        this.selectedLyphs = lyphs;
    }

    toggleChain(chain) {
        this.checked[chain.fullID] = !this.checked[chain.fullID];
        if (this.checked[chain.fullID]) {
            showElement(this.svg, "g_" + chain.id);
        } else {
            hideElement(this.svg, "g_" + chain.id);
        }
    }

    toggleShowCellList() {
        this.showCellList = !this.showCellList;
        if (this.showCellList) {
            this.width *= 3 / 4;
        } else {
            this.width *= 4 / 3;
        }
        this.draw();
    }

    drawCell(chain, parentGroup, reversed, k, n) {
        let group = parentGroup.append("g");
        this.checked[chain.fullID] = true;
        const levelHandler = lyph => this.showLyphs([lyph]);
        drawCell(this.layerCellLevelMap, this.lyphRectMap, this.right, chain, group, reversed, k, n, levelHandler, this.tooltip);
    }

    drawCells(lyph, reversed) {
        let group = this.svg.append('g');

        let maxLength = 0;
        for (const arr of this.lyphCellMap::values()) {
            maxLength = Math.max(maxLength, arr.size);
        }

        if (lyph.fullID in this.lyphCellMap) {
            const chains = Array.from(this.lyphCellMap[lyph.fullID]);
            (chains || []).forEach((c, i) => this.drawCell(c, group, reversed, i, maxLength));
        }
        return group;
    }


    draw() {
        this.svg.selectAll('g').remove();
        const svgHeight = this.layerSize.height + 2 * this.layerSize.border.y + this.init.y;
        let k = (this.lyph.layers || []).length;
        const svgWidth = (this.layerSize.width + this.layerSize.spacing) * k + 2 * this.layerSize.border.x;
        this.svg.attr("width", Math.max(svgWidth, 0.9*this.width)).attr("height", svgHeight);

        const layerCallback = (lyphRef, rect) => {
            this.lyphRectMap[lyphRef] = rect;
            rect.on("click", d => this.showLyphs(this.layerCellLevelMap[lyphRef]));
        }

        this.right = new Set();
        this.group = this.svg.append('g');
        this.init.x = (this.width - svgWidth) / 2 ;
        drawLyph(this.group, this.layerSize, this.lyph, this.init.x, this.init.y,false, layerCallback, this.tooltip);

        this.cellGroup = this.drawCells(this.lyph);
        this.group.node().appendChild(this.cellGroup.node());
        this.svg.node().appendChild(this.cellGroup.node());
    }

    onNoClick() {
        this.dialogRef.close();
    }
}

@NgModule({
    imports: [CommonModule, MatDialogModule, LyphPanelModule],
    declarations: [LyphDialog],
    exports: [LyphDialog]
})
export class LyphDialogModule {
}