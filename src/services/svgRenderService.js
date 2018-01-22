import {dataSetMain} from '../data/graph';
import * as d3 from 'd3';

export class SVGRenderService {

    init(container: HTMLElement) {
        let width = window.innerWidth;
        let height = window.innerHeight - 90;

        this.svg = d3.select(container).select('svg');

        let radius = 5;
        let center = {"x": width / 2, "y": height / 2};
        let axis = Math.min(width, height) * 0.45;
        let margins = {
            "A": axis,
            "B": axis * 0.7,
            "C": axis * 0.7,
            "D": axis * 0.9
        };

        let simulation = d3.forceSimulation().nodes(dataSetMain.nodes);

        simulation
            .force("link", d3.forceLink(dataSetMain.links).id(d => d.id))
            .force("link", d3.forceLink(dataSetMain.links)
                //Stretch dataSetMains by creating overall length deficit
                .distance(d => 0.01 * d.length * (2 * axis) * ((d.source.dataSetMain === "A") ? 1 : 0.7))
                .strength(0.9))
            .force("collide", d3.forceCollide(d => d.r).iterations(16))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(center.x, center.y))
            .force("y", d3.forceY(0))
            .force("x", d3.forceX(0))
            //.force("splitting",splitting_force)
        ;

        this.svg.append("rect").attr("width", 100).attr("height", 100).attr("fill", "red");


        let path = this.svg.append("g").attr("class", "edge").selectAll("path")
            .data(dataSetMain.links)
            .enter().append("path")
            .attr("id", (d, i) => "path_" + i) //a unique ID to reference later
            .attr("class", "path");

        let pathLabel = this.svg.append("g").selectAll("path")
            .data(dataSetMain.links).enter().append("text")
            .attr("class", "pathLabel")
            .style("text-anchor", "middle")
            .append("textPath")
            .attr("cy", 5)
            .attr("xlink:href", (d, i) => "#path_" + i) //path ID
            .attr("startOffset", "50%")
            .text(d => d.name); //place the text halfway on the arc

        let lyphIcon = this.svg.append("g").selectAll("path")
            .data(dataSetMain.links).enter().append("g")
            .attr("class", "lyphIcon")
            .attr("xlink:href", (d, i) => "#path_" + i) //icon ID
            .attr("startOffset", "60%")
            .append("rect")
            .attr("width", 50)
            .attr("height", 50)
            .attr("fill", "green")
            .text(d => d.lyph); //place the text halfway on the arc

        let node = this.svg.append("g").attr("class", "node").selectAll("circle")
            .data(dataSetMain.nodes).enter()
            .append("circle")
            .attr("r", radius)
            .attr("fill", x => x.color);

        let nodeLabel = this.svg.append("g").selectAll("node").data(dataSetMain.nodes)
            .enter().append("text")
            .attr("class", "nodeLabel")
            .attr("x", 1.2 * radius)
            .attr("y", 1.2 * radius)
            .text(d => d.name);

        simulation.on("tick", tick);

        let drag_handler = d3.drag()
            .on("start", drag_start)
            .on( "drag", drag_drag)
            .on(  "end", drag_end);

        drag_handler(node);

        //drag handler
        function drag_start(d){
            if (!d3.event.active) {
                simulation.alphaTarget(0.8).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
        }

        function drag_drag(d){
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function drag_end(d){
            if (!d3.event.active) {
                simulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
        }

        function drawEdge(d){
            if (d.type === "path") {
                let dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy) / 4;
                return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
            } else {
                if (d.type === "link") {
                    return "M" + d.source.x + "," + d.source.y + " L " + d.target.x + "," + d.target.y;
                }
            }
        }

        function transform(d){
            return "translate(" + d.x + "," + d.y + ")";
        }

        function tick(){
            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            node
                .attr("cx", d => { d.x = Math.max(center.x - margins[d.graph] + radius,
                        Math.min(center.x + margins[d.graph] - radius, d.x))})
                .attr("cy", d => { d.y = Math.max(center.y - margins[d.graph] + radius,
                        Math.min(center.y + margins[d.graph] - radius, d.y))});

            nodeLabel.attr("transform", transform);
            path.attr("d", drawEdge);
        }
    }
}

