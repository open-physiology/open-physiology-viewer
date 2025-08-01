import {Component, ElementRef, Input, NgModule, Output, ViewChild} from '@angular/core';
import * as d3 from "d3";
import {values, entries} from 'lodash-bound';
import {CommonModule} from "@angular/common";

window.d3 = d3;
import {
    d3_createRect,
    animate_mergeRects,
    animate_posRects,
    d3_createBagRect,
    d3_getRectDimensions, hideElement, showElement
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
                <div style="display: flex; justify-content: flex-end;">
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
                <svg #svg></svg>
            </div>
            <div *ngIf="showCellList" class="w3-small w3-padding-16" [class.w3-quarter]="showCellList">
                <mat-checkbox *ngFor="let chain of cellChains; let i = index" [value]="i"
                              [matTooltip]="chain.fullID"
                              [checked]="checked[chain.fullID]"
                              (change)="toggleChain(chain)">
                    {{chain.name || chain.fullID}}
                </mat-checkbox>
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

    cellMap = {};
    lyphCellMap = {};
    layerCellLevelMap = {};
    pairCellLevelMap = {};
    checked = {};

    lyphRectMap = {};

    layerSize = {width: 40, height: 60};
    layerSpacing = 1;
    border = {x: 5, y: 16};
    init = {x: 5, y: 5, width: 100};
    right = new Set();

    get center() {
        return 0.45 * Math.max(this.svg?.attr("width"), this.width);
    }

    @Input() width;

    @Input('tooltipRef') set tooltipRef(value){
        if (!value) return;
        this._tooltipRef = value;
        this.tooltip = d3.select(value.nativeElement);
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

    get cellChains() {
        return this.cellMap::values();
    }

    get lyphPair() {
        return this._lyphPair;
    }

    // @Output() onShowLyph = new EventEmitter();
    showLyphs(lyphs) {
        this.selectedLyphs = lyphs;
    }

    showCellLayers() {
        let lyphs = [];
        const addCells = layers => (layers || []).forEach(layer => {
            if (layer.fullID in this.layerCellLevelMap) {
                this.layerCellLevelMap[layer.fullID].forEach(cell => lyphs.push(cell))
            } else {
                lyphs.push({
                    placeholder: true,
                    label: layer.name || layer.fullID,
                    color: layer.color
                })
            }
        });
        addCells(this.lyphA.layers);
        addCells([...this.lyphB.layers].reverse());
        this.showLyphs(lyphs);
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
            //Scale svg
        }
    }

    drawCell(chain, parentGroup, reversed) {
        let group = parentGroup.append("g");
        group.attr("id", "g_" + chain.id);
        this.checked[chain.fullID] = true;

        const createLeftBag = (pos, commonParams) => {
            const [x, y, width, height] = [pos.x + pos.width / 2, pos.y + pos.height / 4, pos.width / 2, pos.height / 4];
            return d3_createBagRect(group, x, y, width, height, ...commonParams, {
                roundLeft: true,
                roundRight: false,
                radius: 8
            });
        }

        const createRightBag = (pos, commonParams, lyph) => {
            const [x, y, width, height] = [pos.x, pos.y + pos.height / 4, pos.width / 2, pos.height / 4];
            this.right.add(lyph.fullID);
            return d3_createBagRect(group, x, y, width, height, ...commonParams, {
                roundLeft: false,
                roundRight: true,
                radius: 8
            });
        }

        (chain.levels || []).forEach((link, i) => {
            let commonParams = [link.conveyingLyph?.color || "lightblue", link.conveyingLyph?.name || link.conveyingLyph?.fullID, this.tooltip];

            const createShape = (hostLyph, isTube= false) => {
                if (!hostLyph || !link.conveyingLyph) return;
                this.saveLayerCellLevels(this.layerCellLevelMap, hostLyph, link.conveyingLyph);
                let shape;
                if (hostLyph.fullID in this.lyphRectMap) {
                    const hostRect = this.lyphRectMap[hostLyph.fullID];
                    if (hostRect) {
                        const pos = d3_getRectDimensions(hostRect);
                        if (isTube) {
                            shape = (i === 0)
                                ? (reversed ? createRightBag(pos, commonParams, link.conveyingLyph) : createLeftBag(pos, commonParams))
                                : (reversed ? createLeftBag(pos, commonParams) : createRightBag(pos, commonParams, link.conveyingLyph));
                        } else {
                            const [x, y, width, height] = [pos.x, pos.y + pos.height / 4, pos.width, pos.height / 4];
                            shape = d3_createBagRect(group, x, y, width, height, ...commonParams, {
                                roundLeft: false,
                                roundRight: false
                            });
                        }
                    }
                } else {
                    console.error("Lyph with a problem", hostLyph, chain);
                }
                return shape;
            }
            let shape = (link.endsIn)? createShape(link.endsIn, true): createShape(link.fasciculatesIn);
            if (shape) {
                shape.on("click", d => this.showLyphs([link.conveyingLyph]));
            }
        });
    }

    saveLayerCellLevels(map, hostLyph, lyph) {
        if (!hostLyph) return;
        map[hostLyph.fullID] = map[hostLyph.fullID] || [];
        if (!map[hostLyph.fullID].find(e => e.fullID === lyph.fullID)) {
            map[hostLyph.fullID].push(lyph);
        }
    }

    drawCells(lyph, reversed) {
        let group = this.svg.append('g');
        if (lyph.fullID in this.lyphCellMap) {
            const chains = Array.from(this.lyphCellMap[lyph.fullID]);
            (chains || []).forEach(c => this.drawCell(c, group, reversed));
        }
        return group;
    }

    pairCoalescingCells() {
        let lastA = this.lyphA.layers[this.lyphA.layers.length - 1];
        let lastB = this.lyphB.layers[this.lyphB.layers.length - 1];
        this.pairCellLevelMap = {};
        this.layerCellLevelMap::entries().forEach(([key, value]) => this.pairCellLevelMap[key] = [...value]);
        (this.pairCellLevelMap[lastA.fullID] || []).forEach(cell => this.saveLayerCellLevels(this.pairCellLevelMap, lastB, cell));
        (this.pairCellLevelMap[lastB.fullID] || []).forEach(cell => this.saveLayerCellLevels(this.pairCellLevelMap, lastA, cell));
    }

    draw() {
        this.svg.selectAll('g').remove();
        if (this.lyphPair.length < 2) return;

        const svgHeight = this.layerSize.height + 2 * this.border.y + 2 * this.init.y;
        let k = (this.lyphA.layers || []).length + (this.lyphB.layers || []).length;
        const svgWidth = 2 * this.layerSize.width * k + 2 * this.border.x + 2 * this.init.x;
        this.svg.attr("width", Math.max(svgWidth, this.width)).attr("height", svgHeight);

        const drawLyph = (lyph, x, y, reversed = false) => {
            let layers = [...lyph.layers||[]];
            if (reversed) layers = layers.reverse();

            const lyphWidth = (this.layerSize.width + this.layerSpacing) * (layers || []).length;
            const commonParams = ["#eee", lyph.name || lyph.fullID, this.tooltip];

            let group = this.svg.append('g');
            let dx = x;
            // Draw main lyph, shifted to emphasize borders
            if (!reversed) {
                d3_createRect(group, x - this.border.x, y - this.border.y,
                    lyphWidth + this.border.x, this.layerSize.height + this.border.y, ...commonParams);
                group.append("text")
                    .attr("x", x - this.border.x + 2) // slight padding
                    .attr("y", y - this.border.y + 12) // vertically offset so it's not touching the edge
                    .text(lyph.name || lyph.fullID)
                    .attr("font-size", "10px")
                    .attr("fill", "black");
            } else {
                d3_createRect(group, x, y, lyphWidth + this.border.x, this.layerSize.height + this.border.y, ...commonParams);
                group.append("text")
                    .attr("x", x + 2) // slight padding
                    .attr("y", y + this.layerSize.height + this.border.y - 4) // vertically offset so it's not touching the edge
                    .text(lyph.name || lyph.fullID)
                    .attr("font-size", "10px")
                    .attr("fill", "black");
            }

            // Draw layers
            layers.forEach((layer, i) => {
                let rect = d3_createRect(group, dx, y,
                    this.layerSize.width, this.layerSize.height,
                    layer.color, layer.name, this.tooltip);
                dx += this.layerSize.width + this.layerSpacing;
                this.lyphRectMap[layer.fullID] = rect;
                rect.on("click", d => this.showLyphs(this.pairCellLevelMap[layer.fullID]));
            });
            return group;
        }

        this.right = new Set();
        this.init.width = this.width - (this.layerSize.width + this.layerSpacing) * ((this.lyphB.layers || []).length);
        this.groupA = drawLyph(this.lyphA, this.init.x, this.init.y + this.border.y);
        this.groupB = drawLyph(this.lyphB, this.init.width, this.init.y + this.border.y, true);
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

