import { LyphModel }   from './lyphModel';
import { BorderModel} from './borderModel';
import { NodeModel }   from './nodeModel';
import { LinkModel }   from './linkModel';
import { TreeModel }   from './treeModel';
import { GraphModel }  from './graphModel';
import { CoalescenceModel } from './coalescenceModel';

export const modelClasses = {
    "Lyph"  : LyphModel,
    "Node"  : NodeModel,
    "Link"  : LinkModel,
    "Border": BorderModel,
    "Tree"  : TreeModel,
    "Graph" : GraphModel,
    "Coalescence": CoalescenceModel
};



