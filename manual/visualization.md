# Graph Visualization

The ApiNATOMY lyph viewer uses a 3D force-directed layout to automatically position model resources in space. This section explains the principles of the layout algorithm and how to control the positioning and scaling of graph elements.

## Graph Layout

The viewer renders a dynamic graph where:
* **Nodes** are represented by spheres.
* **Links** are represented by lines (straight, curved, or invisible) that act as springs between nodes.

### Force-Directed Mechanism

The layout is computed using the `d3-force-3d` algorithm, which applies several physical forces to the graph:
* **Charge**: Nodes repel each other to avoid overlap and spread out the graph.
* **Link Force**: Links act like springs, pulling connected nodes together or pushing them apart based on a target `length`.
* **Collision**: Prevents nodes from overlapping by defining a radius around each node.

### Controlling Node Positions

While the layout is mostly automatic, modellers can constrain it using several properties:

* **Fixed Positions**: By setting `fixed: true` and providing `layout: { "x": ..., "y": ..., "z": ... }`, a node's position is strictly enforced. Coordinates are percentages of the scene dimensions (from -100 to 100).
* **Foci (Attraction Points)**: If a node is not fixed, the `layout` coordinates act as a "gravity center" that attracts the node without strictly fixing it.
* **Hosting**: Nodes can be hosted by other resources:
    * `hostedBy`: Places a node on a Link at a specific `offset` (0 to 1).
    * `internalIn`: Places a node inside a Lyph or Region, attracting it to its center.
* **Control Nodes**: A node can be centered among a set of `controlNodes`.

### Collapsible Links

When the same semantic entity must appear in multiple locations (e.g., connected to different lyph borders), the tool generates **clone nodes** connected by **collapsible links**. These links pull the clones together. If the constraints allow it, the clones will merge into a single visual point.

### Link Topology and Geometry

The visual representation of links (edges) can be customized using the `geometry` property to reflect different biological or structural relationships.

*   **Straight (link)**: The default geometry for links, representing direct connections.
*   **Arc (arc)**: Renders the link as an elliptic arc. This requires specifying an `arcCenter`. The viewer calculates the ellipse passing through the start and end nodes with the given center.
*   **Semicircle (semicircle)**: Renders a cubic Bezier curve that approximates a semicircle between two nodes.
*   **Rectangle (rectangle)**: Renders a semi-rectangular path with rounded corners, often used to avoid overlapping with other visual elements.
*   **Spline (spline)**: Renders a quadratic Bezier curve. The curvature can be controlled via the `curvature` property (percentage from -100 to 100), or explicitly set by providing a `controlPoint`.
*   **Invisible (invisible)**: The link is not rendered visually but still acts as a constraint for the force-directed layout and can convey lyphs.
*   **Path (path)**: A specialized geometry used for edge bundling, where the link is represented by a sequence of points.
*   **Ellipse (ellipse)**: Specifically for scaffold wires, renders the wire as a full ellipse.

These topologies are particularly useful for emulating circulation or complex vessel paths. For example, using `arc` geometry can emulate circular or elliptical circulation loops.

#### Link Geometry Properties

| Property | Description | Applies to |
| --- | --- | --- |
| `geometry` | The type of geometry to use (`link`, `arc`, `semicircle`, `rectangle`, `spline`, `invisible`, `path`, `ellipse`). | All links/wires |
| `arcCenter` | Coordinates of the center point for elliptic arcs. | `arc` |
| `curvature` | Percentage value (-100 to 100) determining the curve of the spline. | `spline` |
| `controlPoint` | Explicit coordinates for the Bezier control point. | `spline` |
| `stroke` | Visual style of the link: `thick`, `dashed`, or `normal`. | All visible links |
| `lineWidth` | Thickness of the link when `stroke` is set to `thick`. | `thick` links |

---

## Lyph Scaling and Coloring

Lyphs are the primary functional units in ApiNATOMY. Their visual size in the viewer is determined by their axis (the Link they are conveyed by) and specific scaling properties.

### Lyph Coloring

To maintain visual consistency and biological meaning, the viewer follows specific coloring rules:
*   **Template Inheritance**: Lyphs generated from the same **template** share the same color. This helps users quickly identify functionally similar structures across the model.
*   **Explicit Color**: Modellers can override the default coloring by providing a `color` property in the lyph definition.
*   **Layer Coloring**: Individual layers within a lyph can also have their own colors, typically inherited from the material they represent.

### Automatic Scaling (sizeFromAxis)

By default, a lyph's dimensions are derived from its axis length. This ensures that the lyph structure remains proportional to the underlying connectivity graph.

1.  **Axis Length**: The target length of the link (set via the `length` property) defines the base unit for scaling.
2.  **Scale Property**: The `scale` object allows adjusting the lyph's width and height as a percentage of the axis length.
    ```json
    "scale": { "width": 50, "height": 50 }
    ```
    In this example, the lyph's width and height will be 50% of its axis length.
3.  **Default Scale**: If not specified, the default scale is typically 40% for width and 80% for height.

### Explicit Dimensions

If you want a lyph to have a fixed size regardless of its axis length, you can specify explicit `width` and `height` values. These values override the automatic scaling logic.

### Layer Sizing

The width of individual layers within a lyph can be controlled:
* By default, all layers share the lyph's width equally.
* **layerWidth**: Defines the percentage of the container lyph's width that a specific layer should occupy.

### Internal Lyph Scaling

Lyphs placed inside other lyphs (`internalLyphs`) are automatically scaled to fit within their container. The viewer ensures that an internal lyph does not exceed 95% of its host's dimensions to maintain visual nesting.

---

## Chains and Trees

For complex structures like chains and trees, the viewer performs additional layout optimizations:
* **Chain Interpolation**: For chains anchored to scaffolds, the viewer interpolates initial node positions along the curve to help the force-directed layout converge faster.
* **Tree Layout**: Canonical trees are laid out as sequences of links, while branching instances use 3D rotations to spread branches in space.
