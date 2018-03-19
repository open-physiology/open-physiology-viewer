import { LyphModel }   from './lyphModel';
import { BorderModel, BorderLinkModel } from './borderModel';
import { NodeModel }   from './nodeModel';
import { LinkModel }   from './linkModel';
import { TreeModel }   from './treeModel';
import { GraphModel }  from './graphModel';
import { CoalescenceModel } from './coalescenceModel';

export const modelClasses = {
    "Lyph"  : LyphModel,
    "Node"  : NodeModel,
    "Link"  : LinkModel,
    "BorderLink": BorderLinkModel,
    "Border": BorderModel,
    "Tree"  : TreeModel,
    "Graph" : GraphModel,
    "Coalescence": CoalescenceModel
};

export function avgDimension(obj, property){
    if (obj && obj[property]){
        if (obj[property].min){
            if (obj[property].max){
                return (obj[property].min + obj[property].max) / 2
            } else {
                return obj[property].min;
            }
        } else {
            return obj[property].max || 1;
        }
    }
    return 1;
}

