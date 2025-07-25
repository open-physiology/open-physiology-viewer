import {Component, ElementRef, EventEmitter, Input, NgModule, Output, ViewChild} from '@angular/core';
import * as d3 from "d3";
import {values} from 'lodash-bound';
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

@Component({
    selector: 'coalescence-panel',
    template: `
        <div class="w3-row w3-padding-small">
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
                <div #svgContainer>
                    <svg #svg></svg>
                    <div #tooltip class="tooltip"></div>                   
                </div>
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
    `,
    styles: [`
        .tooltip {
            position: absolute;
            padding: 2px;
            background-color: #f5f5f5;
            font: 12px sans-serif;
            border: 1px solid #666;
            pointer-events: none;
        }

        .mat-checkbox-layout {
            align-items: flex-start !important;
        }
    `]
})
export class CoalescencePanel {
    @ViewChild('svg') svgRef: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;
    @ViewChild('svgContainer') svgContainer: ElementRef;
    showCellList = false;

    cellMap = {};
    lyphCellMap = {};
    checked = {};

    lyphRectMap = {};

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

    @Output() onShowLyph = new EventEmitter();

    layerSize = {width: 40, height: 60};
    layerSpacing = 1;
    border = {x: 5, y: 16};
    init = {x: 5, y: 5, width: 100};

    get center() {
        return 0.45 * this.width;
    }

    ngAfterViewInit() {
        let el = this.svgContainer.nativeElement;
        this.width = 0.8 * el.clientWidth;
        window.addEventListener('resize', () => {
            this.width = 0.8 * el.clientWidth;
        }, false);

        this.svg = d3.select(this.svgRef.nativeElement);
        this.tooltip = d3.select(this.tooltipRef.nativeElement).style("opacity", 0);
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

        const createRightBag = (pos, commonParams) => {
            const [x, y, width, height] = [pos.x, pos.y + pos.height / 4, pos.width / 2, pos.height / 4];
            return d3_createBagRect(group, x, y, width, height, ...commonParams, {
                roundLeft: false,
                roundRight: true,
                radius: 8
            });
        }

        (chain.levels || []).forEach((link, i) => {
            let commonParams = [link.conveyingLyph?.color || "lightblue", link.conveyingLyph?.name || link.conveyingLyph?.fullID, this.tooltip];
            let shape;
            if (link.endsIn) {
                const hostLyph = link.endsIn;
                const hostRect = this.lyphRectMap[hostLyph.fullID];
                if (hostRect) {
                    const pos = d3_getRectDimensions(hostRect);
                    shape = (i === 0)
                        ? (reversed? createRightBag(pos, commonParams):  createLeftBag(pos, commonParams))
                        : (reversed? createLeftBag(pos, commonParams): createRightBag(pos, commonParams));
                }
            } else {
                if (link.fasciculatesIn) {
                    const hostLyph = link.fasciculatesIn;
                    const hostRect = this.lyphRectMap[hostLyph.fullID];
                    if (hostRect) {
                        const pos = d3_getRectDimensions(hostRect);
                        const [x, y, width, height] = [pos.x, pos.y + pos.height / 4, pos.width, pos.height / 4];
                        shape = d3_createBagRect(group, x, y, width, height, ...commonParams, {roundLeft: false, roundRight: false});
                    }
                }
            }
            if (shape) {
                shape.on("click", d => this.onShowLyph.emit(link.conveyingLyph));
            }
        });
    }

    drawCells(lyph, reversed) {
        let group = this.svg.append('g');
        if (!(lyph.fullID in this.lyphCellMap)) {
            console.info("No chains found in the lyph", lyph.fullID);
            return;
        }
        const chains = Array.from(this.lyphCellMap[lyph.fullID]);
        (chains || []).forEach(c => this.drawCell(c, group, reversed));
        return group;
    }

    draw() {
        //Clean the view
        const svgHeight = this.layerSize.height + 2 * this.border.y + 2 * this.init.y;
        this.svg.attr("width", this.width || 600).attr("height", svgHeight);
        this.svg.selectAll('g').remove();

        if (this.lyphPair.length < 2) return;

        const drawLyph = (lyph, x, y, reversed = false) => {
            let layers = [...lyph.layers];
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
            });
            return group;
        }

        this.init.width = this.width - (this.layerSize.width + this.layerSpacing) * ((this.lyphB.layers || []).length);
        this.groupA = drawLyph(this.lyphA, this.init.x, this.init.y + this.border.y);
        this.groupB = drawLyph(this.lyphB, this.init.width, this.init.y + this.border.y, true);
        this.cellGroupA = this.drawCells(this.lyphA);
        this.cellGroupB = this.drawCells(this.lyphB, true);
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
    imports: [CommonModule, MatSliderModule, MatCheckboxModule],
    declarations: [CoalescencePanel],
    exports: [CoalescencePanel]
})
export class CoalescencePanelModule {
}

