import {NgModule, Component, Input, ViewChild, ElementRef, HostListener} from '@angular/core';
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {MatDialog} from "@angular/material/dialog";

import * as d3 from "d3";
import * as dagreD3 from "dagre-d3";
import {cloneDeep, sortBy, isObject} from 'lodash-bound';

import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "../gui/searchAddBar";
import {ResourceListViewModule, ListNode} from "./resourceListView";
import {MaterialGraphViewerModule} from "./materialGraphViewer";

import {$Field, $SchemaClass} from "../../model";
import {
    COLORS
} from '../utils/colors';
import {
    References,
} from '../utils/references.js';
import {SearchOptions} from "../utils/searchOptions";
import {LinkedResourceModule} from "../gui/linkedResource";
import {ResourceEditor} from "./resourceEditor";
import mprintResources from "../../data/mprint.json";
import {MatTabsModule} from "@angular/material/tabs";
import {MaterialNode, Edge, MAT_NODE_CLASS, MAT_EDGE_CLASS, buildTree} from "../structs/materialNode";

@Component({
    selector: 'materialEditor',
    template: `
        <section class="w3-row">
            <section [class.w3-threequarter]="showPanel">
                <section class="w3-padding-right w3-white" style="position:relative;">
                    <section class="w3-bar-block w3-right vertical-toolbar" style="position:absolute; right:20px">
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="createMaterial()" title="New material">
                            <i class="fa fa-file-pen"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                [disabled]="currentStep === 0"
                                (click)="showDiff()" title="Compare code">
                            <i class="fa fa-code-compare"> </i>
                        </button>
                        <mat-divider></mat-divider>
                        <button [disabled]="!canUndo" class="w3-bar-item"
                                (click)="undo()" [title]="undoTitle">
                            <i class="fa fa-rotate-left"> </i>
                        </button>
                        <button [disabled]="!canRedo" class="w3-bar-item"
                                (click)="redo()" [title]="redoTitle">
                            <i class="fa fa-rotate-right"> </i>
                        </button>
                        <button *ngIf="!showPanel" class="w3-bar-item w3-hover-light-grey"
                                (click)="showPanel = !showPanel" title="Show settings">
                            <i class="fa fa-cog"> </i>
                        </button>
                        <button *ngIf="showPanel" class="w3-bar-item w3-hover-light-grey"
                                (click)="showPanel = !showPanel" title="Hide settings">
                            <i class="fa fa-window-close"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey" (click)="saveChanges()"
                                title="Apply changes">
                            <div style="display: flex">
                                <i class="fa fa-check"> </i>
                                <span *ngIf="currentStep > 0" style="color: red">*</span>
                            </div>
                        </button>
                        <button *ngIf="showTree" class="w3-bar-item w3-hover-light-grey"
                                (click)="showTree = !showTree" title="Return to DAG">
                            <i class="fa fa-reply-all"> </i>
                        </button>
                    </section>
                </section>
                <section [hidden]="showTree" #materialEditor id="materialEditor">
                    <svg #svgDag>
                        <rect width="100%" height="100%"/>
                        <g/>
                    </svg>
                </section>
                <section [hidden]="!showTree">
                    <materialGraphViewer
                            [minWidth]="screenWidth" [minHeight]="screenHeight"
                            [rootNode]="selectedTreeNode"
                            (onNodeSelect)="onNodeClick($event)"
                    >
                    </materialGraphViewer>
                </section>
            </section>
            <section *ngIf="showPanel" class="w3-quarter w3-white settings-panel">
                <linkedResource
                        [resource]="selectedMaterial"
                        [color]="COLORS.selectedBorder"
                        [highlightColor]="COLORS.selected"
                >
                </linkedResource>
                <linkedResource
                        [resource]="matToLink">
                </linkedResource>
                <searchAddBar
                        [searchOptions]="searchOptions"
                        [selected]="matToLink?.id"
                        (selectedItemChange)="selectMatToLink($event)"
                        (addSelectedItem)="linkMaterial($event)"
                >
                </searchAddBar>
                <resourceDeclaration
                        [resource]="selectedMaterial"
                        [externalSearchOptions]="externalSearchOptions"
                        (onValueChange)="updateProperty($event)"
                ></resourceDeclaration>
                <mat-tab-group animationDuration="0ms" #tabChainMethod>
                    <mat-tab class="w3-margin">
                        <!-- Lyphs -->
                        <ng-template mat-tab-label>Lyphs</ng-template>
                        <resourceListView
                                listTitle="Lyphs"
                                [showMenu]=false
                                [listData]="lyphList"
                                (onNodeClick)="switchEditor($event)"
                        >
                        </resourceListView>
                    </mat-tab>
                    <mat-tab class="w3-margin">
                        <!-- Materials -->
                        <ng-template mat-tab-label>Materials</ng-template>
                        <resourceListView
                                listTitle="Materials"
                                [showMenu]=false
                                [listData]="materialList">
                        </resourceListView>
                    </mat-tab>
                </mat-tab-group>
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
                <div *ngIf="[MAT_NODE_CLASS.LYPH, MAT_NODE_CLASS.TEMPLATE, MAT_NODE_CLASS.MATERIAL].includes(type)">
                    <button mat-menu-item (click)="deleteMaterial(item)">Delete</button>
                    <button *ngIf="!hasChildren" mat-menu-item (click)="deleteDefinition(item)">Delete definition
                    </button>
                    <button *ngIf="hasParents" mat-menu-item (click)="removeParents(item)">Disconnect from parents
                    </button>
                    <button *ngIf="hasChildren" mat-menu-item (click)="removeChildren(item)">Disconnect from children
                    </button>
                    <button *ngIf="selectedNode !== item" mat-menu-item (click)="linkMaterial(item)">Connect to selected
                    </button>
                </div>
                <button *ngIf="[MAT_NODE_CLASS.LYPH, MAT_NODE_CLASS.TEMPLATE].includes(type) && !hasChildren && !hasParents"
                        mat-menu-item (click)="excludeLyph(item)">Exclude from view
                </button>
                <div *ngIf="type === MAT_NODE_CLASS.UNDEFINED && !item.includes(':')">
                    <button mat-menu-item (click)="defineAsMaterial(item)">Define as material</button>
                    <button mat-menu-item (click)="defineAsLyphTemplate(item)">Define as lyph template</button>
                </div>
                <button *ngIf="type === MAT_EDGE_CLASS.MATERIAL" mat-menu-item (click)="removeRelation(item)">Delete
                    relation
                </button>
                <button *ngIf="type === MAT_EDGE_CLASS.NEW" mat-menu-item (click)="addMaterial(item)">Add material</button>
            </ng-template>
        </mat-menu>
    `,
    styles: [`
        .vertical-toolbar {
            width: 48px;
        }

        .vertical-toolbar button {
            height: 48px;
        }

        #materialEditor {
            height: 100vh;
            overflow-y: auto;
            overflow-x: auto;
        }

        #svgDag {
            display: block;
            width: 100%;
            top: 0;
            left: 0;
            min-height: 100%;
        }

        .tooltip {
            position: absolute;
            padding: 2px;
            background-color: ${COLORS.tooltip};
            font: 12px sans-serif;
            border: 1px solid ${COLORS.tooltipBorder};
            border-radius: 2px;
            pointer-events: none;
        }

        ::ng-deep .mat-menu-content {
            padding-top: 0px !important;
            padding-bottom: 0px !important;
        }

        .mat-menu-item {
            line-height: 32px;
            height: 32px;
        }

        :host /deep/ g.${MAT_NODE_CLASS.UNDEFINED} > rect {
            fill: ${COLORS.undefined};
        }

        :host /deep/ g.${MAT_NODE_CLASS.MATERIAL} > rect {
            fill: ${COLORS.material};
        }

        :host /deep/ g.${MAT_NODE_CLASS.LYPH} > rect {
            fill: ${COLORS.lyph};
        }

        :host /deep/ g.${MAT_NODE_CLASS.TEMPLATE} > rect {
            fill: ${COLORS.template};
        }

        :host /deep/ text {
            font-weight: 300;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serf;
            font-size: 14px;
        }

        :host /deep/ .node rect {
            stroke: ${COLORS.border};
            fill: ${COLORS.default};
        }

        :host /deep/ .node rect:hover {
            fill: ${COLORS.highlighted};
            stroke-width: 2px;
        }

        :host /deep/ .edgePath path {
            stroke: ${COLORS.path};
            stroke-width: 2px;
        }

        :host /deep/ .edgePath path:hover {
            stroke: ${COLORS.highlighted};
        }

        :host /deep/ .edge .new {
            stroke: ${COLORS.new};
            fill: ${COLORS.new};
        }

        :host /deep/ path.link {
            fill: none;
            stroke: ${COLORS.pathLink};
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

        .label {
            user-select: none;
            cursor: pointer;
        }

        .settings-panel {
            height: 100vh;
            overflow-y: auto;
            overflow-x: auto;
        }
    `]
})
/**
 * @class
 * @property entitiesByID
 */
export class MaterialEditorComponent extends ResourceEditor {
    _helperFields = ['_class', '_generated', '_inMaterials', '_included'];
    MAT_NODE_CLASS = MAT_NODE_CLASS;
    MAT_EDGE_CLASS = MAT_EDGE_CLASS;

    showTree = false;
    graphD3;
    nodes = [];
    edges = [];
    menuTopLeftPosition = {x: '0', y: '0'}

    //Drag & drop
    selected_node;
    source_node;
    target_node;
    md_node;
    hide_line = true;

    //Canvas resizing
    screenHeight;
    screenWidth;

    externalResources = mprintResources;
    externalSearchOptions = [];

    ngOnInit() {
        SearchOptions.addOptions(this.externalResources, this.externalSearchOptions, $SchemaClass.OntologyTerm);
    }

    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;
    @ViewChild('materialEditor') materialEditor: ElementRef;
    @ViewChild('svgDag') svgRef: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;

    @Input('model') set model(newModel) {
        this._model = newModel::cloneDeep();
        this.clearHelpers(this._model);
        this._modelText = JSON.stringify(this._model, null, 4);
        this.steps = [];
        this.currentStep = 0;
        this.saveStep('Initial model');
        this.updateGraph();
        this.draw();
    }

    constructor(snackBar: MatSnackBar, dialog: MatDialog) {
        super(snackBar, dialog);
        this.getScreenSize();
    }

    @HostListener('window:resize', ['$event'])
    getScreenSize(event?) {
        this.screenHeight = window.innerHeight;
        this.screenWidth = window.innerWidth;
    }

    updateSearchOptions() {
        this.searchOptions = SearchOptions.materialsAndLyphTemplates(this._model);
    }

    ngAfterViewInit() {
        this.svg = d3.select(this.svgRef.nativeElement);

        this.svg.select("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "white")
            .on('click', d => this.onEmptyClick())
            .on('contextmenu', d => this.onEmptyRightClick(d));
        this.tooltip = d3.select(this.tooltipRef.nativeElement).style("opacity", 0);
        this.width = this.svgRef.nativeElement.clientWidth;
        this.height = this.svgRef.nativeElement.clientHeight;
        this.draw();

        window.addEventListener('resize', () => {
            this.width = this.svgRef.nativeElement.clientWidth;
            this.height = this.svgRef.nativeElement.clientHeight;
            if (this.isHistory) {
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
        return `Undo ${(this.canUndo ? '"' + this.steps[this.currentStep].action + '"' : "")}`;
    }

    get redoTitle() {
        return `Redo ${(this.canRedo ? '"' + this.steps[this.currentStep + 1].action + '"' : "")}`;
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
            let x = this.graphD3.node(e.source.id);
            let y = this.graphD3.node(e.target.id);
            if (x && y) {
                this.graphD3.setEdge(e.source.id, e.target.id, {
                    curve: d3.curveBasis,
                    class: e.source.id + " " + e.target.id
                });
            } else {
                throw new Error("Graph cannot have an edge between non-existing nodes: " + e.source.id + " --- " + e.target.id);
            }
        });
        this.render = new dagreD3.render(this.graphD3);
        this.render(this.inner, this.graphD3);

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
            .attr('fill', COLORS.new);

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
        function isPath(entitiesByID, v, w) {
            let stack = [];
            let explored = new Set();
            stack.push(v);
            explored.add(v);
            while (stack.length !== 0) {
                let t = stack.pop();
                if (t === w) {
                    return true;
                }
                let t_node = entitiesByID[t];
                (t_node.materials || []).filter(n => !explored.has(n))
                    .forEach(n => {
                        explored.add(n);
                        stack.push(n);
                    });
            }
            return false;
        }

        nodes.on('click', d => this.onNodeClick(d))
            .on('dblclick', d => this.onDblClick(d))
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
                            this.showWarning("Cannot create the edge: source and target nodes must be different!");
                            this.resetMouseVars();
                            return;
                        }
                        let areConnected = isPath(this.entitiesByID, this.target_node, this.source_node);
                        if (areConnected) {
                            this.showWarning("Cannot create the edge: a loop will be introduced!");
                        }
                        let existing_edge = this.graphD3.edge(this.source_node, this.target_node);
                        if (!existing_edge) {
                            this._addRelation({v: this.source_node, w: this.target_node});
                            this.resetMouseVars();
                        } else {
                            this.showWarning("Cannot create the edge: it already exists!");
                        }
                    }
                }
            });
    }

    appendEdgeEvents(edges) {
        edges
            .on('contextmenu', d => this.onEdgeRightClick(d));
    }

    /**
     * Update the whole graph to reflect global changes in the model
     */
    updateGraph() {
        this.entitiesByID = {};
        this.nodes = [];
        this.edges = [];

        this.updateSearchOptions();
        let created = this.collectMaterials();

        //Create nodes for visualization
        (this._model.materials || []).forEach(m => {
            let node = MaterialNode.createInstance(m);
            this.nodes.push(node);
            this.entitiesByID[m.id]._class = $SchemaClass.Material;
        });
        (this._model.lyphs || []).forEach(m => {
            if ((m._inMaterials || []).length > 0 || (m.materials || []).length > 0 || m._included) {
                let node = MaterialNode.createInstance(m, MAT_NODE_CLASS.LYPH);
                this.nodes.push(node);
                m._included = true;
            }
            this.entitiesByID[m.id]._class = $SchemaClass.Lyph;
        });
        (created || []).forEach(m => {
            if (m.id) {
                let node = MaterialNode.createInstance(m, MAT_NODE_CLASS.UNDEFINED);
                this.nodes.push(node);
            }
        });

        // Create edges for visualization
        this.nodes.forEach(node => {
            (node.parents || []).forEach(p => {
                let edge = new Edge(node.id + '---' + p, this.entitiesByID[p], node.resource, 'has-material');
                this.edges.push(edge);
            });
        });
        this.nodes::sortBy([$Field.id]);
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
                if (prop === $Field.id) {
                    References.replaceMaterialRefs(this._model, this.selectedNode, value);
                    this.selectedNode = value;
                    node.id = value;
                    this.updateGraph();
                    this.draw();
                }
                if (prop === $Field.name) {
                    this.graphD3.setNode(this.selectedNode, {
                        label: this.selectedMaterial.name || this.selectedMaterial.id,
                    });
                    this.inner.call(this.render, this.graphD3);
                }
                this.saveStep(`Update property ${prop} of material ` + this.selectedNode);
            }
        } else {
            this.showWarning(`Cannot update the property: material is not selected!`);
        }
    }

    onEdgeRightClick({v, w}) {
        d3.event.preventDefault();
        let type = 'has-material';
        this.menuTopLeftPosition.x = d3.event.clientX + 'px';
        this.menuTopLeftPosition.y = d3.event.clientY + 'px';
        this.matMenuTrigger.menuData = {item: {v, w}, type: type}
        this.matMenuTrigger.openMenu();
    }

    onDblClick(nodeID) {
        this.selectedTreeNode = buildTree(this.entitiesByID, this.entitiesByID[nodeID]);
        this.showTree = true;
    }

    onNodeClick(nodeID) {
        this.selectedNode = nodeID;
    }

    @Input('selectedNode') set selectedNode(nodeID) {
        if (!this._selectedNode !== nodeID) {
            function selector(id){
                return 'g.edgePath.' + id.replace(":", "_") + ' path';
            }
            if (this._selectedNode) {
                let previous = this.graphD3.node(this._selectedNode);
                if (previous) {
                    // Unselect previous node
                    const prevColor = this._selectedNodeColor || COLORS.material;
                    const elem = d3.select(previous.elem).select("g rect");
                    elem.style("stroke-width", "1px").style("stroke", COLORS.border).style("fill", prevColor);
                    d3.selectAll(selector(this._selectedNode)).style("stroke", COLORS.path);
                }
            }
            this._selectedNode = nodeID;
            if (this.graphD3) {
                let node = this.graphD3.node(nodeID);
                if (node) {
                    // Emphasize new selected node
                    const elem = d3.select(node.elem).select("g rect");
                    this._selectedNodeColor = elem.attr("fill");
                    elem.style("stroke-width", "4px").style("stroke", COLORS.selectedBorder).style("fill", COLORS.selected);
                    d3.selectAll(selector(this._selectedNode)).style("stroke", COLORS.selectedPathLink);
                }
            }
            this.prepareLyphList();
            this.prepareMaterialList();
        }
    }

    prepareLyphList() {
        this.lyphList = [];
        (this._model.lyphs || []).forEach(lyph => {
            if ((lyph.layers || []).find(e => e === this._selectedNode)) {
                this.lyphList.push(ListNode.createInstance(lyph));
            }
        });
    }

    prepareMaterialList() {
        this.materialList = [];
        if (this.selectedMaterial) {
            (this.selectedMaterial.materials || []).forEach(
                matID => {
                    let mat = this.entitiesByID[matID] || matID;
                    this.materialList.push(ListNode.createInstance(mat));
                }
            );
        }
    }

    get selectedNode() {
        return this._selectedNode;
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
        let type = MAT_NODE_CLASS.UNDEFINED;
        if (!node._generated) {
            type = node._class === $SchemaClass.Material ? MAT_NODE_CLASS.MATERIAL : node.isTemplate ? MAT_NODE_CLASS.TEMPLATE : MAT_NODE_CLASS.LYPH;
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

    saveStep(action) {
        // Refresh material parts panel as it may change after editing
        this.prepareMaterialList();
        super.saveStep(action);
    }

    onEmptyClick() {
        this.selectedNode = null;
        this.matToLink = null;
    }

    onEmptyRightClick() {
        d3.event.preventDefault();
        let type = MAT_EDGE_CLASS.NEW;
        this.menuTopLeftPosition.x = d3.event.clientX + 'px';
        this.menuTopLeftPosition.y = d3.event.clientY + 'px';
        this.matMenuTrigger.menuData = {item: [d3.event.clientX, d3.event.clientY - 48], type: type}
        this.matMenuTrigger.openMenu();
    }

    _addRelation({v, w}) {
        if (v === w) {
            this.showWarning(`Cannot include a material to itself!`);
            return;
        }
        let material1 = this.entitiesByID[v];
        let material2 = this.entitiesByID[w];
        if (material1 && material2) {
            material1.materials = material1.materials || [];
            if (!material1.materials.find(m => m === w)) {
                material1.materials.push(w);
                this.graphD3.setEdge(v, w, {curve: d3.curveBasis, class: v + " " + w});
                this.inner.call(this.render, this.graphD3);
                let path = this.graphD3.edge({v: v, w: w});
                material2._inMaterials = material2._inMaterials || [];
                material2._inMaterials.push(material1);
                this.appendEdgeEvents(d3.select(path.elem));
                this.saveStep(`Add relation ${v + "---" + w}`);
            } else {
                this.showWarning(`Cannot create the relationship: material ${v} already contains material ${w}!`);
            }
        } else {
            this.showWarning(`Failed to locate a material definition for ${v} or ${w}`);
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
        this._model.materials = this._model.materials || [];
        this._model.materials.push(newMat);
        this.entitiesByID[newMat.id] = newMat;
        return newMat;
    }

    createMaterial(def) {
        let newMat;
        if (def && typeof def === 'object') {
            // Ensure id uniqueness
            let baseId = def.id || 'newMat1';
            let idx = 1;
            let candidate = baseId;
            while (this.entitiesByID[candidate]) {
                const m = (baseId.match(/^(.*?)(\d+)$/) || []);
                if (m.length) {
                    candidate = `${m[1]}${parseInt(m[2], 10) + 1}`;
                } else {
                    idx += 1;
                    candidate = `newMat${idx}`;
                }
            }
            def.id = candidate;
            def._class = def._class || $SchemaClass.Material;
            // Insert into model and cache
            this._model.materials = this._model.materials || [];
            this._model.materials.push(def);
            this.entitiesByID[def.id] = def;
            newMat = def;
        } else {
            newMat = this.defineNewMaterial();
        }
        this.graphD3.setNode(newMat.id, {
            label: newMat.name || newMat.id,
            class: MAT_NODE_CLASS.MATERIAL
        });
        this.inner.call(this.render, this.graphD3);
        let newNode = MaterialNode.createInstance(newMat, MAT_NODE_CLASS.MATERIAL);
        this.nodes.push(newNode);
        let node = this.graphD3.node(newMat.id);
        if (node) {
            let elem = d3.select(node.elem);
            this.appendNodeEvents(elem);
        }
        this.updateSearchOptions();
        this.selectedNode = newMat.id;
        this.saveStep("Create material " + newMat.id);
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
            this.resizeCanvas();
        }
    }

    resizeCanvas() {
        this.svg.attr("width", Math.max(this.screenWidth, this.graphD3.graph().width + 40));
        this.svg.attr("height", Math.max(this.screenHeight, this.graphD3.graph().height + 40));
    }

    addDefinition(prop, nodeID) {
        let resource = this.entitiesByID[nodeID];
        resource.name = "Generated " + nodeID;
        resource._class = prop === $Field.lyphs ? $SchemaClass.Lyph : $SchemaClass.Material;
        delete resource._generated;
        this._model[prop] = this._model[prop] || [];
        this._model[prop].push(resource);
        return resource;
    }

    deleteDefinition(nodeID) {
        let material = this.entitiesByID[nodeID];
        if (material) {
            References.removeMaterialOrLyph(this._model, nodeID);
            this.updateSearchOptions();
            this.entitiesByID[nodeID]._generated = true;
            delete this.entitiesByID[nodeID]._class;
            let node = this.graphD3.node(nodeID);
            if (node) {
                node.class = MAT_NODE_CLASS.UNDEFINED;
                let val = d3.select(node.elem).attr("class")
                    .replace(MAT_NODE_CLASS.MATERIAL, MAT_NODE_CLASS.UNDEFINED)
                    .replace(MAT_NODE_CLASS.LYPH, MAT_NODE_CLASS.UNDEFINED)
                    .replace(MAT_NODE_CLASS.TEMPLATE, MAT_NODE_CLASS.UNDEFINED);
                d3.select(node.elem).attr("class", val);
            }
            this.saveStep("Delete definition " + nodeID);
        }
    }

    defineAsLyphTemplate(nodeID) {
        let lyph = this.addDefinition($Field.lyphs, nodeID);
        lyph.isTemplate = true;
        let node = this.graphD3.node(nodeID);
        if (node) {
            node.class = MAT_NODE_CLASS.TEMPLATE;
            let val = d3.select(node.elem).attr("class").replace(MAT_NODE_CLASS.UNDEFINED, MAT_NODE_CLASS.TEMPLATE);
            d3.select(node.elem).attr("class", val);
        }
        this.saveStep("Define as lyph " + nodeID);
    }

    defineAsMaterial(nodeID) {
        this.addDefinition($Field.materials, nodeID);
        let node = this.graphD3.node(nodeID);
        if (node) {
            node.class = MAT_NODE_CLASS.MATERIAL;
            let val = d3.select(node.elem).attr("class").replace(MAT_NODE_CLASS.UNDEFINED, MAT_NODE_CLASS.MATERIAL);
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
            References.clearMaterialRefs(this._model, nodeID);
            References.removeMaterialOrLyph(this._model, nodeID);
            this.updateSearchOptions();
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
                References.clearMany(m, ["materials"], material.id);
                this._removeEdge({v: m.id, w: material.id});
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
                References.clearMany(m, ["_inMaterials"], material.id);
                this._removeEdge({v: material.id, w: m});
                // this._removeNodeParent(m.id, nodeID);
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
            References.clearMany(material1, ["materials"], w);
            References.clearMany(material2, ["_inMaterials"], v);
            this._removeEdge({v, w});
            this.inner.call(this.render, this.graphD3);
            this.saveStep(`Remove relation ${v + "---" + w}`);
        }
    }

    restoreState() {
        this.updateGraph();
        this.draw();
    }

    selectMatToLink(nodeLabel) {
        let newMat = this.selectBySearch(nodeLabel);
        if (this._selectedNode) {
            this.matToLink = newMat;
        } else {
            if (newMat) {
                this.onNodeClick(newMat.id);
            }
        }
    }

    /**
     * Add lyph to the graph. If a node is selected beforehand, create the relationship
     * @param matID
     */
    linkMaterial(matID) {
        let mat = this.entitiesByID[matID];
        if (mat) {
            let node = this.graphD3.node(matID);
            if (!node && mat._class === $SchemaClass.Lyph) {
                this.graphD3.setNode(matID, {
                    label: mat.name,
                    class: mat.isTemplate ? MAT_NODE_CLASS.TEMPLATE : MAT_NODE_CLASS.LYPH
                });
                let newNode = MaterialNode.createInstance(mat, MAT_NODE_CLASS.LYPH);
                this.nodes.push(newNode);
                this.inner.call(this.render, this.graphD3);
                node = this.graphD3.node(matID);
                let elem = d3.select(node.elem);
                this.appendNodeEvents(elem);
                if (mat._class === $SchemaClass.Lyph) {
                    mat._included = true;
                }
                this.saveStep('Include lyph ' + matID);
            }
            if (this._selectedNode) {
                this._addRelation({v: this._selectedNode, w: matID});
            } else {
                this.showWarning("Cannot add a relation: parent material is not selected");
            }
        } else {
            this.showWarning(`Failed to find definition of the selected material (${matID})!`);
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
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchAddBarModule, MatButtonModule, MatTabsModule,
        MatDividerModule, ResourceListViewModule, MaterialGraphViewerModule, LinkedResourceModule],
    declarations: [MaterialEditorComponent],
    exports: [MaterialEditorComponent]
})
export class MaterialEditorModule {
}

