import {VisualResource} from './visualResourceModel';
import {Resource} from './resourceModel';
import {Edge} from './edgeModel';
import {clone, merge, isObject} from 'lodash-bound';
import {$LogMsg, logger} from './logger';
import {
    $Field,
    $Prefix,
    $Color,
    $SchemaClass,
    getGenID,
    getNewID,
    getID,
    refToResource,
    mergeGenResource,
    genResource, isIncluded
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


/**
 * Class that models regions
 * @class
 * @property {Array<Anchor>} borderAnchors
 * @property {Array<Wire>} facets
 * @property {Array<Anchor>} internalAnchors
 * @property {Array<Region>} internalRegions
 * @property {Region} internalIn
 * @property {Array<Region>} layers
 * @property {Region} layerIn
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
            if (!isIncluded(component.wires, facet.id)){
                component.wires.push(facet);
                facet.includeRelated && facet.includeRelated(component);
            }
        });
        (this.internalAnchors||[]).forEach(internal => {
            if (!internal || internal.class !== $SchemaClass.Anchor){ return; }
            if (!isIncluded(component.anchors, internal.id)){
                component.anchors.push(internal);
            }
        });
    }

}

/**
 * Stratified Region model
 * @property supertype
 * @property axisWire
 */
export class StratifiedRegion extends Shape {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.class = $SchemaClass.StratifiedRegion;
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }
}

/**
 * Stratification model
 * @property strata
 * @property conveys
 */
export class Stratification extends Resource {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.class = json.class || $SchemaClass.Stratification;
        // Support alias: some inputs may specify `materials` instead of `strata`
        if (!json.strata && json.materials) {
            json.strata = json.materials;
        }
        json.strata = json.strata || [];
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    static createStratifiedRegions(parentGroup, template){
        (template.axisWires||[]).forEach(wire => {
            const wireID = getID(wire);
            const templateID = getID(template);
            const res = genResource({
                [$Field.id]: getGenID(wireID, templateID),
                [$Field.class]: $SchemaClass.StratifiedRegion,
                [$Field.supertype]: templateID,
                [$Field.axisWire]: wireID
            }, "shapeModel.createStratifiedRegions");
            mergeGenResource(undefined, parentGroup, res, $Field.stratifiedRegions);
            template.subtypes = template.subtypes || [];
            if (!isIncluded(template.subtypes, res.id)) {
                template.subtypes.push(res.id);
            }
        });
    }
}
