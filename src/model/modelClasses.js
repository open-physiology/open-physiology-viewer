import { GroupTemplate, Channel, Chain, Tree }  from './groupTemplateModel';
import { Group }    from './groupModel';
import { Graph }    from './graphModel';
import { Resource, External } from './resourceModel'
import { VisualResource, Material, Node, Link } from './visualResourceModel'
import { Shape, Lyph, Region, Border } from './shapeModel'
import { Coalescence } from './coalescenceModel';

export const modelClasses = {
    /*Abstract */
    "Resource"       : Resource,
    "VisualResource" : VisualResource,
    "GroupTemplate"  : GroupTemplate,
    "Shape"          : Shape,

    /*Resources */
    "External"     : External,
    "Coalescence"  : Coalescence,
    "Channel"      : Channel,
    "Chain"        : Chain,
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