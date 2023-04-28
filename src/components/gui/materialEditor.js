import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import * as d3 from "d3";
import * as dagreD3 from "dagre-d3";
import { cloneDeep} from 'lodash-bound';

export class Node {
    constructor(id, parents, label, type, resource) {
        this.id = id;
        this.parents = parents;
        this.label = label;
        this.type = type;
        this.resource = resource;
    }
}

/**
 * @class
 * @property points
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
    selector: 'materialEditor',
    template: `
        <section #materialEditorD3 id="materialEditorD3">
            <svg #svgDagD3>
                <g/>
            </svg>
        </section>
        <section #tooltip class="tooltip"></section>
        
        <!--Right click-->
        <div style="visibility: hidden; position: fixed;" 
            [style.left]="menuTopLeftPosition.x" 
            [style.top]="menuTopLeftPosition.y" 
            [matMenuTriggerFor]="rightMenu">            
        </div> 

        <mat-menu #rightMenu="matMenu"> 
          <ng-template matMenuContent let-item="item"> 
            <button mat-menu-item (click)="deleteMaterial(item)">Delete</button> 
            <button mat-menu-item (click)="removeParents(item)">Remove parents</button> 
            <div *ngIf="item.type === 'type-undefined'">
                <button mat-menu-item (click)="defineAsMaterial(item)">Define as material</button> 
                <button mat-menu-item (click)="defineAsLyph(item)">Define as lyph</button> 
            </div>
          </ng-template> 
        </mat-menu> 

    `,
    styles: [`
        
        #materialEditorD3 {
            width: 100%;
            height: 1200px;
            border: 2px solid #000;
            overflow-y: scroll;
            overflow-x: scroll;
        }

        svg {
            display: block;
            width: 200%;
            height: 200%;
        }

        .tooltip {
            position: absolute;
            padding: 2px;
            background-color: #f5f5f5;
            font: 12px sans-serif;
            border: 1px solid #666;
            pointer-events: none;
        }

        :host /deep/ g.type-undefined > rect {
            fill: lightgrey;
        }

        :host /deep/ g.type-material > rect {
            fill: #00ff00;
        }

        :host /deep/ g.type-lyph > rect {
            fill: #ff0000;
        }

        :host /deep/ text {
            font-weight: 300;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serf;
            font-size: 12px;
        }

        :host /deep/ .node rect {
            stroke: #999;
            fill: lightgrey;
        }

        :host /deep/ .node rect:hover {
            fill: pink;
            stroke-width: 1.5px;
        }

        :host /deep/ .edgePath path {
            stroke: lightgrey;
            stroke-width: 1.5px;
        }

        :host /deep/ .edgePath path:hover {
            stroke: pink;
        }
        
        .mat-menu-item{
            line-height:20px;
            height:20px;    
        }
        
        .mat-menu-item:hover{
            background-color:lightgrey;
            color: blue;
        }        
        
    `]
})
export class DagViewerD3Component {
    _originalModel;
    _model;
    g;
    nodesByID;
    nodes = [];
    edges = [];
    menuTopLeftPosition = {x: '0', y: '0'}

    // reference to the MatMenuTrigger in the DOM
    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;
    @ViewChild('materialEditorD3') materialEditor: ElementRef;
    @ViewChild('svgDagD3') svgRef: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;

    @Input('model') set model(newModel) {
        this._originalModel = newModel;
        this._model = newModel::cloneDeep();
        this.updateGraph();
        this.draw();
    }

    constructor() {
        this.g = new dagreD3.graphlib.Graph();
        this.render = new dagreD3.render(this.g);
    }

    ngAfterViewInit() {
        this.draw();
    }

    draw() {
        if (!this.svgRef) {
            return;
        }
        let svg = d3.select(this.svgRef.nativeElement),
            inner = svg.select("g"),
            zoom = d3.zoom().on("zoom", function () {
                inner.attr("transform", d3.event.transform);
            });
        // svg = d3.select("svg > g");
        // svg.selectAll("*").remove();
        svg.call(zoom);

        let tooltip = d3.select(this.tooltipRef.nativeElement).style("opacity", 0);

        this.g.setGraph({rankDir: 'LR', align: 'UL',
            nodesep: 30, edgesep: 10, ranksep: 300,
            width: 10, height: 10
        });
        (this.nodes || []).forEach((node, i) => {
            this.g.setNode(node.id, {label: node.label, class: node.type, item: node, idx: i});
        });
        (this.edges || []).forEach(e => {
            this.g.setEdge(e.source.id, e.target.id, {
                curve: d3.curveBasis
            });
        });

        this.render(inner, this.g);

        let nodes = inner.selectAll("g.node");
        nodes
            .on('click', d => this.onNodeClick(d))
            .on('mouseover', d => {
                tooltip.style("opacity", .9);
                tooltip.html(`<div>${this.nodesByID[d].id}: ${this.nodesByID[d].name || "?"}<\div>`)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on('contextmenu', d => this.onRightClick(this.nodesByID[d]))
            .on('mouseout', () => {
                tooltip.style("opacity", 0);

            });

        // let edges = inner.selectAll("g.edgePaths");
        // edges
        //     .on('click', d => this.onEdgeClick())
        //     .on('contextmenu', d => this.onRightClick());

        let xCenterOffset = (svg.attr("width") - this.g.graph().width) / 2;
        inner.attr("transform", "translate(" + xCenterOffset + ", 20)");
        svg.attr("height", this.g.graph().height + 40);
    }

    onEdgeClick(d){
        // console.log("Clicked on: ", d);
    }

    onNodeClick(d) {
        // console.log("Clicked on: ", d);
    }

    updateGraph() {
        this.faultyDefs = [];
        this.nodesByID = {};
        this.edgesByID = {};
        this.nodes = [];
        this.edges = [];
        (this._model.materials || []).forEach(m => {
            if (!m.id) {
                this.faultyDefs.push({item: m, reason: "No ID"});
                return;
            }
            m._inMaterials = m._inMaterials || [];
            this.nodesByID[m.id] = m;
        });
        (this._model.lyphs || []).forEach(m => {
            if (!m.id) {
                this.faultyDefs.push({item: m, reason: "No ID"});
                return;
            }
            m._inMaterials = m._inMaterials || [];
            this.nodesByID[m.id] = m;
        });
        let created = [];
        (this._model.materials || []).forEach(m => {
            (m.materials || []).forEach(childID => {
                if (!this.nodesByID[childID]) {
                    this.nodesByID[childID] = {
                        "id": childID,
                        "generated": true,
                        "_inMaterials": [],
                    };
                    created.push(this.nodesByID[childID]);
                }
            });
            (m.materials || []).forEach(childID => this.nodesByID[childID]._inMaterials.push(m));
        });
        created.forEach(obj => this._model.materials.push(obj));

        (this._model.materials || []).forEach(m => {
            this.nodes.push(new Node(
                m.id,
                (m._inMaterials || []).map(parent => parent.id),
                m.name || m.id,
                m.generated ? "type-undefined" : "type-material",
                m
            ))
        });
        (this._model.lyphs || []).forEach(m => {
            if ((m._inMaterials||[]).length > 0) {
            // if (m._inMaterials) {
                this.nodes.push(new Node(
                    m.id,
                    (m._inMaterials || []).map(parent => parent.id),
                    m.name || m.id,
                    "type-lyph",
                    m
                ))
            }
        });
        this.nodes.forEach(node => {
            (node.parents || []).forEach(p => {
                let edge = new Edge(node.id + p, this.nodesByID[p], node.resource, 'has-material');
                if (!this.edgesByID[edge.id]) {
                    this.edges.push(edge);
                    this.edgesByID[edge.id] = edge;
                }
            });
        });
    }

    /**
     * Method called when the user click with the right button
     * @param d
     */
    onRightClick(d) {
        d3.event.preventDefault();
        this.menuTopLeftPosition.x = d3.event.clientX + 'px';
        this.menuTopLeftPosition.y = d3.event.clientY + 'px';
        this.matMenuTrigger.menuData = {item: d}
        this.matMenuTrigger.openMenu();
    }

    deleteMaterial(node){
        console.log("Deleting: ", node);
    }

    defineAsLyph(node){
        console.log("Defining lyph: ", node);
    }

    defineAsMaterial(node){
        console.log("Defining material: ", node);
    }

    removeParents(node){
        console.log("Disconnecting from parents: ", node);
    }

}

@NgModule({
    imports: [CommonModule, MatMenuModule],
    declarations: [DagViewerD3Component],
    exports: [DagViewerD3Component]
})
export class MaterialEditorModule {
}

