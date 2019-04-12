import { Tree }     from './treeModel';
import { Channel }  from './channelModel';
import { Group }    from './groupModel';
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
    "External"     : External,
    "Coalescence"  : Coalescence,
    "Channel"      : Channel,
    "Tree"         : Tree,
    "Group"        : Group,
    "Graph"        : Graph,

    /*Visual resources */
    "Node"         : Node,
    "Link"         : Link,
    /* Shapes */
    "Material"     : Material,
    "Region"       : Region,
    "Lyph"         : Lyph,
    "Border"       : Border
};