import {Resource} from './resourceModel';
import {Shape} from './shapeModel';
import {
    $Field,
    $SchemaClass,
    getGenID,
    getID,
    mergeGenResource,
    genResource, isIncluded
} from './utils';

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
        if (!json.strata && json.materials) {
            json.strata = json.materials;
        }
        json.strata = json.strata || [];
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    static createStratifiedRegions(component, template){
        (template.axisWires||[]).forEach(wire => this.createStratifiedRegion(component,template,wire));
    }

    static createStratifiedRegion(component, stratification, wire){
        const wireID = getID(wire);
        const stratificationID = getID(stratification);
        const stratifiedRegion = genResource({
            [$Field.id]: getGenID(wireID, stratificationID),
            [$Field.class]: $SchemaClass.StratifiedRegion,
            [$Field.supertype]: stratificationID,
            [$Field.axisWire]: wireID
        }, "shapeModel.createStratifiedRegions");
        // Generated stratifiedRegions will be placed to groups by the method inludeRelated
        mergeGenResource(undefined, component, stratifiedRegion, $Field.stratifiedRegions);
        stratification.subtypes = stratification.subtypes || [];
        if (!isIncluded(stratification.subtypes, stratifiedRegion.id)) {
            stratification.subtypes.push(stratifiedRegion.id);
        }
        return stratifiedRegion;
    }
}
