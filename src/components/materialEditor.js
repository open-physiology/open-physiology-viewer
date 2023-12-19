import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import * as d3 from "d3";
import * as dagreD3 from "dagre-d3";
import {cloneDeep, values, sortBy} from 'lodash-bound';
import {
    clearMaterialRefs,
    clearMany,
    isPath,
    replaceMaterialRefs,
    prepareMaterialSearchOptions,
    COLORS
} from './gui/utils.js'
import {DiffDialog} from "./gui/diffDialog";
import {ResourceDeclarationModule} from "./gui/resourceDeclarationEditor";
import {$Field, $SchemaClass} from "../model";
import {SearchAddBarModule} from "./gui/searchAddBar";
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {HostListener} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ResourceListViewModule, ListNode} from "./gui/resourceListView";

/**
 * Css class names to represent ApiNATOMY resource classes
 * @type {{LYPH: string, UNDEFINED: string, TEMPLATE: string, MATERIAL: string}}
 */
const CLASS = {
    LYPH: $SchemaClass.Lyph,
    MATERIAL: $SchemaClass.Material,
    TEMPLATE: "Template",
    UNDEFINED: "Undefined"
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
                            <i class="fa fa-magnifying-glass"> </i>
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
                    </section>
                </section>
                <section #materialEditorD3 id="materialEditorD3">
                    <svg #svgDagD3>
                        <rect width="100%" height="100%"/>
                        <g/>
                    </svg>                    
                </section>                
            </section>
            <section *ngIf="showPanel" class="w3-quarter w3-white">
                <searchAddBar 
                        [searchOptions]="searchOptions"
                        [selected]="matToLink"
                        (selectedItemChange)="selectBySearch($event)"
                        (addSelectedItem)="linkMaterial($event)"
                >
                </searchAddBar>                          
                <resourceDeclaration
                        [resource]="selectedMaterial"
                        (onValueChange)="updateProperty($event)"
                ></resourceDeclaration>
                    <resourceListView 
                      title="Lyphs"
                      [showMenu]=false
                      [listData]="lyphList"
                      (onNodeClick)="selectLyph($event)"
                    >
                    </resourceListView>   
                
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
                <div *ngIf="[CLASS.LYPH, CLASS.TEMPLATE, CLASS.MATERIAL].includes(type)">
                    <button mat-menu-item (click)="deleteMaterial(item)">Delete</button>
                    <button *ngIf="!hasChildren" mat-menu-item (click)="deleteDefinition(item)">Delete definition</button>
                    <button *ngIf="hasParents" mat-menu-item (click)="removeParents(item)">Disconnect from parents</button>
                    <button *ngIf="hasChildren" mat-menu-item (click)="removeChildren(item)">Disconnect from children</button>
                </div>
                <button *ngIf="[CLASS.LYPH, CLASS.TEMPLATE].includes(type) && !hasChildren && !hasParents" 
                        mat-menu-item (click)="excludeLyph(item)">Exclude from view</button>
                <div *ngIf="type === CLASS.UNDEFINED">
                    <button mat-menu-item (click)="defineAsMaterial(item)">Define as material</button>
                    <button mat-menu-item (click)="defineAsLyphTemplate(item)">Define as lyph template</button>
                </div>
                <button *ngIf="type === EDGE_CLASS.MATERIAL" mat-menu-item (click)="removeRelation(item)">Delete relation</button>
                <button *ngIf="type === EDGE_CLASS.NEW" mat-menu-item (click)="addMaterial(item)">Add material</button>

            </ng-template>
        </mat-menu>
    `,
    styles: [`
        .vertical-toolbar {
            width: 48px;
        }       
        .vertical-toolbar button{
            height: 48px;
        }
        
        #materialEditorD3 {
            height: 100vh;
            overflow-y: scroll;
            overflow-x: scroll;
        }

        #svgDagD3 {
            display: block;
            width: 100%;
            top: 0;
            left: 0;
            min-height: 100%;
        }

        .tooltip {
            position: absolute;
            padding: 2px;
            background-color: #f5f5f5;
            font: 12px sans-serif;
            border: 1px solid #666;
            pointer-events: none;
        }
        
        ::ng-deep .mat-menu-content {
          padding-top: 0px !important;
          padding-bottom: 0px !important;
        }
        
        .mat-menu-item{
          line-height:32px;
          height:32px;
        }

        :host /deep/ g.${CLASS.UNDEFINED} > rect {
            fill: lightgrey;
        }

        :host /deep/ g.${CLASS.MATERIAL} > rect {
            fill: ${COLORS.material};
        }

        :host /deep/ g.${CLASS.LYPH} > rect {
            fill: ${COLORS.lyph};
        }

        :host /deep/ g.${CLASS.TEMPLATE} > rect {
            fill: ${COLORS.template};
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
    `]
})
/**
 * @class
 * @property entitiesByID
 */
export class DagViewerD3Component {
    CLASS = CLASS;
    EDGE_CLASS = EDGE_CLASS;

    _originalModel;
    _model;
    _selectedNode;

    graphD3;
    entitiesByID;
    nodes = [];
    edges = [];
    menuTopLeftPosition = {x: '0', y: '0'}

    searchOptions;
    steps = [];
    currentStep = 0;
    selected_node;
    source_node;
    target_node;
    md_node;
    hide_line = true;
    showPanel = true;

    _snackBar;
    _snackBarConfig = new MatSnackBarConfig();

    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;
    @ViewChild('materialEditorD3') materialEditor: ElementRef;
    @ViewChild('svgDagD3') svgRef: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;

    @Output() onChangesSave = new EventEmitter();
    @Output() onSwitchEditor = new EventEmitter();

    @Input('model') set model(newModel) {
        this._originalModel = newModel;
        this._model = newModel::cloneDeep();
        this._modelText = JSON.stringify(this._model, null, 4);
        this.steps = [];
        this.currentStep = 0;
        this.saveStep('Initial model');
        this.updateGraph();
        this.draw();
    }

    constructor(snackBar: MatSnackBar, dialog: MatDialog) {
        this.dialog = dialog;
        this._snackBar = snackBar;
        this._snackBarConfig.panelClass = ['w3-panel', 'w3-orange'];
        this.getScreenSize();
    }

    @HostListener('window:resize', ['$event'])
    getScreenSize(event?) {
          this.screenHeight = window.innerHeight;
          this.screenWidth = window.innerWidth;
    }

    updateSearchOptions() {
        this.searchOptions = prepareMaterialSearchOptions(this._model);
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
      return `Redo ${(this.canRedo? '"' + this.steps[this.currentStep + 1].action + '"': "")}`;
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
                this.graphD3.setEdge(e.source.id, e.target.id, {curve: d3.curveBasis, class: e.source.id + " " + e.target.id});
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
                            let message = "Cannot create the edge: source and target nodes must be different!";
                            this._snackBar.open(message, "OK", this._snackBarConfig);
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
                            this._addRelation({v: this.source_node, w: this.target_node});
                            this.resetMouseVars();
                        } else {
                            let message = "Cannot create the edge: it already exists!";
                            this._snackBar.open(message, "OK", this._snackBarConfig);
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

        [$Field.materials, $Field.lyphs].forEach(prop => {
            (this._model[prop] || []).forEach(m => {
                (m.materials || []).forEach(childID => {
                    if (!this.entitiesByID[childID]) {
                        this.entitiesByID[childID] = {
                            [$Field.id]: childID,
                            "_generated": true,
                            "_inMaterials": [],
                        };
                        created.push(this.entitiesByID[childID]);
                    }
                });
                (m.materials || []).forEach(childID => this.entitiesByID[childID]._inMaterials.push(m));
            });
        });

        //Create nodes for visualization
        (this._model.materials || []).forEach(m => {
            this.nodes.push(new MaterialNode(
                m.id,
                (m._inMaterials || []).map(parent => parent.id),
                (m.materials || []).map(child => child.id ? child.id : child),
                m.name || m.id,
                CLASS.MATERIAL,
                m
            ));
            this.entitiesByID[m.id]._class = $SchemaClass.Material;
        });
        (this._model.lyphs || []).forEach(m => {
            if ((m._inMaterials || []).length > 0 || (m.materials || []).length > 0 || m._included) {
                this.nodes.push(new MaterialNode(
                    m.id,
                    (m._inMaterials || []).map(parent => parent.id),
                    (m.materials || []).map(child => child.id ? child.id : child),
                    m.name || m.id,
                    m.isTemplate? CLASS.TEMPLATE: CLASS.LYPH,
                    m
                ));
                m._included = true;
            }
            this.entitiesByID[m.id]._class = $SchemaClass.Lyph;
        });
        (created || []).forEach(m => {
            if (m.id) {
                this.nodes.push(new MaterialNode(
                    m.id,
                    (m._inMaterials || []).map(parent => parent.id),
                    (m.materials || []).map(child => child.id ? child.id : child),
                    m.name || m.id,
                    CLASS.UNDEFINED,
                    m
                ));
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
                    replaceMaterialRefs(this._model, this.selectedNode, value);
                    this.selectedNode = value;
                    node.id = value;
                    this.updateGraph();
                    this.draw();
                    this.saveStep("ID update " + value);
                }
                if (prop === $Field.name) {
                    this.graphD3.setNode(this.selectedNode, {
                        label: this.selectedMaterial.name || this.selectedMaterial.id,
                    });
                    this.inner.call(this.render, this.graphD3);
                    this.saveStep("Name update " + value);
                }
            }
        } else {
            let message = `Cannot update the property: material is not selected!`;
            this._snackBar.open(message, "OK", this._snackBarConfig);
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
                    d3.selectAll('g.edgePath.' + this._selectedNode + ' path').style("stroke-width", null);
                }
            }
            this._selectedNode = nodeID;
            let node = this.graphD3.node(nodeID);
            if (node) {
                let elem = d3.select(node.elem);
                elem.select("g rect").attr("stroke-width", "5");
                let edges = d3.selectAll('g.edgePath.' + nodeID + ' path').style("stroke-width", "5");
            }
            this.prepareLyphList();
        }
    }

    prepareLyphList(){
        this.lyphList = [];
        (this._model.lyphs||[]).forEach(lyph => {
            if ((lyph.layers||[]).find(e => e === this._selectedNode)){
                this.lyphList.push(ListNode.createInstance(lyph));
            }
        });
    }

    selectLyph(node){
        if (node.class === $SchemaClass.Lyph || node.class === "Template") {
            this.onSwitchEditor.emit({editor: "lyph", node: node.id});
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
        let type = CLASS.UNDEFINED;
        if (!node._generated) {
            type = node._class === $SchemaClass.Material ? CLASS.MATERIAL : node.isTemplate? CLASS.TEMPLATE: CLASS.LYPH;
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

    onEmptyClick() {
        this.selectedNode = null;
    }

    onEmptyRightClick() {
        d3.event.preventDefault();
        let type = EDGE_CLASS.NEW;
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
                this.graphD3.setEdge(v, w, {curve: d3.curveBasis, class: v + " " + w});
                this.inner.call(this.render, this.graphD3);
                let path = this.graphD3.edge({v: v, w: w});
                material2._inMaterials = material2._inMaterials || [];
                material2._inMaterials.push(material1);
                this.appendEdgeEvents(d3.select(path.elem));
                this.saveStep(`Add relation ${v + "---" + w}`);
            } else {
                let message = `Cannot create the relationship: material ${v} already contains material ${w}!`;
                this._snackBar.open(message, "OK", this._snackBarConfig);
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
        this._model.materials = this._model.materials || [];
        this._model.materials.push(newMat);
        this.entitiesByID[newMat.id] = newMat;
        return newMat;
    }

    createMaterial() {
        let newMat = this.defineNewMaterial();
        this.graphD3.setNode(newMat.id, {
            label: newMat.name,
            class: CLASS.MATERIAL
        });
        this.inner.call(this.render, this.graphD3);
        this.nodes.push(new MaterialNode(newMat.id, [], [], newMat.name, CLASS.MATERIAL, newMat));
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

    resizeCanvas(){
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
            this._removeMaterialOrLyph(nodeID);
            this.entitiesByID[nodeID]._generated = true;
            delete this.entitiesByID[nodeID]._class;
            let node = this.graphD3.node(nodeID);
            if (node) {
                node.class = CLASS.UNDEFINED;
                let val = d3.select(node.elem).attr("class")
                    .replace(CLASS.MATERIAL, CLASS.UNDEFINED)
                    .replace(CLASS.LYPH, CLASS.UNDEFINED)
                    .replace(CLASS.TEMPLATE, CLASS.UNDEFINED);
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
            node.class = CLASS.TEMPLATE;
            let val = d3.select(node.elem).attr("class").replace(CLASS.UNDEFINED, CLASS.TEMPLATE);
            d3.select(node.elem).attr("class", val);
        }
        this.saveStep("Define as lyph " + nodeID);
    }

    defineAsMaterial(nodeID) {
        this.addDefinition($Field.materials, nodeID);
        let node = this.graphD3.node(nodeID);
        if (node) {
            node.class = CLASS.MATERIAL;
            let val = d3.select(node.elem).attr("class").replace(CLASS.UNDEFINED, CLASS.MATERIAL);
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

showDiff(){
         const dialogRef = this.dialog.open(DiffDialog, {
            width : '90%',
            data  : {'oldContent': this._modelText, 'newContent': this.currentText}
        });
        dialogRef.afterClosed().subscribe(res => {
            if (res !== undefined){
            }
        });
    }

    get currentText(){
        if (this.currentStep > 0 && this.currentStep < this.steps.length) {
            const added = ['_class', '_generated', '_inMaterials', '_included'];
            let currentModel = this._model::cloneDeep();
            return JSON.stringify(currentModel,
                function(key, val) {
                    if (!added.includes(key)){
                        return val;
                    }},
                4);
        }
        return this._modelText;
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

    clearHelpers(){
        this.entitiesByID::values().forEach(obj => {
            //Clean up all helper mods
            delete obj._inMaterials;
            delete obj._class;
            delete obj._generated;
            delete obj._included;
        });
    }

    saveChanges() {
        this.clearHelpers();
        this.onChangesSave.emit(this._model);
    }

    selectBySearch(nodeLabel) {
        let nodeID = nodeLabel.substring(
            nodeLabel.indexOf("(") + 1,
            nodeLabel.lastIndexOf(")")
        );
        let node = this.entitiesByID[nodeID];
        if (node) {
            if (this.selectedNode) {
                this.matToLink = nodeID;
            } else {
                this.selectedNode = nodeID;
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
            if (!node && mat._class === $SchemaClass.Lyph){
                this.graphD3.setNode(matID, {
                    label: mat.name,
                    class: mat.isTemplate? CLASS.TEMPLATE: CLASS.LYPH
                });
                this.nodes.push(new MaterialNode(matID, [], [], mat.name, mat.isTemplate? CLASS.TEMPLATE: CLASS.LYPH, mat));
                this.inner.call(this.render, this.graphD3);
                node = this.graphD3.node(matID);
                let elem = d3.select(node.elem);
                this.appendNodeEvents(elem);
                if (mat._class === $SchemaClass.Lyph) {
                    mat._included = true;
                }
                this.saveStep('Include lyph ' + matID);
            }
            if (this.selectedNode){
                this._addRelation({v: this.selectedNode, w: matID});
            }
            this.matToLink = null;
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
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchAddBarModule, MatButtonModule,
        MatDividerModule, ResourceListViewModule],
    declarations: [DagViewerD3Component],
    exports: [DagViewerD3Component]
})
export class MaterialEditorModule {
}

