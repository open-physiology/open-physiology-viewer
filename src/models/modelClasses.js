import { Node }   from './nodeModel';
import { Border } from './borderModel';
import { BorderPart } from './borderPartModel';
import { Lyph }   from './lyphModel';
import { Region } from './regionModel';
import { Link }   from './linkModel';
import { Graph }  from './graphModel';
import { Entity } from './entityModel'

export class Material extends Entity {}
export class External extends Entity {}

export const modelClasses = {
    "External": External,
    "Node"    : Node,
    "Link"    : Link,
    "Material": Material,
    "Region"  : Region,
    "Lyph"    : Lyph,
    "Border"  : Border,
    "BorderPart"  : BorderPart,
    "Graph"   : Graph
};