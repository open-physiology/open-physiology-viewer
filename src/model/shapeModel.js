import {VisualResource} from './visualResourceModel';
import {clone, isObject, isString, keys, merge, pick} from 'lodash-bound';

export const LYPH_TOPOLOGY = {
    TUBE : "TUBE",
    BAG  : "BAG",
    BAG2 : "BAG2",
    CYST : "CYST"
};

/**
 * Class that specifies borders of lyphs and regions
 * @class
 * @property border
 * @property internalLyphs
 * @property internalNodes
 * @property internalLyphColumns
 * @property points
 * @property hostedLyphs
 */
export class Shape extends VisualResource {

    /**
     * Create a Shape resource from its JSON specification together with resources to model shape borders.
     * @param   {Object} json                          - resource definition
     * @param   {Object} [modelClasses]                - map of class names vs implementation of ApiNATOMY resources
     * @param   {Map<string, Resource>} [entitiesByID] - map of resources in the global model
     * @returns {Shape} - ApiNATOMY Shape resource
     */
    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        json.id     = json.id || ("new_" + entitiesByID
            ? entitiesByID::keys().length()
            : Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5));
        json.border = json.border || {};
        json.border.id = json.border.id || (json.id + "_border");
        json.border.borders = json.border.borders || {};
        for (let i = 0; i < json.numBorders ; i++){
            json.border.borders[i]::merge({"id": json.border.id + "_" + i});
        }
        delete json.numBorders;
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.border.host = res;
        return res;
    }

    // toggleBorder(){
    //     if (!this.viewObjects || !this.viewObjects['main']) { return; }
    //     if (this.viewObjects['border']){
    //         if (this.viewObjects['main'].children.find(this.viewObjects['border'])){
    //             this.viewObjects['main'].children.remove(this.viewObjects['border']);
    //         } else {
    //             this.viewObjects['main'].add(this.viewObjects['border']);
    //         }
    //     }
    // }
}

/**
 * Class that models lyphs
 * @class
 * @property topology
 * @property angle
 * @property scale
 * @property isTemplate
 * @property conveyedBy
 * @property layers
 * @property layerIn
 * @property internalIn
 * @property inCoalescences
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
        //TODO override to avoid endless recursion
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
    static clone(sourceLyph, targetLyph, lyphs, stack = []){
        if (!sourceLyph || !targetLyph) {return; }
        if (!lyphs) {lyphs = [];}
        targetLyph::merge(sourceLyph::pick(["color", "scale", "height", "width", "length", "thickness", "external", "comment"]));
        targetLyph.layers = [];
        //stack.push(sourceLyph.id);
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
            //if (!stack.includes(layerParent.id)) {
                this.clone(layerParent, lyphLayer, lyphs, stack);
            //}

            lyphLayer::merge(targetLyph::pick(["topology"]));
            targetLyph.layers.push(lyphLayer);
        });
        //stack.pop();
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

    get axis() {
        return this.conveyedBy || ((this.layerIn)? this.layerIn.axis : null);
    }

    get container(){
        return this.internalIn || this.layerIn && this.layerIn.internalIn;
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
}

/**
 * Class that models regions
 */
export class Region extends Shape {

    /**
     * Create a Region resource from its JSON specification.
     * The method checks and sets default values to the region corner points if they are undefined.
     * @param   {Object} json                          - resource definition
     * @param   {Object} [modelClasses]                - map of class names vs implementation of ApiNATOMY resources
     * @param   {Map<string, Resource>} [entitiesByID] - map of resources in the global model
     * @returns {Shape} - ApiNATOMY Shape resource
     */
    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        if (!json.points || json.points.length < 3) {
            json.points = [{"x": -10, "y": -10 },{"x": -10, "y": 10 },{"x": 10, "y": 10 },{"x": 10, "y": -10 }];
        }
        json.numBorders = json.points.length;
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.points.push(res.points[0]::clone()); //make closed shape
        return res;
    }
}

/**
 * The class defining the border of a shape (lyph or region)
 * @class
 * @property host
 * @property borders
 *
 */
export class Border extends VisualResource {
    get isVisible(){
        return super.isVisible && (this.host? this.host.isVisible: true);
    }
}


