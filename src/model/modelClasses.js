import {GroupTemplate} from './groupTemplateModel';
import {Chain}   from './chainModel';
import {Tree}    from './treeModel';
import {Channel} from './channelModel';
import {Villus}  from './villusModel';
import {Group}   from './groupModel';
import {Graph}   from './graphModel';
import {Resource, External} from './resourceModel'
import {VisualResource, Material, Node, Link} from './visualResourceModel'
import {Shape, Lyph, Region, Border} from './shapeModel'
import {Coalescence}  from './coalescenceModel';
import {$SchemaClass} from './utils';

export const modelClasses = {
    /*Abstract */
    [$SchemaClass.Resource]       : Resource,
    [$SchemaClass.VisualResource] : VisualResource,
    [$SchemaClass.GroupTemplate]  : GroupTemplate,
    [$SchemaClass.Shape]          : Shape,

    /*Resources */
    [$SchemaClass.External]     : External,
    [$SchemaClass.Coalescence]  : Coalescence,
    [$SchemaClass.Channel]      : Channel,
    [$SchemaClass.Chain]        : Chain,
    [$SchemaClass.Tree]         : Tree,
    [$SchemaClass.Villus]       : Villus,
    [$SchemaClass.Group]        : Group,
    [$SchemaClass.Graph]        : Graph,

    /*Visual resources */
    [$SchemaClass.Node]         : Node,
    [$SchemaClass.Link]         : Link,
    /* Shapes */
    [$SchemaClass.Material]     : Material,
    [$SchemaClass.Region]       : Region,
    [$SchemaClass.Lyph]         : Lyph,
    [$SchemaClass.Border]       : Border
};