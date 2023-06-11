import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import * as d3 from "d3";
import * as dagreD3 from "dagre-d3";
import { cloneDeep, values, sortBy} from 'lodash-bound';
import {clearMaterialRefs, clearMany, isPath, replaceMaterialRefs} from './gui/utils.js'
import FileSaver  from 'file-saver';
import {ResourceDeclarationModule} from "./gui/resourceDeclarationEditor";
import {$Field, $SchemaClass} from "../model";
import {SearchBarModule} from "./gui/searchBar";
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';


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
        <section #materialEditorD3 id="materialEditorD3" class="w3-row">
            <section class="w3-threequarter">
                 <section class="w3-padding-right" style="position:relative;">
                     <section class="w3-bar-block w3-right vertical-toolbar" style="position:absolute; right:0">
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="createMaterial()" title="New material">
                            <i class="fa fa-file-pen"> </i>
                        </button>
                        <button [disabled]="!isHistory" class="w3-bar-item w3-hover-light-grey"
                                (click)="showHistory()" title="Show history">
                            <i class="fa fa-timeline"> </i>
                        </button>
                        <button [disabled]="!canUndo" class="w3-bar-item w3-hover-light-grey"
                                (click)="undo()" title="Undo">
                            <i class="fa fa-rotate-left"> </i>
                        </button>
                        <button [disabled]="!canRedo" class="w3-bar-item w3-hover-light-grey"
                                (click)="redo()" title="Redo">
                            <i class="fa fa-rotate-right"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="preview()" title="Preview">
                            <i class="fa fa-magnifying-glass"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey" (click)="saveChanges()"
                                title="Apply changes">
                            <i class="fa fa-check"> </i>
                        </button>
                    </section>
                </section>
                <svg #svgDagD3>
                    <rect width="100%" height="100%"/>
                    <g/>
                </svg>
            </section>
            <section class="w3-quarter">
                 <div class="default-box">
                   <div class="settings-wrap">
                       <div class="default-boxContent">
                        <searchBar [selected]="_selectedName" [searchOptions]="_searchOptions"
                                   (selectedItemChange)="selectBySearch($event)">
                        </searchBar>
                       </div>
                   </div>
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
          <ng-template matMenuContent let-item="item" let-type="type"> 
            <div *ngIf="type === 'type-lyph' || type === 'type-material'">
                <button mat-menu-item (click)="deleteMaterial(item)">Delete</button> 
                <button mat-menu-item (click)="removeParents(item)">Disconnect from parents</button> 
                <button mat-menu-item (click)="removeChildren(item)">Disconnect from children</button> 
            </div>
            <div *ngIf="type === 'type-undefined'">
                <button mat-menu-item (click)="defineAsMaterial(item)">Define as material</button> 
                <button mat-menu-item (click)="defineAsLyph(item)">Define as lyph</button> 
            </div>
            <div *ngIf="type === 'has-material'">
                <button mat-menu-item (click)="removeRelation(item)">Delete relation</button> 
            </div>          
          </ng-template> 
        </mat-menu> 
    `,
    styles: [`
       .vertical-toolbar{
            width : 48px;
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
      stroke-dasharray: 10,2;
      cursor: default;
    }
    
    :host /deep/ path.link.selected {
      stroke-dasharray: 10,2;
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
        
        .default-box .default-boxContent {
          padding: 1.067rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .default-box .default-box-header ~ .default-boxContent {
          padding-top: 0;
        }
        :host >>> .default-box .default-boxFooter {
          text-align: right;
        }
        :host >>> .default-box .default-boxContent section section {
          display: flex;
        }
        :host >>> .default-box .default-boxContent .w3-label {
          width: 6.25rem;
          flex: none;
        }
        :host >>> .default-box .default-boxContent button img {
          position: relative;
          top: -2px;
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
    edgesByID;
    menuTopLeftPosition = {x: '0', y: '0'}

    steps = [];
    currentStep = 0;
    newMatCounter = 0;

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
        this.updateGraph();
        this.draw();
    }

    constructor(snackBar: MatSnackBar) {
        this._snackBar = snackBar;
        console.log("Snackbar: ", this._snackBar);
        this._snackBarConfig.panelClass = ['w3-panel', 'w3-yellow'];
    }

    updateSearchOptions(){
        this._searchOptions = (this._model.materials||[]).map(e => e.name + ' (' + e.id + ')');
        this._searchOptions.concat((this._model.lyphs||[]).map(e => e.name + ' (' + e.id + ')'));
        this._searchOptions.sort();
    }

    ngAfterViewInit() {
        this.svg = d3.select(this.svgRef.nativeElement);
        this.svg.select("rect")
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("fill", "white")
          .on('contextmenu', this.onEmptyRightClick);
        this.tooltip = d3.select(this.tooltipRef.nativeElement).style("opacity", 0);
        this.width  = this.svgRef.nativeElement.clientWidth;
        this.height = this.svgRef.nativeElement.clientHeight;
        this.draw();

        window.addEventListener('resize', () => {
            this.width  = this.svgRef.nativeElement.clientWidth;
            this.height = this.svgRef.nativeElement.clientHeight;
            this.draw();
        }, false);
    }

    get isHistory(){
        return this.steps.length > 0;
    }

    get canUndo(){
        return this.currentStep > 0;
    }

    get canRedo(){
        return this.currentStep < this.steps.length - 1;
    }

    /**
     * Draw dagre-d3 graph
    */
    draw() {
        if (!this.svg) {
            return;
        }
        this.svg.select('g').remove();

        let inner = this.svg.append("g");
        this.zoom = d3.zoom().on("zoom", () => {
            inner.attr("transform", d3.event.transform);
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
        let render = new dagreD3.render(this.graphD3);
        render(inner, this.graphD3);

        let selected_node, source_node, target_node, md_node;
        let hide_line = true;

        function resetMouseVars() {
            selected_node = null;
            source_node = null;
            target_node = null;
            md_node = null;
            hide_line = true;
        }

        let nodes = inner.selectAll("g.node");
        nodes
            .on('click', d => {
                this.onNodeClick(d);
            })
            .on('contextmenu', d => this.onRightClick(d))
            .on('mouseover', d => {
                this.tooltip.style("opacity", .9);
                this.tooltip.html(`<div>${this.entitiesByID[d]?.id}: ${this.entitiesByID[d]?.name || "?"}<\div>`)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on('mouseout', d => {
                this.tooltip.style("opacity", 0);
                if (source_node && (d === source_node)) {
                    hide_line = false;
                }
            })
            .on('mousedown', d => {
                if (d3.event.shiftKey){
                    source_node = d;
                    selected_node = (source_node === selected_node)? null: source_node;
                    md_node = this.graphD3.node(d);
                    drag_line
                        .style('marker-end', 'url(#end-arrow)')
                        .attr('d', 'M' + md_node.x + ',' + md_node.y + 'L' + md_node.x + ',' + md_node.y);
                } else {
                    if (source_node) {
                        drag_line
                            .classed('hidden', true)
                            .style('marker-end', '');
                        target_node = d;
                        if (target_node === source_node) {
                            resetMouseVars();
                            return;
                        }
                        //NK TODO prevent loop
                        let areConnected = isPath(this.entitiesByID, target_node, source_node);
                        if (areConnected){
                            let message = "Cannot create the edge: a loop will be introduced!";
                            this._snackBar.open(message, "OK", this._snackBarConfig);
                        }

                        let existing_edge = this.graphD3.edge(source_node, target_node);
                        if (!existing_edge) {
                            this.graphD3.setEdge(source_node, target_node, {
                                label: "new",
                                arrowhead: "vee",
                                arrowheadStyle: "fill: #a5a5a5",
                                style: "stroke: #a5a5a5; stroke-dasharray: 3, 3;",
                                lineInterpolate: 'bundle'
                            });

                            let edge = new Edge(source_node + '---' + target_node, this.entitiesByID[source_node], this.entitiesByID[target_node], 'has-material');
                            this.edges.push(edge);

                            if (source_node && target_node) {
                                let material1 = this.entitiesByID[source_node];
                                let material2 = this.entitiesByID[target_node];
                                if (material1 && material2) {
                                    material1.materials = material1.materials || [];
                                    if (!material1.materials.find(m => m === material2.id)) {
                                        material1.materials.push(material2.id);

                                        //NK TODO add edge without redrawing

                                        this.updateGraph();
                                        this.draw();
                                    }
                                }
                            }
                            resetMouseVars();
                        }
                    }
                }
            });

        let edges = inner.selectAll("g.edgePath");
        edges
            .on('click', d => this.onEdgeClick(d))
            .on('contextmenu', d => this.onEdgeRightClick(d));

        this.svg.attr("height", this.graphD3.graph().height + 40);
        // inner.attr("height", this.graphD3.graph().height + 40);

        //Experimental
        // this.svg.append('svg:defs').append('svg:marker')
        inner.append('svg:defs').append('svg:marker')
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

        function mousedown() {
        }

        function mousemove() {
            if (source_node) {
                drag_line
                    .classed('hidden', hide_line)
                    .attr('d', 'M' + md_node.x + ',' + md_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
            }
        }

        function mouseup() {
            if (source_node) {
                drag_line
                    .classed('hidden', true)
                    .style('marker-end', '');
            }
            resetMouseVars();
        }

        let drag_line = inner.append('svg:path')
          .attr('class', 'link dragline hidden')
          .attr('d', 'M0,0L0,0');

        inner.on('mousedown', mousedown)
          .on('mousemove', mousemove)
          .on('mouseup', mouseup);
    }

    /**
     * Update the whole graph to reflect global changes in the model
     */
    updateGraph() {
        this.faultyDefs = [];
        this.entitiesByID = {};
        this.edgesByID = {};
        this.nodes = [];
        this.edges = [];

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
        let created = [];
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
                (m.materials || []).map(child => child.id? child.id: child),
                m.name || m.id,
                "type-material",
                m
            ));
            this.entitiesByID[m.id]._class = $SchemaClass.Material;
        });
        (this._model.lyphs || []).forEach(m => {
            // if ((m._inMaterials||[]).length > 0) {
                this.nodes.push(new Node(
                    m.id,
                    (m._inMaterials || []).map(parent => parent.id),
                    (m.materials || []).map(child => child.id? child.id: child),
                    m.name || m.id,
                    "type-lyph",
                    m
                ));
            // }
            this.entitiesByID[m.id]._class = $SchemaClass.Lyph;
        });
        (created || []).forEach(m => {
            this.nodes.push(new Node(
                m.id,
                (m._inMaterials || []).map(parent => parent.id),
                (m.materials || []).map(child => child.id? child.id: child),
                m.name || m.id,
                "type-undefined",
                m
            ));
        });

        // Create edges for visualization
        this.nodes.forEach(node => {
            (node.parents || []).forEach(p => {
                let edge = new Edge(node.id + '---' + p, this.entitiesByID[p], node.resource, 'has-material');
                if (!this.edgesByID[edge.id]) {
                    this.edges.push(edge);
                    this.edgesByID[edge.id] = edge;
                }
            });
        });

        this.nodes::sortBy(["id"]);
    }

    /**
     * Update node (material, lyph) property
     * @param prop
     * @param value
     */
    updateProperty({prop, value}){
        if (this.selectedNode){
            let node = this.graphD3.node(this.selectedNode);
            if (node) {
                if (prop === "id") {
                    replaceMaterialRefs(this._model, this.selectedNode, value);
                    this.selectedNode = value;
                    node.id = value;
                    this.updateGraph();
                    this.draw();
                }
                if (prop === "name") {
                    node.label = value || node.id;
                    d3.select(node.elem).select("g").select("g text")
                    .attr("dy", "1em")
                    .attr("x", "1")
                    .text(node.label);
                }
            }
        }
    }

    onEdgeClick(d){
        // console.log("Clicked on: ", d);
    }

    onEdgeRightClick({v, w}){
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

    get selectedNode(){
        return this._selectedNode;
    }

    set selectedNode(nodeID){
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
                // this.zoom.translate([this.width / 2 - this.zoom.scaleTo(elem), this.height / 2 - this.zoom.scale(elem)])
                // console.log(node.elem);
            }
        }
    }

    get selectedMaterial(){
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
        if (!node._generated){
            type = node._class === $SchemaClass.Material? "type-material": "type-lyph";
        }
        this.menuTopLeftPosition.x = d3.event.clientX + 'px';
        this.menuTopLeftPosition.y = d3.event.clientY + 'px';
        this.matMenuTrigger.menuData = {item: nodeID, type: type}
        this.matMenuTrigger.openMenu();
    }

    onEmptyRightClick(){
        d3.event.preventDefault();
    }

    createMaterial(){
        let newMat = {
            "id": "newMat" + ++this.newMatCounter,
            "name": "New material " + this.newMatCounter
        }
        this._model.materials.push(newMat);
        this.updateGraph();
        this.draw();
        this.selectedNode = newMat.id;
    }

    deleteMaterial(nodeID){
        let material = this.entitiesByID[nodeID];
        if (material) {
            this.saveStep("Delete material");
            clearMaterialRefs(this._model, material.id);
            this.updateGraph();
            this.draw();
        }
    }

    defineAsLyph(nodeID){
        this.saveStep("Define as lyph");
        let lyph = this.entitiesByID[nodeID];
        lyph.name = "Generated " + lyph.id;
        this._model.lyphs.push(lyph);
        this.saveStep("Define lyph");
        //NK TODO Update node color
    }

    defineAsMaterial(nodeID){
        this.saveStep("Define as material");
        let material = this.entitiesByID[nodeID];
        material.name = "Generated " + material.id;
        this._model.materials.push(material);
        this.saveStep("Define material");
        //NK TODO Update node color
        let node = this.graphD3.node(nodeID);
        if (node){
            node._class = 'type-material';
            d3.select(node.elem).select("g rect").attr("class", 'type-material');
        }
        // console.log(node.elem);
    }

    removeParents(nodeID){
        let material = this.entitiesByID[nodeID];
        if ((material._inMaterials||[]).length > 0) {
            this.saveStep("Disconnect parents");
            material._inMaterials.forEach(m => clearMany(m, ["materials"], material.id));
            material._inMaterials = [];
            this.updateGraph();
            this.draw();
        }
    }

    removeChildren(nodeID){
        let material = this.entitiesByID[nodeID];
        if ((material.materials||[]).length > 0) {
            this.saveStep("Disconnect children");
            material.materials.forEach(m => clearMany(m, ["_inMaterials"], material.id));
            material.materials = [];
            this.updateGraph();
            this.draw();
        }
    }

    removeRelation({v, w}){
        let material = this.entitiesByID[v];
        if ((material.materials||[]).length > 0) {
            this.saveStep("Remove relation");
            clearMany(material, ["materials"], w);
            let edge = this.graphD3.edge({v,w});
            if (edge){
                d3.select(edge.elem).remove();
            }
        }
    }

    preview(){
        let result = JSON.stringify(this._model, null, 4);
        const blob = new Blob([result], {type: 'text/plain'});
        FileSaver.saveAs(blob, this._model.id + '-material-editor.json');
    }

    saveStep(action){
        console.log("Saving step before: ", action);
        let snapshot = this._model::cloneDeep();
        this.steps.push({action: action, snapshot: snapshot});
        this.currentStep = this.steps.length-1;
    }

    undo(){
        console.log("Undo!");
        if (this.currentStep > 1) {
            this._model = this.steps[this.currentStep - 1];
            this.updateGraph();
            this.draw();
            this.currentStep -= 1;
        }
    }

    redo(){
        console.log("Redo!");
        if (this.currentStep < this.steps.length) {
            this._model = this.steps[this.currentStep].snapshot;
            this.updateGraph();
            this.draw();
            this.currentStep += 1;
        }
    }

    showHistory(){
    }

    saveChanges(){
        this.entitiesByID::values().forEach(obj => {
            //Clean up all helper mods
            delete obj._inMaterials;
            delete obj._class;
            delete obj._generated;
        });

        this.onChangesSave.emit(this._model);
    }

    selectBySearch(nodeLabel) {
        let nodeID = nodeLabel.substring(
            nodeLabel.indexOf("(") + 1,
            nodeLabel.lastIndexOf(")")
        );
        if (this.entitiesByID[nodeID]) {
            this.selectedNode = nodeID;
        }
    }
}

@NgModule({
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchBarModule],
    declarations: [DagViewerD3Component],
    exports: [DagViewerD3Component]
})
export class MaterialEditorModule {
}

