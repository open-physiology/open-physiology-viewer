import { Node }   from './nodeModel';
import { Border } from './borderModel';
import { Lyph }   from './lyphModel';
import { Region } from './regionModel';
import { Link }   from './linkModel';
import { Graph }  from './graphModel';
import { Material } from './materialModel';

export const modelClasses = {
    "Node"    : Node,
    "Link"    : Link,
    "Material": Material,
    "Region"  : Region,
    "Lyph"    : Lyph,
    "Border"  : Border,
    "Graph"   : Graph
};