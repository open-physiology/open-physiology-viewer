import { GroupTemplate, Channel, Chain, Tree, Villus }  from './groupTemplateModel';
import { Group }    from './groupModel';
import { Graph }    from './graphModel';
import { Resource, External } from './resourceModel'
import { VisualResource, Material, Node, Link } from './visualResourceModel'
import { Shape, Lyph, Region, Border } from './shapeModel'
import { Coalescence } from './coalescenceModel';
import {$Class} from './utils';

export const modelClasses = {
    /*Abstract */
    [$Class.Resource]       : Resource,
    [$Class.VisualResource] : VisualResource,
    [$Class.GroupTemplate]  : GroupTemplate,
    [$Class.Shape]          : Shape,

    /*Resources */
    [$Class.External]     : External,
    [$Class.Coalescence]  : Coalescence,
    [$Class.Channel]      : Channel,
    [$Class.Chain]        : Chain,
    [$Class.Tree]         : Tree,
    [$Class.Villus]       : Villus,
    [$Class.Group]        : Group,
    [$Class.Graph]        : Graph,

    /*Visual resources */
    [$Class.Node]         : Node,
    [$Class.Link]         : Link,
    /* Shapes */
    [$Class.Material]     : Material,
    [$Class.Region]       : Region,
    [$Class.Lyph]         : Lyph,
    [$Class.Border]       : Border
};