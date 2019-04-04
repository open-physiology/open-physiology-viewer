//import * as d3 from 'd3';
import * as d3 from 'd3-force';
import {select, event} from 'd3-selection';
import {attrs} from 'd3-selection-multi';
import {drag} from 'd3-drag';
import {inputScale} from 'd3-scale';
import {category20} from 'd3-scale-chromatic';
import {transition} from 'd3-transition';

import {Component, ElementRef, Input, NgModule, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {values, pick, flatten, keys} from 'lodash-bound';

@Component({
    selector: 'relGraph',
    template: `
        <section id="svgPanel" class="w3-row">
            <section id="svgContainer">
                <svg #svg viewBox="0 0 1000 600"></svg>
                <section #tooltip class="tooltip"></section>
            </section>
        </section>
    `,
    styles: [`
        #svgPanel {
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
    `]
})
/**
 * Search bar component
 */
export class RelGraph {

    @ViewChild('svg') svgElementRef: ElementRef;
    @ViewChild('tooltip') tooltipElementRef: ElementRef;

    _graphData;
    _matPrefix = "lyphMat_";

    data = {nodes: [], links: []};
    width = 1000; height = 600;

    @Input('graphData') set graphData(newGraphData) {
        if (this._graphData !== newGraphData) {
            this._graphData = newGraphData;

            this.data = {nodes: [], links: []};

            let nodeResources = this._graphData::pick(["materials", "lyphs", "coalescences", "links"])::values()::flatten();
            let filter = (this._graphData.config && this._graphData.config.filter) || [];
            nodeResources = nodeResources.filter(e => !filter.find(x => e.isSubtypeOf(x)));
            this.data.nodes = nodeResources.map(e => e::pick(["id", "name", "class", "conveyingType"]));

            const getNode = (d) => this.data.nodes.find(e => d && (e === d || e.id === d.id));

            //link - link
            (this._graphData.nodes||[]).filter(node  => node.sourceOf && node.targetOf).forEach(node => {
                let sources = (node.sourceOf||[]).map(lnk => getNode(lnk));
                let targets = (node.targetOf||[]).map(lnk => getNode(lnk));
                sources.forEach(source => {
                    targets.forEach(target => {
                        this.data.links.push({
                            "source": source.id, "target": target.id, "type"  : source.conveyingType === "DIFFUSIVE"? "diffusive" : "advective"
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

            (this._graphData.lyphs||[]).filter(e => getNode(e)).forEach(lyph => {
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
                    if (getNode(material) && (lyph.id === this._matPrefix + material.id)){
                        this.data.links.push({"source": material.id, "target": lyph.id, "type"  : "lyphFromMaterial"});
                    }
                })
            });

            (this._graphData.materials||[]).filter(e => getNode(e)).forEach(material => {
                (material.materials||[]).forEach(material2 => {
                    if (getNode(material2)){
                        this.data.links.push({"source": material.id, "target": material2.id, "type" : "material"});
                    }
                })
            });

            (this._graphData.coalescences||[]).filter(e => getNode(e)).forEach(coalescence => {
                (coalescence.lyphs||[]).filter(e => getNode(e)).forEach(lyph  => {
                    this.data.links.push({"source": lyph.id, "target": coalescence.id, "type"  : "coalescence"})
                })
            });

            this.draw();
        }
    }

    ngAfterViewInit() {
        this.container = document.getElementById('svgContainer');
        this.width  = this.container.clientWidth;
        this.height = this.container.clientHeight;

        window.addEventListener('resize', evt => this.resizeToDisplaySize(evt), false);
    }

    resizeToDisplaySize(evt) {
        this.width  = this.container.clientWidth;
        this.height = this.container.clientHeight;
        select(this.svgElementRef.nativeElement)
            .attr("left", 0)
            .attr("width", this.width).attr("height", this.height);
    }

    draw() {
        let data = this.data;
        let svg = select(this.svgElementRef.nativeElement).attr("width", this.width).attr("height", this.height);

        //Clean the view
        svg.selectAll("g").remove();

        //Simulation

        let simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .force("center", d3.forceCenter(this.width / 2, this.height / 2));

        //Links

        const linkTypeColors = {
            "diffusive"         : "#CCC",
            "advective"         : "#000",
            "conveyingLyph"     : "#FF0000",
            "layer"             : "#00FF00",
            "subtype"           : "#0000FF",
            "coalescence"       : "#FFA500",
            "material"          : "#000080",
            "conveyingMaterial" : "#FFC0CB",
            "lyphFromMaterial"  : "#008000"
        };

        const directedLinkTypes = ["layer", "subtype", "lyphFromMaterial", "material"];

        //Arrow markers

        svg.append("defs").selectAll("marker")
            .data(directedLinkTypes)
            .enter().append("marker")
            .attr("id",   d => 'marker' + d)
            .attr('fill', d => linkTypeColors[d])
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr('markerUnits', 'strokeWidth')
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0,-5 L 10, 0 L 0,5");

        const link = svg.append("g").selectAll("path")
            .data(data.links).join("path")
            .attr("stroke-opacity", 0.6)
            .attr("stroke", d => linkTypeColors[d.type])
            .attr("marker-end", d => "url(#marker" + d.type + ")");

        //Nodes

        const nodeTypes = {
            "Lyph"             : {color: "#FF0000", shape: "circle", attrs: {"r": 5}},
            "LyphFromMaterial" : {color: "#00FF00", shape: "circle", attrs: {"r": 5}},
            "Link"             : {color: "#000000", shape: "rect",   attrs: {"width": 10, "height": 10, "x": -5, "y": -5}},
            "Coalescence"      : {color: "#FFFF00", shape: "path",   attrs: {"d": "M -10 8 L 0 -8 L 10 8 L -10 8"}},
            "Material"         : {color: "#008000", shape: "path",   attrs: {"d": "M -7 0 L -4 -7 L 4 -7 L 7 0 L 4 7 L -4 7 L -7 0"}}
        };

        const nodeStrokeColor = "#CCC";

        const nodeLyph = svg.append("g").selectAll(nodeTypes["Lyph"].shape)
            .data(data.nodes.filter(e => e.class === "Lyph"))
            .join(nodeTypes["Lyph"].shape);

        const nodeLink = svg.append("g").selectAll(nodeTypes["Link"].shape)
            .data(data.nodes.filter(e => e.class === "Link"))
            .join(nodeTypes["Link"].shape);

        const nodeCoalescence = svg.append("g").selectAll(nodeTypes["Coalescence"].shape)
            .data(data.nodes.filter(e => e.class === "Coalescence"))
            .join(nodeTypes["Coalescence"].shape);

        const nodeMaterial = svg.append("g").selectAll(nodeTypes["Material"].shape)
            .data(data.nodes.filter(e => e.class === "Material"))
            .join(nodeTypes["Material"].shape);

        //Legends

        const labelHSpacing = 15;
        const labelVSpacing = 4;

        //Link legend

        const linkVSpacing  = 15;
        const linkLegendRect = {width: 40, height: 1};

        const linkLegend = svg.append("g").selectAll('.linkLegend')
            .data(linkTypeColors::keys()).enter().append('g').attr('class', 'linkLegend')
            .attr('transform', (d, i) => {
                let [h, v] = [-linkLegendRect.width, i * (linkLegendRect.height + linkVSpacing) + linkVSpacing];
                return 'translate(' + h + ',' + v + ')';
            });

        linkLegend.append('rect')
            .attr('width', linkLegendRect.width).attr('height', linkLegendRect.height)
            .style('fill', d => linkTypeColors[d]).style('stroke', d => linkTypeColors[d]);

        linkLegend.append('text')
            .attr('x', linkLegendRect.width  + labelHSpacing)
            .attr('y', linkLegendRect.height + labelVSpacing)
            .text(d => d);

        //Node legend

        const offset = linkTypeColors::keys().length * (linkLegendRect.height + linkVSpacing) + linkVSpacing;
        const nodeLegendRect = {width: 12, height: 12};
        const nodeVSpacing   = 4;

        const nodeLegend = svg.append("g").selectAll('.nodeLegend')
            .data(nodeTypes::keys())
            .enter().append("g")
            .attr('class', 'nodeLegend')
            .attr('transform', (d, i) => {
            let [h, v] = [-nodeLegendRect.width, offset + i * (nodeLegendRect.height + nodeVSpacing) + nodeVSpacing];
            return 'translate(' + h + ',' + v + ')';
        });

        nodeLegend.each(function(d){
            select(this).append(nodeTypes[d].shape).attrs(nodeTypes[d].attrs)
                .attr('fill', nodeTypes[d].color)
                .attr('stroke', nodeStrokeColor)
        });

        nodeLegend.append('text')
            .attr('x', nodeLegendRect.width  + labelHSpacing)
            .attr('y', nodeLegendRect.height - labelVSpacing)
            .text(d => d);

        //Tooltips

        let tooltip = select(this.tooltipElementRef.nativeElement)
            .style("opacity", 0);

        let text = svg.append("g")
            .selectAll("text")
            .data(data.nodes)
            .enter().append("text")
            .attr("y", 12)
            .style("pointer-events", "none")
            .style("font", "10px sans-serif")
            .style("text-anchor", "middle")
            .style("opacity", 0.6)
            .text(d => d.id);

        //Behavior on drag

        let nodeDrag = drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);

        function dragstarted(d) {
            if (!event.active) {simulation.alphaTarget(0.3).restart(); }
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(d) {
            if (!event.active) {simulation.alphaTarget(0);}
        }

        //Set common node attributes

        [nodeLink, nodeCoalescence, nodeMaterial, nodeLyph].forEach(node => {
            node.attrs(d => nodeTypes[d.class].attrs)
                .attr("stroke", nodeStrokeColor)
                .attr("fill", e => (e.class ==="Lyph" && e.id.startsWith(this._matPrefix))
                    ? nodeTypes["LyphFromMaterial"].color
                    : nodeTypes[e.class].color);

            node.on("dblclick", d => {
                d.fx = null;
                d.fy = null;
            });

            node.on("mouseover", d => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<div>${d.id}: ${d.name||"?"}<\div>`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

            node.call(nodeDrag);
        });

        //Update

        simulation.on("tick", () => {
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

            nodeLyph
                .attr("cx", d => boundX(d.x))
                .attr("cy", d => boundY(d.y));

            [nodeLink, nodeCoalescence, nodeMaterial, text].forEach(e =>
                e.attr("transform", d => "translate(" + boundX(d.x) + "," + boundY(d.y) + ")"));
        });

        return svg.node();
    }

}

@NgModule({
    imports: [CommonModule],
    declarations: [RelGraph],
    exports: [RelGraph]
})
export class RelGraphModule {
}

