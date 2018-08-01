import { Node }   from './nodeModel';
import { Border } from './borderModel';
import { Lyph }   from './lyphModel';
import { Link }   from './linkModel';
import { Graph }  from './graphModel';
import { Material } from './materialModel';

export const modelClasses = {
    "Node"    : Node,
    "Link"    : Link,
    "Material": Material,
    "Lyph"    : Lyph,
    "Border"  : Border,
    "Graph"   : Graph
};