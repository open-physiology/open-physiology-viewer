import {Shape} from './shapeModel';
import {
    $Field,
    $Prefix,
    $SchemaClass,
    getGenID,
    getID,
    refToResource,
    genResource, isIncluded
} from './utils';
import {clone, isObject} from 'lodash-bound';
import {$LogMsg, logger} from './logger';
import tinycolor from "tinycolor2";
import {$Color} from "./utils";

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
