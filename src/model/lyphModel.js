import {Node} from './verticeModel';
import {Link} from './edgeModel';
import {Shape} from './shapeModel';
import {clone, merge, pick, isObject, isNumber, mergeWith, values} from 'lodash-bound';
import {$LogMsg, logger} from './logger';
import {
    LYPH_TOPOLOGY,
    $Field,
    $Prefix,
    $Default,
    $Color,
    $SchemaClass,
    getGenID,
    getGenName,
    getID,
    mergeResources,
    refToResource,
    getFullID,
    mergeGenResource,
    genResource, isIncluded
} from './utils';


/**
 * Class that models lyphs
 * @class
 * @property chainTopology
 * @property angle
 * @property scale
 * @property isTemplate
 * @property supertype
 * @property subtypes
 * @property {Link} conveys
 * @property Array<Lyph> layers
 * @property {Lyph} layerIn
 * @property Array<Lyph> internalIn
 * @property Array<Material> inMaterials
 * @property Array<Coalescence> inCoalescences
 * @property Array<Chain> inChains
 * @property Array<Chain> templateInChains
 * @property bundles
 * @property endBundles
 * @property bundlesChains
 * @property providesChains
 * @property prev
 * @property next
 * @property villus
 * @property width
 * @property height
 * @property length
 * @property thickness
 * @property internalNodesInLayers
 * @property seedIn
 * @property {Array<External>} inheritedExternal
 * @property {Array<OntologyTerm>} inheritedOntologyTerms
 * @property {Array<Reference>} inheritedReferences
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

    getLayerIndex() {
        return (this.layerIn?.layers || []).findIndex(x => x.fullID === this.fullID);
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
            let supertype = refToResource(sourceLyph.supertype, parentGroup, $Field.lyphs);
            if (supertype && supertype.isTemplate){
                this.expandTemplate(parentGroup, supertype);
            }
        }

        targetLyph::mergeWith(sourceLyph::pick([$Field.color, $Field.scale, $Field.height, $Field.width, $Field.length,
            $Field.thickness, $Field.description, $Field.create3d, $Field.namespace, $Field.topology,
            $Field.materials, $Field.channels, $Field.bundlesChains, $Field.internalLyphsInLayers
        ]), mergeResources);
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
                //Issue #126 cloned lyphs inherit external annotations from the source lyph
                targetLyph::mergeWith(sourceLyph::pick([$Field.references, $Field.ontologyTerms, $Field.external]), mergeResources);
            }
        }

        targetLyph.name = targetLyph.name || getGenName(sourceLyph.name);

        if ((targetLyph.layers||[]).length > 0 && (sourceLyph.layers||[]) > 0) {
            logger.warn($LogMsg.LYPH_SUBTYPE_HAS_OWN_LAYERS, targetLyph);
        }

        const cloneParts = prop =>{
            let missingParts = [];
            (sourceLyph[prop] || []).forEach((partRef, i) => {
                let nm = sourceLyph.namespace || parentGroup.namespace;
                let fullPartRef = getFullID(nm, partRef);
                let sourcePart = refToResource(fullPartRef, parentGroup, $Field.lyphs);
                if (!sourcePart) {
                    missingParts.push(fullPartRef);
                    return;
                }

                let targetPart = {};
                const n = (targetLyph[prop]||[]).length;
                if (n > i){
                    targetPart = targetLyph.layers[i];
                }
                let targetPartID = getGenID(sourcePart.id, targetLyph.id, i+1);
                targetPart = targetPart::merge(genResource({
                    [$Field.id]        : targetPartID,
                    [$Field.namespace] : targetLyph.namespace,
                    [$Field.fullID]    : getFullID(targetLyph.namespace, targetPartID),
                    [$Field.name]      : getGenName(sourcePart.name || '?', "in", targetLyph.name || '?', $Prefix[prop], i+1),
                    [$Field.skipLabel] : true
                }, "shapeModel.clone (Lyph)"));

                mergeGenResource(undefined, parentGroup, targetPart, $Field.lyphs);
                this.clone(parentGroup, sourcePart, targetPart);
                if (prop === $Field.layers) {
                    //Layers inherit their topology from hosting lyph
                    targetPart::merge(sourcePart::pick([$Field.topology]));
                }
                targetLyph[prop] = targetLyph[prop] || [];
                targetLyph[prop].push(targetPart.id);
            });
            if (missingParts.length > 0) {
                logger.error($LogMsg.LYPH_NO_TEMPLATE, prop, sourceLyph.fullID, missingParts.join(", "));
            }
        }
        cloneParts($Field.layers);
        cloneParts($Field.internalLyphs);

        return targetLyph;
    }

    /**
     * Assign internal resources to generated lyph layers
     * @param parentGroup
     */
    static mapInternalResourcesToLayers(parentGroup){

        function moveResourceToLayer(resource, layerIndex, lyph, prop){
            if (layerIndex::isNumber() && layerIndex > -1 && layerIndex < lyph.layers?.length){
                let internalID = getID(resource);
                let layerRef = lyph.layers[layerIndex];
                let layer = refToResource(layerRef, parentGroup, $Field.lyphs);
                if (!layer && lyph.namespace && !lyph.layers[layerIndex].includes(':')){
                    //search in the main lyph namespace
                    layerRef = lyph.namespace + ":" + lyph.layers[layerIndex];
                    layer = refToResource(layerRef, parentGroup, $Field.lyphs);
                }
                if (layer){
                    layer[prop] = layer[prop] || [];
                    if (internalID && !isIncluded(layer[prop], internalID)){
                        layer[prop].push(getFullID(parentGroup.namespace, internalID));
                        if (resource::isObject()){
                            resource.internalIn = layerRef;
                        }
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

    collectInheritedProperty(prop, inheritedProp, rel){
        this[inheritedProp] = this[inheritedProp] || [];
        let fullIDs = this[inheritedProp].map(x => x.fullID);
        let curr = this[rel];
        while (curr && curr.fullID !== this.fullID) {
            (curr[prop] || []).forEach(e => {
                if (!fullIDs.includes(e.fullID)) {
                    this[inheritedProp].push(e);
                    fullIDs.push(e.fullID);
                }
            });
            curr = curr[rel];
        }
        if (this[inheritedProp].length === 0) {
            delete this[inheritedProp];
        }

    }

    collectInheritedExternals(){
        const props = [$Field.external, $Field.ontologyTerms, $Field.references];
        const inheritedProps = [$Field.inheritedExternal, $Field.inheritedOntologyTerms, $Field.inheritedReferences];
        this.supertype && props.forEach((prop, i) => this.collectInheritedProperty(prop, inheritedProps[i], $Field.supertype));
        this.cloneOf && inheritedProps.forEach(prop=> this.collectInheritedProperty(prop, prop, $Field.cloneOf));
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

    get prototype(){
        if (!this.generated){
            return this;
        }
        // NK for generated layers, show parent or its supertype, it will have material layers
        if (this.layerIn){
            return this.layerIn.prototype;
        }
        if (this.supertype){
            return this.supertype.prototype;
        }
        if (this.cloneOf){
            return this.cloneOf.prototype;
        }
        if (this.generatedFrom){
            return this.generatedFrom;
        }
    }

    /**
     * Defines size of the conveying lyph based on the length of the link
     * @returns {{height: number, width: number}}
     */
    get sizeFromAxis() {
        const length = this.axis?.length || $Default.EDGE_LENGTH;
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
                if (internal.conveys &&! group.contains(internal.conveys)){
                    group.links.push(internal.conveys);
                    internal.conveys.includeRelated && internal.conveys.includeRelated(group);
                }
                internal.includeRelated && internal.includeRelated(group);
            }
        });
        (this.internalNodes||[]).forEach(internal => {
            if (internal::isObject() && !group.contains(internal)){
                group.nodes.push(internal);
                (internal.clones||[]).forEach(clone => {
                    if (!group.contains(clone)) {
                        group.nodes.push(clone);
                    }
                });
            }
        });

        //Add conveyed links
        if (this.conveys){
            group.links = group.links || [];
            if (!group.contains(this.conveys)){
                group.links.push(this.conveys);
            }
        }
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
            if (this.container.layerIn){
                let layerWidth = this.container.layerIn.width ||
                    this.axis.length / (this.container.layerIn.layers||[0]).length;
                this.axis.length = layerWidth * 0.5;
            }
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

    clearReferences(){
        if (this.isTemplate || this.subtypes){
            return;
        }
        let removed = [this];
        if (this.conveys) {
            delete this.conveys.conveyingLyph;
            this.conveys.collapsible = true;
        }
        if (this.border){
            (this.border.borders||[]).forEach(e => delete e.onBorder);
        }
        //1..*
        let props = [$Field.internalIn, $Field.layerIn, $Field.supertype, $Field.hostedBy, $Field.cloneOf];
        let otherProps = [$Field.internalLyphs, $Field.layers, $Field.subtypes, $Field.hostedLyphs, $Field.clones];
        props.forEach((prop, i) => {
            if (this[prop]) {
                this[prop][otherProps[i]] = (this[prop][otherProps[i]]||[]).filter(e => e.fullID !== this.fullID);
            }
        });
        //1..1
        props = [$Field.endBundles, $Field.bundles, $Field.seedIn, $Field.villus, $Field.border];
        otherProps = [$Field.endsIn, $Field.fasciculatesIn, $Field.seed, $Field.villusOf, $Field.host];
        props.forEach((prop, i) => {
            if (this[prop]){
                delete this[prop][otherProps[i]];
            }
        });
        //*..*
        props = [$Field.transportedBy, $Field.materials, $Field.channels, $Field.bundlesChains, $Field.external,
            $Field.references, $Field.ontologyTerms, $Field.inCoalescences, $Field.clones, $Field.inChains];
        otherProps = [$Field.materials, $Field.inMaterials, $Field.housingLyphs, $Field.housingLyphs, $Field.externalTo,
            $Field.documents, $Field.annotates, $Field.lyphs, $Field.cloneOf, $Field.lyphs];
        props.forEach((prop, i) => {
            if (this[prop]){
                this[prop].forEach(r => r[otherProps[i]] = (r[otherProps[i]]||[]).filter(e => e.fullID !== this.fullID));
            }
        });
        (this.layers||[]).forEach(layer => {
            removed.push(layer);
            layer.clearReferences();
        });
        return removed;
    }
}
