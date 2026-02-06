import {Component, ElementRef, Input, NgModule, ViewChild} from '@angular/core';
import {CommonModule} from "@angular/common";
import * as d3 from "d3";
import {
    d3_createRect,
    d3_createBagRect,
    drawCellNetwork, generateRandomCellNetwork
} from '../utils/svgDraw';
import cellularNetworks from "../../data/cellNetworks.json";

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

        this.lyphs.forEach(lyph => {
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

        let rects = [];
        if (roundRight || roundLeft) {
            layers.forEach((layer, i) => {
                let params = [layer?.color || "lightblue", layer?.name || layer?.fullID, this.tooltip];
                d3_createBagRect(group, dx, dy, width, height, ...params,
                    {roundLeft: roundLeft, roundRight: roundRight, radius: 30});
                rects.push({x: dx, y: dy, width: width, height: height, left: roundLeft, right: roundRight});
                height -= 2 * delta;
                width -= 2 * delta;
                if (roundLeft) {
                    dx += 2 * delta;
                }
                dy += delta;
            });
        } else {
            //tube, draw layers on both sides from center
            layers.forEach(layer => {
                let params = [layer?.color || "lightblue", layer?.name || layer?.fullID, this.tooltip];
                d3_createRect(group, dx, dy, width, height, ...params);
                rects.push({x: dx, y: dy, width: width, height: height});
                height -= 2 * delta;
                dy += delta;
            });
        }

        //let [nodes, links] = generateRandomCellNetwork(rects);
        let [nodes, links] = this.generateCellNetwork(layers, rects);
        drawCellNetwork(rects, group, nodes, links, this.tooltip);
    }

    generateCellNetwork(layers, rects){
        if (!layers) return;
        let fromMaterials = new Set();
        let toMaterials = new Set();
        cellularNetworks.forEach(network => {
            fromMaterials.add(network.from);
            (network.to||[]).forEach(target => toMaterials.add(target))
        });

        function findCellMaterials(material){
            let cellMaterials = [];
            if (material) {
                if (toMaterials.has(material.id)) return [material.id];
            }
            (material?.inMaterials||[]).forEach(inMat => {
                if (fromMaterials.has(inMat.id)){
                    cellMaterials.push(inMat.id);
                }
            });
            (material?.materials||[]).forEach(mat => {
                let nested = findCellMaterials(mat);
                if (nested.length > 0){
                    cellMaterials = cellMaterials.concat(nested);
                }
            });
            return cellMaterials;
        }

        function mapToCellNodes(lyph){
            let curr = lyph;
            while (curr.cloneOf){
                curr = curr.cloneOf;
            }
            while (curr?.supertype){
                curr = curr.supertype
            }
            if (curr.generatedFrom){
                curr = curr.generatedFrom;
            }
            return findCellMaterials(curr);
        }

        const createNode = (name, idx, i, n) => {
            let rect = rects[idx];
            let dx, dy;
            if (rect.left || rect.right) {
                dy = (i + 1) / (n + 1);
            } else {
                dy = 0.05;
            }
            if (rect.left){
                dx = 0.1;
            } else {
                if (rect.right){
                    dx = 0.9;
                } else {
                    dx =  (i + 1) / (n + 1);
                }
            }

            return ({
                x: rect.x + dx * rect.width,
                y: rect.y + dy * rect.height,
                label: name,
                from: 0,
                to: 0
            })
        }

        let nodes = [];
        layers.forEach((layer, idx) => {
            let components = mapToCellNodes(layer);
            components.forEach((c, i) => nodes.push(createNode(c, idx, i, components.length)));
        });
        let fromNodes = nodes.filter(node => fromMaterials.has(node.label));
        let toNodes = nodes.filter(node => toMaterials.has(node.label));
        let links = [];
        fromNodes.forEach(s => {
            toNodes.forEach(t =>{
                 links.push({source: s, target: t});
                 s.from += 1
                 t.to += 1
            });
        });
        nodes = nodes.filter(node => node.to + node.from > 0);
        return [nodes, links];
    }
}

@NgModule({
    imports: [CommonModule],
    declarations: [LyphPanel],
    exports: [LyphPanel]
})
export class LyphPanelModule {
}