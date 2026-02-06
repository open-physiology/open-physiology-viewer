import {limitLabel} from "../utils/helpers";
import {isObject} from "lodash-bound";

/**
 * @class
 * @classdesc This is a resource node to display in the list
 * @property id
 * @property label
 * @property class
 * @property length
 * @property isTemplate
 * @property index
 * @property resource
 * @property icons
 * @property canMoveUp
 * @property canMoveDown
 * @property layerIndex
 * @property maxLayerIndex
 */
export class ListNode {
    constructor(id, label, cls, length, isTemplate, index, resource) {
        this.id = id;
        this.label = limitLabel(label);
        this.length = length;
        this.isTemplate = isTemplate;
        this.class = cls;
        this.index = index;
        this.resource = resource;
        this.icons = [];
        this.canMoveUp = index > 0 && this.length > 1;
        this.canMoveDown = index < this.length - 1;
        this.layerIndex = resource?._layerIndex;
        this.maxLayerIndex = resource?._maxLayerIndex || (resource?.layers || []).length - 1;
    }

    /**
     * @param objOrID - Resource object or its ID
     * @param idx - position in the list
     * @param length - length of the list
     * @returns {ListNode}
     * @public
     */
    static createInstance(objOrID, idx, length = 0) {
        if (objOrID::isObject()) {
            return new this(objOrID.id, objOrID.name, objOrID._class, length, objOrID.isTemplate, idx, objOrID);
        } else {
            return new this(objOrID, "Generated " + objOrID, "Undefined", length, false, idx, undefined);
        }
    }
}