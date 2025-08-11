import {Component, ElementRef, Input, NgModule, Output, ViewChild, EventEmitter} from '@angular/core';
import * as d3 from "d3";
import {values, entries} from 'lodash-bound';
import {CommonModule} from "@angular/common";

window.d3 = d3;
import {
    updateLyphMap,
    collectLayerCells,
    drawLyph,
    animate_mergeRects,
    animate_posRects,
    drawCell, hideElement, showElement
} from '../utils/svgDraw';
import {MatSliderModule} from "@angular/material/slider";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {LyphPanelModule} from "./lyphPanel";
import {MatTooltipModule} from "@angular/material/tooltip";

@Component({
    selector: 'coalescence-panel',
    template: `
        <div class="w3-row w3-margin-bottom">
            <div class="w3-border" [class.w3-threequarter]="showCellList"
                 style="display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: flex-end;align-items: center;">
                    <span style="margin-right: 8px;">{{label}}</span>
                    <mat-slider class="w3-bar-item w3-light-grey"
                                style="height: 42px; width:100px;"
                                [min]="0"
                                [max]="1"
                                [step]="0.1"
                                tickInterval="1"
                                [value]="scale"
                                title="Lyph distance"
                                (change)="onScaleChange($event.value)"
                    >
                    </mat-slider>
                    <button class="w3-bar-item w3-hover-light-grey"
                            style="height: 42px; width: 48px; border:0;"
                            (click)="draw()"
                            title="Refresh">
                        <i class="fa fa-refresh"></i>
                    </button>
                    <div *ngIf="hasCells">
                        <button *ngIf="!showCells" class="w3-bar-item w3-hover-light-grey"
                                style="height: 42px; width: 48px; border:0;"
                                (click)="onShowTab.emit()"
                                title="Show details">
                            <i class="fa fa-door-open"></i>
                        </button>
                        <button *ngIf="showCells" class="w3-bar-item w3-hover-light-grey"
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
    `,
    styles: [`
        .lyphContainer {
            position: relative;
            width: 100%;
            height: 100%;
        }

        .cross {
            position: absolute;
            top: 4px;
            right: 4px;
            border: 0;
            background-color: transparent;
        }

        .mat-checkbox-layout {
            align-items: flex-start !important;
        }
    `]
})
export class CoalescencePanel {
    @ViewChild('svg') svgRef: ElementRef;
    showCellList = false;
    checked = {};

    //Cell chains, chain.fullID -> Chain
    cellMap = {};
    //Cell chains per host lyph, host.fullID -> set<Chain>
    lyphCellMap = {};
    layerCellLevelMap = {};
    pairCellLevelMap = {};
    lyphRectMap = {};

    layerSize = {width: 40, height: 60, spacing: 1, border: {x: 5, y: 16}};
    init = {x: 5, y: 20, width: 100};
    right = new Set();

    get center() {
        return 0.45 * Math.max(this.svg?.attr("width"), this.width);
    }

    @Input() showCells;
    @Input() width;
    @Input() label;

    @Input('tooltipRef') set tooltipRef(value) {
        if (!value) return;
        this._tooltipRef = value;
        this.tooltip = d3.select(this._tooltipRef.nativeElement);
    }

    @Input('lyphPair') set lyphPair(value) {
        this._lyphPair = value;
        this.cellMap = {};

        const getChain = (lyph, parent) => (lyph.bundlesChains || []).forEach(c => {
            this.cellMap[c.fullID] = c;
            this.lyphCellMap[parent.fullID] = this.lyphCellMap[parent.fullID] || new Set();
            this.lyphCellMap[parent.fullID].add(c);
        });

        (this.lyphA.layers || []).forEach(layer => getChain(layer, this.lyphA));
        (this.lyphB.layers || []).forEach(layer => getChain(layer, this.lyphB));
    }

    get lyphA() {
        return this._lyphPair[0];
    }

    get lyphB() {
        return this._lyphPair[1];
    }

    get lyphPair() {
        return this._lyphPair;
    }

    get cellChains() {
        return this.cellMap::values();
    }

    get hasCells(){
        return this.cellChains.length > 0;
    }

    @Output() onShowTab = new EventEmitter();

    showLyphs(lyphs) {
        this.selectedLyphs = lyphs;
    }

    showCellLayers() {
        let lyphsA = collectLayerCells(this.layerCellLevelMap, this.lyphA.layers);
        let lyphsB = collectLayerCells(this.layerCellLevelMap, [...this.lyphB.layers].reverse());
        this.showLyphs([...(lyphsA || []), ...(lyphsB || [])]);
    }

    ngAfterViewInit() {
        this.svg = d3.select(this.svgRef.nativeElement);
        this.draw();
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

    pairCoalescingCells() {
        let lastA = this.lyphA.layers[this.lyphA.layers.length - 1];
        let lastB = this.lyphB.layers[this.lyphB.layers.length - 1];
        this.pairCellLevelMap = {};
        this.layerCellLevelMap::entries().forEach(([key, value]) => this.pairCellLevelMap[key] = [...value]);
        (this.pairCellLevelMap[lastA.fullID] || []).forEach(cell => updateLyphMap(this.pairCellLevelMap, lastB, cell));
        (this.pairCellLevelMap[lastB.fullID] || []).forEach(cell => updateLyphMap(this.pairCellLevelMap, lastA, cell));
    }

    draw() {
        this.svg.selectAll('g').remove();
        if (this.lyphPair.length < 2) return;

        const svgHeight = this.layerSize.height + 2 * this.layerSize.border.y + this.init.y;
        let k = (this.lyphA.layers || []).length + (this.lyphB.layers || []).length;
        const svgWidth = 2 * (this.layerSize.width + this.layerSize.spacing) * k + 2 * this.layerSize.border.x;
        this.svg.attr("width", Math.max(svgWidth, this.width)).attr("height", svgHeight);

        const layerCallback = (lyphRef, rect) => {
            this.lyphRectMap[lyphRef] = rect;
            rect.on("click", d => this.showLyphs(this.pairCellLevelMap[lyphRef]));
        }

        this.right = new Set();
        this.init.width = this.width - (this.layerSize.width + this.layerSize.spacing) * ((this.lyphB.layers || []).length);
        this.groupA = this.svg.append('g');
        this.groupB = this.svg.append('g');
        drawLyph(this.groupA, this.layerSize, this.lyphA, this.init.x, this.init.y, false, layerCallback, this.tooltip);
        drawLyph(this.groupB, this.layerSize, this.lyphB, this.init.width, this.init.y, true, layerCallback, this.tooltip);
        this.cellGroupA = this.drawCells(this.lyphA);
        this.cellGroupB = this.drawCells(this.lyphB, true);
        this.pairCoalescingCells();

        this.groupA.node().appendChild(this.cellGroupA.node());
        this.groupB.node().appendChild(this.cellGroupB.node());
        animate_mergeRects(this.groupA, this.groupB, this.layerSize.width, this.layerSize.height, this.center);
        this.groupA.node().removeChild(this.cellGroupA.node());
        this.groupB.node().removeChild(this.cellGroupB.node());
        this.svg.node().appendChild(this.cellGroupA.node());
        this.svg.node().appendChild(this.cellGroupB.node());
        this.scale = 0;
    }

    onScaleChange(newScale) {
        this.scale = newScale;
        this.groupA.node().appendChild(this.cellGroupA.node());
        this.groupB.node().appendChild(this.cellGroupB.node());
        animate_posRects(this.groupA, this.groupB, this.layerSize.width, this.layerSize.height, this.center, 1 - this.scale);
        this.groupA.node().removeChild(this.cellGroupA.node());
        this.groupB.node().removeChild(this.cellGroupB.node());
        this.svg.node().appendChild(this.cellGroupA.node());
        this.svg.node().appendChild(this.cellGroupB.node());
    }
}

@NgModule({
    imports: [CommonModule, MatSliderModule, MatCheckboxModule, LyphPanelModule, MatTooltipModule],
    declarations: [CoalescencePanel],
    exports: [CoalescencePanel]
})
export class CoalescencePanelModule {
}

