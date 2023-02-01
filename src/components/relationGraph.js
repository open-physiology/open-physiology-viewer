import * as d3 from 'd3';
window.d3 = d3;

import {Component, ElementRef, Input, NgModule, ViewChild, ChangeDetectionStrategy} from "@angular/core";
import {CommonModule} from "@angular/common";
import {values, pick, flatten, keys, entries, isObject} from 'lodash-bound';
import forceInABox from '../algorithms/forceInABox';
import FileSaver from "file-saver";
import {ResourceInfoModule} from "./gui/resourceInfo";
import {MatSliderModule} from "@angular/material/slider";
import {MatCheckboxModule} from '@angular/material/checkbox';
import {SearchBarModule} from "./gui/searchBar";
import {$Field, $SchemaClass} from "../model";


@Component({
    selector: 'relGraph',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section id="relGraphPanel" class="w3-row">
            <section #relGraphContainer id="relGraphContainer" [class.w3-threequarter]="_showPanel">
                <section class="w3-bar-block w3-right" style="position:absolute; right:0">
                    <input #fileInput
                           type="file"
                           accept=".json"
                           [style.display]="'none'"
                           (change)="load(fileInput.files)"
                    />
                    <button class="w3-bar-item w3-hover-light-grey" (click)="draw()"
                            title="Update layout">
                        <i class="fa fa-refresh"> </i>
                    </button>
                    <button *ngIf="!_showPanel" class="w3-bar-item w3-hover-light-grey"
                            (click)="toggleSettingPanel()" title="Show legend">
                        <i class="fa fa-cog"> </i>
                    </button>
                    <button *ngIf="_showPanel" class="w3-bar-item w3-hover-light-grey"
                            (click)="toggleSettingPanel()" title="Hide legend">
                        <i class="fa fa-window-close"> </i>
                    </button>
                    <button class="w3-bar-item w3-hover-light-grey"
                            (click)="export()" title="Save coordinates">
                        <i class="fa fa-save"> </i>
                    </button>
                    <button class="w3-bar-item w3-hover-light-grey"
                            (click)="fileInput.click()" title="Load coordinates">
                        <i class="fa fa-folder"> </i>
                    </button>
                </section>
                <svg #svg></svg>
            </section>
            <section id="relGraphSettingsPanel" [hidden]="!_showPanel" class="w3-quarter">
                <svg #legendSvg></svg>
                <section class="w3-padding-small">
                    <!--Node type filter-->
                    <fieldset class="w3-card w3-round w3-margin-small">
                        <legend>Resource types</legend>
                        <span *ngFor="let nodeType of nodeTypes | keyvalue">
                            <mat-checkbox matTooltip="Toggle nodes" labelPosition="after" class="w3-margin-left"
                                          [checked] = "!nodeType.value.hidden"
                                          (change)  = "toggleNodeType(nodeType.key)">
                                {{nodeType.key}}
                            </mat-checkbox>
                        </span>
                    </fieldset>
                    
                    <!--Link type filter-->
                    <fieldset class="w3-card w3-round w3-margin-small">
                        <legend>Relationship types</legend>
                        <span *ngFor="let linkType of linkTypes | keyvalue">
                            <mat-checkbox matTooltip="Toggle relationships" labelPosition="after" class="w3-margin-left"
                                          [checked] = "!linkType.value.hidden"
                                          (change)  = "toggleLinkType(linkType.key)">
                                {{linkType.key}}
                            </mat-checkbox>
                        </span>
                    </fieldset>
                    
                    <!--Highlighted entity-->
                    <fieldset class="w3-card w3-round w3-margin-small">
                        <legend>Highlighted</legend>
                        <resourceInfoPanel *ngIf="!!_highlighted" [resource]="_highlighted"></resourceInfoPanel>
                    </fieldset>

                    <!--Search bar-->
                    <fieldset class="w3-card w3-round w3-margin-small-small">
                        <legend>Search</legend>
                        <searchBar [selected]="_selectedName" [searchOptions]="_searchOptions"
                                   (selectedItemChange)="selectBySearch($event)">
                        </searchBar>
                    </fieldset>

                    <!--Selected entity-->
                    <fieldset class="w3-card w3-round w3-margin-small">
                        <legend>Selected</legend>
                        <resourceInfoPanel *ngIf="!!_selected" [resource]="_selected">
                        </resourceInfoPanel>
                        <button *ngIf="!!_selected" title="Edit"
                                class="w3-hover-light-grey w3-right">
                            <i class="fa fa-edit"> </i>
                        </button>
                    </fieldset>

                    <section #tooltip class="tooltip"></section>

                </section>

            </section>
        </section>
    `,
    styles: [`
        #relGraphPanel {
            height: 100vh;
        }

        #relGraphContainer {
            height: 100vh;
        }

        .tooltip {
            position: absolute;
            padding: 2px;
            background-color: #f5f5f5;
            font: 12px sans-serif;
            border: 1px solid #666;
            pointer-events: none;
        }

        #relGraphSettingsPanel {
            height: 100vh;
            overflow-y: scroll;
        }

        :host >>> fieldset {
            border: 1px solid grey;
            margin: 2px;
        }

        :host >>> legend {
            padding: 0.2em 0.5em;
            border: 1px solid grey;
            color: grey;
            font-size: 90%;
            text-align: right;
        }
    `]
})
/**
 * Search bar component
 */
export class RelGraph {
    @ViewChild('svg') svgRef: ElementRef;
    @ViewChild('relGraphContainer') relGraphContainer: ElementRef;
    @ViewChild('legendSvg') legendSvgRef: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;

    _graphData;
    _highlighted = null;
    _selected    = null;

    _searchOptions;
    _selectedName = "";
    _showPanel = true;
    _isActive = false;

    data = { nodes: [], links: [] };

    nodeTypes = {
        "Lyph"                  : {color: "#FF0000", shape: "circle", attrs: {"r": 5}, hidden: true},
        "LyphFromMaterial"      : {color: "#00FF00", shape: "circle", attrs: {"r": 5}, hidden: true},
        "Link"                  : {color: "#000000", shape: "rect",   attrs: {"width": 10, "height": 10, "x": -5, "y": -5}, hidden: true},
        "Coalescence"           : {color: "#FFA500", shape: "path",   attrs: {"d": "M -10 8 L 0 -8 L 10 8 L -10 8"}, hidden: true},
        "EmbeddedCoalescence"   : {color: "#FFFF00", shape: "path",   attrs: {"d": "M -10 8 L 0 -8 L 10 8 L -10 8"}, hidden: true},
        "Material"              : {color: "#008000", shape: "path",   attrs: {"d": "M -7 0 L -4 -7 L 4 -7 L 7 0 L 4 7 L -4 7 L -7 0"}, hidden: true}
    };

    linkTypes = {
        "diffusive"         :  {color: "#CCC"},
        "advective"         :  {color: "#000"},
        "conveyingLyph"     :  {color: "#FF0000"},
        "layer"             :  {color: "#00FF00", directed: true},
        "subtype"           :  {color: "#0000FF", directed: true},
        "coalescence"       :  {color: "#FFA500"},
        "material"          :  {color: "#000080", directed: true},
        "conveyingMaterial" :  {color: "#FFC0CB"},
        "lyphFromMaterial"  :  {color: "#008000", directed: true}
    };

    strokeTypes = {
        "instance": "#CCC",
        "template": "#0000FF"
    };

    @Input('isActive') set isActive(value){
        this._isActive = value;
        if (this.simulation){
            if (value){
                this.simulation.restart();
            } else {
                this.simulation.stop();
            }
        }
    }

    @Input('graphData') set graphData(newGraphData) {
        if (this._graphData !== newGraphData) {
            this._graphData = newGraphData;

            this._searchOptions = (this._graphData.resources||[]).filter(e => e.name).map(e => e.name);
            this.data = {nodes: [], links: []};

            let resources = this._graphData::pick([$Field.materials, $Field.lyphs, $Field.coalescences, $Field.links])::values()::flatten();
            let filter = (this._graphData.config && this._graphData.config.filter) || [];
            this.data.nodes = resources.filter(e => !!e && e.isSubtypeOf && !filter.find(x => e.isSubtypeOf(x)));

            this.data.nodes.forEach(e => {
                if (!e::isObject()){return; }
                e.relClass = e.class;
                if (e.class === $SchemaClass.Lyph && e.generatedFrom){ e.relClass = "LyphFromMaterial"; }
                if (e.class === $SchemaClass.Coalescence && e.topology === "EMBEDDING"){ e.relClass = "EmbeddedCoalescence"; }
            });

            const getNode = (d) => this.data.nodes.find(e => d && (e === d || e.id === d.id));

            //link - link
            (this._graphData.nodes||[]).filter(node  => node.sourceOf && node.targetOf).forEach(node => {
                let sources = (node.sourceOf||[]).map(lnk => getNode(lnk));
                let targets = (node.targetOf||[]).map(lnk => getNode(lnk));
                sources.forEach(source => {
                    targets.forEach(target => {
                        this.data.links.push({
                            "source": source.id, "target": target.id, "type" : source.conveyingType? source.conveyingType.toLowerCase(): "advective"
                        });
                    })
                })
            });

            (this._graphData.links||[]).forEach(lnk => {
                if (getNode(lnk.conveyingLyph)){
                    this.data.links.push({"source": lnk.id, "target": lnk.conveyingLyph.id, "type"  : "conveyingLyph"});
                }
                (lnk.conveyingMaterials||[]).forEach(material => {
                    if (getNode(material)) {
                        this.data.links.push({"source": lnk.id, "target": material.id, "type": "conveyingMaterial"});
                    }
                })
            });

            (this._graphData.lyphs||[]).forEach(lyph => {
                if (!getNode(lyph)) {return;}
                if (getNode(lyph.layerIn)){
                    this.data.links.push({"source": lyph.layerIn.id, "target": lyph.id, "type"  : "layer"});
                }
                if (getNode(lyph.supertype)){
                    this.data.links.push({"source": lyph.supertype.id, "target": lyph.id, "type" : "subtype"});
                }
                if (getNode(lyph.cloneOf)){
                    this.data.links.push({"source": lyph.cloneOf.id, "target": lyph.id, "type"  : "subtype"});
                }
                (lyph.materials||[]).forEach(material => {
                    if (getNode(material) && lyph.generatedFrom && (lyph.generatedFrom.id === material.id)){
                        this.data.links.push({"source": material.id, "target": lyph.id, "type"  : "lyphFromMaterial"});
                    }
                })
            });

            (this._graphData.materials||[]).forEach(material => {
                if (!getNode(material)) {return;}
                (material.materials||[]).forEach(material2 => {
                    if (getNode(material2)){
                        this.data.links.push({"source": material.id, "target": material2.id, "type" : "material"});
                    }
                })
            });

            (this._graphData.coalescences||[]).forEach(coalescence => {
                if (getNode(coalescence)) {return;}
                (coalescence.lyphs||[]).forEach(lyph  => {
                    if (!getNode(e)) {return;}
                    this.data.links.push({"source": lyph.id, "target": coalescence.id, "type" : "coalescence"})
                })
            });
        }
    }

    get graphData() {
        return this._graphData;
    }

    ngAfterViewInit() {
        this.drawLegend();
        window.addEventListener('resize', () => {
            this.width  = this.relGraphContainer.nativeElement.clientWidth;
            this.height = this.relGraphContainer.nativeElement.clientHeight;
            this.draw();
        }, false);
    }

    draw() {
        let svg = d3.select(this.svgRef.nativeElement).attr("width", this.width).attr("height", this.height);
        //Clean the view
        svg.selectAll("g").remove();
        svg.selectAll("rect").remove();

        if (!this.data || !this.width || !this.height) {return; }
        let data = { nodes: [], links: [] };
        let visibleNodeTypes = this.nodeTypes::keys().filter(key => !this.nodeTypes[key].hidden);
        let visibleLinkTypes = this.linkTypes::keys().filter(key => !this.linkTypes[key].hidden);

        data.nodes = this.data.nodes.filter(d => visibleNodeTypes.includes(d.relClass));
        data.links = this.data.links.filter(d => visibleLinkTypes.includes(d.type));
        const getID  = (e) => e::isObject()? e.id : e;
        data.links = data.links.filter(d => data.nodes.find(n => n.id === getID(d.source)) &&
            data.nodes.find(n => n.id === getID(d.target)));

        let useGroupInABox = true;

        let fParams = {
            forceInABoxStrength      : 0.1,
            linkStrengthInterCluster : 0.2,
            linkStrengthIntraCluster : 0.1
        };

        //Simulation
        let groupingForce = forceInABox()
            .size([this.width, this.height])       // Size of the chart
            .template("treemap")                   // Either treemap or force
            .groupBy("class")                      // Nodes' attribute to group
            .strength(fParams.forceInABoxStrength) // Strength to foci
            .links(data.links)
            .enableGrouping(useGroupInABox)
            .linkStrengthInterCluster(fParams.linkStrengthInterCluster)  // linkStrength between nodes of different clusters
            .linkStrengthIntraCluster(fParams.linkStrengthIntraCluster); // linkStrength between nodes of the same cluster

        let simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id))
            .force("charge", d3.forceManyBody().strength(-20))
            .force("collide", d3.forceCollide(10))
            .force("group", groupingForce)
            .force("x", useGroupInABox ? null : d3.forceX(this.width / 2))
            .force("y", useGroupInABox ? null : d3.forceY(this.height / 2));

        this.simulation = simulation;

        //Zoom area
        svg.append("rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .call(d3.zoom()
                .scaleExtent([1, 10])
                .on("zoom", zoomed));

        function zoomed() {
            graphGroup.attr("transform", d3.event.transform);
        }

        //Highlight and select markers
        // let highlighter = svg.append("g").append("circle").attr("r", 10).attr("fill", "#ff0000");
        // let selector = svg.append("g").append("circle").attr("r", 10).attr("fill", "#008000");

        //Arrow markers
        const directedLinkTypes = this.linkTypes::entries().filter(([, value]) => value.directed).map(([key, ]) => key);

        let graphGroup = svg.append("g");
        graphGroup.append("defs").selectAll("marker")
            .data(directedLinkTypes)
            .enter().append("marker")
            .attr("id",   d => 'marker' + d)
            .attr('fill', d => this.linkTypes[d].color)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr('markerUnits', 'strokeWidth')
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0,-5 L 10, 0 L 0,5");

        const link = graphGroup.append("g").selectAll("path")
            .data(data.links).join("path")
            .attr("stroke-opacity", 0.6)
            .attr("stroke", d => this.linkTypes[d.type].color)
            .attr("marker-end", d => "url(#marker" + d.type + ")");

        //Nodes

        const [nodeLyph, nodeLyphFromMaterial, nodeLink, nodeCoalescence, nodeEmbeddedCoalescence, nodeMaterial] =
            this.nodeTypes::keys().map(clsName =>
                graphGroup.append("g").selectAll(this.nodeTypes[clsName].shape)
                    .data(data.nodes.filter(e => e.relClass === clsName))
                    .join(this.nodeTypes[clsName].shape)
            );

        //Tooltips

        let tooltip = d3.select(this.tooltipRef.nativeElement)
            .style("opacity", 0);

        let text = graphGroup.append("g")
            .selectAll("text")
            .data(data.nodes)
            .enter().append("text")
            .attr("y", 12)
            .style("pointer-events", "none")
            .style("font", "10px sans-serif")
            .style("text-anchor", "middle")
            .style("opacity", 0.6)
            .text(d => d.id);

        //Drag

        const AnchorDrag = d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);

        function dragstarted(d) {
            if (!d3.event.active) {simulation.alphaTarget(0.3).restart(); }
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function dragended(d) {
            if (!d3.event.active) {simulation.alphaTarget(0);}
        }

        //Set common node attributes

        [nodeLink, nodeCoalescence, nodeEmbeddedCoalescence, nodeMaterial, nodeLyph, nodeLyphFromMaterial].forEach(node => {
            node.each(d => {
                this.nodeTypes[d.relClass].attrs::entries().forEach(([key, value]) => node.attr(key, value));
            });

            node.attr("stroke", e => e.isTemplate? this.strokeTypes.template: this.strokeTypes.instance)
                .attr("fill", e => this.nodeTypes[e.relClass].color);

            node.on("dblclick", d => {
                d.fx = null;
                d.fy = null;
                this.selected = d
            });

            node.on("click", d => { 
                this.selected = d;
                console.log("D selected ", d);
            });

            node.on("mouseover", d => {
                this.highlighted = d;
                tooltip.style("opacity", .9);
                tooltip.html(`<div>${d.id}: ${d.name||"?"}<\div>`)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            }).on("mouseout", () => tooltip.style("opacity", 0));

            node.each(function(d){
                d.viewObjects = d.viewObjects || {};
                d.viewObjects["node"] = this;
            });

            node.call(AnchorDrag);
        });

        //Update

        simulation.on("tick", () => {
            if (!this._isActive){
                simulation.stop();
                return;
            }
            const boundX = x => Math.min(this.width, Math.max(0, x));
            const boundY = y => Math.min(this.height, Math.max(0, y));

            link.attr("d", d => {
                //screen boundaries
                ["source", "target"].forEach(prop => {
                    d[prop].x = boundX(d[prop].x);
                    d[prop].y = boundY(d[prop].y);
                });
                return "M" + d.source.x + ' ' + d.source.y + " L" + d.target.x + ' ' + d.target.y;
            });

            [nodeLyph, nodeLyphFromMaterial].forEach(node => {
                node.attr("cx", d => boundX(d.x))
                    .attr("cy", d => boundY(d.y));
            });

            [nodeLink, nodeCoalescence, nodeEmbeddedCoalescence, nodeMaterial, text].forEach(e =>
                e.attr("transform", d => "translate(" + boundX(d.x) + "," + boundY(d.y) + ")"));
        });

        return graphGroup.node();
    }

    drawLegend(){
        //Legends
        if (!this.legendSvgRef){ return; }
        let legendSvg = d3.select(this.legendSvgRef.nativeElement).attr("width", 300).attr("height", 260);

        const labelHSpacing = 15;
        const labelVSpacing = 4;
        const legendXOffset = 50;

        //Link legend

        const linkVSpacing  = 15;
        const linkLegendRect = {width: 40, height: 1};

        const linkLegend = legendSvg.append("g").selectAll('.linkLegend')
            .data(this.linkTypes::keys()).enter().append('g').attr('class', 'linkLegend')
            .attr('transform', (d, i) => {
                let [h, v] = [legendXOffset - linkLegendRect.width, i * (linkLegendRect.height + linkVSpacing) + linkVSpacing];
                return 'translate(' + h + ',' + v + ')';
            });

        linkLegend.append('rect')
            .attr('width', linkLegendRect.width).attr('height', linkLegendRect.height)
            .style('fill', d => this.linkTypes[d].color).style('stroke', d => this.linkTypes[d].color);

        linkLegend.append('text')
            .attr('x', linkLegendRect.width  + labelHSpacing)
            .attr('y', linkLegendRect.height + labelVSpacing)
            .style("pointer-events", "none")
            .text(d => d);

        //Node legend

        const offset = this.linkTypes::keys().length * (linkLegendRect.height + linkVSpacing) + linkVSpacing;
        const nodeLegendRect = {width: 12, height: 12};
        const nodeVSpacing   = 4;

        const nodeLegend = legendSvg.append("g").selectAll('.nodeLegend')
            .data(this.nodeTypes::keys()).enter().append("g").attr('class', 'nodeLegend')
            .attr('transform', (d, i) => {
                let [h, v] = [legendXOffset - nodeLegendRect.width, offset + i * (nodeLegendRect.height + nodeVSpacing) + nodeVSpacing];
                return 'translate(' + h + ',' + v + ')';
            });

        let nodeTypes = this.nodeTypes;
        nodeLegend.each(function(d) {
            let shape = d3.select(this).append(nodeTypes[d].shape);
            nodeTypes[d].attrs::entries().forEach(([key, value]) => shape.attr(key, value));
            shape.attr('fill', nodeTypes[d].color).attr('stroke', "CCC")
        });

        nodeLegend.append('text')
            .attr('x', nodeLegendRect.width  + labelHSpacing)
            .attr('y', nodeLegendRect.height - labelVSpacing)
            .style("pointer-events", "none")
            .text(d => d);
    }

    toggleSettingPanel(){
        this._showPanel = !this._showPanel;
        this.width *= this._showPanel? 3/4: 4/3;
        this.draw();
    }

    toggleLinkType(key) {
        if (key && this.linkTypes[key]) {
            this.linkTypes[key].hidden = !this.linkTypes[key].hidden;
        }
        this.draw();
        //This more efficient then draw but leaves arrow markers
        // let svg = d3.select(this.svgRef.nativeElement);
        // let link = svg.select("g").select("g").selectAll("path");
        // let visibleLinkTypes = this.linkTypes::keys().filter(key => !this.linkTypes[key].hidden);
        // link.data(this.data.links).join("path").attr("stroke-opacity", d => visibleLinkTypes.includes(d.type)? 0.6: 0);
    }

    toggleNodeType(key) {
        if (key && this.nodeTypes[key]) {
            this.nodeTypes[key].hidden = !this.nodeTypes[key].hidden;
        }
        this.draw();
    }

    export(){
        if (this._graphData){
            let coords = {};
            (this.data.nodes||[]).forEach(e => coords[e.id] = {"x": e.x, "y": e.y});
            let result = JSON.stringify(coords, null, 2);
            const blob = new Blob([result], {type: 'text/plain'});
            FileSaver.saveAs(blob, 'apinatomy-relationshipCoords.json');
        }
    }

    load(files) {
        if (files && files[0]){
            const reader = new FileReader();
            reader.onload = () => {
                let coords = JSON.parse(reader.result);
                (this.data.nodes||[]).forEach(d => {
                    if (coords[d.id]){
                        d.x = coords[d.id].x;
                        d.y = coords[d.id].y;
                        d.fx = d.x;
                        d.fy = d.y;
                    }
                })
            };

            try {
                reader.readAsText(files[0]);
            } catch (err){
                throw new Error("Failed to open the input file: " + err);
            }
        }
    }

    set highlighted(entity) {
        this._highlighted = entity;
    }

    set selected(entity){
        this._selected     = entity;
        this._selectedName = entity? entity.name || "": "";
    }

    get highlighted(){
        return this._highlighted;
    }

    get selected(){
        return this._selected;
    }

    selectBySearch(name) {
        if (this._graphData && (name !== this._selectedName)) {
            this._selectedName = name;
            this.selected = (this._graphData.resources||[]).find(e => e.name === name);
        }
    }
}

@NgModule({
    imports: [CommonModule, ResourceInfoModule, MatSliderModule, SearchBarModule, MatCheckboxModule],
    declarations: [RelGraph],
    exports: [RelGraph]
})
export class RelGraphModule {
}

