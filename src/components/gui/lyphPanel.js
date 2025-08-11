import {Component, ElementRef, Input, NgModule, ViewChild} from '@angular/core';
import {CommonModule} from "@angular/common";
import * as d3 from "d3";
import {
    d3_createRect,
    d3_createBagRect
} from '../utils/svgDraw';
import {entries} from 'lodash-bound';

@Component({
    selector: 'lyphPanel',
    template: `
        <b class="w3-padding">{{lyph?.name || lyph?.id}}</b>
        <div #svgLyphContainer id="svgLyphContainer">
            <svg #svg></svg>
        </div>
    `,
    styles: [`
        #svgLyphContainer {
            width: 100%;
            height: 100%;
        }
    `]
})
export class LyphPanel {
    @ViewChild('svg') svgRef: ElementRef;
    @ViewChild('svgLyphContainer') svgContainer: ElementRef;

    lyphSize = {width: 200, height: 200};
    init = {x: 20, y: 20, width: 100};
    border = 10;
    placeholder = 40;

    @Input() right;

    @Input('lyphs') set lyphs(value) {
        if (this.lyphs !== value) {
            this._lyphs = value;
            this.draw();
        }
    }

    @Input('tooltipRef') set tooltipRef(value) {
        if (!value) return;
        this.tooltip = d3.select(value.nativeElement);
    }

    get lyphs() {
        return this._lyphs;
    }

    ngAfterViewInit() {
        let el = this.svgContainer.nativeElement;
        this.width = 0.9 * el.clientWidth;
        this.heigth = 0.9 * el.clientHeight;
        window.addEventListener('resize', () => {
            this.width = 0.9 * el.clientWidth;
        }, false);

        this.svg = d3.select(this.svgRef.nativeElement);
        this.draw();
    }

    draw() {
        if (!this.svg) return;
        const svgHeight = this.lyphSize.height + 2 * this.init.y;
        const n = (this.lyphs || []).length;
        const k = (this.lyphs || []).filter(lyph => lyph.placeholder).length;
        let svgWidth = (n - k) * this.lyphSize.width + k * this.placeholder + 2 * n * this.border + 2 * this.init.x;
        this.svg.attr("width", Math.max(svgWidth, this.width)).attr("height", svgHeight);
        this.svg.selectAll('*').remove();

        let zoomGroup = this.svg.append('g');

        let dx = this.init.x;
        let dy = this.init.y;
        let max_dy = dy;

        this.lyphs.forEach((lyph, i) => {
            if (Array.isArray(lyph)){
                // group -> layer with several cells
                lyph.forEach(cell => {
                     max_dy = Math.max(max_dy, dy);
                     this.drawLyph(dx, dy, cell, zoomGroup);
                     dy += this.lyphSize.height + 2 * this.border;
                });
            } else {
                this.drawLyph(dx, dy, lyph, zoomGroup);
            }
            dy = this.init.y;
            dx += (lyph.placeholder ? this.placeholder : this.lyphSize.width);
        });

        this.svg.attr("height", Math.max(this.svg.attr("height"), max_dy));

        const zoom = d3.zoom()
            .scaleExtent([0.5, 10])  // zoom out/in limits
            .on("zoom", () => zoomGroup.attr("transform", d3.event.transform));

        // Attach zoom behavior to SVG
        this.svg.call(zoom);
    }

    drawLyph(init_x, init_y, lyph, parentGroup) {
        let group = parentGroup.append('g');

        let dx = init_x;
        let dy = init_y;
        let width = this.lyphSize.width;
        let height = this.lyphSize.height;

        if (lyph.placeholder) {
            d3_createRect(group, dx - this.border, dy - this.border, this.placeholder + 2 * this.border, height + 2 * this.border,
                lyph.color, lyph.label, this.tooltip);
            return;
        }

        let rects = [];
        let roundLeft = false, roundRight = false;
        if (['BAG', 'BAG2', 'CYST'].includes(lyph.topology)) {
            if (this.right?.has(lyph.fullID)) {
                roundRight = true;
            } else {
                roundLeft = true;
            }
        }
        let hostColor = lyph.housingLyph?.color || "white";
        let delta = 0.5 * this.lyphSize.height / ((lyph.layers || []).length + 1);
        let layers = [...(lyph.layers || [])].reverse();

        let borderLeft = roundLeft? this.border: 0;
        let borderRight = roundRight? this.border: 0;
        d3_createRect(group, dx - borderLeft, dy - this.border, width + borderLeft + borderRight, height + 2 * this.border,
            hostColor, lyph.housingLyph?.name || lyph.housingLyph?.fullID, this.tooltip);

        if (roundRight || roundLeft) {
            layers.forEach((layer, i) => {
                let params = [layer?.color || "lightblue", layer?.name || layer?.fullID, this.tooltip];
                d3_createBagRect(group, dx, dy, width, height, ...params,
                    {roundLeft: roundLeft, roundRight: roundRight, radius: 30});
                height -= 2 * delta;
                width -= 2 * delta;
                if (roundLeft) {
                    dx += 2 * delta;
                }
                dy += delta;
                rects.push({x: dx, y: dy, width: width, height: height});
            });
        } else {
            //tube, draw layers on both sides from center
            layers.forEach(layer => {
                let params = [layer?.color || "lightblue", layer?.name || layer?.fullID, this.tooltip];
                d3_createRect(group, dx, dy, width, height, ...params);
                height -= 2 * delta;
                dy += delta;
                rects.push({x: dx, y: dy, width: width, height: height});
            });
        }
        this.drawRandomGraph(rects, group);
    }

    drawRandomGraph(rects, group) {
        let nodesByRect = rects.map(rect => {
            let numNodes = Math.random() < 0.5 ? 1 : 2;
            let nodes = [];
            for (let i = 0; i < numNodes; i++) {
                nodes.push({
                    x: rect.x + Math.random() * rect.width,
                    y: rect.y + Math.random() * rect.height,
                    rectIndex: rects.indexOf(rect)
                });
            }
            return nodes;
        });

        // Flatten node list for drawing
        let allNodes = nodesByRect.flat();

        // 3) Draw nodes
        group.selectAll("circle")
            .data(allNodes)
            .enter()
            .append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", 5)
            .attr("fill", "steelblue");

        // 4) Generate links between nodes in rect[i] and rect[i+1]
        let links = [];
        for (let i = 0; i < nodesByRect.length - 1; i++) {
            let groupA = nodesByRect[i];
            let groupB = nodesByRect[i + 1];
            groupA.forEach(a => {
                groupB.forEach(b => {
                    links.push({source: a, target: b});
                });
            });
        }

        // 5) Draw links
        group.selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .attr("stroke", "#999");
    }
}

@NgModule({
    imports: [CommonModule],
    declarations: [LyphPanel],
    exports: [LyphPanel]
})
export class LyphPanelModule {
}