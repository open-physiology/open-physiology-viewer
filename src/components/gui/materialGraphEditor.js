import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import * as d3 from "d3";
import {cloneDeep, values, sortBy} from 'lodash-bound';
import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "./searchAddBar";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {ResourceListViewModule} from "./resourceListView";

/**
 * Css class names to represent ApiNATOMY resource classes
 * @type {{LYPH: string, UNDEFINED: string, TEMPLATE: string, MATERIAL: string}}
 */
const CLASS = {
    LYPH: "type-lyph",
    TEMPLATE: "type-template",
    MATERIAL: "type-material",
    UNDEFINED: 'type-undefined'
}

const EDGE_CLASS = {
    MATERIAL: 'has-material',
    NEW: 'has-new'
}

/**
 * @class
 * @property id
 * @property parents
 * @property children
 * @property label
 * @property type
 * @property resource
 */
export class MaterialNode {
    constructor(id, parents, children, label, type, resource) {
        this.id = id;
        this.parents = parents;
        this.children = children;
        this.label = label;
        this.type = type;
        this.resource = resource;
    }
}

/**
 * @class
 * @property id
 * @property parent
 * @property child
 * @property type
 */
export class Edge {
    constructor(id, parent, child, type) {
        this.id = id;
        this.source = parent;
        this.target = child;
        this.type = type;
    }
}

@Component({
    selector: 'materialGraphViewer',
    template: `
        <section #materialGraphViewer id="materialGraphViewer">
        </section>
    `,
    styles: [`      
    `]
})
/**
 * @class
 */
export class DagViewerD3Component {
    CLASS = CLASS;
    EDGE_CLASS = EDGE_CLASS;

    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;
    @ViewChild('materialGraphViewer') materialEditor: ElementRef;
    @ViewChild('svgD3') svgRef: ElementRef;

    @Input('model') set model(newModel) {
        this._originalModel = newModel;
        this._model = newModel::cloneDeep();
        this._modelText = JSON.stringify(this._model, null, 4);
        this.steps = [];
        this.currentStep = 0;
        this.updateGraph();
        this.draw();
    }

    /**
     * Draw dagre-d3 graph
     */
    draw() {
        if (!this.svg) {
            return;
        }
        this.svg.select('g').remove();

        this.inner = this.svg.append("g");
        this.zoom = d3.zoom().on("zoom", () => {
            this.inner.attr("transform", d3.event.transform);
        });
        this.svg.call(this.zoom);

        const createGraph = data => {
            const width = 928;
            const marginTop = 10;
            const marginRight = 10;
            const marginBottom = 10;
            const marginLeft = 40;

            const root = d3.hierarchy(data);
            const dx = 10;
            const dy = (width - marginRight - marginLeft) / (1 + root.height);

            const tree = d3.tree().nodeSize([dx, dy]);
            const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

            const gLink = this.svg.append("g")
                .attr("fill", "none")
                .attr("stroke", "#555")
                .attr("stroke-opacity", 0.4)
                .attr("stroke-width", 1.5);

            const gNode = this.svg.append("g")
                .attr("cursor", "pointer")
                .attr("pointer-events", "all");

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

                let canvas = this.svg.select("rect");

                const transition = canvas.transition()
                    .duration(duration)
                    .attr("height", height)
                    .attr("viewBox", [-marginLeft, left.x - marginTop, width, height])
                    .tween("resize", window.ResizeObserver ? null : () => () => canvas.dispatch("toggle"));

                // Update the nodes…
                const node = gNode.selectAll("g")
                    .data(nodes, d => d.id);

                // Enter any new nodes at the parent's previous position.
                const nodeEnter = node.enter().append("g")
                    .attr("transform", d => `translate(${source.y0},${source.x0})`)
                    .attr("fill-opacity", 0)
                    .attr("stroke-opacity", 0)
                    .on("click", (event, d) => {
                        d.children = d.children ? null : d._children;
                        update(event, d);
                    });

                nodeEnter.append("circle")
                    .attr("r", 2.5)
                    .attr("fill", d => d._children ? "#555" : "#999")
                    .attr("stroke-width", 10);

                nodeEnter.append("text")
                    .attr("dy", "0.31em")
                    .attr("x", d => d._children ? -6 : 6)
                    .attr("text-anchor", d => d._children ? "end" : "start")
                    .text(d => d.data.name)
                    .clone(true).lower()
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-width", 3)
                    .attr("stroke", "white");

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

                // Update the links…
                const link = gLink.selectAll("path")
                    .data(links, d => d.target.id);

                // Enter any new links at the parent's previous position.
                const linkEnter = link.enter().append("path")
                    .attr("d", d => {
                        const o = {x: source.x0, y: source.y0};
                        return diagonal({source: o, target: o});
                    });

                // Transition links to their new position.
                link.merge(linkEnter).transition(transition)
                    .attr("d", diagonal);

                // Transition exiting nodes to the parent's new position.
                link.exit().transition(transition).remove()
                    .attr("d", d => {
                        const o = {x: source.x, y: source.y};
                        return diagonal({source: o, target: o});
                    });

                // Stash the old positions for transition.
                root.eachBefore(d => {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });
            }

            // Do the first update to the initial configuration of the tree — where a number of nodes
            // are open (arbitrarily selected as the root, plus nodes with 7 letters).
            root.x0 = dy / 2;
            root.y0 = 0;
            root.descendants().forEach((d, i) => {
                d.id = i;
                d._children = d.children;
                // if (d.depth && d.data.name.length !== 7) d.children = null;
            });

            update(null, root);

            return this.svg.node();

        }

        // let data  = this.nodes[2];
        // data.children = (data.children||[]).map(child => this.entitiesByID[child]);
        let data = {
            name: "flare",
            children: [
                {
                    name: "analytics", children: [{name: "cluster", children: []},
                        {name: "graph", children: []},
                        {name: "optimization", children: []}]
                },
                {name: "animate", children: []},
                {name: "data", children: []},
                {name: "display", children: []},
                {name: "flex", children: []},
                {
                    name: "physics", children: [{name: "AggregateExpression", value: 1616},
                        {name: "And", value: 1027},
                        {name: "Arithmetic", value: 3891},
                        {name: "Average", value: 891},
                        {name: "BinaryExpression", value: 2893},
                        {name: "Comparison", value: 5103},
                        {name: "CompositeExpression", value: 3677},
                        {name: "Count", value: 781},
                        {name: "DateUtil", value: 4141},
                        {name: "Distinct", value: 933},
                        {name: "Expression", value: 5130},
                        {name: "ExpressionIterator", value: 3617},
                        {name: "Fn", value: 3240},
                        {name: "If", value: 2732},
                        {name: "IsA", value: 2039},
                        {name: "Literal", value: 1214},
                        {name: "Match", value: 3748},
                        {name: "Maximum", value: 843},
                        {name: "methods", children: []},
                        {name: "Minimum", value: 843}]
                },
                {name: "query", children: []},
                {name: "scale", children: []},
                {name: "util", children: []},
                {name: "vis", children: []}
            ]
        }

        // this.graphD3 = createGraph(data);

        //NK TODO create graph

        this.resizeCanvas();

        let nodes = this.inner.selectAll("g.node");
        this.appendNodeEvents(nodes);

        let edges = this.inner.selectAll("g.edgePath");
        this.appendEdgeEvents(edges);

        // Draw temporary edge when creating a new relationship

        this.inner.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 9)
            .attr("refY", 5)
            .attr("markerUnits", "strokeWidth")
            .attr("markerWidth", 6)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .append('svg:path')
            .attr('d', 'M 0 0 L 10 5 L 0 10 L 4 5 z')
            .style("stroke-width", 1)
            .style("stroke-dasharray", "1,0")
            .attr('fill', '#a5a5a5');

        this.drag_line = this.inner.append('svg:path')
            .attr('class', 'link dragline hidden')
            .attr('d', 'M0,0L0,0');

        let self = this;

        function canvasMouseMove() {
            if (self.source_node) {
                self.drag_line
                    .classed('hidden', self.hide_line)
                    .attr('d', 'M' + self.md_node.x + ',' + self.md_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
            }
        }

        function canvasMouseUp() {
            if (self.source_node) {
                self.drag_line
                    .classed('hidden', true)
                    .style('marker-end', '');
            }
            self.resetMouseVars();
        }

        this.inner
            .on('mousemove', canvasMouseMove)
            .on('mouseup', canvasMouseUp);
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

