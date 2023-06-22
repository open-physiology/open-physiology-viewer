import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import * as d3 from "d3";
import * as dagreD3 from "dagre-d3";
import {cloneDeep, values, sortBy} from 'lodash-bound';
import {clearMaterialRefs, clearMany, isPath, replaceMaterialRefs} from './gui/utils.js'
import FileSaver from 'file-saver';
import {ResourceDeclarationModule, COLORS} from "./gui/resourceDeclarationEditor";
import {$Field, $SchemaClass} from "../model";
import {SearchBarModule} from "./gui/searchBar";
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";


/**
 * @class
 *
 */
export class Node {
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
    selector: 'materialEditor',
    template: `
        <section #materialEditorD3 id="materialEditorD3" class="w3-row">
            <section class="w3-threequarter">
                <section class="w3-padding-right" style="position:relative;">
                    <section class="w3-bar-block w3-right vertical-toolbar" style="position:absolute; right:0">
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="createMaterial()" title="New material">
                            <i class="fa fa-file-pen"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="preview()" title="Preview">
                            <i class="fa fa-magnifying-glass"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey" (click)="saveChanges()"
                                title="Apply changes">
                            <i class="fa fa-check"> </i>
                        </button>
                        <mat-divider></mat-divider>
<!--                        <button [disabled]="!isHistory" class="w3-bar-item"-->
<!--                                (click)="showHistory()" title="Show history">-->
<!--                            <i class="fa fa-timeline"> </i>-->
<!--                        </button>-->
                        <button [disabled]="!canUndo" class="w3-bar-item"
                                (click)="undo()" [title]="undoTitle">
                            <i class="fa fa-rotate-left"> </i>
                        </button>
                        <button [disabled]="!canRedo" class="w3-bar-item"
                                (click)="redo()" [title]="redoTitle">
                            <i class="fa fa-rotate-right"> </i>
                        </button>
                    </section>
                </section>
                <svg #svgDagD3>
                    <rect width="100%" height="100%"/>
                    <g/>
                </svg>
            </section>
            <section class="w3-quarter">
                <div class="settings-wrap">
                    <div class="default-box pb-0">
                        <div class="default-searchBar default-box-header">
                            <div class="search-bar">
                                <img src="./styles/images/search.svg"/>
                                <searchBar [searchOptions]="_searchOptions"
                                           (selectedItemChange)="selectBySearch($event)">
                                </searchBar>
                            </div>
                        </div>
                    </div>
                    <button *ngIf="lyphToInclude" (click)="includeLyph(lyphToInclude)" class="w3-right w3-hover-light-grey add-button">
                        <i class="fa fa-add">
                        </i>
                    </button> 
                </div>
                <resourceDeclaration
                        [resource]="selectedMaterial"
                        (onValueChange)="updateProperty($event)"
                ></resourceDeclaration>
            </section>
        </section>
        <section #tooltip class="tooltip"></section>

        <!--Right click-->
        <div style="visibility: hidden; position: fixed;"
             [style.left]="menuTopLeftPosition.x"
             [style.top]="menuTopLeftPosition.y"
             [matMenuTriggerFor]="rightMenu">
        </div>

        <mat-menu #rightMenu="matMenu">
            <ng-template matMenuContent let-item="item" let-type="type" let-hasParents="hasParents"
                         let-hasChildren="hasChildren">
                <div *ngIf="type === 'type-lyph' || type === 'type-material'">
                    <button mat-menu-item (click)="deleteMaterial(item)">Delete</button>
                    <button mat-menu-item (click)="deleteDefinition(item)">Delete definition</button>
                    <div *ngIf="hasParents">
                        <button mat-menu-item (click)="removeParents(item)">Disconnect from parents</button>
                    </div>
                    <div *ngIf="hasChildren">
                        <button mat-menu-item (click)="removeChildren(item)">Disconnect from children</button>
                    </div>
                </div>
                <div *ngIf="type === 'type-lyph' && !hasChildren && !hasParents">
                    <button mat-menu-item (click)="excludeLyph(item)">Exclude from view</button>
                </div>
                <div *ngIf="type === 'type-undefined'">
                    <button mat-menu-item (click)="defineAsMaterial(item)">Define as material</button>
                    <button mat-menu-item (click)="defineAsLyph(item)">Define as lyph</button>
                </div>
                <div *ngIf="type === 'has-material'">
                    <button mat-menu-item (click)="removeRelation(item)">Delete relation</button>
                </div>
                <div *ngIf="type === 'type-new'">
                    <button mat-menu-item (click)="addMaterial(item)">Add material</button>
                </div>

            </ng-template>
        </mat-menu>
    `,
    styles: [`
        .vertical-toolbar {
            width: 48px;
        }
        
        .add-button {
          width: 30px;
          border: ${COLORS.inputBorderColor} 1px solid;
          background: transparent;
          color:  ${COLORS.inputTextColor};
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.525rem 0.625rem;
          cursor: pointer;
          margin-right: 1rem;
        }
        
        #materialEditorD3 {
            height: 100vh;
            overflow-y: scroll;
            overflow-x: scroll;
        }

        svg {
            display: block;
            width: 100%;
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
            fill: #CCFFCC;
        }

        :host /deep/ g.type-lyph > rect {
            fill: #ffe4b2;
        }

        :host /deep/ text {
            font-weight: 300;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serf;
            font-size: 14px;
        }

        :host /deep/ .node rect {
            stroke: #999;
            fill: lightgrey;
        }

        :host /deep/ .node rect:hover {
            fill: #FFCCCC;
            stroke-width: 1.5px;
        }

        :host /deep/ .edgePath path {
            stroke: lightgrey;
            stroke-width: 1.5px;
        }

        :host /deep/ .edgePath path:hover {
            stroke: #FFCCCC;
        }        

        :host /deep/ .edge .new {
            stroke: #a5a5a5;
            fill: #a5a5a5;
        }

        :host /deep/ path.link {
            fill: none;
            stroke: #a5a5a5;
            stroke-width: 4px;
            stroke-dasharray: 10, 2;
            cursor: default;
        }

        :host /deep/ path.link.selected {
            stroke-dasharray: 10, 2;
        }

        :host /deep/ path.link.dragline {
            pointer-events: none;
        }

        :host /deep/ path.link.hidden {
            stroke-width: 0;
        }

        :host ::ng-deep .settings-wrap {
            padding-bottom: 0.8rem;
            margin-top: 0;
            position: relative;
        }

       .default-box .default-box-header {
          padding: 1.067rem;
          display: flex;
          align-items: center;
        }

        .default-box .default-box-header .search-bar {
          flex-grow: 1;
        }
        
        .pb-0 {
          padding-bottom: 0 !important;
        }
        
        .default-box .default-box-header .search-bar {
          flex-grow: 1;
        }
        
        .mat-form-field {
          width: 100%;
        }

        .search-bar .mat-form-field {
          display: block;
          width: 100%;
        }

        .search-bar .mat-form-field-underline {
          display: none;
        }

        .search-bar .mat-form-field-appearance-legacy .mat-form-field-wrapper {
          padding-bottom: 0;
        }

        .search-bar .mat-form-field-appearance-legacy .mat-form-field-infix {
          padding: 0;
          width: 100%;
          margin: 0;
          border: none;
        }

        .search-bar input.mat-input-element {
          background: ${COLORS.white};
          border: 0.067rem solid ${COLORS.inputBorderColor};
          box-sizing: border-box;
          border-radius: 0.134rem;
          margin: 0;
          height: 2.134rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 1.067rem;
          padding: 0 0.534rem 0 1.734rem;
        }

        .search-bar .search-input {
          background: ${COLORS.white};
          border: 0.067rem solid ${COLORS.inputBorderColor};
          box-sizing: border-box;
          border-radius: 0.134rem;
          margin: 0;
          display: block;
          width: 100%;
          height: 2.134rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 1.067rem;
          padding: 0 0.534rem 0 1.734rem;
        }

        .search-bar {
          position: relative;
        }

        .search-bar img {
          position: absolute;
          left: 0.534rem;
          top: 50%;
          transform: translateY(-50%);
          color: ${COLORS.inputTextColor};
          font-size: 0.934rem;
        }

        .search-bar img.input-clear {
          right: 0.534rem;
          cursor: pointer;
          left: auto;
        }

        .search-bar .search-input:focus {
          outline: none;
          border-color: ${COLORS.toggleActiveBg};
          box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
        }

        .search-bar .search-input::placeholder {
          color: ${COLORS.inputPlacholderColor};
        }
        
        :host >>> .default-searchBar .mat-form-field-appearance-legacy .mat-form-field-underline {
          display: none;
        }
        :host >>> .default-searchBar .mat-form-field-appearance-legacy .mat-form-field-wrapper {
          padding-bottom: 0;
        }
        :host >>> .default-searchBar .mat-form-field-should-float .mat-form-field-label {
          display: none !important;
        }
        :host >>> .default-searchBar .search-bar img {
          z-index: 10;
        }
        :host >>> .default-searchBar .mat-form-field-label {
          padding-left: 1.625rem;
          top: 1.5em;
          color: ${COLORS.inputPlacholderColor};
          font-size: 0.75rem;
          font-weight: 500;
        }
        :host >>> .default-searchBar .mat-form-field-infix {
          background: ${COLORS.white};
          border: 0.067rem solid ${COLORS.inputBorderColor};
          box-sizing: border-box;
          border-radius: 0.134rem;
          margin: 0;
          height: 2.134rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 1.067rem;
          padding: 0.5rem 2rem 0 2rem;
        }
        :host >>> .default-searchBar .mat-focused .mat-form-field-infix {
          outline: none;
          border-color: ${COLORS.toggleActiveBg};
          box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
        }
        
        :host >>> .default-searchBar .search-bar img {
          z-index: 10;
        }

    `]
})
export class DagViewerD3Component {
    _originalModel;
    _model;
    _searchOptions;
    _selectedNode;

    graphD3;
    entitiesByID;
    nodes = [];
    edges = [];
    menuTopLeftPosition = {x: '0', y: '0'}

    steps = [];
    currentStep = 0;
    selected_node;
    source_node;
    target_node;
    md_node;
    hide_line = true;

    _snackBar;
    _snackBarConfig = new MatSnackBarConfig();

    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;
    @ViewChild('materialEditorD3') materialEditor: ElementRef;
    @ViewChild('svgDagD3') svgRef: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;

    @Output() onChangesSave = new EventEmitter();

    @Input('model') set model(newModel) {
        this._originalModel = newModel;
        this._model = newModel::cloneDeep();
        this.steps = [];
        this.currentStep = 0;
        this.saveStep('Initial model');
        this.updateGraph();
        this.draw();
    }

    constructor(snackBar: MatSnackBar) {
        this._snackBar = snackBar;
        this._snackBarConfig.panelClass = ['w3-panel', 'w3-yellow'];
    }

    updateSearchOptions() {
        this._searchOptions = (this._model.materials || []).map(e => e.name + ' (' + e.id + ')');
        this._searchOptions = this._searchOptions.concat((this._model.lyphs || []).map(e => e.name + ' (' + e.id + ')'));
        this._searchOptions.sort();
    }

    ngAfterViewInit() {
        this.svg = d3.select(this.svgRef.nativeElement);

        this.svg.select("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "white")
            .on('contextmenu', d => this.onEmptyRightClick(d));
        this.tooltip = d3.select(this.tooltipRef.nativeElement).style("opacity", 0);
        this.width = this.svgRef.nativeElement.clientWidth;
        this.height = this.svgRef.nativeElement.clientHeight;
        this.draw();

        window.addEventListener('resize', () => {
            this.width = this.svgRef.nativeElement.clientWidth;
            this.height = this.svgRef.nativeElement.clientHeight;
            if (this.isHistory){
                this.updateGraph();
            }
            this.draw();
        }, false);
    }

    get isHistory() {
        return this.steps.length > 0;
    }

    get canUndo() {
        return this.currentStep > 0;
    }

    get canRedo() {
        return this.currentStep < this.steps.length - 1;
    }

    get undoTitle() {
        return `Undo ${(this.canUndo? '"' + this.steps[this.currentStep].action + '"': "")}`;
    }

    get redoTitle() {
      return `Redo ${(this.canRedo? '"' + this.steps[this.currentStep].action + '"': "")}`;
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

        this.graphD3 = new dagreD3.graphlib.Graph();
        this.graphD3.setGraph({rankDir: 'LR', align: 'UL', nodesep: 30, edgesep: 10, ranksep: 300});

        (this.nodes || []).forEach((node, i) => {
            this.graphD3.setNode(node.id, {
                label: node.label,
                class: node.type
            });
        });
        (this.edges || []).forEach(e => {
            this.graphD3.setEdge(e.source.id, e.target.id, {curve: d3.curveBasis})
        });
        this.render = new dagreD3.render(this.graphD3);
        this.render(this.inner, this.graphD3);

        this.svg.attr("height", this.graphD3.graph().height + 40);

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

    resetMouseVars() {
        this.selected_node = null;
        this.source_node = null;
        this.target_node = null;
        this.md_node = null;
        this.hide_line = true;
    }

    appendNodeEvents(nodes) {
        nodes.on('click', d => {
            this.onNodeClick(d);
        })
            .on('contextmenu', d => this.onRightClick(d))
            .on('mouseover', d => {
                this.tooltip.style("opacity", .9);
                this.tooltip.html(`<div>${this.entitiesByID[d]?.id}: ${this.entitiesByID[d]?.name || "?"}<\div>`)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 48) + "px");
            })
            .on('mouseout', d => {
                this.tooltip.style("opacity", 0);
                if (this.source_node && (d === this.source_node)) {
                    this.hide_line = false;
                }
            })
            .on('mousedown', d => {
                if (d3.event.shiftKey) {
                    this.source_node = d;
                    this.selected_node = (this.source_node === this.selected_node) ? null : this.source_node;
                    this.md_node = this.graphD3.node(d);
                    this.drag_line
                        .style('marker-end', 'url(#end-arrow)')
                        .attr('d', 'M' + this.md_node.x + ',' + this.md_node.y + 'L' + this.md_node.x + ',' + this.md_node.y);
                } else {
                    if (this.source_node) {
                        this.drag_line
                            .classed('hidden', true)
                            .style('marker-end', '');
                        this.target_node = d;
                        if (this.target_node === this.source_node) {
                            this.resetMouseVars();
                            return;
                        }
                        let areConnected = isPath(this.entitiesByID, this.target_node, this.source_node);
                        if (areConnected) {
                            let message = "Cannot create the edge: a loop will be introduced!";
                            this._snackBar.open(message, "OK", this._snackBarConfig);
                        }

                        let existing_edge = this.graphD3.edge(this.source_node, this.target_node);
                        if (!existing_edge) {
                            if (this.source_node && this.target_node) {
                                this._addRelation({v: this.source_node, w: this.target_node});
                            }
                            this.resetMouseVars();
                        }
                    }
                }
            });
    }

    appendEdgeEvents(edges) {
        edges
            .on('click', d => this.onEdgeClick(d))
            .on('contextmenu', d => this.onEdgeRightClick(d));
    }

    /**
     * Update the whole graph to reflect global changes in the model
     */
    updateGraph() {
        this.faultyDefs = [];
        this.entitiesByID = {};
        this.nodes = [];
        this.edges = [];

        let created = [];

        this.updateSearchOptions();

        [$Field.materials, $Field.lyphs].forEach(prop => {
            (this._model[prop] || []).forEach(m => {
                if (!m.id) {
                    this.faultyDefs.push({item: m, reason: "No ID"});
                    return;
                }
                m._inMaterials = [];
                this.entitiesByID[m.id] = m;
            });
        });
        (this._model.materials || []).forEach(m => {
            (m.materials || []).forEach(childID => {
                if (!this.entitiesByID[childID]) {
                    this.entitiesByID[childID] = {
                        "id": childID,
                        "_generated": true,
                        "_inMaterials": [],
                    };
                    created.push(this.entitiesByID[childID]);
                }
            });
            (m.materials || []).forEach(childID => this.entitiesByID[childID]._inMaterials.push(m));
        });

        //Create nodes for visualization
        (this._model.materials || []).forEach(m => {
            this.nodes.push(new Node(
                m.id,
                (m._inMaterials || []).map(parent => parent.id),
                (m.materials || []).map(child => child.id ? child.id : child),
                m.name || m.id,
                "type-material",
                m
            ));
            this.entitiesByID[m.id]._class = $SchemaClass.Material;
        });
        (this._model.lyphs || []).forEach(m => {
            if ((m._inMaterials || []).length > 0 || m._included) {
                this.nodes.push(new Node(
                    m.id,
                    (m._inMaterials || []).map(parent => parent.id),
                    (m.materials || []).map(child => child.id ? child.id : child),
                    m.name || m.id,
                    "type-lyph",
                    m
                ));
                m._included = true;
            }
            this.entitiesByID[m.id]._class = $SchemaClass.Lyph;
        });
        (created || []).forEach(m => {
            this.nodes.push(new Node(
                m.id,
                (m._inMaterials || []).map(parent => parent.id),
                (m.materials || []).map(child => child.id ? child.id : child),
                m.name || m.id,
                "type-undefined",
                m
            ));
        });

        // Create edges for visualization
        this.nodes.forEach(node => {
            (node.parents || []).forEach(p => {
                let edge = new Edge(node.id + '---' + p, this.entitiesByID[p], node.resource, 'has-material');
                this.edges.push(edge);
            });
        });

        this.nodes::sortBy(["id"]);
    }

    /**
     * Update node (material, lyph) property
     * @param prop
     * @param value
     */
    updateProperty({prop, value}) {
        if (this.selectedNode) {
            let node = this.graphD3.node(this.selectedNode);
            if (node) {
                if (prop === "id") {
                    replaceMaterialRefs(this._model, this.selectedNode, value);
                    this.selectedNode = value;
                    node.id = value;
                    this.updateGraph();
                    this.draw();
                    this.saveStep("ID update " + node.id);
                }
                if (prop === "name") {
                    this.graphD3.setNode(this.selectedNode, {
                        label: this.selectedMaterial.name || this.selectedMaterial.id,
                    });
                    this.inner.call(this.render, this.graphD3);
                    this.saveStep("Name update " + node.id);
                }
            }
        }
    }

    onEdgeClick(d) {
        // console.log("Clicked on: ", d);
    }

    onEdgeRightClick({v, w}) {
        d3.event.preventDefault();
        let type = 'has-material';
        this.menuTopLeftPosition.x = d3.event.clientX + 'px';
        this.menuTopLeftPosition.y = d3.event.clientY + 'px';
        this.matMenuTrigger.menuData = {item: {v, w}, type: type}
        this.matMenuTrigger.openMenu();
    }

    onNodeClick(nodeID) {
        this.selectedNode = nodeID;
    }

    get selectedNode() {
        return this._selectedNode;
    }

    set selectedNode(nodeID) {
        if (this._selectedNode !== nodeID) {
            if (this._selectedNode) {
                let previous = this.graphD3.node(this._selectedNode);
                if (previous) {
                    d3.select(previous.elem).select("g rect").attr("stroke-width", null);
                }
            }
            let material = this.entitiesByID[nodeID];
            this._selectedNode = nodeID;
            let node = this.graphD3.node(nodeID);
            if (node) {
                let elem = d3.select(node.elem);
                elem.select("g rect").attr("stroke-width", "5");
            }
        }
    }

    get selectedMaterial() {
        return this.entitiesByID[this._selectedNode];
    }

    /**
     * Method called when the user click with the right button
     * @param nodeID
     */
    onRightClick(nodeID) {
        d3.event.preventDefault();
        let node = this.entitiesByID[nodeID];
        let type = 'type-undefined';
        if (!node._generated) {
            type = node._class === $SchemaClass.Material ? "type-material" : "type-lyph";
        }
        this.menuTopLeftPosition.x = d3.event.clientX + 'px';
        this.menuTopLeftPosition.y = d3.event.clientY + 'px';
        this.matMenuTrigger.menuData = {
            item: nodeID, type: type,
            hasParents: (node._inMaterials || []).length > 0,
            hasChildren: (node.materials || []).length > 0
        }
        this.matMenuTrigger.openMenu();
    }

    onEmptyRightClick() {
        d3.event.preventDefault();
        let type = "type-new";
        this.menuTopLeftPosition.x = d3.event.clientX + 'px';
        this.menuTopLeftPosition.y = d3.event.clientY + 'px';
        this.matMenuTrigger.menuData = {item: [d3.event.clientX, d3.event.clientY - 48], type: type}
        this.matMenuTrigger.openMenu();
    }

    _addRelation({v, w}){
        let material1 = this.entitiesByID[v];
        let material2 = this.entitiesByID[w];
        if (material1 && material2) {
            material1.materials = material1.materials || [];
            if (!material1.materials.find(m => m === w)) {
                material1.materials.push(w);
                this.graphD3.setEdge(v, w, {curve: d3.curveBasis})
                this.inner.call(this.render, this.graphD3);
                let path = this.graphD3.edge({v: v, w: w});
                this.appendEdgeEvents(d3.select(path.elem));
                this.saveStep(`Add relation ${v + "---" + w}`);
            }
        }
    }

    _removeNode(nodeID) {
        delete this.entitiesByID[nodeID];
        this.graphD3.removeNode(nodeID);
        let idx = (this.nodes || []).findIndex(n => n.id === nodeID);
        if (idx > -1) {
            this.nodes.splice(idx, 1);
        }
    }

    _removeEdge({v, w}) {
        this.graphD3.removeEdge(v, w);
        let idx = (this.edges || []).findIndex(e => e.source === v && e.target === w);
        if (idx > -1) {
            this.edges.splice(idx, 1);
        }
    }

    _removeMaterialOrLyph(nodeID) {
        let idx = (this._model.materials || []).findIndex(m => m.id === nodeID);
        if (idx > -1) {
            this._model.materials.splice(idx, 1);
        } else {
            idx = (this._model.lyphs || []).findIndex(m => m.id === nodeID);
            this._model.lyphs.splice(idx, 1);
        }
        this.updateSearchOptions();
    }

    defineNewMaterial() {
        let newMatCounter = 1;
        let newMatID = "newMat" + newMatCounter;
        while (this.entitiesByID[newMatID]) {
            newMatID = "newMat" + ++newMatCounter;
        }
        let newMat = {
            [$Field.id]: newMatID,
            [$Field.name]: "New material " + newMatCounter,
            "_class": $SchemaClass.Material
        }
        this._model.materials.push(newMat);
        this.entitiesByID[newMat.id] = newMat;
        return newMat;
    }

    createMaterial() {
        let newMat = this.defineNewMaterial();
        this.graphD3.setNode(newMat.id, {
            label: newMat.name,
            class: 'type-material'
        });
        this.inner.call(this.render, this.graphD3);
        this.nodes.push(new Node(newMat.id, [], [], newMat.name, "type-material", newMat));
        let node = this.graphD3.node(newMat.id);
        if (node) {
            let elem = d3.select(node.elem);
            this.appendNodeEvents(elem);
        }
        this.updateSearchOptions();
        this.selectedNode = newMat.id;
        return newMat.id;
    }

    addMaterial(pos) {
        let nodeID = this.createMaterial();
        let node = this.graphD3.node(nodeID);
        if (node) {
            let elem = d3.select(node.elem);
            let selection = this.svg.select("rect");
            let transform = d3.zoomTransform(selection.node());
            let zoomPos = transform.invert(pos);
            elem.attr('transform', 'translate(' + zoomPos[0] + ',' + zoomPos[1] + ')');
        }
    }

    addDefinition(prop, nodeID) {
        let resource = this.entitiesByID[nodeID];
        resource.name = "Generated " + nodeID;
        resource._class = prop === $Field.lyphs ? $SchemaClass.Lyph : $SchemaClass.Material;
        delete resource._generated;
        this._model[prop] = this._model[prop] || [];
        this._model[prop].push(resource);
    }

    deleteDefinition(nodeID) {
        let material = this.entitiesByID[nodeID];
        if (material) {
            this._removeMaterialOrLyph(nodeID);
            this.entitiesByID[nodeID]._generated = true;
            delete this.entitiesByID[nodeID]._class;
            let node = this.graphD3.node(nodeID);
            if (node) {
                node.class = 'type-undefined';
                let val = d3.select(node.elem).attr("class").replace('type-material', node.class).replace('type-lyph', node.class);
                d3.select(node.elem).attr("class", val);
            }
            this.saveStep("Delete definition " + nodeID);
        }
    }

    defineAsLyph(nodeID) {
        this.addDefinition($Field.lyphs, nodeID);
        let node = this.graphD3.node(nodeID);
        if (node) {
            node.class = 'type-lyph';
            let val = d3.select(node.elem).attr("class").replace('type-undefined', node.class);
            d3.select(node.elem).attr("class", val);
        }
        this.saveStep("Define as lyph " + nodeID);
    }

    defineAsMaterial(nodeID) {
        this.addDefinition($Field.materials, nodeID);
        let node = this.graphD3.node(nodeID);
        if (node) {
            node.class = 'type-material';
            let val = d3.select(node.elem).attr("class").replace('type-undefined', node.class);
            d3.select(node.elem).attr("class", val);
        }
        this.saveStep("Define as material " + nodeID);
    }

    /** Delete material
     * @param nodeID - graph node (material or lyph) ID
     */
    deleteMaterial(nodeID) {
        let material = this.entitiesByID[nodeID];
        if (material) {
            clearMaterialRefs(this._model, nodeID);
            this._removeMaterialOrLyph(nodeID);
            this._removeNode(nodeID);
            let edges = this.graphD3.nodeEdges(nodeID);
            (edges || []).forEach(({v, w}) => this._removeEdge({v, w}));
            this.inner.call(this.render, this.graphD3);
            this.saveStep("Delete material " + nodeID);
        }
    }

    /**
     * Remove node parents
     * @param nodeID - graph node (material or lyph) ID
     */
    removeParents(nodeID) {
        let material = this.entitiesByID[nodeID];
        if ((material._inMaterials || []).length > 0) {
            material._inMaterials.forEach(m => {
                clearMany(m, ["materials"], material.id);
                this._removeEdge({v: m.id, w: material.id})
            });
            material._inMaterials = [];
            this.inner.call(this.render, this.graphD3);
            this.saveStep("Disconnect parents " + nodeID);
        }
    }

    /**
     * Remove node children
     * @param nodeID - graph node (material or lyph) ID
     */
    removeChildren(nodeID) {
        let material = this.entitiesByID[nodeID];
        if ((material.materials || []).length > 0) {
            material.materials.forEach(m => {
                clearMany(m, ["_inMaterials"], material.id);
                this._removeEdge({v: material.id, w: m});
            });
            material.materials = [];
            this.inner.call(this.render, this.graphD3);
            this.saveStep("Disconnect children " + nodeID);
        }
    }

    /**
     * Remove edge between 2 nodes
     * @param v - source node
     * @param w - target node
     */
    removeRelation({v, w}) {
        let material1 = this.entitiesByID[v];
        let material2 = this.entitiesByID[w];
        if ((material1.materials || []).length > 0) {
            clearMany(material1, ["materials"], w);
            clearMany(material2, ["_inMaterials"], v);
            this._removeEdge({v, w});
            this.inner.call(this.render, this.graphD3);
            this.saveStep(`Remove relation ${v + "---" + w}`);
        }
    }

    preview() {
        let result = JSON.stringify(this._model, null, 4);
        const blob = new Blob([result], {type: 'text/plain'});
        FileSaver.saveAs(blob, this._model.id + '-material-editor.json');
    }

    /**
     * Save operation in history
     * @param action
     */
    saveStep(action) {
        if (this.currentStep > this.steps.length - 1){
            this.currentStep = this.steps.length - 1;
        }
        if (this.currentStep !== this.steps.length - 1){
            this.steps.length = this.currentStep + 1;
        }
        let snapshot = this._model::cloneDeep();
        this.steps.push({action: action, snapshot: snapshot});
        this.currentStep = this.steps.length - 1;
    }

    /**
     * Undo the operation
     */
    undo() {
        if (this.currentStep > 0 && this.currentStep < this.steps.length) {
            this.currentStep -= 1;
            this._model = this.steps[this.currentStep].snapshot;
            this.updateGraph();
            this.draw();
        }
    }

    /**
     * Redo the operation
     */
    redo() {
        if (this.currentStep >= 0 && this.currentStep < this.steps.length - 1) {
            this.currentStep += 1;
            this._model = this.steps[this.currentStep].snapshot;
            this.updateGraph();
            this.draw();
        }
    }

    saveChanges() {
        this.entitiesByID::values().forEach(obj => {
            //Clean up all helper mods
            delete obj._inMaterials;
            delete obj._class;
            delete obj._generated;
            delete obj._included;
        });

        this.onChangesSave.emit(this._model);
    }

    selectBySearch(nodeLabel) {
        let nodeID = nodeLabel.substring(
            nodeLabel.indexOf("(") + 1,
            nodeLabel.lastIndexOf(")")
        );
        let node = this.entitiesByID[nodeID];
        if (node) {
            if (node._class === $SchemaClass.Lyph && !node._included) {
                this.lyphToInclude = nodeID;
            } else {
                this.selectedNode = nodeID;
            }
        }
    }

    /**
     * Add lyph to the graph. If a node is selected beforehand, create the relationship
     * @param lyphID
     */
    includeLyph(lyphID) {
        let lyph = this.entitiesByID[lyphID];
        if (lyph) {
            this.graphD3.setNode(lyphID, {
                label: lyph.name,
                class: 'type-lyph'
            });
            this.nodes.push(new Node(lyphID, [], [], lyph.name, "type-lyph", lyph));
            if (this.selectedNode){
                this._addRelation({v: this.selectedNode, w: lyphID});
            } else {
                this.inner.call(this.render, this.graphD3);
            }
            let node = this.graphD3.node(lyphID);
            if (node) {
                let elem = d3.select(node.elem);
                this.appendNodeEvents(elem);
            }
            lyph._included = true;
            this.entitiesByID[lyphID] = lyph;
            this.lyphToInclude = null;
            this.saveStep('Included lyph ' + lyphID);
        }
    }

    excludeLyph(nodeID) {
        delete this.entitiesByID[nodeID]._included;
        this.graphD3.removeNode(nodeID);
        let idx = (this.nodes || []).findIndex(n => n.id === nodeID);
        if (idx > -1) {
            this.nodes.splice(idx, 1);
        }
        this.inner.call(this.render, this.graphD3);
        this.saveStep('Excluded lyph ' + nodeID);
    }
}

@NgModule({
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchBarModule, MatButtonModule, MatDividerModule],
    declarations: [DagViewerD3Component],
    exports: [DagViewerD3Component]
})
export class MaterialEditorModule {
}

