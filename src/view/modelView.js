import {values} from 'lodash-bound';
import {modelClasses} from "../model";
import {copyCoords, extractCoords, getPoint} from "./utils";
import './visualResourceView';
import './verticeView';
import './edgeView';
import './linkView';
import './wireView';
import './shapeView';
import './lyphView';
import './regionView';
import './stratificationView.js';
import './stratifiedRegionView.js';

const {Group, Edge, Link, Coalescence, Component, Chain, Node, Lyph} = modelClasses;


// Update chain with dynamic ends
Chain.prototype.update = function (state) {
    const MIN_LAYOUT_DELTA = 5;
    let verbose = false
    if (this.id === "chain-epithelial-cell-in-inner-medullary-collecting-duct1"){
        verbose = true;
    }

    // Resize chain lyphs to match the current estimated level length.
    // During iterative layout `start/end` can temporarily collapse, so we only
    // use positive chain length values and keep previous level lengths otherwise.
    const resizeLevels = () => {
        let min = {
            width: 40,
            height: 80
        };
        const levelCount = this.levels?.length || 0;
        const levelLength = this.length > 0 ? this.length / levelCount : null;

        for (let i = 0; i < levelCount; i++) {
            const level = this.levels[i];
            if (levelLength) {
                level.length = levelLength;
            }
            const lyph = level.conveyingLyph;
            if (lyph) {
                if (lyph.housingLyph) {
                    if (!lyph.housingLyph.width || !lyph.housingLyph.height) {
                        [lyph.housingLyph.width, lyph.housingLyph.height] = lyph.housingLyph.sizeFromAxis::values();
                    }
                    //First and last levels in a chain end in the housing lyph
                    const delta = (i === 0 || i === levelCount - 1) ? 0.8 : 0.95;
                    if (level.length) {
                        level.length = this.radial
                            ? Math.min(level.length, delta*lyph.housingLyph.width)
                            : Math.min(level.length, delta*lyph.housingLyph.height);
                    }
                }
                const [width, height] = lyph.sizeFromAxis::values();
                min.width = Math.min(width, width);
                min.height = Math.min(height, height);
            }
        }

        const DELTA = 5;
        // Make chain lyphs all the same size.
        for (let i = 0; i < levelCount; i++) {
            const lyph = this.levels[i].conveyingLyph;
            if (lyph && (Math.abs(lyph.width - min.width) > DELTA || Math.abs(lyph.height - min.height) > DELTA)) {
                [lyph.width, lyph.height] = [min.width, min.height];
                if (lyph.viewObjects["2d"]){
                    lyph.removeViewObjects();
                    lyph.updateViewObjects(state);
                    lyph.viewObjects::values().forEach(obj => obj && state.graphScene.add(obj));
                }
            }
        }
    };

    if (!this.root || !this.leaf || !this.levels) {
        return;
    }

    // Update anchored or wired chain
    let {start, end} = this.getScaffoldChainEnds();
    start = extractCoords(start);
    end = extractCoords(end);
    if (start && end) {
        let curve = null;
        if (this.wiredTo && this.wiredTo.getCurve) {
            curve = this.startFromLeaf ? this.wiredTo.getCurve(end, start) : this.wiredTo.getCurve(start, end);
        }
        const measuredLength = curve && curve.getLength ? curve.getLength() : end.distanceTo(start);
        const hasUsableLength = measuredLength >= MIN_LAYOUT_DELTA;

        // Degenerate scaffold distance is expected in early layout iterations.
        // Do not project chain nodes to this collapsed segment, otherwise all
        // level sources/targets may be forced to (0, 0).
        if (!hasUsableLength) {
            resizeLevels();
            return;
        }
        const totalLevels = this.levels.length;
        // Adjust to recognize wireStart and wireEnd properties
        const from = this.wireStart ? this.wireStart : 0;
        const to = this.wireEnd ? (this.wireEnd < 0 ? totalLevels + this.wireEnd : this.wireEnd) : totalLevels;
        const activeLevels = to - from;
        if (activeLevels === 0) {
            return;
        }
        if (activeLevels < 0) {
            this.startFromLeaf = true;
        }

        // Scale full chain length from measured wired segment length.
        this.length = measuredLength * totalLevels / activeLevels;

        resizeLevels();

        let wiredRoot = from > 0 ? this.levels[from].source : this.root;
        copyCoords(wiredRoot.layout, start);
        wiredRoot.fixed = true;

        // Interpolate node positions to speed up constrained chain layout.
        for (let i = from; i < to - 1; i++) {
            let node = this.levels[i].target;
            if (!node?.anchoredTo) {
                let p = this.startFromLeaf
                    ? getPoint(curve, end, start, (to - 1 - i) / activeLevels)
                    : getPoint(curve, start, end, (i + 1) / activeLevels);
                copyCoords(node.layout, p);
                // Leave nodes unfixed if we want them to be stretched by the force-directed layout instead
                node.fixed = true;
            }
        }
        let wiredLeaf = to < totalLevels ? this.levels[to].target : this.leaf;
        copyCoords(wiredLeaf.layout, end);
        wiredLeaf.fixed = true;
    } else {
        resizeLevels();
    }
};

/**
 * Create visual objects for group resources
 * @param state
 */
Group.prototype.createViewObjects = function (state) {
    (this.scaffolds || []).forEach(scaffold => {
        if (!(scaffold instanceof Component)) return;
        scaffold.createViewObjects(state);
        scaffold.viewObjects::values().forEach(obj => obj && state.graphScene.add(obj));
    });

    this.visibleNodes.forEach(node => {
        if (!(node instanceof Node)) return;
        node.createViewObjects(state);
        node.viewObjects::values().forEach(obj => obj && state.graphScene.add(obj));
    });

    (this.chains || []).forEach(chain => chain.update && chain.update(state));

    this.visibleLinks.forEach(link => {
        if (!(link instanceof Link)) return;
        link.createViewObjects(state);
        link.viewObjects::values().forEach(obj => obj && state.graphScene.add(obj));
        if (link.geometry === Edge.EDGE_GEOMETRY.INVISIBLE) {
            link.viewObjects["main"].material.visible = false;
        }
    });
};

/**
 * Update visual objects for group resources
 */
Group.prototype.updateViewObjects = function (state) {
    //Update scaffolds
    (this.scaffolds || []).forEach(scaffold => scaffold.updateViewObjects(state));

    //Update node positions
    this.visibleNodes.forEach(node => node.updateViewObjects(state));

    (this.chains || []).forEach(chain => chain.update && chain.update(state));

    this.lyphs.forEach(lyph => {
        if (!(lyph instanceof Lyph)) return;
        lyph.setVisibility(false);
    });

    this.visibleLinks.forEach(link => link.updateViewObjects(state));

    (this.coalescences || []).forEach(coalescence => {
        if (coalescence.abstract || !coalescence.lyphs) return;
        let lyph = coalescence.lyphs[0];
        if (!lyph || lyph.isTemplate) return;
        for (let i = 1; i < coalescence.lyphs.length; i++) {
            let lyph2 = coalescence.lyphs[i];
            if (lyph2.isTemplate) {
                return;
            }

            let layers2 = lyph2.layers || [lyph2];
            if (coalescence.topology === Coalescence.COALESCENCE_TOPOLOGY.EMBEDDING) {
                //Non-symmetric - first lyph is a "housing lyph"
                if (layers2.length > 0) {
                    layers2[layers2.length - 1].setMaterialVisibility(!state.showCoalescences);
                }
            } else {//CONNECTING
                //Non-symmetric - second lyph moves towards the first
                //coalescing lyphs are independent / at the same scale level
                if (state.showCoalescences && lyph.viewObjects["2d"]) {
                    let layers = lyph.layers || [lyph];
                    let overlap = Math.min(layers[layers.length - 1].width, layers2[layers2.length - 1].width);
                    let scale = (lyph.width + lyph2.width - overlap) / (lyph.width || 1);
                    if (lyph.axis && lyph2.axis) {
                        let v1 = lyph.points[3].clone().sub(lyph.points[0]).multiplyScalar(scale);
                        let v2 = lyph.points[2].clone().sub(lyph.points[1]).multiplyScalar(scale);
                        let c1 = extractCoords(lyph.axis.source).clone().add(v1);
                        let c2 = extractCoords(lyph.axis.target).clone().add(v2);
                        copyCoords(lyph2.axis.source, c1);
                        copyCoords(lyph2.axis.target, c2);
                    }
                }
            }
        }
    });
};

/**
 * Create visual objects for Scaffold resources
 * @param state
 */
Component.prototype.createViewObjects = function (state) {
    [this.visibleAnchors, this.visibleWires, this.visibleRegions, this.visibleStratifiedRegions].forEach(resArray =>
        resArray.forEach(res => {
            res.createViewObjects(state);
            res.viewObjects::values().forEach(obj => obj && state.graphScene.add(obj));
        })
    );
};

/**
 * Update visual objects for group resources
 */
Component.prototype.updateViewObjects = function (state) {
    this.visibleAnchors.forEach(anchor => anchor.updateViewObjects(state));
    this.visibleWires.forEach(wire => wire.updateViewObjects(state));
    this.visibleRegions.forEach(region => region.updateViewObjects(state));
    this.visibleStratifiedRegions.forEach(region => region.updateViewObjects(state));
};
