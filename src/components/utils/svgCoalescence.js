import {animate} from 'animejs';
import * as d3 from "d3";

export function drawSvgCoalescence(cls, svg, tooltip = null) {

    function drawLayers(layers, x, y, layerWidth, layerHeight) {
        const spacing = 1;
        let dx = x;
        let dy = y;
        let group = svg.append('g');
        (layers || []).forEach((layer, i) => {
            createRectangle(dx, dy, layerWidth, layerHeight, layer.color, layer.name, group);
            dx += layerWidth + spacing;
        });
        return group;
    }

    function createRectangle(x, y, width, height, color, text, group) {
        group.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", color)
            .attr("stroke", "black")
            .attr("stroke-width", "1")
            .style("cursor", "pointer")
            .on("mouseover", d => {
                if (!tooltip) return;
                tooltip
                    .style("left", d3.event.pageX + 10 + "px")
                    .style("top", d3.event.pageY + 10 + "px")
                    .style("opacity", "0.9")
                    .html(text);
            })
            .on("mouseout", d => {
                if (!tooltip) return;
                tooltip.style("opacity", 0)
            });
    }

    function animateCls(groupA, groupB, rectWidth, rectHeight, centerX) {

        // Get X positions of target rectangles
        const aRects = groupA.selectAll("rect").nodes();
        const bRects = groupB.selectAll("rect").nodes();
        const k = aRects.length;

        const lastARectX = parseFloat(aRects[k - 1].getAttribute("x"));
        const firstBRectX = parseFloat(bRects[0].getAttribute("x"));

        const offsetA = centerX - lastARectX;
        const offsetB = centerX - firstBRectX;

        animate(aRects, {
            translateX: offsetA,
            duration: 1200,
            easing: 'easeInOutQuad'
        });

        animate(bRects, {
            translateX: offsetB,
            duration: 1200,
            easing: 'easeInOutQuad'
        });
    }

    function drawClsLyphs(lyph1, lyph2, i) {
        const layerWidth = 40;
        const layerHeight = 60;
        const spacing = 1;

        let width = svg.attr("width") || 800;

        let xOffset = width - (layerWidth + spacing) * (lyph2.layers.length);
        let yOffset = 10 + i * (layerHeight + 10);

        const groupA = drawLayers(lyph1.layers, 0, yOffset, layerWidth, layerHeight);
        const groupB = drawLayers(lyph2.layers.reverse(), xOffset, yOffset, layerWidth, layerHeight);

        if (svg.attr("height") < yOffset + layerHeight + 10){
            svg.attr("height", yOffset + layerHeight + 10);
        }

        // Move to the center
        // xOffset = (layerWidth + spacing) * (lyph1.layers.length + lyph2.layers.length - 1);
        // const transformX = (width - xOffset) / 2;
        // groupA.attr("transform", `translate(${transformX},${0})`);
        // groupB.attr("transform", `translate(${transformX},${0})`);

        animateCls(groupA, groupB, layerWidth, layerHeight, width / 2);
    }

    /**
     * Get unique pairs.
     *
     * @param {Array} array - The array.
     * @returns {Array} - The unique pairs.
     */
    function uniquePairs(array) {
        if (!Array.isArray(array)) {
            return [];
        }

        if (array.length < 3) {
            return [array];
        }

        return array.reduce(
            (previousValue, currentValue, index) =>
                previousValue.concat(
                    array.slice(index + 1).map((value) => [currentValue, value]),
                ),
            [],
        );
    }

    function drawCoalescence() {
        if (!cls) return;
        let lyphPairs = uniquePairs(cls.lyphs);
        lyphPairs.forEach((pair, i) => drawClsLyphs(pair[0], pair[1], i));
    }

    drawCoalescence();
}


