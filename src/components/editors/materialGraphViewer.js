import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener} from '@angular/core';
import {MatMenuModule} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";

import * as d3 from "d3";
import 'd3-transition';

import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "../gui/searchAddBar";
import {ResourceListViewModule} from "./resourceListView";
import {COLORS} from "../utils/colors";

@Component({
    selector: 'materialGraphViewer',
    template: `
        <section #materialGraphViewer id="materialGraphViewer">
            <svg #svgTree>
                <rect width="100%" height="100%"/>
                <g/>
            </svg>  
        </section>
    `,
    styles: [`      
        #materialGraphViewer {
            height: 90vh;
            overflow-y: auto;
            overflow-x: auto;
        }

        #svgTree {
            display: block;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            min-width: 800px; 
            min-height: 600px;
        }
        
        :host /deep/ text {
            font-weight: 300;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serf;
            font-size: 14px;
        }
    `]
})
/**
 * @class
 */
export class DagViewerD3Component {
    _rootNode;

    @ViewChild('svgTree') svgRef: ElementRef;

    // Optional minimum canvas size passed from container dialog
    inputMinWidth = 0;
    inputMinHeight = 0;

    @Input('minWidth') set minWidth(val) {
        const v = Number(val) || 0;
        if (v !== this.inputMinWidth) {
            this.inputMinWidth = v;
            this.updateSizeAndRedraw();
        }
    }

    @Input('minHeight') set minHeight(val) {
        const v = Number(val) || 0;
        if (v !== this.inputMinHeight) {
            this.inputMinHeight = v;
            this.updateSizeAndRedraw();
        }
    }

    @Input('rootNode') set node(value) {
        this._rootNode = value;
        this.hasCenteredRoot = false; // recenter on new data
        this.updateSizeAndRedraw();
    }
    @Output() onNodeSelect = new EventEmitter();

    get rootNode(){
        return this._rootNode;
    }

    ngAfterViewInit() {
        this.svg = d3.select(this.svgRef.nativeElement);

        this.svg.select("rect")
            .attr("fill", "white");
        this.updateSizeAndRedraw();

        window.addEventListener('resize', () => {
            this.hasCenteredRoot = false;
            this.updateSizeAndRedraw();
        }, false);
    }

    updateSizeAndRedraw() {
        if (!this.svgRef || !this.svgRef.nativeElement) {
            return;
        }
        const clientW = this.svgRef.nativeElement.clientWidth || 0;
        const clientH = this.svgRef.nativeElement.clientHeight || 0;
        this.width  = Math.max(clientW, this.inputMinWidth || 0);
        this.height = Math.max(clientH, this.inputMinHeight || 0);
        this.svg.attr("width", this.width).attr("height", this.height);
        this.draw();
    }

    /**
     * Draw dagre-d3 graph
     */
    draw() {
        if (!this.svg || !this._rootNode) {
            return;
        }
        this.svg.select('g').remove();

        this.inner = this.svg.append("g");
        this.zoom = d3.zoom().on("zoom", () => {
            this.inner.attr("transform", d3.event.transform);
        });
        this.svg.call(this.zoom);

        const width = 928;
        const marginTop = 10;
        const marginRight = 10;
        const marginBottom = 10;
        const marginLeft = 40;

        let root;
        try {
            root = d3.hierarchy(this._rootNode);
        } catch(e) {
            console.error(e, this._rootNode);
            throw Error("Failed to construct a material tree for the root ", this._rootNode.id);
        }
        const dx = 40;
        const dy = (width - marginRight - marginLeft) / (1 + root.height);

        const tree = d3.tree().nodeSize([dx, dy]);
        const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

        const gLink = this.inner.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5);

        const gNode = this.inner.append("g")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all");

        const markerColors = ["#e89894", "#999"];
        const markers = ["M10,-5 L0,0 L10,5", "M 0,-5 L 10,0 L 0,5"];

        this.svg.append("svg:defs").selectAll("marker")
            .data(["start", "end"])
            .enter().append("svg:marker")
            .attr("id",  d => 'marker-' + d)
            .attr('fill', (d, i) => markerColors[i])
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr('markerUnits', 'strokeWidth')
            .attr("orient", "auto")
            .append("path")
            .attr("d", (d, i) => markers[i]);

        const update = (event, source) => {
            const duration = event?.altKey ? 2500 : 250; // hold the alt key to slow down the transition
            const nodes = root.descendants().reverse();
            const links = root.links();

            // Compute the new tree layout.
            tree(root);

            let left = root;
            let right = root;
            root.eachBefore(node => {
                if (node.x < left.x) left = node;
                if (node.x > right.x) right = node;
            });

            const height = right.x - left.x + marginTop + marginBottom;

            const transition = this.inner.transition()
                .duration(duration)
                .attr("height", height)
                // Note: viewBox on a <g> has no effect; keeping transition for compatibility
                .attr("viewBox", [-marginLeft, left.x - marginTop - (height - (right.x - left.x)) / 2, width, height])
                .tween("resize", window.ResizeObserver ? null : () => () => this.inner.dispatch("toggle"));

            // Update the nodes…
            const node = gNode.selectAll("g").data(nodes, d => d.id);

            // Enter any new nodes at the parent's previous position.
            const nodeEnter = node.enter().append("g")
                .attr("transform", d => `translate(${source.y0},${source.x0})`)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0)
                .on("dblclick", d => {
                    d.children = d.children ? null : d._children;
                    update(event, d);
                })
                .on("click", d => {
                    this.onNodeSelect.emit(d.data.id);
                });

            nodeEnter.append("circle")
                .attr("r", 3)
                .attr("fill", d => d.data.category === 'parent'? d._children ? "#bb3F3F": "#e89894": d._children ? "#555" : "#999")
                .attr("stroke-width", 10);

            nodeEnter.append("text")
                .attr("dy", "0.32em")
                .attr("x", d => d._children ? -10 : 10)
                .attr("text-anchor", d => d._children ? "end" : "start")
                .text(d => d.data.label)
                .clone(true).lower()
                .call(getTextBox);

            //Rect padding around text
            const pX = 6;
            const pY = 4;

            nodeEnter.insert("rect","text")
                .attr("x", d => {return d.bbox.x - pX})
                .attr("y", d => {return d.bbox.y - pY})
                .attr("width", d => {return d.bbox.width + 2*pX})
                .attr("height", d => {return d.bbox.height + 2*pY})
                .style("fill", d => COLORS[d.data.type?.toLowerCase()] || '#cccccc')
                .style("stroke", "#999");

            function getTextBox(selection) {
                selection.each(function(d) { d.bbox = this.getBBox(); })
            }

            // Transition nodes to their new position.
            const nodeUpdate = node.merge(nodeEnter).transition(transition)
                .attr("transform", d => `translate(${d.y},${d.x})`)
                .attr("fill-opacity", 1)
                .attr("stroke-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            const nodeExit = node.exit().transition(transition).remove()
                .attr("transform", d => `translate(${source.y},${source.x})`)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0);

            const link = gLink.selectAll("path")
                .data(links, d => d.target.id);

            const linkEnter = link.enter().append("path")
                .attr("d", d => {
                    const o = {x: source.x0, y: source.y0};
                    return diagonal({source: o, target: o});
                })
               .attr("stroke", d => d.target.data.category === 'parent'? "#bb3F3F": "#999")
               .attr("marker-end", d => `url(#marker-${d.target.data.category === 'parent'? 'start': 'end'})`);

            link.merge(linkEnter).transition(transition)
                .attr("d", diagonal);

            link.exit().transition(transition).remove()
                .attr("d", d => {
                    const o = {x: source.x, y: source.y};
                    return diagonal({source: o, target: o});
                });

            root.eachBefore(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });

            // Center the root once after layout is computed
            if (!this.hasCenteredRoot) {
                // Defer to end of the current tick to ensure sizes are computed
                setTimeout(() => {
                    this.centerOnNode(root);
                    this.hasCenteredRoot = true;
                }, 0);
            }
        }

        root.x0 = dy / 2;
        root.y0 = marginLeft;

        root.descendants().forEach((d, i) => {
            d.id = i;
            d._children = d.children;
            if (d.depth) d.children = null;
        });

        update(null, root);
    }

    // Center given node (typically root) in the SVG viewport using zoom transform.
    centerOnNode(node, scale = 1) {
        if (!this.svg || !this.zoom || !node) return;

        const svgEl = this.svgRef.nativeElement;
        const svgWidth = svgEl.clientWidth || this.width || 1000;
        const svgHeight = svgEl.clientHeight || this.height || 800;

        // Current layout uses x (vertical) and y (horizontal).
        const targetX = node.x;
        const targetY = node.y;

        const translateX = (svgWidth / 2) - (targetY * scale);
        const translateY = (svgHeight / 2) - (targetX * scale);

        const t = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
        this.svg.transition().duration(350).call(this.zoom.transform, t);
    }
}

@NgModule({
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchAddBarModule, MatButtonModule,
        MatDividerModule, ResourceListViewModule],
    declarations: [DagViewerD3Component],
    exports: [DagViewerD3Component]
})
export class MaterialGraphViewerModule {
}

