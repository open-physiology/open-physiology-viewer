import {getGenID, $Prefix, $Field, generateFromJSON, getGenName} from "../model";
import {getFullID, findResourceByID, $Color, mergeGenResource, isIncluded, includeRef} from "../model/utils";
import {cloneDeep} from 'lodash-bound';
import {$LogMsg, logger} from "../model/logger";

const aV = "aV", aW = "aW", rV = "rV", rW = "rW";
const WIRE_CURVATURE = 15;
const CLS_POS = {x: -50, y: -30};
const CLS_DISTANCE = 5;
const RAIL_DISTANCE = 10;

class VascularLayout {
    constructor(scaffold) {
        this.scaffold = scaffold;
        this.scaffold.namespace = scaffold.namespace || scaffold.id;
        this.wireV = findResourceByID(scaffold.wires, "w-V-rail");
        this.wireW = findResourceByID(scaffold.wires, "w-W-rail");
        this.sV = findResourceByID(scaffold.anchors, "sV");
        this.tV = findResourceByID(scaffold.anchors, "tV");
        this.sW = findResourceByID(scaffold.anchors, "sW");
        this.tW = findResourceByID(scaffold.anchors, "tW");
    }

    createRailV0() {
        if (isIncluded(this.scaffold.wires, "w-V-rail_0")) return;
        let sV_0 = {
            [$Field.id]: "sV_0",
            [$Field.layout]: {
                x: this.sV.layout.x,
                y: this.sV.layout.y + RAIL_DISTANCE
            },
            [$Field.invisible]: true,
            [$Field.skipLabel]: true
        }
        let tV_0 = {
            [$Field.id]: "tV_0",
            [$Field.layout]: {
                x: this.tV.layout.x,
                y: this.tV.layout.y + RAIL_DISTANCE
            },
            [$Field.invisible]: true,
            [$Field.skipLabel]: true
        }
        this.wireV_0 = {
            [$Field.id]: "w-V-rail_0",
            [$Field.source]: sV_0.id,
            [$Field.target]: tV_0.id,
            [$Field.geometry]: "invisible"
        }
        this.scaffold.anchors.push(sV_0);
        this.scaffold.anchors.push(tV_0);
        this.scaffold.wires.push(this.wireV_0);
    }

    createRailW0() {
        if (findResourceByID(this.scaffold.wires, "w-W-rail_0")) return;
        let sW_0 = {
            [$Field.id]: "sW_0",
            [$Field.layout]: {
                x: this.sW.layout.x,
                y: this.sW.layout.y - RAIL_DISTANCE
            },
            [$Field.invisible]: true,
            [$Field.skipLabel]: true
        }
        let tW_0 = {
            [$Field.id]: "tW_0",
            [$Field.layout]: {
                x: this.tW.layout.x,
                y: this.tW.layout.y - RAIL_DISTANCE
            },
            [$Field.invisible]: true,
            [$Field.skipLabel]: true
        }
        this.wireW_0 = {
            [$Field.id]: "w-W-rail_0",
            [$Field.source]: sW_0.id,
            [$Field.target]: tW_0.id,
            [$Field.geometry]: "invisible"
        }
        this.scaffold.anchors.push(sW_0);
        this.scaffold.anchors.push(tW_0);
        this.scaffold.wires.push(this.wireW_0);
    }

    computeDistance(coord1, coord2) {
        if (!coord1 || !coord2) return;
        const dx = coord1.x - coord2.x;
        const dy = coord1.y - coord2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    scaleEllipse(ellipse, dx, dy) {
        if (!ellipse?.radius) return;
        ellipse.radius.x += dx;
        ellipse.radius.y += dy;
    }

    updateRails(rail1, rail2, d) {
        if (!rail1 || !rail2) return;
        let s1 = findResourceByID(this.scaffold.anchors, rail1.source);
        let s2 = findResourceByID(this.scaffold.anchors, rail2.source);
        let t1 = findResourceByID(this.scaffold.anchors, rail1.target);
        let t2 = findResourceByID(this.scaffold.anchors, rail2.target);
        let d0 = this.computeDistance(s1, s2);
        let delta = (d - d0) / 2;
        s1.layout.y -= delta;
        s2.layout.y += delta;
        t1.layout.y -= delta;
        t2.layout.y += delta;
        return delta;
    }

    updateRegion(region, delta) {
        if (!region?.points) return;
        region.points.forEach(p => p.y += delta);
    }

    updateRailRegions(d) {
        let delta = this.updateRails(d);
        let rV = findResourceByID(this.scaffold.regions, rV);
        let rW = findResourceByID(this.scaffold.regions, rW);
        this.updateRegion(rV, -delta);
        this.updateRegion(rW, delta);
    }

    assignWire(chain, anchorS, anchorT, curvature) {
        let w = {
            [$Field.id]: getGenID($Prefix.wire, chain.id),
            [$Field.name]: getGenName("Wire for", chain.name),
            [$Field.source]: anchorS,
            [$Field.target]: anchorT,
            [$Field.geometry]: "spline",
            [$Field.stroke]: "dashed",
            [$Field.curvature]: curvature
        }
        this.scaffold.wires.push(w);
        chain.wiredTo = getFullID(this.scaffold.namespace, w.id);
        return w;
    }

    getVChains(chains) {
        return (chains || []).filter(c => c.root?.anchoredTo?.id === aV);
    }

    getWChains(chains) {
        return (chains || []).filter(c => c.root?.anchoredTo?.id === aW && c.levels?.length > 1);
    }

    createAnchorRegionV(ext, wire = null) {
        let anchorX = {
            [$Field.id]: getGenID($Prefix.anchor, aV, rV, ext),
            [$Field.hostedBy]: wire?.id || this.wireV.id,
            [$Field.skipLabel]: true,
            [$Field.invisible]: true
        }
        this.scaffold.anchors.push(anchorX);
        return anchorX;
    }

    createAnchorRegionW(ext, wire = null) {
        let anchorX = {
            [$Field.id]: getGenID($Prefix.anchor, aW, rW, ext),
            [$Field.hostedBy]: wire?.id || this.wireW.id,
            [$Field.skipLabel]: true,
            [$Field.invisible]: true
        }
        this.scaffold.anchors.push(anchorX);
        return anchorX;
    }
}

export function createVascularLayout(model) {

    function findAllPaths(edges, startEdge) {
        const results = [];

        // Useful for debugging
        function printHighestEntry(map) {
            let maxKey = null;
            let maxValue = -Infinity;
            for (const [key, value] of map.entries()) {
                if (value > maxValue) {
                    maxValue = value;
                    maxKey = key;
                }
            }
            console.log(`Key: ${maxKey}, Value: ${maxValue}`);
        }

        function isCoalescenceAxis(link) {
            return link.conveyingLyph?.inCoalescences?.length > 0;
        }

        // Use visit map to find out what causes infinite loops
        // const visitMap = new Map();
        function dfs(curr, path, visited, blocked, isFinal) {
            if (!curr) return;
            visited.add(curr.id);
            // if (!visitMap.has(curr.id)) {
            //     visitMap.set(curr.id, 0);
            // }
            // visitMap.set(curr.id, visitMap.get(curr.id) + 1);

            path.push(curr);

            if (isFinal(curr)) {
                results.push([...path]); // save a copy of the current path
            }

            const neighbours = [];
            [$Field.source, $Field.target].forEach(end => {
                [$Field.targetOf, $Field.sourceOf].forEach(prop => {
                    (curr[end][prop] || []).forEach(neighbor => {
                        if (curr.id === neighbor.id) return;
                        if (curr.namespace === "wbkg" && neighbor.namespace === "vascular") {
                            return;
                        }
                        if (!blocked.has(neighbor.id) && !visited.has(neighbor.id)) {
                            neighbours.push(neighbor);
                            // Block siblings from traversing each other
                            blocked.add(neighbor.id);
                        }
                    });
                });
            });
            neighbours.forEach(neighbor => dfs(neighbor, path, visited, blocked, isFinal));
            neighbours.forEach(neighbor => blocked.delete(neighbor.id));

            path.pop();
            visited.delete(curr.id);
        }

        dfs(startEdge, [], new Set(), new Set(), isCoalescenceAxis);

        return results;
    }

    if (model && model.scaffolds?.length > 0) {
        const scaffold = model.scaffolds[0];
        if (scaffold.id !== "fd-map") {
            logger.error($LogMsg.SCAFFOLD_NOT_APPLICABLE, scaffold.id);
            return;
        }
        logger.info($LogMsg.SCAFFOLD_CUSTOM, scaffold.id);

        const scaffoldLayout = new VascularLayout(scaffold);
        console.info("Generating model for connectivity analysis...");
        let genModel = generateFromJSON(model::cloneDeep());
        console.log("Preliminary model generated!");

        const chainMap = {};
        (model.chains || []).forEach(c => chainMap[c.id] = c);

        /* Update scaffold + connectivity layout  */
        const vascularChains = genModel.chains.filter(c => (c.id in chainMap));
        const vChains = scaffoldLayout.getVChains(vascularChains);
        const wChains = scaffoldLayout.getWChains(vascularChains);
        const wbkg = findResourceByID(model.groups, "wbrcm");

        if (vChains.length === 0 && wChains.length === 0) return;
        if (vChains.length > 0) {
            scaffoldLayout.createRailV0();
        }
        if (wChains.length > 0) {
            scaffoldLayout.createRailW0();
        }

        scaffold.wires = scaffold.wires || [];

        function findExitLevel(path) {
            for (let i = 1; i < path.length; i++) {
                if (path[i].namespace === "wbkg") {
                    return i - 1;
                }
            }
            return Number.MAX_VALUE;
        }

        const coalescenceLyphDict = {};

        // const uniquePaths = new Set();

        function sortLinkedArraysDescending(A, B) {
            // Combine A and B into pairs
            let combined = A.map((value, index) => ({value, linked: B[index]}));

            // Sort by value in decreasing order
            combined.sort((a, b) => b.value - a.value);

            // Unpack the sorted arrays back into A and B
            for (let i = 0; i < combined.length; i++) {
                A[i] = combined[i].value;
                B[i] = combined[i].linked;
            }
        }

        const anchorPaths = (chains, anchorHandler, wireHandler, chainWire) => {
            const railLinks = {};
            chains.forEach((chain, i) => {
                const paths = findAllPaths(genModel.links, chain.levels[0]);
                console.info("Found paths for chain ", chain.id, paths.length);
                paths.forEach((path, j) => {
                    if (!(chain.id in coalescenceLyphDict)) {
                        coalescenceLyphDict[chain.id] = [];
                    }
                    let lastLyph = path[path.length - 1].conveyingLyph;
                    if (lastLyph) {
                        coalescenceLyphDict[chain.id].push(lastLyph);
                    }
                });

                const exitLevels = paths.map(path => findExitLevel(path));
                sortLinkedArraysDescending(exitLevels, paths);

                const anchorX = anchorHandler(i, chainWire);
                if (chain.name) {
                    anchorX.name = chain.name;
                }
                wireHandler(chainMap[chain.id], anchorX.id);

                railLinks[chain.id] = new Set();
                //let railMaxIdx = 0;


                model.groups = model.groups || [];
                let chainGroup = {
                    [$Field.id]: getGenID($Prefix.group, "paths", chain.id),
                    [$Field.name]: getGenName("Paths", chain.name || chain.id),
                    [$Field.hidden]: false,
                    [$Field.links]: []
                }
                model.groups.unshift(chainGroup);

                paths.forEach((path, j) => {
                    railLinks[chain.id].add(path[exitLevels[j]]);
                    path.forEach(edge => {
                        includeRef(chainGroup.links, edge.fullID, edge.namespace);
                    });
                });
                Array.from(railLinks[chain.id]).forEach((edge, j) => {
                    if (!edge) return;
                    let anchorX = anchorHandler(i + "&" + j);
                    anchorX.name = edge.conveyingLyph?.name || edge.id;
                    anchorX.anchoredNode = edge.target?.fullID;
                });
            });
            return railLinks;
        }

        const anchorHandlerV = (i, wire) => {
            return scaffoldLayout.createAnchorRegionV(i, wire);
        }
        const anchorHandlerW = (i, wire) => {
            return scaffoldLayout.createAnchorRegionW(i, wire);
        }
        const assignWireV = (chain, anchor) => {
            return scaffoldLayout.assignWire(chain, aV, anchor, -WIRE_CURVATURE);
        }
        const assignWireW = (chain, anchor) => {
            return scaffoldLayout.assignWire(chain, aW, anchor, WIRE_CURVATURE);
        }

        let edgesV = anchorPaths(vChains, anchorHandlerV, assignWireV, scaffoldLayout.wireV_0);
        let edgesW = anchorPaths(wChains, anchorHandlerW, assignWireW, scaffoldLayout.wireW_0);

        function createCoalescenceNodes() {
            const coalescenceSet = new Set();
            for (let chainID in coalescenceLyphDict) {
                coalescenceLyphDict[chainID].forEach(clsLyph => {
                    (clsLyph.inCoalescences || []).forEach(cls => coalescenceSet.add(cls));
                });
            }

            function createCoalescenceNode(cls, i, clsGroup) {
                let clsNodeID = getGenID($Prefix.node, cls.id);
                //If coalescence node exists, do nothing
                if (isIncluded(model.nodes, clsNodeID)) return;

                let clsNode = {
                    [$Field.id]: clsNodeID,
                    [$Field.name]: cls.name,
                    [$Field.layout]: {
                        x: CLS_POS.x + CLS_DISTANCE * i,
                        y: CLS_POS.y
                    },
                    [$Field.val]: 5,
                    [$Field.fixed]: true,
                    [$Field.color]: $Color.Coalescence,
                    [$Field.representsCoalescence]: cls.fullID
                }
                mergeGenResource(clsGroup, model, clsNode, $Field.nodes);
                (cls.lyphs || []).forEach((lyph, j) => {
                    let lyphRef = getFullID(wbkg.namespace, lyph.id);
                    let clsLyphNode = {
                        [$Field.id]: getGenID(clsNodeID, j),
                        [$Field.name]: cls.name,
                        [$Field.invisible]: true,
                        [$Field.internalIn]: lyphRef
                    }
                    mergeGenResource(clsGroup, model, clsLyphNode, $Field.nodes);
                    let clsLnk = {
                        [$Field.id]: getGenID($Prefix.link, cls.id, j),
                        [$Field.name]: getGenName("Coalescing lyph", j, cls.name || cls.id),
                        [$Field.stroke]: "dashed",
                        [$Field.source]: clsNode.id,
                        [$Field.target]: clsLyphNode.id
                    }
                    mergeGenResource(clsGroup, model, clsLnk, $Field.links);
                    includeRef(clsGroup.lyphs, lyphRef);
                });
            }

            model.nodes = model.nodes || [];
            model.links = model.links || [];
            model.groups = model.groups || [];
            let clsGroup = {
                [$Field.id]: getGenID($Prefix.group, "cls"),
                [$Field.name]: "Coalescences",
                [$Field.hidden]: false,
                [$Field.nodes]: [],
                [$Field.links]: [],
                [$Field.lyphs]: [],
            }
            model.groups.unshift(clsGroup);
            Array.from(coalescenceSet).forEach((cls, i) => {
                createCoalescenceNode(cls, i, clsGroup);
            });
        }

        createCoalescenceNodes();

        // Show urinary trees
        let wbkgUrinaryLeft = findResourceByID(wbkg.chains, "left_chain-urinary-tail");
        let wbkgUrinaryRight = findResourceByID(wbkg.chains, "right_chain-urinary-tail");
        if (wbkgUrinaryLeft) {
            wbkgUrinaryLeft.hidden = false;
            wbkgUrinaryLeft.wiredTo = getFullID(scaffold.namespace, "w-U-f3K-left");
        }
        if (wbkgUrinaryRight) {
            wbkgUrinaryRight.hidden = false;
            wbkgUrinaryRight.wiredTo = getFullID(scaffold.namespace, "w-U-f3K-right");
        }
    }
}

export function configVascularLayout(genModel, config) {
    config.layout = config.layout || {};
    config.layout.showLayers = false;
}