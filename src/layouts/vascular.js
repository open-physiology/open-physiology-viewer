import {getGenID, $Prefix, $Field, generateFromJSON, getGenName, $SchemaClass} from "../model";
import {getFullID, findResourceByID, includeRef, sortLinkedArraysDescending} from "../model/utils";
import {$LogMsg, logger} from "../model/logger";
import {VascularScaffold} from "./vascularScaffold";

const aV = "aV", aW = "aW", rV = "rV", rW = "rW";
const WIRE_CURVATURE = 15;
const CLS_POS = {x: -50, y: -30};
const CLS_DISTANCE = 5;


export function createVascularLayout(model, modelClasses, config) {

    function findAllPaths(edges, startEdge) {
        const results = [];

        function isCoalescenceAxis(link) {
            return link.conveyingLyph?.inCoalescences?.length > 0;
        }

        // Use visit map to find out what causes infinite loops
        // const visitMap = new Map();
        function dfs(curr, path, visited, blocked, isFinal) {
            if (!curr) return;
            visited.add(curr.id);
            // if (!visitMap.has(curr.id)) visitMap.set(curr.id, 0);
            // visitMap.set(curr.id, visitMap.get(curr.id) + 1);

            path.push(curr);

            if (isFinal(curr)) results.push([...path]); // save a copy of the current path

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

    if (model && model.scaffolds?.length === 0) return;

    const scaffold = model.scaffolds[0];
    if (scaffold.id !== "fd-map") {
        logger.error($LogMsg.SCAFFOLD_NOT_APPLICABLE, scaffold.id);
        return;
    }
    logger.info($LogMsg.SCAFFOLD_CUSTOM, scaffold.id);

    const scaffoldLayout = new VascularScaffold(scaffold);
    console.info("Generating model for connectivity analysis...");
    let genModel = generateFromJSON(model);
    console.log("Preliminary model generated!");

    const chainMap = {};
    (model.chains || []).forEach(c => chainMap[c.id] = c);

    /* Update scaffold + connectivity layout  */
    const vascularChains = genModel.chains.filter(c => (c.id in chainMap));
    const vChains = scaffoldLayout.getVChains(vascularChains);
    const wChains = scaffoldLayout.getWChains(vascularChains);
    const wbkg = findResourceByID(model.groups, "wbrcm");

    const clsMap = {};
    (wbkg.coalescences || []).forEach(c => clsMap[c.id] = c);

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

    const clsLyphSet = new Set();

    const anchorPaths = (chains, anchorHandler, wireHandler, chainWire) => {
        const railLinks = {};
        chains.forEach((chain, i) => {
            const paths = findAllPaths(genModel.links, chain.levels[0]);
            console.info("Found paths for chain ", chain.id, paths.length);
            paths.forEach((path, j) => {
                let lastLyph = path[path.length - 1].conveyingLyph;
                if (lastLyph) {
                    clsLyphSet.add(lastLyph);
                }
            });

            const exitLevels = paths.map(path => findExitLevel(path));
            sortLinkedArraysDescending(exitLevels, paths);

            const anchorX = anchorHandler(i, chainWire);
            anchorX.name = getGenName($Prefix.anchor, chain.name || chain.id);
            wireHandler(chainMap[chain.id], anchorX.id);

            railLinks[chain.id] = new Set();

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
                path.forEach(edge => includeRef(chainGroup.links, edge.fullID, edge.namespace));
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

    const anchorHandlerV = (i, wire) => scaffoldLayout.createAnchorRegionV(i, wire);
    const anchorHandlerW = (i, wire) => scaffoldLayout.createAnchorRegionW(i, wire);
    const assignWireV = (chain, anchor) => scaffoldLayout.assignWire(chain, aV, anchor, -WIRE_CURVATURE);
    const assignWireW = (chain, anchor) => scaffoldLayout.assignWire(chain, aW, anchor, WIRE_CURVATURE);

    anchorPaths(vChains, anchorHandlerV, assignWireV, scaffoldLayout.wireV_0);
    anchorPaths(wChains, anchorHandlerW, assignWireW, scaffoldLayout.wireW_0);

    const clsSet = new Set();

    Array.from(clsLyphSet).forEach(clsLyph => (clsLyph.inCoalescences || []).forEach(cls => clsSet.add(cls)));
    Array.from(clsSet).forEach((cls, i) => {
        let group = cls.createNodeGroup(model);
        let node = cls.createNodes(group, model);
        node.layout = {
            "x": CLS_POS.x + i * CLS_DISTANCE,
            "y": CLS_POS.y
        };
        clsMap[cls.id].group = getFullID(model.namespace, group.id);
    });

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
    return configVascularLayout(model);
}

export function configVascularLayout(model, modelClasses, config) {
    console.info("Generating modified model...");
    let genModel = generateFromJSON(model);
    console.log("Final model generated!");

    const colorLyph = lyph => {
        if ((lyph.inCoalescences || []).length > 0) {
            lyph.color = "#ee9955";
        } else {
            lyph.color = "#d0d0d0";
        }
    }
    const wbkgUrinaryLeft = genModel.entitiesByID["wbkg:left_chain-urinary-tail"];
    const wbkgUrinaryRight = genModel.entitiesByID["wbkg:right_chain-urinary-tail"];
    (wbkgUrinaryLeft?.lyphs || []).forEach(lyph => colorLyph(lyph));
    (wbkgUrinaryRight?.lyphs || []).forEach(lyph => colorLyph(lyph));

    config.layout = config.layout || {};
    config.layout.showLayers = false;
    config.labels = config.labels || {};
    config.labels.Anchor = $Field.name;

    genModel.groups.forEach(g => {
        if (g.hidden) {
            g.inactive = true;
        }
        if (g.id.includes("group_paths")) {
            (g.lyphs || []).forEach(lyph => colorLyph(lyph));
        }
    });

    (genModel.coalescences || []).forEach(cls => {
        if (cls.group) {
            delete cls.group.inactive;
        }
    });
    return genModel;
}



