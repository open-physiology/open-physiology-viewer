import { copyCoords } from './utils';
import { LINK_GEOMETRY } from './linkModel';
import { Node } from './nodeModel';
import { Lyph } from './lyphModel';
import { VisualResource } from './visualResourceModel';
import { merge } from 'lodash-bound';
import { THREE, getCenterOfMass, lyphBorders, polygonBorders, extractCoords, boundToRectangle, boundToPolygon} from '../three/utils';

/**
 *  The class defining the border of a shape (lyph or region)
 * @class
 * @property host
 * @property borders
 *
 */
export class Border extends VisualResource {

    get isVisible(){
        return super.isVisible && (this.host? this.host.isVisible: true);
    }

    get polygonOffsetFactor(){
        return this.host? this.host.polygonOffsetFactor: 0;
    }

    /**
     * Returns coordinates of the bounding box (min and max points defining a parallelogram containing the border points)
     */
    getBoundingBox(){
        let [x, y, z] = ["x","y","z"].map(key => this.host.points.map(p => p[key]));
        let min = {"x": Math.min(...x), "y": Math.min(...y), "z": Math.min(...z)};
        let max = {"x": Math.max(...x), "y": Math.max(...y), "z": Math.max(...z)};
        return [min, max];
    }

    /**
     * Assigns fixed position on a grid inside border
     * @param link - link to place inside border
     * @param i    - position
     * @param numCols - number of columns
     * @param numRows - number of Rows
     */
    placeLinkInside(link, i, numCols, numRows){//TODO this will only work well for rectangular shapes
        if (!link.source || !link.target){
            console.warn(`Cannot place a link inside border ${this.id}`, link);
            return;
        }
        let delta = 0.05; //offset from the border
        let p = this.host.points.slice(0,3).map(p => p.clone());
        p.forEach(p => p.z += 1);
        let dX = p[1].clone().sub(p[0]);
        let dY = p[2].clone().sub(p[1]);
        let offsetY = dY.clone().multiplyScalar(delta + Math.floor(i / numCols) / (numRows * (1 + 2 * delta) ) );
        let sOffsetX = dX.clone().multiplyScalar(i % numCols / numCols + link.source.offset || 0);
        let tOffsetX = dX.clone().multiplyScalar(1 - (i % numCols + 1) / numCols + link.target.offset || 0);
        copyCoords(link.source, p[0].clone().add(sOffsetX).add(offsetY));
        copyCoords(link.target, p[1].clone().sub(tOffsetX).add(offsetY));
        link.source.z += 1; //todo replace to polygonOffset?
    }

    placeNodeInside(node, i, n, center){//TODO this will only work well for rectangular shapes
        if (!node || !node.class) {
            console.warn(`Cannot place a node inside border ${this.id}`, node);
            return;
        }
        let [min, max] = this.getBoundingBox();
        let dX = max.x - min.x; let dY = max.y - min.y;
        let r  = Math.min(dX, dY) / 4;
        let offset = new THREE.Vector3( r, 0, 0 );
        let axis   = new THREE.Vector3( 0, 0, 1);
        let angle  = 4 * Math.PI * i / n;
        offset.applyAxisAngle( axis, angle );
        let pos = center.clone().add(offset);
        copyCoords(node, pos);
        node.z += 1;
    }

    /**
     * Push existing link inside of the border
     * @param link
     */
    pushLinkInside(link) {
        const delta = 5;
        let points = this.host.points.map(p => p.clone());
        let [min, max] = this.getBoundingBox();
        //Global force pushes content on top of lyph
        if (Math.abs(max.z - min.z) <= delta) {
            //Fast way to get projection for lyphs parallel to x-y plane
            link.source.z = link.target.z = points[0].z + 1;
        } else {
            //Project links with hosted lyphs to the container lyph plane
            let plane = new THREE.Plane();
            plane.setFromCoplanarPoints(...points.slice(0,3));

            ["source", "target"].forEach(key => {
                let node = extractCoords(link[key]);
                plane.projectPoint(node, node);
                node.z += 1;
                copyCoords(link[key], node);
            });
        }
        boundToRectangle(link.source, min, max);
        boundToRectangle(link.target, min, max);
        let [dX, dY] = ["x", "y"].map(key => points.map(p => Math.min(p[key] - min[key], max[key] - p[key])));
        if (Math.max(...[...dX,...dY]) > delta) { //if the shape is not rectangle
            //Push the link to the tilted lyph rectangle
            boundToPolygon(link, this.borders);
        }
    }

    createViewObjects(state){
        //Make sure we always have border objects regardless of data input
        for (let i = 0; i < this.borders.length; i++){
            let [s, t] = ["s", "t"].map(
                prefix => Node.fromJSON({"id": `${prefix}_${this.id}_${i}`}
            ));
            this.borders[i]::merge({
                "source": s,
                "target": t,
                "geometry": LINK_GEOMETRY.INVISIBLE,
                "length": this.host.points[i + 1].distanceTo(this.host.points[i])
            });
            if (this.borders[i].conveyingLyph) {
                this.borders[i].conveyingLyph.conveyedBy = this.borders[i];
                this.borders[i].createViewObjects(state);
                state.graphScene.add(this.borders[i].conveyingLyph.viewObjects["main"]);
            }
        }
        //TODO draw borders as links
        this.viewObjects["shape"] = (this.host instanceof Lyph)
            ? lyphBorders([this.host.width, this.host.height, this.host.width / 2, ...this.host.radialTypes])
            : polygonBorders(this.host.points);
    }

    updateViewObjects(state){
        for (let i = 0; i < this.borders.length ; i++){
            copyCoords(this.borders[i].source, this.host.points[ i ]);
            copyCoords(this.borders[i].target, this.host.points[i + 1]);
            this.borders[i].updateViewObjects(state);
            //Position hostedNodes exactly on the link shape
            if (this.borders[i].hostedNodes){
                //position nodes on the lyph border (exact shape)
                const offset = 1 / (this.borders[i].hostedNodes.length + 1);
                this.borders[i].hostedNodes.forEach((node, j) => {
                    let p = this.viewObjects["shape"][i].getPoint(node.offset ? node.offset : offset * (j + 1));
                    p = new THREE.Vector3(p.x, p.y, 1);
                    copyCoords(node, this.host.translate(p));
                })
            }
        }

        //By doing the update here, we also support inner content in the region
        const lyphsToLinks = (lyphs) => (lyphs || []).filter(lyph => lyph.axis).map(lyph => lyph.axis);

        let hostedLinks   = lyphsToLinks(this.host.hostedLyphs);
        let internalLinks = lyphsToLinks(this.host.internalLyphs);

        hostedLinks.forEach((link) => { this.pushLinkInside(link); });
        let numCols = this.host.internalLyphColumns || 1;
        let numRows = internalLinks.length / numCols;
        internalLinks.forEach((link, i) => { this.placeLinkInside(link, i, numCols, numRows); });

         let center = getCenterOfMass(this.host.points);
        (this.host.internalNodes || []).forEach((node, i) => {
            this.placeNodeInside(node, i,
            this.host.internalNodes.length, center)
        });
    }
}