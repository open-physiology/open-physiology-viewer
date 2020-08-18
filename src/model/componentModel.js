import {Resource} from "./resourceModel";
import {isArray, isNumber, isObject, keys, unionBy} from "lodash-bound";
import {$Color, $Field, $Prefix, $SchemaClass, getGenID, getID, getNewID} from "./utils";
import {Link} from "./visualResourceModel";

export class Component extends Resource {


    /**
     * Create a scaffold model from JSON specification
     * @param json -
     * @param modelClasses
     * @param entitiesByID
     * @returns {Resource}
     */
    static fromJSON(json, modelClasses = {}, entitiesByID) {
        (json.regions||[]).forEach(region => {
            modelClasses.Region.expandTemplate(json, region);
            modelClasses.Region.validateTemplate(json, region);
        });

        //Create scaffold
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.mergeSubgroupEntities();
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
        this.show();
        if (!ids) {return;}
        (this.components||[]).forEach(g => {
            if (ids.includes(g.id)){
                g.show();
            } else {
                g.hide();
            }
        });
    }

    /**
     * Hide current group (=hide all its entities)
     */
    hide(){
        this.resources.forEach(entity => entity.hidden = true);
    }

    /**
     * Show current group (=show all its entities)
     */
    show(){
        this.resources.forEach(entity => delete entity.hidden);
    }

    /**
     * Entities that belong to the component (resources excluding sub-components)
     * @returns {*[]}
     */
    get resources(){
        let res = [];
        let relFieldNames = this.constructor.Model.filteredRelNames([$SchemaClass.Component]);
        relFieldNames.forEach(property => res = res::unionBy((this[property] ||[]), $Field.id));
        return res.filter(e => !!e && e::isObject());
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

    /**
     * Add entities from sub-components to the current component
     */
    mergeSubgroupEntities(){
        //Place references to subcomponent resources to the current component
        (this.components||[]).forEach(component => {
            if (component.id === this.id) {
                logger.warn("The model contains self-references or cyclic component dependencies: ", this.id, component.id);
                return;
            }
            let relFieldNames = this.constructor.Model.filteredRelNames([$SchemaClass.Component]);
            relFieldNames.forEach(property => {
                if (component[property]::isArray()){
                    this[property] = (this[property]||[])::unionBy(component[property], $Field.id);
                    this[property] = this[property].filter(x => x.class);
                }
            });
        });
    }
}