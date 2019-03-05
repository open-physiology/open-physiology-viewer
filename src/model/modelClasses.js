import { Group }    from './groupModel';
import { Tree }     from './treeModel';
import { Graph }    from './graphModel';
import { Resource, External } from './resourceModel'
import { VisualResource, Material, Node, Link } from './visualResourceModel'
import { Shape, Lyph, Region, Border } from './shapeModel'

export class Coalescence extends Resource{}

export const modelClasses = {
    /*Abstract */
    "Resource"       : Resource,
    "VisualResource" : VisualResource,
    "Shape"          : Shape,

    /*Resources */
    "External": External,
    "Coalescence": Coalescence,
    "Group"   : Group,
    "Tree"    : Tree,
    "Graph"   : Graph,

    /*Visual resources */
    "Node"    : Node,
    "Link"    : Link,

    "Material": Material,
    "Region"  : Region,
    "Lyph"    : Lyph,
    "Border"  : Border
};