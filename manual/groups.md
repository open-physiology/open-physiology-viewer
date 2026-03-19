# Groups and Resource Visibility

In the ApiNATOMY viewer, groups are the primary mechanism for organizing and controlling the visibility of visual resources (nodes, links, lyphs, etc.). A group represents a subgraph of the complete connectivity model.

## Group Definition

A group is defined in the input model (under the `groups` property) and typically contains lists of identifiers for:
- `nodes`: Vertices in the connectivity graph.
- `links`: Edges connecting nodes.
- `lyphs`: Anatomical units that can be conveyed by links or contain other resources.
- `regions`: 2D or 3D areas that can host other resources.

## Resource Visibility

The visibility of resources is primarily determined by the group they belong to:

1.  **Group Visibility**: A group itself has a `hidden` property. When a group is hidden, all resources it contains are also hidden from the visualization.
2.  **Resource Visibility**: Individual resources also have a `hidden` property.
3.  **Ungrouped Resources**: Resources that are not explicitly assigned to any group are automatically collected into a "Default Group" (named "Ungrouped"), which is hidden by default.

## Automatic Resource Inclusion (`includeRelated`)

To ensure that the visualization of a group is consistent and complete, the viewer automatically adds dependent or related resources to a group when it is processed. This mechanism is called `includeRelated`.

When a resource is added to a group, the following related resources are automatically included:

### Lyphs
- **Layers**: All layers of a lyph are included.
- **Internal Lyphs**: Lyphs that are marked as internal to the lyph.
- **Internal Nodes**: Nodes that are marked as internal to the lyph.
- **Conveyed Link**: If the lyph conveys a link (its axis), that link is included.

### Links
- **End Nodes**: The source and target nodes of the link.
- **Conveying Lyph**: If the link is conveyed by a lyph, that lyph is included.
- **Hosted Nodes**: Nodes that are hosted by the link.

### Nodes
- **Clones**: Any automatically created clones of the node.

This recursive inclusion ensures that if you add a lyph to a group, you don't have to manually add its axis, its end nodes, or its internal structure; the viewer handles this automatically.

## Dynamic Groups

The viewer supports the creation of dynamic groups at runtime. These are groups that are not defined in the original input model but are generated based on user interaction or specific model processing requirements.

Dynamic groups are marked with a `description: "dynamic"` property. They are often used for:
- Visualizing specific paths or chains.
- Grouping resources that share certain properties (e.g., all lyphs of a certain type).
- Isolate specific subgraphs for detailed inspection.

The `createGroup(id, name, nodes, links, lyphs, modelClasses)` method in the `Group` class is used to programmatically generate these groups.

## Visibility Processing in the App

1.  **Model Loading**: During `fromJSON`, groups are instantiated.
2.  **Related Inclusion**: The `includeRelated()` method is called for each group, which triggers the recursive inclusion of dependent resources across all resources in the group.
3.  **Visibility Update**: The `show()` and `hide()` methods on the `Group` class are used to toggle the visibility of all resources within the group simultaneously.
4.  **Resource Tracking**: Each resource maintains an `inGroups` list, tracking all groups it belongs to. This helps in managing shared resources across multiple groups.
