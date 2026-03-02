import {Resource} from './resourceModel';
import {Shape} from './shapeModel';
import {
    $Field,
    $SchemaClass,
    getGenID,
    getID,
    genResource, isIncluded, mergeGenResource
} from './utils';
import {isObject} from "lodash-bound";

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
        (template.axisWires||[]).forEach(wire => {
            const stratifiedRegion = this.createStratifiedRegion(component,template,wire);
            mergeGenResource(undefined, component, stratifiedRegion, $Field.stratifiedRegions);
        });
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
        stratification.subtypes = stratification.subtypes || [];
        if (!isIncluded(stratification.subtypes, stratifiedRegion.id)) {
            stratification.subtypes.push(stratifiedRegion.id);
        }
        stratification.axisWires = stratification.axisWires || [];
        if (!isIncluded(stratification.axisWires, wireID)) {
            stratification.axisWires.push(wireID);
        }
        if (wire::isObject()){
            wire.stratifiedRegion = stratifiedRegion.id;
            wire.stratification = stratificationID;
        }
        return stratifiedRegion;
    }
}
