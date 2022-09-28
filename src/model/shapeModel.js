import {VisualResource} from './visualResourceModel';
import {Node} from './verticeModel';
import {Edge, Link} from './edgeModel';
import {clone, merge, pick, isObject, mergeWith, values, keys} from 'lodash-bound';
import {$LogMsg, logger} from './logger';
import {
    LYPH_TOPOLOGY,
    $Field,
    $Prefix,
    $Default,
    $Color,
    $SchemaClass,
    getGenID,
    getNewID,
    getGenName,
    getID,
    mergeResources,
    refToResource,
    getFullID,
    mergeGenResource,
    genResource
} from './utils';
import tinycolor from "tinycolor2";

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
 * @property internalIn
 * @property internalInLayer
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
        json.border = json.border || {
            [$Field.borders]   : []
        };
        json.border.id = json.border.id || getGenID($Prefix.border, json.id);
        for (let i = 0; i < json.border.borders.length; i++) {
            const id = getGenID(json.border.id, i);
            json.border.borders[i]::merge({
                [$Field.id]       : id,
                [$Field.class]    : (json.class === $SchemaClass.Region)? $SchemaClass.Wire: $SchemaClass.Link,
                [$Field.source]   : {id: getGenID($Prefix.source, id)},
                [$Field.target]   : {id: getGenID($Prefix.target, id)},
                [$Field.geometry] : Edge.EDGE_GEOMETRY.INVISIBLE,
                [$Field.skipLabel]: true
            });
            json.border.borders[i] =  genResource(json.border.borders[i], "shapeModel.fromJSON (Link)");
        }
        json.border =  genResource(json.border, "shapeModel.fromJSON (Border)");
        let res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        res.border.host = res;
        return res;
    }
}

/**
 * Class that models lyphs
 * @class
 * @property chainTopology
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
 * @property endBbundles
 * @property bundlesChains
 * @property prev
 * @property next
 * @property villus
 * @property width
 * @property height
 * @property length
 * @property thickness
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
        json.class = $SchemaClass.Lyph;
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    /**
     * Generate new layers for subtypes and replicate template properties
     * @param parentGroup
     * @param template - lyph template
     */
    static expandTemplate(parentGroup, template){
        if (!template || template._inactive || !parentGroup) { return; }

        //If subtypes contain resource definitions, include them to the group's list of lyphs
        (template.subtypes||[]).forEach(s => {
            if (s::isObject() && s.id && !refToResource(s.id, parentGroup, $Field.lyphs)){
                parentGroup.lyphs.push(s); //generate a lyph for the template subtype
                parentGroup.lyphsByID[getFullID(parentGroup.namespace, s.id)] = s;
            }
        });

        //Template supertype must contain id's for correct generation
        template.subtypes = (template.subtypes||[]).map(e => getID(e));

        (parentGroup.lyphsByID || {})::values().forEach(e => {
            //Revised to avoid duplication of generated lyph templates with the same name in different namespaces:
            //e.g, in 'wbkgSpleen' lyph templates 'mat_mat-myenteric-plexus' are generated for both 'wbkg' and 'spleen'
            if (getFullID(e.namespace, e.supertype) === template.fullID &&
                !template.subtypes.includes(e.id) && !template.subtypes.includes(e.fullID)) {
                template.subtypes.push(e.fullID || e.id);
            }
        });

        let subtypes = [];
        template.subtypes.forEach(ref => {
            let lyph = refToResource(ref, parentGroup, $Field.lyphs);
            if (lyph){
                subtypes.push(lyph);
            } else {
                logger.error($LogMsg.LYPH_SUBTYPE_NOT_FOUND, template.namespace, template.id, ref);
            }
        });
        subtypes.forEach(subtype => this.clone(parentGroup, template, subtype));
        template._inactive = true;
    }

    /**
     * Copy the properties and layer structure of the source lyph to the target lyph
     * @param parentGroup
     * @param sourceLyph - the lyph to clone
     * @param targetLyph - the cloned lyph instance
     * @returns {Lyph} the target lyph
     */
    static clone(parentGroup, sourceLyph, targetLyph){
        if (!sourceLyph) { return; }
        if (sourceLyph === targetLyph || sourceLyph.id === targetLyph.id){
            logger.error($LogMsg.LYPH_SELF, sourceLyph);
            return;
        }

        targetLyph = targetLyph || genResource({}, "shapeModel.clone.0 (Lyph)");

        if (!parentGroup.lyphs) {parentGroup.lyphs = [];}

        if (sourceLyph.supertype && (sourceLyph.layers||[]).length === 0){
            //expand the supertype - the sourceLyph may need to get its layers from the supertype first
            //FIXME supertype in another namespace?
            let supertype = refToResource(sourceLyph.supertype, parentGroup, $Field.lyphs);
            if (supertype && supertype.isTemplate){
                this.expandTemplate(parentGroup, supertype);
            }
        }

        targetLyph::mergeWith(sourceLyph::pick([$Field.color, $Field.scale, $Field.height, $Field.width, $Field.length,
            $Field.thickness, $Field.scale, $Field.description, $Field.create3d, $Field.namespace,
                $Field.materials, $Field.channels, $Field.bundlesChains]), mergeResources);
        //If targetLyph is from different namespace, add namespace to default materials
        if (targetLyph.namespace !== sourceLyph.namespace){
            [$Field.materials, $Field.channels, $Field.bundlesChains].forEach(prop => {
                if (targetLyph[prop]) {
                    targetLyph[prop] = targetLyph[prop].map(m => getFullID(sourceLyph.namespace, m));
                }
            });
        }

        if (sourceLyph.isTemplate){
            if (!targetLyph.supertype) {
                targetLyph.supertype = sourceLyph.fullID || sourceLyph.id;
            }
            //Clone template villus object into all subtype lyphs
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
            if (!targetLyph.cloneOf) {
                targetLyph.cloneOf = sourceLyph.fullID || sourceLyph.id;
            }
        }

        targetLyph.name = targetLyph.name || getGenName(sourceLyph.name);

        if ((targetLyph.layers||[]).length > 0 && (sourceLyph.layers||[]) > 0) {
            logger.warn($LogMsg.LYPH_SUBTYPE_HAS_OWN_LAYERS, targetLyph);
        }

        let missingLayers = [];
        (sourceLyph.layers || []).forEach((layerRef, i) => {
            let nm = sourceLyph.namespace || parentGroup.namespace;
            let fullLayerRef = getFullID(nm, layerRef);
            let sourceLayer = refToResource(fullLayerRef, parentGroup, $Field.lyphs);
            if (!sourceLayer) {
                missingLayers.push(fullLayerRef);
                return;
            }

            let targetLayer = {};
            const n = (targetLyph.layers||[]).length;
            if (n > i){
                targetLayer = targetLyph.layers[i];
            }
            let targetLayerID = getGenID(sourceLayer.id, targetLyph.id, i+1);
            targetLayer = targetLayer::merge(genResource({
                [$Field.id]        : targetLayerID,
                [$Field.namespace] : targetLyph.namespace,
                [$Field.fullID]    : getFullID(targetLyph.namespace, targetLayerID),
                [$Field.name]      : getGenName(sourceLayer.name || '?', "in", targetLyph.name || '?', $Prefix.layer, i+1),
                [$Field.skipLabel] : true
            }, "shapeModel.clone (Lyph)"));
            mergeGenResource(undefined, parentGroup, targetLayer, $Field.lyphs);

            this.clone(parentGroup, sourceLayer, targetLayer);
            targetLayer::merge(targetLyph::pick([$Field.topology]));
            targetLyph.layers = targetLyph.layers || [];
            targetLyph.layers.push(targetLayer.id);
        });

        if (missingLayers.length > 0) {
            logger.error($LogMsg.LYPH_NO_TEMPLATE_LAYER, sourceLyph.fullID, missingLayers.join(", "));
        }

        return targetLyph;
    }

    /**
     * Assign internal resources to generated lyph layers
     * @param parentGroup
     */
    static mapInternalResourcesToLayers(parentGroup){

        function moveResourceToLayer(resource, layerIndex, lyph, prop){
            if (layerIndex < lyph.layers?.length){
                let layer = refToResource(lyph.layers[layerIndex], parentGroup, $Field.lyphs);
                if (layer){
                    layer[prop] = layer[prop] || [];
                    let internalID = getID(resource);
                    if (internalID && !layer[prop].find(x => x === internalID)){
                        layer[prop].push(internalID);
                        return true;
                    }
                    logger.info($LogMsg.RESOURCE_TO_LAYER, internalID, layer.id, prop, layer[prop]);
                } else {
                    logger.warn($LogMsg.LYPH_INTERNAL_NO_LAYER, lyph, layerIndex, lyph.layers[layerIndex]);
                }
            } else {
                logger.warn($LogMsg.LYPH_INTERNAL_OUT_RANGE, layerIndex, lyph.layers?.length, lyph.id);
            }
            return false;
        }

        /**
         * Map internal lyph resources to its layers
         * @param key1 property containing references to internal resources (internalLyphs or internalNodes)
         * @param key2 property containing indexes of layers to map internal resources into
         * @example A.internalLyphs=[B,C] and A.internalLyphsInLayers=[1,2]
         */
        function mapToLayers1(key1, key2){
            (parentGroup.lyphs||[]).forEach(lyph => {
                if (lyph.layers && lyph[key1]) {
                    lyph[key2] = lyph[key2] || [];
                    const k = lyph[key2].length;
                    const n = Math.max(lyph[key1].length, k);
                    //Issue #209 - for consistency an absent internalLyphsInLayers expand to layer 0 for all lyphs.
                    for (let i = k; i < n; i++){
                        lyph[key2].push(0);
                    }
                    for (let i = 0; i < n; i++) {
                        if(moveResourceToLayer(lyph[key1][i], lyph[key2][i], lyph, key1)) {
                            lyph[key1][i] = undefined;
                        }
                    }
                    lyph[key1] = lyph[key1].filter(x => !!x);
                }
            });
        }
        mapToLayers1($Field.internalLyphs, $Field.internalLyphsInLayers);
        mapToLayers1($Field.internalNodes, $Field.internalNodesInLayers);

        //B.internalIn=A + B.internalInLayer=1
        /**
         * Map internal resource into hosting lyph layer
         * @param key1 property containing references to internal resources (internalLyphs or internalNodes)
         * @param key2 property defining type of the resource to which the mapping is applied (lyphs or nodes)
         */
        function mapToLayers2(key1, key2){
            (parentGroup[key2]||[]).forEach(resource => {
                if (resource.internalIn) {
                    let lyph = refToResource(resource.internalIn, parentGroup, $Field.lyphs);
                    if (lyph){
                        if (resource.internalInLayer){
                            moveResourceToLayer(resource, resource.internalInLayer, lyph, key1);
                            delete resource.internalIn;
                        }
                    } else {
                        logger.error($LogMsg.LYPH_INTERNAL_IN_NOT_FOUND, resource.id, resource.internalIn);
                    }
                }
            });
        }
        mapToLayers2($Field.internalLyphs, $Field.lyphs);
        mapToLayers2($Field.internalNodes, $Field.nodes);
    }

    collectInheritedExternals(prop, inheritedProp){
        this[inheritedProp] = this[inheritedProp] || [];
        const ids = this[inheritedProp].map(x => x.id);
        let curr = this.supertype;
        while (curr && curr.fullID !== this.fullID){
            (curr[prop]||[]).forEach(e => {
                if (!ids.includes(e.id)){
                    this[inheritedProp].push(e);
                    ids.push(e.id);
                }
            });
            curr = curr.supertype;
        }
        if (this[inheritedProp].length === 0){
            delete this[inheritedProp];
        }
    }

    /**
     * Get border types based on the lyph's topology
     * @returns {Array}
     */
    get radialTypes() {
        if (this.layerIn){
            return this.layerIn.radialTypes;
        }
        let res = [false, false];
        switch (this.topology || LYPH_TOPOLOGY.TUBE) {
            case Lyph.LYPH_TOPOLOGY.CYST   : return [true, true];
            case Lyph.LYPH_TOPOLOGY.BAG    : res[0] = true; break;
            case Lyph.LYPH_TOPOLOGY.BAG2   : res[1] = true; break;
            case Lyph.LYPH_TOPOLOGY["BAG-"]: res[0] = true; break;
            case Lyph.LYPH_TOPOLOGY["BAG+"]: res[1] = true; break;
        }
        if (this.conveys && this.conveys.reversed){
            return [res[1], res[0]];
        }
        return res;
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
        return (this.conveys && (this.conveys.fasciculatesIn || this.conveys.endsIn)) || this.internalIn; // || this.hostedBy;
    }

    get container(){
        return this.internalIn || this.layerIn && this.layerIn.internalIn;
    }

    /**
     * Defines size of the conveying lyph based on the length of the link
     * @returns {{height: number, width: number}}
     */
    get sizeFromAxis() {
        const length = this.axis && this.axis.length || $Default.EDGE_LENGTH;
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
            //Lyph cannot be bigger than 95% of its host lyph
            [$Field.width, $Field.height].forEach(prop => {
                let val = 0.95 * (this.host[prop] || hostSize[prop]);
                this[prop] = Math.min(this[prop], val);
            });
        }
    }

    includeRelated(group){
        (this.layers||[]).forEach(layer => layer.includeRelated && layer.includeRelated(group));
        (this.internalLyphs||[]).forEach(internal => {
            if (internal::isObject() && !group.contains(internal)){
                group.lyphs.push(internal);
                internal.hidden = group.hidden;
                if (internal.conveys &&! group.contains(internal.conveys)){
                    group.links.push(internal.conveys);
                    internal.conveys.hidden = group.hidden;
                    internal.conveys.includeRelated && internal.conveys.includeRelated(group);
                }
                internal.includeRelated && internal.includeRelated(group);
            }
        });
        (this.internalNodes||[]).forEach(internal => {
            if (internal::isObject() && !group.contains(internal)){
                group.nodes.push(internal);
                internal.hidden = group.hidden;
                (internal.clones||[]).forEach(clone => {
                    if (!group.contains(clone)) {
                        group.nodes.push(clone);
                    }
                });
            }
        });
    }

    createAxis(modelClasses, entitiesByID, namespace) {
        let [sNode, tNode] = [$Prefix.source, $Prefix.target].map(prefix =>
            Node.fromJSON(genResource({
                [$Field.id]        : getGenID(prefix, this.id),
                [$Field.color]     : $Color.Node,
                [$Field.val]       : this.internalIn? 0.1: 1,
                [$Field.skipLabel] : true,
                [$Field.invisible] : true
            },"shapeModel.createAxis (Node)"), modelClasses, entitiesByID, namespace));

        let link = Link.fromJSON(genResource({
            [$Field.id]           : getGenID($Prefix.link, this.id),
            [$Field.source]       : sNode.fullID || sNode.id,
            [$Field.target]       : tNode.fullID || tNode.id,
            [$Field.geometry]     : Link.LINK_GEOMETRY.INVISIBLE,
            [$Field.conveyingLyph]: this.fullID,
            [$Field.skipLabel]    : true
         },"shapeModel.createAxis (Link)"), modelClasses, entitiesByID, namespace);

        link.source = sNode;
        link.target = tNode;
        link.conveyingLyph = this;

        if (this.internalIn) {
            link.geometry = Link.LINK_GEOMETRY.INVISIBLE;
            link.applyToEndNodes(end => end.color = $Color.InternalNode);
        }
        sNode.sourceOf = [link];
        tNode.targetOf = [link];
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
            this.axis.length = this.axis.length || $Default.EDGE_LENGTH;
        }
    }

    get isFirstLayer(){
        if (this.layerIn?.layers?.length > 0){
            if (this.layerIn.layers[0].fullID === this.fullID){
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if the current lyph carries a material.
     * @param materialID
     * @returns {*|void}
     */
    containsMaterial(materialID){
        let res = false;
        if (this.id === materialID) { res = true; }
        if (!res){
            res = (this.materials || []).find(e => e.containsMaterial(materialID));
        }
        if (!res && this.supertype) {
            res = this.supertype.containsMaterial(materialID)
        }
        if (!res && this.cloneOf) {
            res = this.cloneOf.containsMaterial(materialID)
        }
        if (!res && this.generatedFrom) {
            res = this.generatedFrom.containsMaterial(materialID)
        }
        return res;
    }

    /**
     * Checks if the current resource is derived from
     * @param supertypeID
     * @returns {boolean}
     */
    isSubtypeOf(supertypeID){
        let res = false;
        if (this.id === supertypeID) { res = true; }
        if (!res && this.supertype) {
            res = this.supertype.isSubtypeOf(supertypeID)
        }
        if (!res && this.cloneOf) {
            res = this.cloneOf.isSubtypeOf(supertypeID)
        }
        if (!res && this.layerIn) {
            res = this.layerIn.isSubtypeOf(supertypeID)
        }
        return res;
    }
}

/**
 * Class that models regions
 * @class
 * @property {Array<Anchor>} borderAnchors
 * @property {Array<Wire>} facets
 * @property {Array<Anchor>} internalAnchors
 * @property {Array<Region>} internalRegions
 * @property {Region} internalIn
 * @property {Group} hostedGroup
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
        json.class = $SchemaClass.Region;
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    static validateTemplate(parentGroup, template){
        if (template.facets){
            template.points = [];
            template.facets.forEach(wireRef => {
                let wire = refToResource(wireRef, parentGroup, $Field.wires);
                if (!wire || !wire.source || !wire.target){
                    logger.warn($LogMsg.REGION_FACET_ERROR, wireRef);
                    return;
                }
                let sourceAnchor = refToResource(wire.source, parentGroup, $Field.anchors);
                let targetAnchor = refToResource(wire.target, parentGroup, $Field.anchors);
                if (!sourceAnchor || !targetAnchor){
                    logger.warn($LogMsg.REGION_FACET_NO_ANCHORS, wire.source, wire.target);
                    return;
                }
                if (!sourceAnchor.layout && !sourceAnchor.hostedBy || !targetAnchor.layout && !targetAnchor.hostedBy){
                    logger.warn($LogMsg.REGION_FACET_NO_LAYOUT, wire.source, wire.target);
                }
            });
        }
    }

    static expandTemplate(parentGroup, template){
        if (!template::isObject()){
            logger.error($LogMsg.RESOURCE_NO_OBJECT, template);
            return;
        }
        template.id = template.id || getGenID(parentGroup.id, (parentGroup.regions||[]).length);
        let anchors = [];
        if (!template.borderAnchors) {
            //generate border anchors from points
            (template.points||[]).forEach((p, i) => {
                anchors.push(genResource({
                    [$Field.id]       : getGenID($Prefix.anchor, template.id, i),
                    [$Field.layout]   : p::clone(),
                    [$Field.skipLabel]: true
                }, "shapeModel.expandTemplate (Anchor)"));
            });
            parentGroup.anchors = parentGroup.anchors || [];
            parentGroup.anchors.push(...anchors);
            template.borderAnchors = anchors.map(e => e.id);
        } else {
            anchors = template.borderAnchors.map(e => refToResource(e, parentGroup, $Field.anchors)).filter(e => e);
        }
        if (!template.facets) {
            //generate facets from border anchors
            if (anchors.length < 3){
                logger.error($LogMsg.REGION_BORDER_ERROR, template.id);
                return;
            }
            let wires = [];
            for (let i = 1; i < anchors.length + 1; i++) {
                wires.push(genResource({
                    [$Field.id]        : getGenID($Prefix.wire, template.id, i),
                    [$Field.source]    : anchors[i - 1].id,
                    [$Field.target]    : anchors[i % anchors.length].id,
                    [$Field.color]     : template.color? tinycolor(template.color).darken(25).toRgbString(): $Color.Wire,
                    [$Field.skipLabel] : true
                }, "shapeModel.expandTemplate (Wire)"));
            }
            parentGroup.wires = parentGroup.wires || [];
            parentGroup.wires.push(...wires);
            template.facets = wires.map(e => e.id);
        } else {
            //assign border anchors from facets
            template.borderAnchors = template.borderAnchors || [];
            if (template.borderAnchors.length > 0){
                logger.warn($LogMsg.REGION_CONFLICT, template.id);
                template.borderAnchors = [];
            }
            (template.facets||[]).forEach(facet => {
                const f = refToResource(facet, parentGroup, $Field.wires);
                const s = refToResource(f.source, parentGroup, $Field.anchors);
                const t = refToResource(f.target,parentGroup, $Field.anchors);
                s && t && template.borderAnchors.push(getID(s)) && template.borderAnchors.push(getID(t));
            });
            template.borderAnchors = [... new Set(template.borderAnchors)];
        }
    }

    includeRelated(component){
        (this.facets||[]).forEach(facet => {
            if (!facet || facet.class !== $SchemaClass.Wire){ return; }
            if (!(component.wires||[]).find(e => e.id === facet.id)){
                component.wires.push(facet);
                facet.includeRelated && facet.includeRelated(component);
            }
        });
        (this.internalAnchors||[]).forEach(internal => {
            if (!internal || internal.class !== $SchemaClass.Anchor){ return; }
            if (!(component.anchors||[]).find(e => e.id === internal.id)){
                component.anchors.push(internal);
            }
        });
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

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.class = $SchemaClass.Border;
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    get isVisible(){
        return this.host? this.host.isVisible: super.isVisible;
    }
}
