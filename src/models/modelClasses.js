import { Node }   from './nodeModel';
import { Border } from './borderModel';
import { Lyph }   from './lyphModel';
import { Region } from './regionModel';
import { Link }   from './linkModel';
import { Group }  from './groupModel';
import { Tree }   from './treeModel';
import { Graph }  from './graphModel';
import { Resource } from './resourceModel'
import { VisualResource } from './visualResourceModel'
import { Shape } from './shapeModel'

export class Material extends VisualResource {}
export class External extends VisualResource {}

export const modelClasses = {
    "Resource"       : Resource,
    "VisualResource" : VisualResource,
    "Shape"          : Shape,
    /*Resource*/
    "External": External,
    "Material": Material,
    "Group"   : Group,
    "Tree"    : Tree,
    "Graph"   : Graph,
    /*Visual resource */
    "Node"    : Node,
    "Link"    : Link,
    "Region"  : Region,
    "Lyph"    : Lyph,
    "Border"  : Border
};