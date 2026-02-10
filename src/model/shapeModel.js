import {VisualResource} from './visualResourceModel';
import {Resource} from './resourceModel';
import {Edge} from './edgeModel';
import {merge} from 'lodash-bound';
import {
    $Field,
    $Prefix,
    $SchemaClass,
    getGenID,
    getNewID,
    genResource
} from './utils';

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


