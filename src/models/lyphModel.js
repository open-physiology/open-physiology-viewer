import * as three from 'three';
const THREE = window.THREE || three;
import { Entity } from './entityModel';
import { mergedGeometry, geometryDifference, align, extractCoords, copyCoords, getCenterPoint} from '../three/utils';
import { Border } from './borderModel';
import { LINK_TYPES } from './linkModel';
import { boundToPolygon, boundToRectangle } from './utils';


/**
 * Class that creates visualization objects of lyphs
 */
export class Lyph extends Entity {

    static fromJSON(json, modelClasses = {}, entitiesByID) {
        const result = super.fromJSON(json, modelClasses, entitiesByID);

        //Create lyph's border
        result.border.id          = result.border.id || "b_" + result.id; //derive border id from lyph's id
        result.border.borderTypes = result.border.borderTypes || [false,...this.radialBorderTypes(result.topology), false];
        result.border             = Border.fromJSON(result.border);
        return result;
    }

    static radialBorderTypes(topology){
        switch (topology) {
            case "BAG"  : return [true,  false];
            case "BAG2" : return [false, true];
            case "CYST" : return [true,  true];
        }
        return [false, false];
    }

    //lyph's center = the center of its rotational axis
    get center(){
        let res = new THREE.Vector3();
        //Note: Do not use lyph borders to compute center as border translation relies on this method
        if (this.layerInLyph && this.viewObjects["main"]) {
            //Note: it is difficult to compute center of a layer geometrically as we have to translate the host axis
            //in the direction orthogonal to the hosting lyph axis along the plane in which the lyph is placed
            //and it can be placed in any plane passing through the axis!
            res = getCenterPoint(this.viewObjects["main"]);
        } else {
            if (this.axis) { res = this.axis.center; }
        }
        return res;
    }

    get polygonOffsetFactor(){
        let res = 0;
        if (this.container)    { res = this.container.polygonOffsetFactor - 1; }
        if (this.layerInLyph)  { res = Math.min(res, this.layerInLyph.polygonOffsetFactor - 1); }
        if (this.belongsToLyph) { res = Math.min(res, this.belongsToLyph.polygonOffsetFactor - 1); }
        return res;
    }

    /**
     * Defines size of the conveying lyph based on the length of the link
     * @returns {{height: number, width: number}}
     */
    get size(){
        let res = {height: this.axis.length, width: this.axis.length};
        res.width  *= this.scale.width / 100;
        res.height *= this.scale.height / 100;
        return res;
    }

    translate(p0){
        let p = p0.clone();
        let transformedLyph = this.layerInLyph? this.layerInLyph: this;
        if (this.layerInLyph){
            p.x += this.offset;
        }
        p.applyQuaternion(transformedLyph.viewObjects["main"].quaternion);
        p.add(transformedLyph.center);

        //TODO Test for nested lyphs
        if (transformedLyph.container){ p = transformedLyph.container.translate(p); }
        return p;
    }

    /**
     * Create view model for the class instance
     * @param state - layout settings
     */
    createViewObjects(state){

        /**
         * Draws layer of a lyph in 3d. Closed borders are drawn as cylinders because sphere approximation is quite slow
         * @param inner = [$thickness, $height, $radius, $top, $bottom], where:
         * $thickness is axial border distance from the rotational axis
         * $height is axial border height
         * $radius is the radius for the circle for closed border
         * $top is a boolean value indicating whether top axial border is closed
         * $bottom is a boolean value indicating whether bottom axial border is closed
         * @param outer = [thickness,  height,  radius,  top,  bottom], where
         * thickness is non-axial border distance from the rotational axis
         * height is non-axial border height
         * radius is the radius for the circle for closed border
         * top is a boolean value indicating whether top non-axial border is closed
         * bottom is a boolean value indicating whether bottom non-axial border is closed
         * @param material - object material
         * @returns {THREE.Mesh} - a mesh representing layer (tube, bag or cyst)
         * @example
         * d3Layer([ layer.width * i + 1,       layer.height, layer.width / 2, ...layer.border.radialTypes],
         *         [ layer.width * (i + 1) + 1, layer.height, layer.width / 2, ...layer.border.radialTypes], layer.material);
         */
        function d3Layer(inner, outer, material){
            const [$thickness, $height, $radius, $top, $bottom] = inner;
            const [ thickness,  height,  radius,  top,  bottom] = outer;
            const a = 0.5;
            const b = 0.5 * (1 - a) ;
            //Cylinder constructor parameters: [radiusAtTop, radiusAtBottom, height, segmentsAroundRadius, segmentsAlongHeight]
            //Closed borders are approximated by cylinders with smaller diameters for speed

            let $tube      = new THREE.CylinderGeometry( $thickness, $thickness, a * $height, 10, 4);
            let $cupTop    = new THREE.CylinderGeometry( $top? $thickness - $radius: $thickness, $thickness, b * $height, 10, 4);
            let $cupBottom = new THREE.CylinderGeometry( $thickness, $bottom? $thickness - $radius: $thickness, b * $height, 10, 4);

            let tube       = new THREE.CylinderGeometry( thickness,  thickness,  a * height, 10, 4);
            let cupTop     = new THREE.CylinderGeometry( top? thickness - radius: thickness,  thickness,  b * height, 10, 4);
            let cupBottom  = new THREE.CylinderGeometry( thickness, bottom? thickness - radius: thickness,  b * height, 10, 4);

            let smallGeometry = mergedGeometry($tube, $cupTop, $cupBottom, (a + b) * 0.5 * $height);
            let largeGeometry = mergedGeometry(tube,   cupTop,  cupBottom, (a + b) * 0.5 * height);

            return geometryDifference(smallGeometry, largeGeometry, material);
        }

        /**
         * Draws layer of a lyph in 2d.
         * @param inner = [$thickness, $height, $radius, $top, $bottom], where:
         * $thickness is axial border distance from the rotational axis
         * $height is axial border height
         * $radius is the radius for the circle for closed border
         * $top is a boolean value indicating whether top axial border is closed
         * $bottom is a boolean value indicating whether bottom axial border is closed
         * @param outer = [thickness,  height,  radius,  top,  bottom], where
         * thickness is non-axial border distance from the rotational axis
         * height is non-axial border height
         * radius is the radius for the circle for closed border
         * top is a boolean value indicating whether top non-axial border is closed
         * bottom is a boolean value indicating whether bottom non-axial border is closed
         * @param material - object material
         * @returns {THREE.Mesh} - a mesh representing layer (tube, bag or cyst)
         */
        function d2Layer(inner, outer, material, borderMaterial){
            const [$thickness, $height, $radius, $top, $bottom] = inner;
            const [ thickness,  height,  radius,  top,  bottom] = outer;
            const shape = new THREE.Shape();
            shape.moveTo( 0, 0);
            //draw top of the preceding layer geometry
            if ($thickness) {
                if ($top){
                    shape.lineTo( 0, $height / 2 - $radius);
                    shape.quadraticCurveTo( 0, $height / 2, -$radius,  $height / 2);
                    shape.lineTo( -$thickness, $height / 2);
                    shape.lineTo( -$thickness, height / 2);
                } else {
                    shape.lineTo( 0, height / 2);
                }
            }

            //top of the current layer
            shape.lineTo( 0, height / 2);
            if (top){
                shape.lineTo( thickness - radius, height / 2);
                shape.quadraticCurveTo( thickness,  height / 2, thickness,  height / 2 - radius);
            } else {
                shape.lineTo( thickness,  height / 2);
            }

            //side and part of the bottom of the current layer
            if (bottom){
                shape.lineTo( thickness, -height / 2 + radius);
                shape.quadraticCurveTo( thickness, -height / 2, thickness - radius, -height / 2);
            } else {
                shape.lineTo( thickness, -height / 2);
            }
            shape.lineTo( 0, - height/2);

            //draw bottom of the preceding layer geometry
            if ($thickness){
                if ($bottom){
                    shape.lineTo(-$thickness, -height / 2);
                    shape.lineTo(-$thickness, -$height / 2);
                    shape.lineTo( -$radius, -$height / 2);
                    shape.quadraticCurveTo( 0, -$height / 2, 0,  -$height / 2 + $radius);
                } else {
                    shape.lineTo( 0, -height / 2);
                }
            }
            shape.lineTo( 0, 0);
            let layerGeometry = new THREE.ShapeBufferGeometry(shape);
            let layerMesh = new THREE.Mesh( layerGeometry, material );

            // Draw layer borders
            // first get points
            let lineBorderPoints = shape.getPoints();
            let lineBorderGeometry = new THREE.Geometry();

            lineBorderPoints.forEach(point => {
              point.z = 0;
              lineBorderGeometry.vertices.push(point);
            });

            let layerBorder = new THREE.Line(lineBorderGeometry, borderMaterial);
            return [layerMesh, layerBorder]
        }

        /**
         * Draw lyph shape without repeating the shape of the previous layer
         * @param outer = [thickness,  height,  radius,  top,  bottom], where
         * thickness is non-axial border distance from the rotational axis
         * height is non-axial border height
         * radius is the radius for the circle for closed border
         * top is a boolean value indicating whether top non-axial border is closed
         * bottom is a boolean value indicating whether bottom non-axial border is closed
         * @param material - object material
         * @returns {THREE.Mesh} - a mesh representing layer (tube, bag or cyst)
         */
        function d2Lyph(outer, material, borderMaterial){
            let [thickness, height, radius, top, bottom] = outer;

            const shape = new THREE.Shape();

            //Axial border
            shape.moveTo( 0, - height / 2);
            shape.lineTo( 0,   height / 2);

            //Top radial border
            if (top){
                shape.lineTo( thickness - radius, height / 2);
                shape.quadraticCurveTo( thickness,  height / 2, thickness,  height / 2 - radius);
            } else {
                shape.lineTo( thickness,  height / 2);
            }

            //Non-axial border
            if (bottom){
                shape.lineTo( thickness, - height / 2 + radius);
                shape.quadraticCurveTo( thickness, -height / 2, thickness - radius, -height / 2);
            } else {
                shape.lineTo( thickness, - height / 2);
            }

            //Finish Bottom radial border
            shape.lineTo( 0, - height / 2);

            let lyphGeometry = new THREE.ShapeBufferGeometry(shape);
            let lyphMesh = new THREE.Mesh( lyphGeometry, material); //Problem: we cannot get the lyph shape anymore

            // Draw layer borders
            // first get points
            let lineBorderPoints = shape.getPoints();
            let lineBorderGeometry = new THREE.Geometry();

            lineBorderPoints.forEach(point => {
              point.z = 0;
              lineBorderGeometry.vertices.push(point);
            });

            let lyphBorder = new THREE.Line(lineBorderGeometry, borderMaterial);

            return [lyphMesh, lyphBorder]
        }

        //Cannot draw a lyph without axis
        if (!this.axis) { return; }

        //Either use given dimensions or set from axis
        this.width  = this.width  || this.size.width;
        this.height = this.height || this.size.height;

        //There may be several objects representing a lyph, i.e., "2d" and "3d"
        this.viewObjects["lyphs"] = this.viewObjects["lyphs"] || {};

        //Create a lyph object corresponding to the view option defined by the state.method
        if (!this.viewObjects["lyphs"][state.method]){
            let numLayers = (this.layers || [this]).length;
            if (!this.material) {
                this.material = state.materialRepo.createMeshBasicMaterial({
                    color: this.color,
                    polygonOffsetFactor: this.polygonOffsetFactor
                });
            }

            this.borderMaterial = state.materialRepo.createLineBasicMaterial({
                color: this.color,
                linewidth: 3,
                opacity: 1
            });

            //Base width of one layer
            let thickness = this.width / numLayers;
            //The shape of the lyph depends on its position in its parent lyph as layer
            let [lyphObj, lyphBorder] = this.prev? d2Layer(
                    [ this.prev.width, this.prev.height, this.height / 4, ...this.prev.border.radialTypes],
                    [ this.width, this.height, this.height / 4, ...this.border.radialTypes],
                this.material, this.borderMaterial)
                : d2Lyph([this.width, this.height, this.height / 4, ...this.border.radialTypes], this.material, this.borderMaterial);

            lyphObj.__data = this;

            if (lyphBorder){ lyphObj.add( lyphBorder ); }

            this.viewObjects["lyphs"][state.method] = lyphObj;
            //This will be needed to create nested items
            this.viewObjects['main']  = this.viewObjects["lyphs"][state.method];

            this.border.borderInLyph  = this;
            this.border.createViewObjects(state);


            //Layers

            //Define proportion each layer takes
            let resizedLayers = (this.layers || []).filter(layer => layer.layerWidth);
            let layerTotalWidth = 0;
            (resizedLayers||[]).forEach(layer => layerTotalWidth += layer.layerWidth);
            let defaultWidth = (resizedLayers.length < numLayers)?
                (100. - layerTotalWidth) / (numLayers - resizedLayers.length): 0;

            //Link layers
            for (let i = 1; i < (this.layers || []).length; i++){
                this.layers[i].prev      = this.layers[i - 1];
                this.layers[i].prev.next = this.layers[i];
            }

            //Draw layers
            let offset = 0;
            (this.layers || []).forEach((layer, i) => {
                layer.axis   = this.axis;
                if (!layer.layerWidth) { layer.layerWidth = defaultWidth; }
                layer.width  = layer.layerWidth / 100 * this.width;
                layer.height = this.height;
                layer.layerInLyph = this;
                layer.offset = offset;
                offset += layer.width;
                layer.createViewObjects(state);
                let layerObj = layer.viewObjects["main"];
                layerObj.translateX(layer.offset);
                layerObj.translateZ(1);
                lyphObj.add(layerObj);
            });

            (this.internalNodes || []).forEach(node => {
                if (!state.graphData.nodes.find(n => n.id === node.id)){
                    //If internal node is not in the global graph, create visual objects for it
                    node.createViewObjects(state);
                    lyphObj.add(node.viewObjects["main"]);
                }
            })
        } else {
            this.viewObjects['main']  = this.viewObjects["lyphs"][state.method];
        }

        //Do not create labels for layers and nested lyphs
        if (this.layerInLyph || this.belongsToLyph){ return; }

        this.createLabels(state.labels[this.constructor.name], state.fontParams);
     }

    /**
     * Update positions of lyphs in the force-directed graph (and their inner content)
     * @param state - view settings
     */
    updateViewObjects(state){
        if (!this.axis) {return; }
        if (!this.viewObjects["lyphs"][state.method]){
            this.createViewObjects(state);
        }
        this.viewObjects['main']  = this.viewObjects["lyphs"][state.method];


        if (!this.layerInLyph) {//update label
            if (!this.belongsToLyph){
                if (!(this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])) {
                    this.createViewObjects(state);
                }
            }
            //update lyph
            this.viewObjects["main"].visible = (!this.hidden) && state.showLyphs;
            copyCoords(this.viewObjects["main"].position, this.center);
            align(this.axis, this.viewObjects["main"]);
        }

        //update layers
        (this.layers || []).forEach(layer => { layer.updateViewObjects(state); });

        //update inner content
        if (this.internalLyphs || this.internalNodes){
            const fociCenter = getCenterPoint(this.viewObjects["main"]);

            if (this.internalLyphs ) {
                let internalLinks = this.internalLyphs.filter(lyph => lyph.axis).map(lyph => lyph.axis);
                let N = internalLinks.length;

                internalLinks.forEach((link, i) => {
                    const delta = 5;

                    //TODO revise for the case container is nested
                    if (this.axis.type === LINK_TYPES.CONTAINER) {
                        //Global force pushes content on top of lyph
                        if (Math.abs(this.axis.target.z - this.axis.source.z) <= delta) {
                            //Faster way to get projection for lyphs parallel to x-y plane
                            link.source.z = this.axis.source.z + 1;
                            link.target.z = this.axis.target.z + 1;
                        } else {
                            //Project links with innerLyphs to the container lyph plane
                            let plane = new THREE.Plane();
                            let _start = extractCoords(this.axis.source);
                            let _end = extractCoords(this.axis.target);
                            plane.setFromCoplanarPoints(_start, _end, fociCenter);

                            let _linkStart = extractCoords(link.source);
                            let _linkEnd = extractCoords(link.target);
                            [_linkStart, _linkEnd].forEach(node => {
                                plane.projectPoint(node);
                                node.z += 1;
                            });
                            copyCoords(link.source, _linkStart);
                            copyCoords(link.target, _linkEnd);
                        }

                        if (Math.abs(this.axis.target.y - this.axis.source.y) <= delta) {
                            //The lyph rectangle is almost straight, we can quickly bound the content
                            boundToRectangle(link.source, fociCenter, this.width / 2, this.height / 2);
                            boundToRectangle(link.target, fociCenter, this.width / 2, this.height / 2);
                        } else {
                            //Roughly confine the links to avoid extreme link jumping
                            //Regardless of the rotation, the area is bounded to the center +/- hypotenuse / 2
                            const h = Math.sqrt(this.width * this.width + this.height * this.height) / 2;
                            boundToRectangle(link.source, fociCenter, h, h);
                            boundToRectangle(link.target, fociCenter, h, h);

                            //Push the link to the tilted lyph rectangle
                            boundToPolygon(link, this.border.borderLinks); //TODO find a better way to reset links violating boundaries
                        }
                    } else {
                        let p = extractCoords(this.border.borderLinks[0].source);
                        let p1 = extractCoords(this.border.borderLinks[0].target);
                        let p2 = extractCoords(this.border.borderLinks[1].target);
                        [p, p1, p2].forEach(p => p.z +=1 );
                        let dX = p1.clone().sub(p);
                        let dY = p2.clone().sub(p1);
                        let offsetX1 = dX.clone().multiplyScalar(i / N);
                        let offsetX2 = dX.clone().multiplyScalar((i + 1) / N);
                        let offsetY = dY.clone().multiplyScalar(i / N);
                        copyCoords(link.source, p.clone().add(offsetX1).add(offsetY));
                        copyCoords(link.target, p.clone().add(offsetX2).add(offsetY));
                    }
                });
            }

            (this.internalNodes || []).forEach(node => {
                copyCoords(node, fociCenter);
            });
        }

        //update border
        this.border.updateViewObjects(state);

        (this.viewObjects['main'].children || []).forEach(child => {child.visible = state.showLayers;});

        //Layers and inner lyphs have no labels
        if (this.layerInLyph || this.belongsToLyph) { return ; }

        if (!this.center){
            console.log("I HAVE NO CENTER: ", this);
        }

        this.updateLabels(state.labels[this.constructor.name], state.showLabels[this.constructor.name], this.center.clone().addScalar(-5));
    }
}
