import {limitLabel} from "../utils/helpers";
import {$SchemaClass} from "../../model";
import {isObject} from "lodash-bound";

/**
 * Css class names to represent ApiNATOMY resource classes
 * @type {{LYPH: string, UNDEFINED: string, TEMPLATE: string, MATERIAL: string}}
 */
export const MAT_NODE_CLASS = {
    LYPH: $SchemaClass.Lyph,
    MATERIAL: $SchemaClass.Material,
    TEMPLATE: "Template",
    UNDEFINED: "Undefined"
}

export const MAT_EDGE_CLASS = {
    MATERIAL: 'has-material',
    NEW: 'has-new'
}

/**
 * @class
 * @property id
 * @property parents
 * @property children
 * @property label
 * @property type
 * @property resource
 * @property category
 */
export class MaterialNode {
    constructor(id, parents, children, label, type, resource) {
        this.id = id;
        this.parents = parents;
        this.children = children;
        this.label = limitLabel(label);
        this.type = type;
        this.resource = resource;
    }

    /**
     * @param material - ApiNATOMY material resource object
     * @param clsName - resource type
     * @returns {MaterialNode}
     */
    static createInstance(material, clsName = MAT_NODE_CLASS.MATERIAL) {
        return new this(
            material.id,
            (material._inMaterials || []).map(parent => parent.id),
            (material.materials || []).map(child => child.id ? child.id : child),
            material.name || material.id,
            (clsName === MAT_NODE_CLASS.LYPH && material.isTemplate) ? MAT_NODE_CLASS.TEMPLATE : clsName,
            material
        );
    }
}

/**
 * @class
 * @property id
 * @property parent
 * @property child
 * @property type
 */
export class Edge {
    constructor(id, parent, child, type) {
        this.id = id;
        this.source = parent;
        this.target = child;
        this.type = type;
    }
}

/**
 * Create a hierarchy of materials
 * @param entitiesByID
 * @param rootMat
 * @param includeChildren
 * @param includeParents
 * @returns {MaterialNode}
 */
export function buildTree(entitiesByID, rootMat, includeChildren = true, includeParents = true) {
    let rootCls = rootMat._class || rootMat.class;
    let root = MaterialNode.createInstance(rootMat, rootCls);
    let notFound = [];
    if (includeChildren && rootMat.materials) {
        root.children = rootMat.materials.map(child => {
            let mat = child::isObject() ? child : entitiesByID[child];
            if (mat) {
                return buildTree(entitiesByID, mat, true, false);
            } else {
                notFound.push(child);
            }
        });
    } else {
        delete root.children;
    }
    if (includeParents) {
        let materials = rootMat._inMaterials || rootMat.inMaterials;
        if (materials) {
            // Do not include generated resources into the hierarchy
            materials = materials.filter(p => !p.generated);
            let parents = materials.map(parent => {
                let mat = parent::isObject() ? parent : entitiesByID[parent];
                if (mat) {
                    return buildTree(entitiesByID, mat, false, true);
                } else {
                    notFound.push(parent);
                }
            });
            parents.forEach(p => p.category = 'parent');
            root.children = (root.children || []).concat(parents);
        }
    }
    if (notFound.length > 0) {
        root.children = root.children.filter(e => e);
    }
    return root;
}

