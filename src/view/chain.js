import {$Field, modelClasses} from "../model";
import {copyCoords, extractCoords, getPoint} from "./util/utils";

const {Chain, Node} = modelClasses;


//Update chain with dynamic ends
Chain.prototype.update = function(){
    
    if (!this.root || !this.leaf){ 
      console.log(this.id);
      return; 
    }
    let {start, end} = this.getWiredChainEnds();
    console.log("Start ", start.id);
    console.log("End ", end.id)
    start = extractCoords(start);
    end   = extractCoords(end);
    if (start && end) {
        if (this.startFromLeaf){
            let tmp = end;
            end = start;
            start = tmp;
        }
        let curve = this.wiredTo ? this.wiredTo.getCurve(start, end) : null;
        let length = (curve && curve.getLength) ? curve.getLength() : end.distanceTo(start);
        if (length < 5) {
          console.log(this.id);
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
                const size = lyph.sizeFromAxis;
                [$Field.width, $Field.height].forEach(prop => lyph[prop] = size[prop]);
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

