import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { Model } from './model';
import { assign } from 'lodash-bound';
import { boundToRectangle, mergedGeometry, geometryDifference, align, direction, translate, copyCoords, getCenterPoint } from '../three/utils';
import { LINK_TYPES } from './linkModel';
import { BorderModel } from './borderModel';

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
function d2Layer(inner, outer, material){
    const [$thickness, $height, $radius, $top, $bottom] = inner;
    const [ thickness,  height,  radius,  top,  bottom] = outer;
    const shape = new THREE.Shape();
    shape.moveTo( 0, 0);
    //draw top of the preceding layer geometry
    if ($thickness) {
        if ($top){
            shape.lineTo( 0, $height / 2 - $radius);
            shape.quadraticCurveTo( 0, $height / 2, -$radius,  $height / 2);
        } else {
            shape.lineTo( 0, $height / 2);
        }
        shape.lineTo( -$thickness, $height / 2);
        shape.lineTo( -$thickness, height / 2);
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
        shape.lineTo( -$thickness, -height / 2);
        shape.lineTo( -$thickness, -$height / 2);
        if ($bottom){
            shape.lineTo( -$radius, -$height / 2);
            shape.quadraticCurveTo( 0, -$height / 2, 0,  -$height / 2 + $radius);
        } else {
            shape.lineTo( 0, -$height / 2);
        }
    }
    shape.lineTo( 0, 0);
    let layerGeometry = new THREE.ShapeBufferGeometry(shape);

    return new THREE.Mesh( layerGeometry, material );
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
function d2Lyph(outer, material){
    let [thickness,  height,  radius,  top,  bottom] = outer;
    let [$thickness,  $height,  $radius,  $top,  $bottom] = outer;

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

    return new THREE.Mesh( lyphGeometry, material);
}



/**
 * Class that creates visualization objects of lyphs
 */
export class LyphModel extends Model {
    //TODO there can be several axes for coalescing lyphs
    axis;
    layers;
    topology;
    border;

    //Visualization model
    lyphObjects;
    labelObjects;

    constructor(id) {
        super(id);
        this.fields.text.push ('topology');
        this.fields.objects.push('axis');
        this.fields.lists.push('layers');
        //this.fields.lists.push('coalescences');
    }

    toJSON() {
        let res = super.toJSON();
        res.layers   = this.layers && this.layers.forEach(layer => layer.id);
        res.axis     = this.axis && this.axis.id;
        res.topology = this.topology;
        res.border   = this.border.toJSON();
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Lyph";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties

        //Create lyph's border
        result.border             = result.border || {};
        result.border.id          = result.border.id || "b_" + result.id; //derive border id from lyph's id
        result.border.borderTypes = result.border.borderTypes || [false,...this.radialBorderTypes(result.topology), false];
        result.border             = BorderModel.fromJSON(result.border, modelClasses);
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

    get center(){
        //lyph's center = the center of its rotational axis
        let res = new THREE.Vector3();

        if (this.axis) {
            res = this.axis.center;
            if (this.offset) {
                translate(res, this.offset, this.parent.axis);
            }
            return res;
        }
        //if there is no axis, return the global position of the visualization object
        if (this.viewObjects["main"]){
            res.setFromMatrixPosition( this.viewObjects["main"].matrixWorld );
        }
        return res;
    }

    get polygonOffsetFactor(){
        if (this.container && this.container.material) {
            return this.container.material.polygonOffsetFactor - 2;
        }
        return (this.axis && this.axis.type !== LINK_TYPES.CONTAINER)? -3: 0;
    }

    /**
     * Create view model for the class instance
     * @param state - layout settings
     */
    createViewObjects(state){
        if (!this.axis) { return; }

        let {thickness, length} = this.axis.lyphSize;
        this.lyphObjects = this.lyphObjects || {};

        if (!this.lyphObjects[state.method]){
            let numLayers = (this.layers || [this]).length;
            this.width  = numLayers * thickness;
            this.height = length;
            if (!this.material) {

                this.material = state.materialRepo.createMeshBasicMaterial({
                    color: this.color,
                    polygonOffsetFactor: this.polygonOffsetFactor - 2
                });
                // this.material.visible = true; //Do not show overlaying lyph shape
            }

            let lyphObj = d2Lyph([this.width, this.height + 2 * numLayers, thickness / 2, ...this.border.radialTypes], this.material);
            lyphObj.__data = this;
            this.lyphObjects[state.method] = lyphObj;

            this.border.parentLyph  = this;
            this.border.createViewObjects(state);

            //Layers
            (this.layers || []).forEach((layer, i) => {
                if (!layer.material) {

                    layer.material = state.materialRepo.createMeshBasicMaterial({
                        color: layer.color,
                        polygonOffsetFactor: this.material.polygonOffsetFactor - 2
                    });

                }
                layer.width  = thickness;
                layer.height = length;

                layer.border.parentLyph  = layer;
                layer.border.createViewObjects(state);

                let layerObj;
                if (state.method === "3d"){
                    layerObj = d3Layer(
                        [ thickness * i + 1,       length,         thickness / 2, ...layer.border.radialTypes],
                        [ thickness * (i + 1) + 1, length + i * 2, thickness / 2, ...layer.border.radialTypes],
                        layer.material);
                } else {
                    //we do not call d2Lyph directly as we need to keep the border shape as well
                    layerObj = d2Layer(
                        [ thickness * i, length,         thickness / 2, ...layer.border.radialTypes],
                        [ thickness,     length + i * 2, thickness / 2, ...layer.border.radialTypes],
                        layer.material);
                    layerObj.translateX(thickness * i);
                }
                layerObj.__data = layer;
                layer.lyphObjects = layer.lyphObjects || {};
                layer.lyphObjects[state.method] = layerObj;
                layer.viewObjects["main"] = layer.lyphObjects[state.method];


                //Draw nested lyphs
                //TODO assign content to border and process in borderModel
                if (layer.content){
                    //TODO rewrite to derive rotational axis from data
                    let borderObjects  = layer.border.viewObjects["shape"];
                    if (borderObjects[3]){
                        //be default, content lyphs rotate around border #3, i.e., layer.borderObjects[3]
                        let source = borderObjects[3].getPoint(0);
                        let target = borderObjects[3].getPoint(1);

                        //TODO create a border class and make it a rotational axis
                        let contentLyphAxis = {
                            source: source,
                            target: target,
                            direction: direction(source, target),
                            center: (source.clone().add(target)).multiplyScalar(0.5),
                            lyphSize: {thickness: 0.33 * length, length: thickness}
                        };
                        layer.content.axis = contentLyphAxis;
                        //'content' and 'container' are the opposites for the "Contains" relationship
                        //TODO create a uniform mechanism to check at construction that both entities in a relationship refer each other
                        layer.content.container = layer;
                        layer.content.createViewObjects(state);
                        //TODO assign layer its own axis which is a parallel line to the link
                        layer.parent = this;
                        layer.offset = new THREE.Vector3(thickness * i, 0, 0);
                        const contentLyph = layer.content.lyphObjects[state.method];
                        layerObj.add(contentLyph);
                    }
                }
                lyphObj.add(layerObj);
            });
        }
        this.viewObjects['main']  = this.lyphObjects[state.method];

        //Labels
        this.labelObjects = this.labelObjects || {};
        if (!this.labelObjects[state.iconLabel] && this[state.iconLabel]){
            this.labelObjects[state.iconLabel] = new SpriteText2D(this[state.iconLabel], state.fontParams);
        }
        if (this.labelObjects[state.iconLabel]) {
            this.viewObjects['label'] = this.labelObjects[state.iconLabel];
        } else {
            delete this.viewObjects['label'];
        }
    }

    updateViewObjects(state){
        if (!this.axis) {return; }
        if (!this.lyphObjects[state.method] ||
            !(this.labelObjects[state.iconLabel] && this[state.iconLabel])){
            this.createViewObjects(state);
        }
        this.viewObjects['main']  = this.lyphObjects[state.method];

        //update lyph
        if (this.lyphObjects[state.method]){
            this.lyphObjects[state.method].visible = state.showLyphs;
            copyCoords(this.lyphObjects[state.method].position, this.center);
            align(this.axis, this.lyphObjects[state.method]);
        }

        //update border
        this.border.updateViewObjects(state);

        //update layers
        (this.layers || []).filter(layer => layer.content).forEach(layer => { layer.content.updateViewObjects(state); });

        //update inner content
        if (this.internalLyphs){
            const fociCenter = getCenterPoint(this.lyphObjects[state.method]) || this.center;
            state.graphData.links
                .filter(link =>  link.conveyingLyph && this.internalLyphs.includes(link.conveyingLyph.id))
                .forEach(link => {
                    if (link.conveyingLyph.material){
                        link.conveyingLyph.material.polygonOffsetFactor = this.material.polygonOffsetFactor - 1;
                    }
                    // copyCoords(link.source.layout, fociCenter);
                    // copyCoords(link.target.layout, fociCenter);
                    //If we need to clean these layout constraints, set some flag
                    // link.source.layout.reason = "container";
                    // link.target.layout.reason = "container";
                    let dx = 2 * link.lyphSize.thickness;

                    boundToRectangle(link.source, fociCenter, this.width/2 - dx, this.height);
                    boundToRectangle(link.target, fociCenter, this.width/2 - dx, this.height);

                    //Project links with innerLyphs to the container lyph plane
                    //if (state.method === "2d"){
                        let plane = new THREE.Plane();
                        let _start = new THREE.Vector3(this.axis.source.x, this.axis.source.y, this.axis.source.z || 0);
                        let _end = new THREE.Vector3(this.axis.target.x, this.axis.target.y, this.axis.target.z || 0);
                        plane.setFromCoplanarPoints(_start, _end, fociCenter);

                        let _linkStart = new THREE.Vector3(link.source.x, link.source.y, link.source.z || 0);
                        let _linkEnd = new THREE.Vector3(link.target.x, link.target.y, link.target.z || 0);

                        _linkStart  = plane.projectPoint ( _linkStart);
                        _linkEnd = plane.projectPoint ( _linkEnd );

                        copyCoords(link.source, _linkStart);
                        copyCoords(link.target, _linkEnd);
                    //}
                });
        }

        // this.material.visible = !state.showLayers;
        (this.viewObjects['main'].children || []).forEach(child => {child.visible = state.showLayers;});

        if (this.labelObjects[state.iconLabel]){
            this.viewObjects['label'] = this.labelObjects[state.iconLabel];
            this.viewObjects['label'].visible = state.showLyphLabel;
            copyCoords(this.viewObjects['label'].position, this.center);
            this.viewObjects['label'].position.addScalar(-5);
        } else {
            delete this.viewObjects['label'];
        }
    }
}
