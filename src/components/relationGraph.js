import * as d3 from 'd3';
import {Component, ElementRef, Input, NgModule, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {keys, values, pick, flatten} from 'lodash-bound';


@Component({
    selector: 'relGraph',
    template: `
        <section id="svgPanel" class="w3-row">
            <svg #svg viewBox="0 0 1000 600"></svg>
            <section #tooltip class="tooltip"></section>
        </section>
    `,
    styles: [`
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
    data;
    graph;
    @Input('graphData') set graphData(newGraphData) {
        if (this._graphData !== newGraphData) {
            this._graphData = newGraphData;

            this.data = {nodes: [], links: []};

            this.data.nodes = this._graphData::pick(["materials", "lyphs", "coalescences", "links"])::values().map(
                resources => (resources||[]).map(e => e::pick(["id", "name", "class", "conveyingType"])))::flatten();

            //link - link
            (this._graphData.nodes||[]).filter(node  => node.sourceOf && node.targetOf).forEach(node => {
                let sources = (node.sourceOf||[]).map(lnk => this.data.nodes.find(e => e.id === lnk.id));
                let targets = (node.targetOf||[]).map(lnk => this.data.nodes.find(e => e.id === lnk.id));
                sources.forEach(source => {
                    targets.forEach(target => {
                        this.data.links.push({
                            "source": source.id, "target": target.id, "type"  : source.conveyingType === "DIFFUSIVE"? "diffusive" : "advective"
                        });
                    })
                })
            });

            (this._graphData.links||[]).forEach(lnk => {
                if (lnk.conveyingLyph){
                    this.data.links.push({"source": lnk.id, "target": lnk.conveyingLyph.id, "type"  : "conveyingLyph"});
                }
                (lnk.conveyingMaterials||[]).forEach(material =>
                    this.data.links.push({"source": lnk.id, "target": material.id, "type" : "conveyingMaterial"}));
            });

            (this._graphData.lyphs||[]).filter(lyph => lyph.layerIn).forEach(lyph => {
                if (lyph.layerIn){
                    this.data.links.push({"source": lyph.layerIn.id, "target": lyph.id, "type"  : "layer"});
                }
                if (lyph.supertype){
                    this.data.links.push({"source": lyph.supertype.id, "target": lyph.id, "type" : "subtype"});
                }
                if (lyph.cloneOf){
                    //TODO test
                    this.data.links.push({"source": lyph.cloneOf.id, "target": lyph.id, "type"  : "subtype"});
                }
            });

            (this._graphData.coalescences||[]).forEach(coalescence => {
                (coalescence.lyphs||[]).forEach(lyph  =>
                    this.data.links.push({"source": lyph.id, "target": coalescence.id, "type"  : "coalescence"}))
            });

            this.draw(this.data);
        }
    }
    nodeTypes = ["Link", "Lyph", "Material", "Coalescence"];

    constructor(){
    }

    ngAfterViewInit() {
        //this.svgContainer = document.getElementById('svgPanel');
        if (!this.svgElementRef){
            console.error("Failed to locate svg container");
        }
        window.addEventListener('mousemove', evt => this.onMouseMove(evt), false);
    }

    onMouseMove(){

    }

    draw(data) {
        //text label - first 4 characters of ID
        //mouseover ID and Name

        const linkColor = {
            "diffusive"         : "#CCC",
            "advective"         : "#000",
            "conveyingLyph"     : "#FF0000",
            "layer"             : "#00FF00",
            "subtype"           : "#0000FF",
            "coalescence"       : "#FFA500",
            "conveyingMaterial" : "#FFC0CB"
        };

        let svg = d3.select(this.svgElementRef.nativeElement);

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .force("center", d3.forceCenter(500, 300));

        const link = svg.append("g")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(data.links)
            .join("line")
            .attr("stroke", e => linkColor[e.type]);

        const nodeLyph = svg.append("g")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(data.nodes.filter(e => e.class === "Lyph"))
            .join("circle")
            .attr("r", 5)
            .attr("fill", e => e.id.startsWith("lyphMat_")? "#00FF00" :"#FF0000");

        const nodeLink = svg.append("g")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1.5)
            .selectAll("rect")
            .data(data.nodes.filter(e => e.class === "Link"))
            .join("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("x", -5)
            .attr("y", -5)
            .attr("fill", "#000000");

        const nodeCoalescence = svg.append("g")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1.5)
            .selectAll("rect")
            .data(data.nodes.filter(e => e.class === "Coalescence"))
            .join("path")
            .attr("d", "M -10 8 L 0 -8 L 10 8 L -10 8")
            .attr("fill", "#FFFF00");

        const nodeMaterial = svg.append("g")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1.5)
            .selectAll("rect")
            .data(data.nodes.filter(e => e.class === "Material"))
            .join("path")
            .attr("d", "M -10 0 L -5 -10 L 5 -10 L 10 0 L 5 10 L -5 10 L -10 0")
            .attr("fill", "#00FF00");

        let tooltip = d3.select(this.tooltipElementRef.nativeElement)
            .style("opacity", 0);

        [nodeLink, nodeCoalescence, nodeMaterial, nodeLyph].forEach(node => {
            node.on("mouseover", d => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<div>${d.id}: ${d.name||"?"}<\div>`)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px"); //TODO fix positions
            })
            .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

            node.call(this.drag(simulation));
        });

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            nodeLyph
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            nodeLink
                .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

            nodeCoalescence
                .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

            nodeMaterial
                .attr("transform", d => "translate(" + d.x + "," + d.y + ")");
        });

        //invalidation.then(() => simulation.stop());
        return svg.node();

    }

    drag(simulation){

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}

@NgModule({
    imports: [CommonModule],
    declarations: [RelGraph],
    exports: [RelGraph]
})
export class RelGraphModule {
}

