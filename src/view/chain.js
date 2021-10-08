import {values} from 'lodash-bound';
import {modelClasses} from "../model";
import {ForceEdgeBundling} from "../algorithms/forceEdgeBundling";
import {copyCoords, extractCoords, getPoint} from "./utils";
import './visualResourceView';
import './verticeView';
import './edgeView';
import './shapeView';

const {Chain, Node} = modelClasses;


//Update chain with dynamic ends
Chain.prototype.update = function(){
    if (!this.root || !this.leaf){ return; }
    let {start, end} = this.getWiredChainEnds();
    start = extractCoords(start);
    end   = extractCoords(end);
    if (start && end) {
        let curve = this.wiredTo ? this.wiredTo.getCurve(start, end) : null;
        let length = (curve && curve.getLength) ? curve.getLength() : end.distanceTo(start);
        if (length < 10) {
            return;
        }
        this.length = length;
        copyCoords(this.root.layout, start);
        this.root.fixed = true;
        for (let i = 0; i < this.levels.length; i++) {
            //Interpolate chain node positions for quicker layout
            this.levels[i].length = this.length / this.levels.length;
            const lyph = this.levels[i].conveyingLyph;
            if (lyph) {
                lyph.updateSize();
            }
            let node = this.levels[i].target;
            if (node && !node.anchoredTo) {
                let p = getPoint(curve, start, end, (i + 1) / this.levels.length);
                copyCoords(node.layout, p);
                node.fixed = true;
            }
        }
        copyCoords(this.leaf.layout, end);
    }
}

