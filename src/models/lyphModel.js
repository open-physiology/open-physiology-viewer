import {Shape} from './shapeModel';
import {THREE, align, getCenterPoint, createMeshWithBorder, layerShape, lyphShape, d3Layer, d3Lyph} from '../three/utils';
import {copyCoords} from './utils';
import {isObject, isString,  merge, pick} from "lodash-bound";

export const LYPH_TOPOLOGY = {
    TUBE : "TUBE",
    BAG  : "BAG",
    BAG2 : "BAG2",
    CYST : "CYST"
};
/**
 * Class that creates visualization objects of lyphs
 * @class
 * @property topology
 * @property angle
 * @property scale
 * @property isTemplate
 * @property conveyedBy
 * @property layers
 * @property layerIn
 * @property internalIn
 * @property coalescesWith
 * @property prev
 * @property next
 *
 */
export class Lyph extends Shape {

    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        json.numBorders = 4;
        return super.fromJSON(json, modelClasses, entitiesByID);
    }

    /**
     * Generate new layers for subtypes and replicate template properties
     * @param lyphs - lyph set that contains target subtypes
     * @param template - lyph template
     */
    static expandTemplate(lyphs, template){
        if (!template || template.inactive || !lyphs) { return; }

        //Validate subtype
        (template.subtypes||[]).forEach(s => {
            if (s::isObject() && s.id && !lyphs.find(e => e.id === s.id)){
                lyphs.push(s); //generate a lyph for the template supertype
            }
        });
        //Template supertype must contain id's for correct generation
        template.subtypes = (template.subtypes||[]).map(e => e::isObject()? e.id: e);
        let subtypes = lyphs.filter(e => e.supertype === template.id || template.subtypes.includes(e.id));
        subtypes.forEach(subtype => this.clone(template, subtype, lyphs));

        template.inactive = true;
    }

    /**
     * Copy the properties and layer structure of the source lyph to the target lyph
     * @param sourceLyph - the lyph to clone
     * @param targetLyph - the cloned lyph instance
     * @param lyphs - a set of existing model/group lyphs
     * @returns {Lyph} the target lyph
     */
    static clone(sourceLyph, targetLyph, lyphs){
        if (!sourceLyph || !targetLyph) {return; }
        if (!lyphs) {lyphs = [];}
        targetLyph::merge(sourceLyph::pick(["color", "scale", "height", "width", "length", "thickness", "external"]));
        targetLyph.layers = [];
        (sourceLyph.layers || []).forEach(layerRef => {
            let layerParent = layerRef::isString()? lyphs.find(e => e.id === layerRef) : layerRef;
            if (!layerParent) {
                console.warn("Generation error: template layer object not found: ", layerRef);
                return;
            }
            let lyphLayer = { "id" : `${layerParent.id}_${targetLyph.id}` };
            lyphs.push(lyphLayer);
            if (layerParent.isTemplate){
                lyphLayer.supertype = layerParent.id;
            } else {
                lyphLayer.cloneOf = layerParent.id;
            }
            this.clone(layerParent, lyphLayer, lyphs);

            lyphLayer::merge(targetLyph::pick(["topology"]));
            targetLyph.layers.push(lyphLayer);
        });
        targetLyph.layers = targetLyph.layers.map(e => e.id);
        return targetLyph;
    }

    get radialTypes() {
        switch (this.topology) {
            case LYPH_TOPOLOGY.BAG  :
                return [true, false];
            case LYPH_TOPOLOGY.BAG2 :
                return [false, true];
            case LYPH_TOPOLOGY.CYST :
                return [true, true];
            case LYPH_TOPOLOGY.TUBE :
                return [false, false];
        }
        if (this.layerIn){
            return this.layerIn.radialTypes;
        }
        return [false, false];
    }

    get isVisible() {
        return super.isVisible && (this.layerIn ? this.layerIn.isVisible : true);
    }

    //lyph's center = the center of its rotational axis
    get center() {
        let res = new THREE.Vector3();
        //Note: Do not use lyph borders to compute center as border translation relies on this method
        if (this.layerIn && this.viewObjects["main"]) {
            //Note: it is difficult to compute center of a layer geometrically as we have to translate the host axis
            //in the direction orthogonal to the hosting lyph axis along the plane in which the lyph is placed
            //and it can be placed in any plane passing through the axis!
            res = getCenterPoint(this.viewObjects["main"]);
        } else {
            res = this.axis.center || res;
        }
        return res;
    }

    get axis() {
        return this.conveyedBy || ((this.layerIn)? this.layerIn.axis : null);
    }

    get polygonOffsetFactor() {
        return Math.min(
            ...["axis", "layerIn", "internalIn", "hostedBy"].map(prop => this[prop]?
                (this[prop].polygonOffsetFactor || 0) - 1: 0));
    }

    /**
     * Defines size of the conveying lyph based on the length of the link
     * @returns {{height: number, width: number}}
     */
    get size() {
        let res = {height: this.axis.length || 1, width: this.axis.length || 1};
        if (this.scale) {
            res.width  *= this.scale.width / 100;
            res.height *= this.scale.height / 100;
        }
        return res;
    }

    /**
     * Positions the point on the lyph surface
     * @param p0 - initial point (coordinates)
     * @returns {Vector3} transformed point (coordinates)
     */
    translate(p0) {
        let transformedLyph = this.layerIn ? this.layerIn : this;
        if (!p0 || !transformedLyph.viewObjects["main"]) { return p0; }
        let p = p0.clone();
        p.applyQuaternion(transformedLyph.viewObjects["main"].quaternion);
        p.add(transformedLyph.center);
        return p;
    }

    get points(){
        return (this._points||[]).map(p => this.translate(p));
    }

    get avgThickness(){
        let {min, max} = this.thickness || {"min" : 1, "max": 1};
        return ((min||1) + (max||1)) / 2;
    }

    get avgLength(){
        let {min, max} = this.length|| {"min" : 1, "max": 1};
        return ((min||1) + (max||1)) / 2;
    }

    get offset(){
        let offset = this.layerIn? this.layerIn.offset: 0;
        let curr = this.prev;
        while (curr) {
            offset += curr.width;
            curr = curr.prev;
        }
        return offset;
    }

    /**
     * Create view model for the class instance
     * @param state - layout settings
     */
    createViewObjects(state) {
        //Cannot draw a lyph without axis
        if (!this.axis) { return; }

        for (let i = 1; i < (this.layers || []).length; i++) {
            this.layers[i].prev = this.layers[i - 1];
            this.layers[i].prev.next = this.layers[i];
        }

        //Create a lyph object
        if (!this.viewObjects["main"]) {
            //Either use given dimensions or set from axis
            this.width = this.width || this.size.width;
            this.height = this.height || this.size.height;

            let params = {
                color: this.color,
                polygonOffsetFactor: this.polygonOffsetFactor
            };

            //The shape of the lyph depends on its position in its parent lyph as layer
            let offset = this.offset;
            let prev = this.prev || this.layerIn? (this.layerIn.prev || this): this;

            let obj = createMeshWithBorder(this.prev
                    ? layerShape(
                    [this.prev.width, prev.height, this.height / 4, ...this.prev.radialTypes],
                    [this.width, this.height, this.height / 4, ...this.radialTypes])
                    : lyphShape([this.width, this.height, this.height / 4, ...this.radialTypes]),
                params);
            obj.userData = this;
            this.viewObjects['main'] = this.viewObjects['2d'] = obj;

            if (this.create3d){
                params.opacity = 0.5;
                let obj3d = (offset > 0)
                    ? d3Layer(
                        [ offset || 1, prev.height,  this.height / 4, ...prev.radialTypes],
                        [ offset + this.width, this.height, this.height / 4, ...this.radialTypes], params)
                    : d3Lyph([this.width, this.height, this.height / 4, ...this.radialTypes], params) ;
                obj3d.userData = this;
                this.viewObjects["3d"] = obj3d;
                if (state.showLyphs3d){
                    this.viewObjects["main"] = this.viewObjects["3d"];
                }
            }

            this._points = [
                new THREE.Vector3(offset, -this.height / 2, 0),
                new THREE.Vector3(offset, this.height / 2, 0),
                new THREE.Vector3(offset + this.width, this.height / 2, 0),
                new THREE.Vector3(offset + this.width, -this.height / 2, 0),
                new THREE.Vector3(offset, -this.height / 2, 0)
            ];

            //Border uses corner points
            this.border.createViewObjects(state);

            //Layers
            //Define proportion each layer takes
            let numLayers = (this.layers || [this]).length;
            let resizedLayers = (this.layers || []).filter(layer => layer.layerWidth);
            let layerTotalWidth = 0;
            (resizedLayers || []).forEach(layer => layerTotalWidth += layer.layerWidth);
            let defaultWidth = (resizedLayers.length < numLayers) ?
                (100. - layerTotalWidth) / (numLayers - resizedLayers.length) : 0;

            let relOffset = 0;
            (this.layers || []).forEach(layer => {
                layer.create3d = this.create3d;
                layer.layerWidth = layer.layerWidth || defaultWidth;
                layer.width = layer.layerWidth / 100 * this.width;
                layer.height = this.height;
                layer.createViewObjects(state);
                let layerObj = layer.viewObjects["2d"];
                this.viewObjects["2d"].add(layerObj);
                layerObj.translateX(relOffset);
                relOffset += layer.width;

                let layerObj3d = layer.viewObjects["3d"];
                if (layerObj3d) {
                    this.viewObjects["3d"].add(layerObj3d);
                }
            });
        }
        //Do not create labels for layers and nested lyphs
        if (this.layerIn || this.internalIn) { return; }
        this.createLabels(state);
    }

    /**
     * Update position of the lyph and its inner content
     * @param state - view settings
     */
    updateViewObjects(state) {
        if (!this.axis) { return; }

        let viewObj = this.viewObjects["main"] = this.viewObjects["2d"];
        if (!viewObj) { this.createViewObjects(state); }

        if (state.showLyphs3d && this.viewObjects["3d"]){
            viewObj = this.viewObjects["main"] = this.viewObjects["3d"];
        }

        if (!this.layerIn) {//update label
            if (!this.internalIn) {
                if (!(this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])) {
                    this.createViewObjects(state);
                }
            }
            //update lyph
            viewObj.visible = this.isVisible && state.showLyphs;
            copyCoords(viewObj.position, this.center);
            align(this.axis, viewObj, this.axis.reversed);

            if (this.angle){
                viewObj.rotation.x = Math.PI * this.angle / 180;
            }
        } else {
            viewObj.visible = state.showLayers;
        }

        //update layers
        (this.layers || []).forEach(layer => layer.updateViewObjects(state));

        this.border.updateViewObjects(state);

        //Layers and inner lyphs have no labels
        if (this.layerIn || this.internalIn) { return; }

        this.updateLabels(state, this.center.clone().addScalar(-5));
    }
}
