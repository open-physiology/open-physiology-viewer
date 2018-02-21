import { LyphModel } from './lyphModel';
import { NodeModel } from './nodeModel';
import { LinkModel, LINK_TYPES } from './linkModel';
import { TreeModel }  from './treeModel';
import { GraphModel } from './graphModel';
import { CoalescenceModel } from './coalescenceModel';

export const modelClasses = {
    "Lyph" : LyphModel,
    "Node" : NodeModel,
    "Link" : LinkModel,
    "Tree" : TreeModel,
    "Graph": GraphModel,
    "Coalescence": CoalescenceModel
};

