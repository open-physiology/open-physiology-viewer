import {Component, ElementRef, Inject, Input, NgModule, ViewChild} from '@angular/core';
import {CommonModule} from "@angular/common";
import * as d3 from "d3";
import {
    d3_createRect,
    d3_createBagRect
} from '../utils/svgDraw';

@Component({
    selector: 'lyphPanel',
    template: `
        <div>
            <b class="w3-padding">{{lyph?.name || lyph?.id}}</b>
            <div #svgLyphContainer id="svgLyphContainer">
                <svg #svg></svg>
                <div #tooltip class="tooltip"></div>
            </div>
        </div>
    `,
    styles: [`
        #svgLyphContainer {
            width: 100%;
            height: 100%;
        }
        
        .tooltip {
            position: absolute;
            padding: 2px;
            background-color: #f5f5f5;
            font: 12px sans-serif;
            border: 1px solid #666;
            pointer-events: none;
        }
    `]
})
export class LyphPanel {
    lyph;
    layerSize = {width: 100, height: 300};
    init = {x: 20, y: 20, width: 100};

    @ViewChild('svg') svgRef: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;
    @ViewChild('svgLyphContainer') svgContainer: ElementRef;

    @Input() lyph;

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

    draw() {
        const svgHeight = ((this.lyph.layers||[]).length || 1) * this.layerSize.height + 2 * this.init.y;
        this.svg.attr("width", this.width || 600).attr("height", svgHeight);
        this.svg.selectAll('g').remove();

        let group = this.svg.append('g');
        let dx = this.init.x;
        let dy = this.init.y;
        (this.lyph.layers || []).forEach((layer, i) => {
            let params = [layer?.color || "lightblue", layer?.name || layer?.fullID, this.tooltip];
            let roundLeft = false, roundRight = false;
            if (i === this.lyph.layers.length -1 && this.lyph.topology === 'BAG' || this.lyph.topology === 'CYST') {
                roundRight = true;
            }
            if (i === 0 && this.lyph.topology === 'BAG2' || this.lyph.topology === 'CYST') {
                roundLeft = true;
            }
            d3_createBagRect(group, dx, dy, this.layerSize.width, this.layerSize.height,...params,
                {roundLeft: roundLeft, roundRight: roundRight, radius: 30});
            dx += this.layerSize.width;
        });
    }
}

@NgModule({
    imports: [CommonModule],
    declarations: [LyphPanel],
    exports: [LyphPanel]
})
export class LyphPanelModule {
}