import {VisualResource} from './visualResourceModel';
import {Node} from './verticeModel';
import {Link} from './edgeModel';
import {clone, merge, pick, isObject, mergeWith} from 'lodash-bound';
import {$LogMsg, logger} from './logger';
import {
    $Field,
    $Prefix,
    $Color,
    getGenID,
    getGenName,
    findResourceByID,
    getNewID,
    getID,
    LYPH_TOPOLOGY,
    mergeResources, $SchemaClass
} from './utils';

/**
 * Class that specifies borders of lyphs and regions
 * @class
 * @property border
 * @property points
 * @property internalLyphColumns
 * @property internalLyphs
 * @property internalLyphsInLayers
 * @property internalNodes
 * @property internalNodesInLayers
 * @property hostedLyphs
 */
export class Shape extends VisualResource {

    /**
     * Create a Shape resource from its JSON specification together with resources to model shape borders.
     * @param   {Object} json                          - resource definition
     * @param   {Object} [modelClasses]                - map of class names vs implementation of ApiNATOMY resources
     * @param   {Map<string, Resource>} [entitiesByID] - map of resources in the global model
     * @param   {String} namespace
     * @returns {Shape} - ApiNATOMY Shape resource
     */
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.id     = json.id || getNewID(entitiesByID);
        json.border = json.border || {};
        json.border.id = json.border.id || getGenID($Prefix.border, json.id);
        json.border.borders = json.border.borders || [];
        for (let i = 0; i < json.numBorders; i++){
            let id = getGenID(json.border.id, i);
            json.border.borders[i]::merge({
                [$Field.id]       : id,
                [$Field.source]   : { id: getGenID($Prefix.source, id) },
                [$Field.target]   : { id: getGenID($Prefix.target, id) },
                [$Field.geometry] : VisualResource.LINK_GEOMETRY.INVISIBLE,
                [$Field.skipLabel]: true,
                [$Field.generated]: true
            });
        }
        delete json.numBorders;
        let res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        res.border.host = res;
        return res;
    }
}

/**
 * Class that models lyphs
 * @class
 * @property topology
 * @property angle
 * @property scale
 * @property isTemplate
 * @property supertype
 * @property subtypes
 * @property conveys
 * @property layers
 * @property layerIn
 * @property internalIn
 * @property inMaterials
 * @property inCoalescences
 * @property bundles
 * @property bundlesChains
 * @property prev
 * @property next
 * @property villus
 * @property width
 * @property height
 * @property length
 * @property thickness
 * @property fasciculatesIn
 * @property internalNodesInLayers
 */
export class Lyph extends Shape {
    /**
     * @property TUBE
     * @property BAG
     * @property BAG2
     * @property CYST
     */
    static LYPH_TOPOLOGY = LYPH_TOPOLOGY;

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.numBorders = 4;
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    /**
     * Generate new layers for subtypes and replicate template properties
     * @param lyphs - lyph set that contains target subtypes
     * @param template - lyph template
     */
    static expandTemplate(lyphs, template){
        if (!template || template._inactive || !lyphs) { return; }

        //Validate subtype
        (template.subtypes||[]).forEach(s => {
            if (s::isObject() && s.id && !lyphs.find(e => e.id === s.id)){
                lyphs.push(s); //generate a lyph for the template supertype
            }
        });
        //Template supertype must contain id's for correct generation
        template.subtypes = (template.subtypes||[]).map(e => e::isObject()? e.id: e);
        let subtypes = lyphs.filter(e => e.supertype === template.id || template.subtypes.includes(e.id));
        subtypes.forEach(subtype => this.clone(lyphs, template, subtype));

        template._inactive = true;
    }

    /**
     * Copy the properties and layer structure of the source lyph to the target lyph
     * @param lyphs      - a set of existing model/group lyphs
     * @param sourceLyph - the lyph to clone
     * @param targetLyph - the cloned lyph instance
     * @returns {Lyph} the target lyph
     */
    static clone(lyphs, sourceLyph, targetLyph){
        if (!sourceLyph) { return; }
        if (sourceLyph === targetLyph){
            logger.warn($LogMsg.LYPH_SELF, sourceLyph);
            return;
        }

        targetLyph = targetLyph || {};
        if (!lyphs) {lyphs = [];}
 
        if (sourceLyph.supertype && (sourceLyph.layers||[]).length === 0){
            //expand the supertype - the sourceLyph may need to get its layers from the supertype first
            let supertype = findResourceByID(lyphs, sourceLyph.supertype);
            if (supertype && supertype.isTemplate){
                this.expandTemplate(lyphs, supertype);
            }
        }

        targetLyph::mergeWith(sourceLyph::pick([$Field.color, $Field.scale, $Field.height, $Field.width, $Field.length,
            $Field.thickness, $Field.description, $Field.create3d, $Field.materials, $Field.channels, $Field.bundlesChains]),
            mergeResources);

        if (sourceLyph.isTemplate){
            targetLyph.supertype = sourceLyph.id;
            //Clone template villus object into all subtype lyphs
            //TODO test
            if (sourceLyph.villus){
                targetLyph.villus = sourceLyph.villus::clone();
                if (targetLyph.villus.id){
                    targetLyph.villus.id = getGenID(targetLyph.id, $Prefix.villus, targetLyph.villus.id)
                }
                if (targetLyph.villus.villusOf){
                    targetLyph.villus.villusOf = targetLyph.id || targetLyph;
                }
            }
        } else {
            targetLyph.cloneOf = sourceLyph.id;
        }

        if (!targetLyph.name) {
            targetLyph.name = getGenName(sourceLyph.name);
        }

        if ((targetLyph.layers||[]).length > 0) {
            logger.warn($LogMsg.LYPH_SUBTYPE_HAS_OWN_LAYERS, targetLyph);
        }

        (sourceLyph.layers || []).forEach((layerRef, i) => {
            let sourceLayer = findResourceByID(lyphs, layerRef);
            if (!sourceLayer) {
                logger.warn($LogMsg.LYPH_NO_TEMPLATE_LAYER, layerRef);
                return;
            }

            let targetLayer = {};
            const n = (targetLyph.layers||[]).length;
            if (n > i){
                targetLayer = targetLyph.layers[i];
            }
            targetLayer = targetLayer::merge({
                [$Field.id]        : getGenID(sourceLayer.id, targetLyph.id, i+1),
                [$Field.name]      : getGenName(sourceLayer.name || '?', "in", targetLyph.name || '?', "layer", i+1),
                [$Field.skipLabel] : true,
                [$Field.generated] : true
            });
            lyphs.push(targetLayer);
            this.clone(lyphs, sourceLayer, targetLayer);

            targetLayer::merge(targetLyph::pick([$Field.topology]));
            targetLyph.layers = targetLyph.layers || [];
            targetLyph.layers.push(targetLayer.id);
        });

        return targetLyph;
    }

    /**
     * Assign internal resources to generated lyph layers
     * @param lyphs
     */
    static mapInternalResourcesToLayers(lyphs){

        function moveResourceToLayer(resourceIndex, layerIndex, lyph, prop){
            if (layerIndex < lyph.layers.length){
                let layer = findResourceByID(lyphs, lyph.layers[layerIndex]);
                if (layer){
                    layer[prop] = layer[prop] || [];
                    let internalID = getID(lyph[prop][resourceIndex]);
                    if (internalID && !layer[prop].find(x => x === internalID)){
                        layer[prop].push(internalID);
                    }
                    logger.info($LogMsg.RESOURCE_TO_LAYER, internalID, layer.id, prop, layer[prop]);
                    lyph[prop][resourceIndex] = null;
                } else {
                    logger.warn($LogMsg.LYPH_INTERNAL_NO_LAYER, lyph, layerIndex, lyph.layers[layerIndex]);
                }
            } else {
                logger.warn($LogMsg.LYPH_INTERNAL_OUT_RANGE, layerIndex, lyph.layers.length, lyph.id, resourceIndex);
            }
        }

        function processLyphs(key1, key2){
            (lyphs||[]).forEach(lyph => {
                if (lyph.layers && lyph[key1] && lyph[key2]) {
                    for (let i = 0; i < Math.min(lyph[key1].length, lyph[key2].length); i++) {
                        moveResourceToLayer(i, lyph[key2][i], lyph, $Field.internalLyphs);
                    }
                    lyph[key1] = lyph[key1].filter(x => !!x);
                }
            });
        }

        processLyphs($Field.internalLyphs, $Field.internalLyphsInLayers);
        processLyphs($Field.internalNodes, $Field.internalNodesInLayers);
    }

    collectInheritedExternals(){
        const externals = this.inheritedExternal || [];
        const ids = externals.map(x => x.id);
        let curr = this.supertype;
        while (curr){
            (curr.external||[]).forEach(e => {
                if (!ids.includes(e.id)){
                    externals.push(e);
                    ids.push(e.id);
                }
            });
            curr = curr.supertype;
        }
        if (externals.length > 0){
            this.inheritedExternal = externals;
        }
    }

    /**
     * Get border types based on the lyph's topology
     * @returns {Array}
     */
    get radialTypes() {
        switch (this.topology) {
            case Lyph.LYPH_TOPOLOGY["BAG-"]:
            case Lyph.LYPH_TOPOLOGY.BAG  :
                return [true, false];
            case Lyph.LYPH_TOPOLOGY["BAG+"]:
            case Lyph.LYPH_TOPOLOGY.BAG2 :
                return [false, true];
            case Lyph.LYPH_TOPOLOGY.CYST :
                return [true, true];
            case Lyph.LYPH_TOPOLOGY.TUBE :
                return [false, false];
        }
        if (this.layerIn){
            return this.layerIn.radialTypes;
        }
        return [false, false];
    }

    /**
     * Get lyph visibility
     * @returns {boolean}
     */
    get isVisible() {
        return super.isVisible &&
            (this.layerIn && this.layerIn.isVisible || this.conveys && this.conveys.isVisible); //either a visible layer or must convey a visible link
    }

    /**
     * Get lyph axis
     * @returns {Link}
     */
    get axis() {
        return this.conveys || ((this.layerIn)? this.layerIn.axis : null);
    }

    get host() {
        return (this.conveys && this.conveys.fasciculatesIn) || this.internalIn; // || this.hostedBy;
    }

    get container(){
        return this.internalIn || this.layerIn && this.layerIn.internalIn;
    }

    get allContainers(){
        let res = [this];
        if (this.layerIn) {
            res = res.concat(this.layerIn.allContainers);
        }
        if (this.internalIn){
            res = res.concat(this.internalIn.allContainers);
        }
        (this.inMaterials||[]).forEach(materialIn => {
            res = res.concat(materialIn.allContainers);
        });
        
        return res;
    }

    /**
     * Defines size of the conveying lyph based on the length of the link
     * @returns {{height: number, width: number}}
     */
    get sizeFromAxis() {
        const length = this.axis && this.axis.length || 10;
        let res = {width: length, height: length};
        this.scale = this.scale || {
            [$Field.width] : 40,
            [$Field.height]: 80
        }
        res.width  *= (this.scale.width / 100);
        res.height *= (this.scale.height / 100);
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
sh
    updateSize(){
        const size = this.sizeFromAxis;
        [$Field.width, $Field.height].forEach(prop => this[prop] = this[prop] || size[prop]);
        if (this.host){
            //inside of other lyph
            const hostSize = this.host.sizeFromAxis;
            const maxWidth = this.host.width || hostSize.width;
            if (this.width > maxWidth){
                this.width = maxWidth;
            }
            //If host is a layer, make sure lyph width does not exceed the layer's width
            // if (this.host.layerIn){
            //     this.width /= this.host.layerIn.layers.length;
            // }
            //Lyph cannot be bigger than 95% of its host lyph
            [$Field.width, $Field.height].forEach(prop => {
                let val = 0.95 * (this.host[prop] || hostSize[prop]);
                this[prop] = Math.min(this[prop], val);
            });
        }
    }

    includeRelated(group){
        (this.layers||[]).forEach(layer => {
            layer.includeRelated(group);
        });
        (this.internalLyphs||[]).forEach(internal => {
            if (!group.lyphs.find(e => e.id === internal.id)){
                group.lyphs.push(internal);
                if (internal.conveys){
                    group.links.push(internal.conveys);
                    internal.conveys.includeRelated(group);
                }
                internal.includeRelated(group);
            }
        });
        (this.internalNodes||[]).forEach(internal => {
            if (!(group.nodes||[]).find(e => e.id === internal.id)){
                group.nodes.push(internal);
                (internal.clones||[]).forEach(clone => {
                    group.nodes.push(clone);
                });
            }
        });
    }

    createAxis(modelClasses, entitiesByID, namespace) {
        let [sNode, tNode] = [$Prefix.source, $Prefix.target].map(prefix => (
            Node.fromJSON({
                [$Field.id]        : getGenID(prefix, this.id),
                [$Field.color]     : $Color.Node,
                [$Field.val]       : this.internalIn? 0.1: 1,
                [$Field.skipLabel] : true,
                [$Field.generated] : true,
                [$Field.invisible] : true
            }, modelClasses, entitiesByID, namespace)));

        let link = Link.fromJSON({
            [$Field.id]           : getGenID($Prefix.link, this.id),
            [$Field.source]       : sNode.id,
            [$Field.target]       : tNode.id,
            [$Field.geometry]     : Link.LINK_GEOMETRY.INVISIBLE,
            [$Field.conveyingLyph]: this.id,
            [$Field.skipLabel]    : true,
            [$Field.generated]    : true
        }, modelClasses, entitiesByID, namespace);

        if (this.internalIn) {
            link.geometry = Link.LINK_GEOMETRY.INVISIBLE;
            link.applyToEndNodes(end => end.color = $Color.InternalNode);
        }

        link.source.sourceOf = [link];
        link.target.targetOf = [link];
        this.conveys = link;

        return link;
    }

    assignAxisLength() {
        if (!this.axis){
            logger.warn($LogMsg.GRAPH_LYPH_NO_AXIS, this);
            return;
        }
        let container = this.container;
        if (container) {
            if (container.axis) {
                if (!container.axis.length) {
                    container.assignAxisLength();
                }
                this.axis.length = container.axis.length * 0.8;
            } else {
                //TODO lyph can be internal in a region - dynamically compute length based on region width or length
            }
            this.axis.length = this.axis.length || 10;
        }
    }

    /**
     * Determine whether the lyph has a common supertype with a given lyph
     * @param lyph
     * @returns {*}
     */
    static hasCommonTemplateWith(lyph){
        if (!lyph) { return false; }
        if (this === lyph)  { return true; }
        if (this.generatedFrom && this.generatedFrom === lyph.generatedFrom) { return true; }
        let res = false;
        if (this.supertype) {
            res = this.supertype.hasCommonTemplateWith(lyph);
        }
        if (!res && this.cloneOf){
            res = this.cloneOf.hasCommonTemplateWith(lyph);
        }
        if (!res && lyph.supertype){
            res = this.hasCommonTemplateWith(lyph.supertype);
        }
        if (!res && lyph.cloneOf){
            res = this.hasCommonTemplateWith(lyph.cloneOf);
        }
        return res;
    }

}

/**
 * Class that models regions
 * @class
 * @property facets
 * @property borderAnchors
 * @property internalAnchors
 * @property internalRegions
 * @property internalIn
 * @property hostedGroup
 */
export class Region extends Shape {

    /**
     * Create a Region resource from its JSON specification.
     * The method checks and sets default values to the region corner points if they are undefined.
     * @param {Object} json                          - resource definition
     * @param {Object} [modelClasses]                - map of class names vs implementation of ApiNATOMY resources
     * @param {Map<string, Resource>} [entitiesByID] - map of resources in the global model
     * @param {String} namespace                     - model namespace
     * @returns {Shape} - ApiNATOMY Shape resource
     */
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.points = json.points || [
            {"x": -10, "y": -10 },
            {"x": -10, "y":  10 },
            {"x":  10, "y":  10 },
            {"x":  10, "y": -10 }
        ];
        json.numBorders = json.points.length;
        let res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        res.points.push(res.points[0]::clone()); //make closed shape
        return res;
    }

    static validateTemplate(json, template){
        if (template.facets){
            template.points = [];
            template.facets.forEach(wireRef => {
                let wire = findResourceByID(json.wires, wireRef);
                if (!wire || !wire.source || !wire.target){
                    logger.warn($LogMsg.REGION_FACET_ERROR, wire);
                    return;
                }
                let sourceAnchor = findResourceByID(json.anchors, wire.source);
                let targetAnchor = findResourceByID(json.anchors, wire.target);
                if (!sourceAnchor || !targetAnchor){
                    logger.warn($LogMsg.REGION_FACET_NO_ANCHORS, wire.source, wire.target);
                    return;
                }
                if (!sourceAnchor.layout || !targetAnchor.layout){
                    logger.warn($LogMsg.REGION_FACET_NO_LAYOUT, wire.source, wire.target);
                }
            });
        }
    }

    static reduceGroupTemplate(json, template){
        [$Field.facets, $Field.borderAnchors, $Field.internalAnchors].forEach(prop => {
            if ((template[prop] || []).length > 0) {
                logger.warn($LogMsg.REGION_IN_GROUP_TEMPLATE, prop, json && json.id, template.id, template[prop]);
            }
            delete template[prop];
        });
    }

    static expandTemplate(json, template){
        if (!template::isObject()){
            logger.error($LogMsg.RESOURCE_NO_OBJECT, template);
            return;
        }
        template.id = template.id || getGenID(json.id, (json.regions||[]).length);
        let anchors = [];
        if (!template.borderAnchors) {
            //generate border anchors from points
            (template.points||[]).forEach((p, i) => {
                anchors.push({
                    [$Field.id]: getGenID($Prefix.anchor, template.id, i),
                    [$Field.layout]: p::clone(),
                    [$Field.skipLabel]: true,
                    [$Field.generated]: true
                });
            });
            json.anchors = json.anchors || [];
            json.anchors.push(...anchors);
            template.borderAnchors = anchors.map(e => e.id);
        } else {
            anchors = template.borderAnchors.map(e => findResourceByID(e)).filter(e => !!e);
        }
        if (!template.facets) {
            //generate facets from border anchors
            if (anchors.length < 3){
                logger.error($LogMsg.REGION_BORDER_ERROR, template.id);
                return;
            }
            let wires = [];
            for (let i = 1; i < anchors.length + 1; i++) {
                wires.push({
                    [$Field.id]: getGenID($Prefix.wire, template.id, i),
                    [$Field.source]: anchors[i - 1].id,
                    [$Field.target]: anchors[i % anchors.length].id,
                    [$Field.color]: $Color.Link,
                    [$Field.skipLabel]: true,
                    [$Field.generated]: true
                });
            }
            json.wires = json.wires || [];
            json.wires.push(...wires);
            template.facets = wires.map(e => e.id);
        } else {
            //assign border anchors from facets
            template.borderAnchors = template.borderAnchors || [];
            if (template.borderAnchors.length > 0){
                logger.warn($LogMsg.REGION_CONFLICT, template.id);
                template.borderAnchors = [];
            }
            (template.facets||[]).forEach(facet => {
                const f = findResourceByID(json.wires, facet);
                const s = findResourceByID(json.anchors, f.source);
                const t = findResourceByID(json.anchors, f.target);
                s && t && template.borderAnchors.push(getID(s)) && template.borderAnchors.push(getID(t));
            });
            template.borderAnchors = [... new Set(template.borderAnchors)];
            //TODO add test to check that borderAnchors -> facets and facets -> borderAnchors always auto-complete correctly
            //logger.info($LogMsg.REGION_BORDER_ANCHORS, template.id, template.borderAnchors);
        }
    }

    includeRelated(component){
        (this.facets||[]).forEach(facet => {
            if (!facet || facet.class !== $SchemaClass.Wire){ return; }
            if (!(component.wires||[]).find(e => e.id === facet.id)){
                component.wires.push(facet);
                facet.includeRelated(component);
            }
        });
        (this.internalAnchors||[]).forEach(internal => {
            if (!internal || internal.class !== $SchemaClass.Anchor){ return; }
            if (!(component.anchors||[]).find(e => e.id === internal.id)){
                component.anchors.push(internal);
            }
        });
    }

    //
    // get longestFacet() {
    //     if (!this._longestFacet) {
    //         let index = -1;
    //         let length = -1;
    //         for (let i = 0; i < (this.facets || []).length; i++) {
    //             let fLength = this.facets[i].length;
    //             if (fLength > length) {
    //                 index = i;
    //                 length = fLength;
    //             }
    //         }
    //         this._longestFacet = (index >= 0) ? this.facets[index] : null;
    //     }
    //     return this._longestFacet;
    // }
    //
    // get sizeFromAxis() {
    //     return {[$Field.width]: this.width, [$Field.height]: this.height};
    // }
    //
    // get height(){
    //     if (!this._height) {
    //         const h = this.longestFacet;
    //         this._height = (h && h.length) || 10;
    //     }
    //     return this._height;
    // }
    //
    // get width(){
    //     if (!this._width) {
    //         const h = this.longestFacet;
    //         if (h) {
    //             //wires adjacent to the longest facet
    //             const w1 = h.source.targetOf && h.source.targetOf[0];
    //             const w2 = h.target.sourceOf && h.target.sourceOf[0];
    //             if (w1 && w2) {
    //                 this._width = (w1.length + w2.length) / 200; // TODO fix this - compute width for any scaleFactor
    //             }
    //         } else {
    //             this._width = 10;
    //         }
    //     }
    //     return this._width;
    // }
    //
    // updateSize(){
    //     //TODO resize region to fit into hosting region
    // }
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
        return this.host? this.host.isVisible: super.isVisible;
    }
}
