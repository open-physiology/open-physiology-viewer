import {$SchemaClass} from "./utils";
import {Resource} from "./resourceModel";

/**
 * Variance specification for species
 * @class
 * @property presence
 * @property phenotypes
 * @property includes
 * @property clades
 */

export class VarianceSpec extends Resource {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.VarianceSpec;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }
}