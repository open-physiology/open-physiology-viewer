# Stratifications and Stratified Regions

Stratifications provide a way to define layered or segmented structures along scaffold wires. They are used to represent tissue layers or regions that follow a specific path defined by the scaffold.

## Data Representation

### Stratification
A `Stratification` is a template that defines a sequence of layers (strata).
- **id**: Unique identifier.
- **strata**: A list of materials representing the layers.
- **subtypes**: An auto-generated property which points startification to the stratified regions it produced.
- **axisWires**: A list of wires surrounded by tissues defined by the stratification.
 
### Stratified Region
A `StratifiedRegion` is a concrete instance of a `Stratification` applied to a specific scaffold wire. It extends abstract `Shape` class which defines a visual resource with border.
- **supertype**: Reference to the parent `Stratification`.
- **axisWire**: Reference to the `Wire` that serves as the axis for this region.

## Generation and Processing

Stratified regions are generated during the scaffold model instantiation. When a `Scaffold` (or `Component`) is processed, the system looks for `Stratification` definitions that list `axisWires`. For each wire in the list, a new `StratifiedRegion` is created and linked to both the wire and the stratification.

This process is handled by `modelClasses.Component.createStratifiedRegions` during model loading.

## Visualization

The visualization of stratifications involves two main steps:

1.  **Template Creation**: `Stratification.prototype.createViewObjects` creates a `THREE.Group` containing a stack of colored rectangles (`THREE.PlaneGeometry`). Each rectangle represents a stratum. The total height of the stack can be proportional to the length of the `conveys` link if available.
2.  **Instance Positioning**: `StratifiedRegion.prototype.updateViewObjects` takes the visual group created by its `supertype` and positions it in the 3D scene.
    -   The group is centered on the `axisWire`.
    -   The group is rotated to align with the direction of the wire (from source to target).
    -   If the wire is marked as `reversed`, the order of strata is flipped.

The size of these regions can be adjusted globally in the viewer via the `stratifiedRegionSize` setting.

## Stratification Editor

The `StratificationEditor` provides a user interface to:
-   Create and delete `Stratification` templates.
-   Manage the list of strata (materials) for each stratification.
-   Assign or remove `axisWires` associated with a stratification.

It is accessible via the editor panel in the viewer application.

## Assignment via Viewer

Users can dynamically assign stratifications to wires directly in the 3D view:
1.  **Right-click** on a scaffold wire (or a placeholder representing a wire).
2.  A **Stratification Dialog** appears, showing a list of available stratification templates with a preview of their strata.
3.  The user can select a template and choose whether to **reverse** the strata order.
4.  Upon confirmation, a new `StratifiedRegion` is created and added to the scene, following the wire's trajectory.

Existing stratified regions can also be deleted via the context menu (Right-click on the region -> Delete).
