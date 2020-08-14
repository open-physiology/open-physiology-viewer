import {GroupTemplate} from './groupTemplateModel';
import {Chain}   from './chainModel';
import {Tree}    from './treeModel';
import {Channel} from './channelModel';
import {Villus}  from './villusModel';
import {Group}   from './groupModel';
import {Component} from './componentModel';
import {Graph}   from './graphModel';
import {Scaffold} from './scaffoldModel';
import {Resource, External} from './resourceModel'
import {VisualResource, Material, Node, Link, Anchor, Wire} from './visualResourceModel'
import {Shape, Lyph, Region, Border} from './shapeModel'
import {Coalescence}  from './coalescenceModel';
import {$Field, $SchemaClass} from './utils';
import {keys, merge} from "lodash-bound";
import * as schema from "./graphScheme";

export const modelClasses = {
    /*Abstract */
    [$SchemaClass.Resource]       : Resource,
    [$SchemaClass.VisualResource] : VisualResource,
    [$SchemaClass.GroupTemplate]  : GroupTemplate,
    [$SchemaClass.Shape]          : Shape,

    /*Resources */
    [$SchemaClass.External]     : External,
    [$SchemaClass.Coalescence]  : Coalescence,
    [$SchemaClass.Channel]      : Channel,
    [$SchemaClass.Chain]        : Chain,
    [$SchemaClass.Tree]         : Tree,
    [$SchemaClass.Villus]       : Villus,
    [$SchemaClass.Group]        : Group,
    [$SchemaClass.Graph]        : Graph,
    [$SchemaClass.Component]    : Component,
    [$SchemaClass.Scaffold]     : Scaffold,

    /*Visual resources */
    [$SchemaClass.Anchor]       : Anchor,
    [$SchemaClass.Wire]         : Wire,
    [$SchemaClass.Node]         : Node,
    [$SchemaClass.Link]         : Link,

    /* Shapes */
    [$SchemaClass.Material]     : Material,
    [$SchemaClass.Region]       : Region,
    [$SchemaClass.Lyph]         : Lyph,
    [$SchemaClass.Border]       : Border
};

export function isScaffold(model){
    return (model.components || model.anchors || model.wires);
}

export function excelToJSON(model) {
    if (isScaffold(model)){
       return Scaffold.excelToJSON(model, modelClasses);
    } else {
       return Graph.excelToJSON(model, modelClasses);
    }
}

export function fromJSON(model) {
    if (isScaffold(model)){
        return Scaffold.fromJSON(model, modelClasses);
    } else {
        return Graph.fromJSON(model, modelClasses);
    }
}

export function joinModels(model, newModel, flattenGroups = false){
    if (isScaffold(model)){
        if (isScaffold(newModel)) {
            //Both scaffolds
            schema.definitions.Scaffold.properties::keys().forEach(property => {
                delete newModel[property];
                delete model[property];
            });
            if (flattenGroups){
                model.components = model.components || [];
                model.components.push(newModel);
                return model;
            }
            return {[$Field.components]: [model, newModel]};
        } else {
            newModel.scaffolds = newModel.scaffolds || [];
            newModel.scaffolds.push(model);
            return newModel;
        }
    } else {
        if (isScaffold(newModel)) {
            model.scaffolds = model.scaffolds || [];
            model.scaffolds.push(newModel);
            return model;
        }
    }
    //Both  connectivity models
    let newConfig = (model.config||{})::merge(newModel.config);
    schema.definitions.Graph.properties::keys().forEach(property => {
        delete newModel[property];
        delete model[property];
    });
    if (flattenGroups) {
        model.groups = model.groups || [];
        model.groups.push(newModel);
    }
    return {[$Field.groups]: [model, newModel], [$Field.config]: newConfig};
}