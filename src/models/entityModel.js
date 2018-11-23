import { Resource } from './resourceModel';
/**
 * Common methods for all entity models
 */
export class Entity extends Resource{

    constructor(id) {
        super();
        this.id = id;
    }

    /**
     * Create Entity model from the JSON specification
     * @param json - input model
     * @param modelClasses - recognized classes
     * @param entitiesByID - map of all model entities
     * @returns {Entity} - Entity model
     */
    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        //Do not expand templates ?
        return super.fromJSON(json, modelClasses, entitiesByID );
    }
}

