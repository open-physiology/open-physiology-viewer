import * as d3 from 'd3';
//import * as d3 from 'd3-force-3d';
import {Component, ElementRef, Input, NgModule, ViewChild} from "@angular/core";
import {CommonModule} from "@angular/common";
import {values, pick, flatten} from 'lodash-bound';

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
                        this.data.links.push({"source": material.id, "target": lyph.id, "type"  : "material"});
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
        d3.select(this.svgElementRef.nativeElement)
            .attr("width", this.width).attr("height", this.height);
    }

    draw() {
        //text label - first 4 characters of ID
        //mouseover ID and Name
        let data = this.data;
        let svg = d3.select(this.svgElementRef.nativeElement)
            .attr("width", this.width).attr("height", this.height);

        svg.selectAll("g").remove();

        const linkColor = {
            "diffusive"         : "#CCC",
            "advective"         : "#000",
            "conveyingLyph"     : "#FF0000",
            "layer"             : "#00FF00",
            "subtype"           : "#0000FF",
            "coalescence"       : "#FFA500",
            "conveyingMaterial" : "#FFC0CB",
            "material"          : "#008000"
        };

        this.simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .force("center", d3.forceCenter(this.width / 2, this.height / 2));

        const link = svg.append("g")
            .attr("stroke-opacity", 0.6)
            .selectAll("path")
            .data(data.links)
            .join("path")
            .attr("stroke", e => linkColor[e.type]);

        const nodeLyph = svg.append("g")
            .selectAll("circle")
            .data(data.nodes.filter(e => e.class === "Lyph"))
            .join("circle")
            .attr("r", 5)
            .attr("fill", e => e.id.startsWith(this._matPrefix)? "#00FF00" :"#FF0000");

        const nodeLink = svg.append("g")
            .selectAll("rect")
            .data(data.nodes.filter(e => e.class === "Link"))
            .join("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("x", -5)
            .attr("y", -5)
            .attr("fill", "#000");

        const nodeCoalescence = svg.append("g")
            .selectAll("path")
            .data(data.nodes.filter(e => e.class === "Coalescence"))
            .join("path")
            .attr("d", "M -10 8 L 0 -8 L 10 8 L -10 8")
            .attr("fill", "#FFFF00");

        const nodeMaterial = svg.append("g")
            .selectAll("path")
            .data(data.nodes.filter(e => e.class === "Material"))
            .join("path")
            .attr("d", "M -7 0 L -4 -7 L 4 -7 L 7 0 L 4 7 L -4 7 L -7 0")
            .attr("fill", "#008000");

        let tooltip = d3.select(this.tooltipElementRef.nativeElement)
            .style("opacity", 0);

        let text = svg.append("g")
            .selectAll("text")
            .data(data.nodes)
            .enter().append("text")
            .attr("y", 12)
            .style("font", "10px sans-serif")
            .style("text-anchor", "middle")
            .style("opacity", 0.6)
            .text(d => d.id);

        [nodeLink, nodeCoalescence, nodeMaterial, nodeLyph].forEach(node => {
            node.attr("stroke", "#ccc").attr("stroke-width", 1.5);

            node.on("mouseover", d => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`<div>${d.id}: ${d.name||"?"}<\div>`)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px"); //TODO fix positions
            })
            .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

            node.call(this.drag(this.simulation));
        });

        this.simulation.on("tick", () => {

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

        //invalidation.then(() => simulation.stop());
        return svg.node();
    }

    drag(simulation){

        function dragstarted(d) {
            if (!d3.event.active) { simulation.alphaTarget(0.3).restart(); }
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function dragended(d) {
            if (!d3.event.active) { simulation.alphaTarget(0); }
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

