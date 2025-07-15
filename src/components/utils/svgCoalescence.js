import {animate} from 'animejs';
import * as d3 from "d3";

export function drawSvgCoalescence(cls, svg, tooltip = null) {

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
        const layerWidth = 40, layerHeight = 60;
        const labelHeight = 15, clsSpacing = 40;
        const layerSpacing = 1, dBorder = 5;
        let width = svg.attr("width") || 800;

        let dx = width - (layerWidth + layerSpacing) * (lyph2.layers.length);
        let dy = clsSpacing + i * (layerHeight + clsSpacing + labelHeight);

        function drawLyph(lyph, x, y, reversed = false) {
            let layers = (lyph.layers || []);
            if (reversed) layers = layers.reverse();
            const lyphWidth = (layerWidth + layerSpacing) * (layers||[]).length;

            let group = svg.append('g');
            group.append("text")
               .attr("x", x)
               .attr("y", y)
               .style("font-family", "sans-serif")
               .style("font-size", "12px")
               .text(lyph.name||lyph.id);

            let dx = x;
            let dy = y + labelHeight;

            if (reversed){
                createRectangle(x, dy+dBorder, lyphWidth+dBorder, layerHeight, "#ccc", lyph.name||lyph.id, group);
            } else {
                createRectangle(x-dBorder, dy-dBorder, lyphWidth+dBorder, layerHeight, "#ccc", lyph.name||lyph.id, group);
            }
            layers.forEach((layer, i) => {
                createRectangle(dx, dy, layerWidth, layerHeight, layer.color, layer.name, group);
                dx += layerWidth + layerSpacing;
            });
            return group;
        }

        const groupA = drawLyph(lyph1, 0, dy);
        const groupB = drawLyph(lyph2, dx, dy, true);

        if (svg.attr("height") < dy + layerHeight + clsSpacing){
            svg.attr("height", dy + layerHeight + clsSpacing);
        }

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


