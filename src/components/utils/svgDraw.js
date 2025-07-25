import {animate} from "animejs";
import * as d3 from "d3";

export function hideElement(svg, id){
    svg.select(`#${id}`).style("display", "none");
}

export function showElement(svg, id){
    svg.select(`#${id}`).style("display", "inline");
}

export function d3_getRectDimensions(d3Rect) {
    if (!d3Rect || d3Rect.empty()) {
        return null;
    }

    const rect = d3Rect.node();
    return {
        x: parseFloat(rect.getAttribute('x')) || 0,
        y: parseFloat(rect.getAttribute('y')) || 0,
        width: parseFloat(rect.getAttribute('width')) || 0,
        height: parseFloat(rect.getAttribute('height')) || 0
    };
}

export function d3_createRect(group, x, y, width, height, fill, text, tooltip) {
    return group.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", fill)
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

export function d3_createBagRect(group, x, y, width, height, fill, text, tooltip, options = {}) {
    const {roundLeft = false, roundRight = false, radius = 10} = options;
    let shape;
    const r = radius;
    const pathD = [];
    pathD.push(`M ${x + (roundLeft ? r : 0)} ${y}`);

    // Top edge
    if (roundRight) {
        pathD.push(`H ${x + width - r}`);
        pathD.push(`A ${r} ${r} 0 0 1 ${x + width} ${y + r}`);
    } else {
        pathD.push(`H ${x + width}`);
    }

    // Right edge
    if (roundRight) {
        pathD.push(`V ${y + height - r}`);
        pathD.push(`A ${r} ${r} 0 0 1 ${x + width - r} ${y + height}`);
    } else {
        pathD.push(`V ${y + height}`);
    }

    // Bottom edge
    if (roundLeft) {
        pathD.push(`H ${x + r}`);
        pathD.push(`A ${r} ${r} 0 0 1 ${x} ${y + height - r}`);
    } else {
        pathD.push(`H ${x}`);
    }

    // Left edge
    if (roundLeft) {
        pathD.push(`V ${y + r}`);
        pathD.push(`A ${r} ${r} 0 0 1 ${x + r} ${y}`);
    } else {
        pathD.push(`V ${y}`);
    }

    pathD.push("Z");

    shape = group.append("path")
        .attr("d", pathD.join(" "))
        .attr("fill", fill)
        .attr("stroke", "black")
        .attr("stroke-width", "2");

    // Add tooltip behavior
    shape
        .style("cursor", "pointer")
        .on("mouseover", d => {
            if (!tooltip) return;
            tooltip
                .style("left", d3.event.pageX + 10 + "px")
                .style("top", d3.event.pageY + 10 + "px")
                .style("opacity", "0.9")
                .html(text);
        })
        .on("mouseout", () => {
            if (!tooltip) return;
            tooltip.style("opacity", 0);
        });

    return shape;
}

function getOffsets(groupA, groupB, rectWidth, rectHeight, centerX) {
    const aRects = groupA.selectAll(":scope > rect").nodes();
    const bRects = groupB.selectAll(":scope > rect").nodes();

    let offsetA = centerX;
    let offsetB = centerX;

    const k = aRects.length;
    if (k > 0 && bRects.length > 0) {
        const lastARectX = parseFloat(aRects[k - 1].getAttribute("x"));
        const firstBRectX = parseFloat(bRects[0].getAttribute("x"));
        offsetA -= lastARectX;
        offsetB -= firstBRectX;
    }

    const aTexts = groupA.selectAll("text").nodes();
    const bTexts = groupB.selectAll("text").nodes();

    // Should be revised to include all elements from subgroups, now cells contain only paths
    const aPaths = groupA.selectAll("path").nodes();
    const bPaths = groupB.selectAll("path").nodes();

    const aElements = [...aRects, ...aTexts, ...aPaths];
    const bElements = [...bRects, ...bTexts, ...bPaths];

    return [aElements, bElements, offsetA, offsetB];
}

function animate_groups(aElements, bElements, offsetA, offsetB) {
    animate(aElements, {
        translateX: offsetA,
        duration: 1200,
        easing: 'easeInOutQuad'
    });

    animate(bElements, {
        translateX: offsetB,
        duration: 1200,
        easing: 'easeInOutQuad'
    });
}

export function animate_mergeRects(groupA, groupB, rectWidth, rectHeight, centerX) {
    animate_groups(...getOffsets(groupA, groupB, rectWidth, rectHeight, centerX));
}

export function animate_posRects(groupA, groupB, rectWidth, rectHeight, centerX, scale) {
    const [aElements, bElements, offsetA, offsetB] = getOffsets(groupA, groupB, rectWidth, rectHeight, centerX);
    animate_groups(aElements, bElements, offsetA * scale, offsetB * scale);
}