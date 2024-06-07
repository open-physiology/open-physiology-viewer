import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener} from '@angular/core';
import {MatMenuModule} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";

import * as d3 from "d3";

import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "./searchAddBar";
import {ResourceListViewModule} from "./resourceListView";
import {COLORS} from "../gui/utils";


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
            height: 100vh;
            overflow-y: scroll;
            overflow-x: scroll;
        }

        #svgTree {
            display: block;
            width: 100%;
            top: 0;
            left: 0;
            min-height: 100%;
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

    @Input('rootNode') set node(value) {
        this._rootNode = value;
        this.draw();
    }
    @Output() onNodeSelect = new EventEmitter();

    get rootNode(){
        return this._rootNode;
    }

    ngAfterViewInit() {
        this.svg = d3.select(this.svgRef.nativeElement);

        this.svg.select("rect")
            .attr("fill", "white");
            // .on('click', d => this.onEmptyClick())
            // .on('contextmenu', d => this.onEmptyRightClick(d));
        this.width = this.svgRef.nativeElement.clientWidth;
        this.height = this.svgRef.nativeElement.clientHeight;
        this.draw();

        window.addEventListener('resize', () => {
            this.width = this.svgRef.nativeElement.clientWidth;
            this.height = this.svgRef.nativeElement.clientHeight;
            this.draw();
        }, false);
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
                .attr("viewBox", [-marginLeft, left.x - marginTop, width, height])
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
        }

        root.x0 = dy / 2;
        root.y0 = 0;
        root.descendants().forEach((d, i) => {
            d.id = i;
            d._children = d.children;
            if (d.depth) d.children = null;
        });

        update(null, root);
        this.resizeCanvas();
    }

    @HostListener('window:resize', ['$event'])
    getScreenSize(event?) {
          this.screenHeight = window.innerHeight;
          this.screenWidth = window.innerWidth;
    }

    resizeCanvas(){
        this.svg.attr("width", Math.max(this.screenWidth, 1000));
        this.svg.attr("height", Math.max(this.screenHeight, 1000));
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

