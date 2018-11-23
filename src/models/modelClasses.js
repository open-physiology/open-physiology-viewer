import { Node }   from './nodeModel';
import { Border } from './borderModel';
import { BorderPart } from './borderPartModel';
import { Lyph }   from './lyphModel';
import { Region } from './regionModel';
import { Link }   from './linkModel';
import { Group }  from './groupModel';
import { Tree }   from './treeModel';
import { Graph }  from './graphModel';
import { Entity } from './entityModel'
import { Shape } from './shapeModel'

export class Material extends Entity {}
export class External extends Entity {}

export const modelClasses = {
    //"Entity"  : Entity,
    //"Shape"   : Shape,
    "External": External,
    "Node"    : Node,
    "Link"    : Link,
    "Material": Material,
    "Region"  : Region,
    "Lyph"    : Lyph,
    "Border"  : Border,
    "BorderPart"  : BorderPart,
    "Group"   : Group,
    "Tree"    : Tree,
    "Graph"   : Graph
};