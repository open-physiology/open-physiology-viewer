import {modelClasses} from "../model";
import {merge, values} from 'lodash-bound';
import {
    copyCoords,
} from "./util/utils";

const { Border, VisualResource } = modelClasses;

/**
 * Returns coordinates of the bounding box (min and max points defining a parallelogram containing the border points)
 */
 Border.prototype.getBoundingBox = function(){
    let [x, y, z] = ["x","y","z"].map(key => this.host.points.map(p => p[key]));
    let min = {"x": Math.min(...x), "y": Math.min(...y), "z": Math.min(...z)};
    let max = {"x": Math.max(...x), "y": Math.max(...y), "z": Math.max(...z)};
    return [min, max];
};

/**
 * Create visual objects for a shape border
 * @param state
 */
Border.prototype.createViewObjects = function(state){
    VisualResource.prototype.createViewObjects.call(this, state);
    //Make sure we always have border objects regardless of data input
    for (let i = 0; i < this.borders.length; i++){
        let points = this.host.points;
        this.borders[i]::merge({
            "length": points[(i + 1) % points.length].distanceTo(points[i])
        });
        if (this.borders[i].conveyingLyph) {
            this.borders[i].conveyingLyph.conveys = this.borders[i];
            this.borders[i].createViewObjects(state);
            this.borders[i].conveyingLyph.viewObjects::values().forEach(obj => obj && state.graphScene.add(obj));
        }
    }
};

/**
 * Update visual objects for a shape border
 */
Border.prototype.updateViewObjects = function(state){
    VisualResource.prototype.updateViewObjects.call(this, state);

    for (let i = 0; i < this.borders.length ; i++){
        copyCoords(this.borders[i].source, this.host.points[ i ]);
        copyCoords(this.borders[i].target, this.host.points[ (i + 1) % this.borders.length]);
        this.borders[i].updateViewObjects(state);

        //Position hostedNodes exactly on the edge shape
        //TODO move this into Link class as this is not applicable to Wires
        let borderLyph = this.borders[i].conveyingLyph;
        if (borderLyph && borderLyph.viewObjects) {
            borderLyph.viewObjects::values().forEach(obj => obj && this.state.graphScene.add(obj));
        }
        if (this.borders[i].hostedNodes) {
            //position nodes on the lyph border (exact shape)
            let n = this.borders[i].hostedNodes.length;
            const offset = 1 / (n + 1);
            let V = this.host.points[i + 1].clone().sub(this.host.points[i]);
            this.borders[i].hostedNodes.forEach((node, j) => {
                //For borders 2 and 3 position nodes in the reversed order to have parallel links
                let d_i = node.offset !== undefined? node.offset : offset * (j + 1);
                if (i > 1) {
                    d_i = 1 - d_i;
                }
                //TODO cysts may have shifted nodes on layer borders
                copyCoords(node, this.host.points[i].clone().add(V.clone().multiplyScalar(d_i)));
            })
        }
    }

    (this.host.internalNodes || []).forEach((node, i) => {
        let d_i = node.offset !== undefined? node.offset: (i + 1) / (this.host.internalNodes.length + 1);
        this.host.placeNodeInside(node, d_i);
    })

    const lyphsToLinks = lyphs => (lyphs || []).filter(lyph => lyph.axis).map(lyph => lyph.axis);

    const hostedLinks = lyphsToLinks(this.host.hostedLyphs);
    hostedLinks.forEach((link, i) => this.host.placeLinkInside(link, i, Math.floor(Math.sqrt(hostedLinks.length||1)), hostedLinks.length));

    const numCols = this.host.internalLyphColumns || 1;
    const internalLinks = lyphsToLinks(this.host.internalLyphs);
    internalLinks.forEach((link, i) => this.host.placeLinkInside(link, i, numCols, internalLinks.length));
};

/**
 * @property polygonOffsetFactor
 */
Object.defineProperty(Border.prototype, "polygonOffsetFactor", {
    get: function() {
        return this.host? this.host.polygonOffsetFactor: 0;
    }
});

