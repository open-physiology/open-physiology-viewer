import {animate} from "animejs";
import * as d3 from "d3";


export function hideElement(svg, id) {
    svg.select(`#${id}`).style("display", "none");
}

export function showElement(svg, id) {
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

export function collectLayerCells(layerCellLevelMap, layers) {
    let cells = [];
    (layers || []).forEach(layer => {
        if (layer.fullID in layerCellLevelMap) {
            cells.push(layerCellLevelMap[layer.fullID]);
        } else {
            cells.push({
                placeholder: true,
                label: layer.name || layer.fullID,
                color: layer.color
            })
        }
    });
    return cells;
}

export function updateLyphMap(map, hostLyph, lyph) {
    if (!hostLyph) return;
    map[hostLyph.fullID] = map[hostLyph.fullID] || [];
    if (!map[hostLyph.fullID].find(e => e.fullID === lyph.fullID)) {
        map[hostLyph.fullID].push(lyph);
    }
}

export function drawLyph(group, layerSize, lyph, x, y, reversed, layerHandler, tooltip) {
    let layers = [...lyph.layers || []];
    if (reversed) layers = layers.reverse();

    const lyphWidth = (layerSize.width + layerSize.spacing) * (layers || []).length;
    const commonParams = ["#eee", lyph.name || lyph.fullID, tooltip];

    let dx = x;
    // Draw main lyph, shifted to emphasize borders
    if (!reversed) {
        d3_createRect(group, x - layerSize.border.x, y - layerSize.border.y,
            lyphWidth + layerSize.border.x, layerSize.height + layerSize.border.y, ...commonParams);
        group.append("text")
            .attr("x", x - layerSize.border.x + 2) // slight padding
            .attr("y", y - layerSize.border.y + 12) // vertically offset so it's not touching the edge
            .text(lyph.name || lyph.fullID)
            .attr("font-size", "10px")
            .attr("fill", "black");
    } else {
        d3_createRect(group, x, y, lyphWidth + layerSize.border.x, layerSize.height + layerSize.border.y, ...commonParams);
        group.append("text")
            .attr("x", x + 2) // slight padding
            .attr("y", y + layerSize.height + layerSize.border.y - 4) // vertically offset so it's not touching the edge
            .text(lyph.name || lyph.fullID)
            .attr("font-size", "10px")
            .attr("fill", "black");
    }

    // Draw layers
    layers.forEach((layer, i) => {
        let rect = d3_createRect(group, dx, y,
            layerSize.width, layerSize.height,
            layer.color, layer.name, tooltip);
        dx += layerSize.width + layerSize.spacing;
        if (layerHandler) layerHandler(layer.fullID, rect);
    });
}


export function drawCell(layerCellLevelMap, lyphRectMap, right, chain, group, reversed, k, n, levelHandler, tooltip) {
    group.attr("id", "g_" + chain.id);

    const createLeftBag = (pos, commonParams) => {
        const [x, y, width, height] = [
            pos.x + pos.width / 2, pos.y + pos.height / 4,
            pos.width / 2, pos.height / 2];
        return d3_createBagRect(group, x, y, width, height, ...commonParams, {
            roundLeft: true, roundRight: false, radius: 8
        });
    }

    const createRightBag = (pos, commonParams, lyph) => {
        const [x, y, width, height] = [pos.x, pos.y + pos.height / 4, pos.width / 2, pos.height / 2];
        right.add(lyph.fullID);
        return d3_createBagRect(group, x, y, width, height, ...commonParams, {
            roundLeft: false, roundRight: true, radius: 8
        });
    }

    (chain.levels || []).forEach((link, i) => {
        let commonParams = [link.conveyingLyph?.color || "lightblue", link.conveyingLyph?.name || link.conveyingLyph?.fullID, tooltip];

        const createShape = (hostLyph, isTube = false) => {
            if (!hostLyph || !link.conveyingLyph) return;
            updateLyphMap(layerCellLevelMap, hostLyph, link.conveyingLyph);
            let shape;
            if (hostLyph.fullID in lyphRectMap) {
                const hostRect = lyphRectMap[hostLyph.fullID];
                if (hostRect) {
                    const pos = d3_getRectDimensions(hostRect);
                    pos.height /= n;
                    pos.y += (pos.height * k);
                    if (isTube) {
                        shape = (i === 0)
                            ? (reversed ? createRightBag(pos, commonParams, link.conveyingLyph) : createLeftBag(pos, commonParams))
                            : (reversed ? createLeftBag(pos, commonParams) : createRightBag(pos, commonParams, link.conveyingLyph));
                    } else {
                        const [x, y, width, height] = [pos.x, pos.y + pos.height / 4, pos.width, pos.height / 2];
                        shape = d3_createBagRect(group, x, y, width, height, ...commonParams, {
                            roundLeft: false, roundRight: false
                        });
                    }
                }
            } else {
                console.error("Lyph with a problem", hostLyph, chain);
            }
            return shape;
        }

        let shape = (link.endsIn) ? createShape(link.endsIn, true) : createShape(link.fasciculatesIn);
        if (shape && levelHandler) {
            shape.on("click", d => levelHandler(link.conveyingLyph));
        }
    });
}

export function generateRandomCellNetwork(rects) {
    let nodes = rects.map(rect => {
        let numNodes = Math.random() < 0.5 ? 1 : 2;
        let nodes = [];
        for (let i = 0; i < numNodes; i++) {
            nodes.push({
                x: rect.x + Math.random() * rect.width,
                y: rect.y + Math.random() * rect.height
            });
        }
        return nodes;
    });
    // 4) Generate links between nodes in rect[i] and rect[i+1]
    let links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        let groupA = nodes[i];
        let groupB = nodes[i + 1];
        groupA.forEach(a => {
            groupB.forEach(b => {
                links.push({source: a, target: b});
            });
        });
    }
    return [nodes.flat(), links];
}

export function drawCellNetwork(rects, group, nodes, links, tooltip) {
    // 3) Draw nodes
    let node = group.selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 5)
        .attr("fill", "steelblue")
        .style("cursor", "pointer")
        .on("mouseover", d => {
            if (!tooltip) return;
            tooltip
                .style("left", d3.event.pageX + 10 + "px")
                .style("top", d3.event.pageY + 10 + "px")
                .style("opacity", "0.9")
                .html(d.label);
        })
        .on("mouseout", d => {
            if (!tooltip) return;
            tooltip.style("opacity", 0)
        });

    node.enter().append("text")
        .attr("x", d => d.x + 2)
        .attr("y", d => d.y - 4)
        .text(d => d.label)
        .attr("font-size", "10px")
        .attr("fill", "black");

    // 5) Draw links
    group.selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .attr("stroke", "#999");
}