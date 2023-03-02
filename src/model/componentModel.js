import {Resource} from "./resourceModel";
import {isArray, isObject, unionBy} from "lodash-bound";
import {$Color, $Field, $SchemaClass, addColor, mergeRecursively, schemaClassModels, showGroups} from "./utils";
import {logger, $LogMsg} from "./logger";
import {Anchor} from './verticeModel';
import {Wire} from './edgeModel';
import {Region} from './shapeModel';

/**
 * @class
 * @property anchors
 * @property wires
 * @property regions
 * @property components
 */
export class Component extends Resource {

    /**
     * Create a scaffold model from JSON specification
     * @param json -
     * @param modelClasses
     * @param entitiesByID
     * @param defaultNamespace
     * @returns {Resource}
     */
    static fromJSON(json, modelClasses = {}, entitiesByID, defaultNamespace) {
        (json.regions||[]).forEach(region => {
            if (region::isObject()) {//process regions, but not references to regions
                modelClasses.Region.expandTemplate(json, region);
                modelClasses.Region.validateTemplate(json, region);
            }
        });

        let namespace = json.namespace || defaultNamespace;
        //Create scaffold
        json.class = json.class || $SchemaClass.Component;
        let res = super.fromJSON(json, modelClasses, entitiesByID, namespace);

        //Assign color to visual resources with no color in the spec
        addColor(res.regions, $Color.Region);
        addColor(res.wires, $Color.Wire);
        addColor(res.anchors, $Color.Anchor);
        return res;
    }

    /**
     * Groups that can be toggled on or off in the global graph
     * @returns {*[]}
     */
    get activeGroups(){
        return [...(this.components||[])];
    }

    /**
     * Show sub-components of the current component. A resources is shown if it belongs to at least one visible component
     * @param ids - selected component IDs
     */
    showGroups(ids){
        showGroups(this.components||[], ids);
    }

    /**
     * Hide current group (=hide all its entities)
     */
    hide(){
        this.hidden = true;
        this.resources.forEach(entity => entity.hidden = true);
    }

    /**
     * Show current group (=show all its entities)
     */
    show(){
        this.hidden = false;
        this.resources.forEach(entity => delete entity.hidden);
    }

    get visibleComponents(){
        return [...(this.components||[])].filter(e => !e.hidden);
    }

    /**
     * Entities that belong to the component (resources excluding sub-components)
     * @returns {*[]}
     */
    get resources(){
        let res = [];
        let relFieldNames = schemaClassModels[$SchemaClass.Component].filteredRelNames([$SchemaClass.Component]);
        relFieldNames.forEach(prop => res = res::unionBy((this[prop] ||[]), $Field.id));
        return res.filter(e => !!e && e::isObject());
    }

    contains(resource){
        if (resource instanceof Anchor){
            return this.anchors.find(e => e.id === resource.id);
        }
        if (resource instanceof Wire){
            return this.wires.find(e => e.id === resource.id);
        }
        if (resource instanceof Region){
            return this.regions.find(e => e.id === resource.id);
        }
        return false;
    }

    /**
     * Visible anchors
     * @returns {*[]} visible anchors in a scaffold component
     */
    get visibleAnchors(){
        return (this.anchors||[]).filter(e => e.isVisible);
    }

    /**
     * Visible wires
     * @returns {*[]} visible wires in a scaffold component
     */
    get visibleWires(){
        return (this.wires||[]).filter(e => e.isVisible);
    }

    /**
     * Visible regions
     * @returns {*[]} visible regions in a scaffold component
     */
    get visibleRegions(){
        return (this.regions||[]).filter(e => e.isVisible);
    }

    markImported(){
        if (this.imported) {
            let relFieldNames = schemaClassModels[$SchemaClass.Component].filteredRelNames();
            relFieldNames.forEach(prop => this[prop]?.forEach(r => r.imported = true));
        }
    }

    /**
     * Add resources from sub-components to the current component
     */
    mergeSubgroupResources(){
        let relFieldNames = schemaClassModels[$SchemaClass.Component].filteredRelNames();
        mergeRecursively(this, $Field.components, relFieldNames, $LogMsg.COMPONENT_SELF);
    }

    includeRelated(){
        [$Field.anchors, $Field.wires, $Field.regions].forEach(prop =>
            (this[prop]||[]).forEach(res => res.includeRelated && res.includeRelated(this))
        );
    }
}