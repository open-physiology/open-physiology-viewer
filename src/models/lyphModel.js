import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { Model } from './model';
import { assign } from 'lodash-bound';
import { d3Layer, d2Layer, d2Lyph, d2LyphBorders, align, direction, translate, copyCoords, getCenterPoint } from '../three/utils';
import { LINK_TYPES } from './linkModel';
import { BorderModel } from './borderModel';

export class LyphModel extends Model {
    //TODO there can be several axes for coalescing lyphs
    axis;
    layers;
    topology;
    borders = [];

    //Visualization model
    lyphObjects;
    borderObjects;
    labelObjects;

    constructor(id) {
        super(id);
        this.fields.text.push ('topology');
        this.fields.objects.push('axis');
        this.fields.lists.push('layers');
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
        if (!result.border){
            result.border = {
                id:   "b_" + result.id, //derive border id from lyph's id
                type: result.topology
            };
        }
        result.border = BorderModel.fromJSON(result.border, modelClasses);

        return result;
    }

    get borderTypes(){
        switch (this.topology) {
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
        if (this.container) {
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
            this.width = numLayers * thickness;
            this.height = length;
            if (!this.material) {
                this.material = state.materialRepo.createMeshBasicMaterial({
                    color: this.color,
                    polygonOffsetFactor: this.polygonOffsetFactor
                });
                this.material.visible = false; //Do not show overlaying lyph shape
            }
            let lyphObj = d2Lyph([this.width, this.height + 2 * numLayers, this.width / 2, ...this.borderTypes], this.material);
            lyphObj.__data = this;
            this.lyphObjects[state.method] = lyphObj;


            this.borderObjects  = d2LyphBorders([this.width, this.height + 2 * numLayers, this.width / 2, ...this.borderTypes]);

            //Layers
            (this.layers || []).forEach((layer, i) => {
                if (!layer.material) {
                    layer.material = state.materialRepo.createMeshBasicMaterial({
                        color: layer.color,
                        polygonOffsetFactor: this.material.polygonOffsetFactor - 1
                    });
                }
                layer.width  = thickness;
                layer.height = length;

                let layerObj;
                if (state.method === "3d"){
                    layerObj = d3Layer(
                        [ thickness * i + 1,       length,         thickness / 2, ...layer.borderTypes],
                        [ thickness * (i + 1) + 1, length + i * 2, thickness / 2, ...layer.borderTypes],
                        layer.material);
                } else {
                    //we do not call d2Lyph directly as we need to keep the border shape as well
                    layerObj = d2Layer(
                        [ thickness * i, length,         thickness / 2, ...layer.borderTypes],
                        [ thickness,     length + i * 2, thickness / 2, ...layer.borderTypes],
                        layer.material);
                    layerObj.translateX(thickness * i);
                }
                layerObj.__data = layer;
                layer.lyphObjects = layer.lyphObjects || {};
                layer.lyphObjects[state.method] = layerObj;
                layer.viewObjects["main"] = layer.lyphObjects[state.method];

                //We want straight parts of the borders for positioning lyphs
                //d2LyphBorders includes rounded corners for bags or cysts
                //to get straight lines, pass ...[false, false] instead of layer.borderTypes
                //TODO BorderModel should allow us to choose relevant parts of borders without this trick
                layer.borderObjects  = d2LyphBorders([thickness, length + i * 2, thickness / 2, false, false]);
                //...layer.borderTypes]);

                if (layer.content){
                    //TODO rewrite to derive rotational axis from data
                    if (layer.borderObjects[3]){
                        //be default, content lyphs rotate around border #3, i.e., layer.borderObjects[3]
                        let source = layer.borderObjects[3].getPoint(0);
                        let target = layer.borderObjects[3].getPoint(1);

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

        if (this.lyphObjects[state.method]){
            this.lyphObjects[state.method].visible = state.showLyphs;
            copyCoords(this.lyphObjects[state.method].position, this.center);
            align(this.axis, this.lyphObjects[state.method]);
        }

        //align inner content of layers
        (this.layers || []).filter(layer => layer.content).forEach(layer => {
            layer.content.updateViewObjects(state);
        });

        //position nodes on lyph border
        //TODO generalise to work recursively
        if (this.borderObjects){
            if (this.boundaryNodes){
                let quaternion = this.lyphObjects[state.method].quaternion;

                let boundaryNodes =  this.boundaryNodes.map(id => state.graphData.nodes.find(node => node.id === id))
                    .filter(node => !!node);
                for (let j = 0; j < 4; j++){
                    let nodesOnBorder = boundaryNodes.filter((node, i) => (this.boundaryNodeBorders[i] || 0) === j);
                    if (nodesOnBorder.length > 0){
                        let points = this.borderObjects[j].getSpacedPoints(nodesOnBorder.length + 1)
                            .map(p => new THREE.Vector3(p.x, p.y, 0));
                        points.forEach(p => {
                            //Shape transformation is affected also by the container lyph/layer
                            if (this.container){
                                let pQuaternion = this.container.lyphObjects[state.method].quaternion;
                                p.applyQuaternion(pQuaternion);
                            }
                            p.applyQuaternion(quaternion);

                            if (this.container){ p.add(this.container.center); }
                            p.add(this.center);
                        });

                        nodesOnBorder.forEach((node, i) => { copyCoords(node, points[i + 1]); });
                    }
                }
            }
        }
        if (this.internalLyphs){
            const fociCenter = getCenterPoint(this.lyphObjects[state.method]) || this.center;
            state.graphData.links
                .filter(link =>  link.conveyingLyph && this.internalLyphs.includes(link.conveyingLyph.id))
                .forEach(link => {
                    copyCoords(link.source.layout, fociCenter);
                    copyCoords(link.target.layout, fociCenter);

                    //Project links with innerLyphs to the container lyph plane

                    //if (state.method === "2d"){
                        let plane = new THREE.Plane();
                        let _start = new THREE.Vector3(this.axis.source.x, this.axis.source.y, this.axis.source.z || 0);
                        let _end = new THREE.Vector3(this.axis.target.x, this.axis.target.y, this.axis.target.z || 0);
                        plane.setFromCoplanarPoints(_start, _end, fociCenter);

                        let _linkStart = new THREE.Vector3(link.source.x, link.source.y, link.source.z || 0);
                        let _linkEnd = new THREE.Vector3(link.target.x, link.target.y, link.target.z || 0);

                        plane.projectPoint(link.source, _linkStart);
                        plane.projectPoint(link.target, _linkEnd);

                        // _linkStart  = plane.projectPoint(_linkStart);
                        // _linkEnd = plane.projectPoint(_linkEnd);
                        //
                        // copyCoords(link.source, _linkStart);
                        // copyCoords(link.target, _linkEnd);
                    //}
                });

            //TODO force internal nodes to stay inside of the container lyph instead of just attracting to its center
        }

        this.material.visible = !state.showLayers;
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
