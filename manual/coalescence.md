# Coalescence Visualization

Coalescence in the Open Physiology Viewer represents the merging of lyphs (e.g., when they share the same space or are connected). This document describes how coalescences are generated, visualized, and how users can interact with them.

## Generation of Coalescence Nodes

Coalescence nodes are generated automatically for each coalescence defined in the model that is not an "embedding" topology. The generation process is handled by `Group.createCoalescenceNodes` and `Coalescence.createNodes`.

### Coalescence Node Components
- **Main Coalescence Node**: A visible node (often styled as a colorful circle) that represents the coalescence resource. It contains the property `representsCoalescence`, which stores the ID of the coalescence resource.
- **Invisible Control Nodes**: For each lyph involved in the coalescence, an invisible node is created. These nodes are placed "internally" to the coalescing lyphs (`internalIn` property).
- **Dashed Links**: The main coalescence node is connected to each invisible control node by a dashed link, visually indicating which lyphs are part of the coalescence.

## User Interaction

Users can interact with coalescences in the 3D scene:

1.  **Double-click on a Lyph**: If a lyph is part of a coalescence, double-clicking it will toggle the visibility of the "coalescence group" containing the coalescence node and its links.
2.  **Double-click on a Coalescence Node**: This action opens the `Coalescence Dialog`, providing a detailed view of the merging lyphs and their internal components.

## Coalescence Dialog (`coalescenceDialog.js`)

The `CoalescenceDialog` is the primary interface for inspecting a coalescence.

### Organization
- **Unique Lyph Pairs**: The dialog calculates all unique pairs of lyphs involved in the coalescence using the `uniquePairs` method.
- **Tabbed Interface**: 
    - **Overview Tab**: Shows all unique pairs in a simplified view.
    - **Detail Tabs**: Each pair has its own tab (numbered 1, 2, etc.) for a more detailed inspection.
- **Components**: It hosts multiple `CoalescencePanel` instances, one for each pair.

## Coalescence Panel (`coalescencePanel.js`)

The `CoalescencePanel` visualizes the merging of two lyphs and their internal "cells."

### Data Structures
- `lyphCellMap`: A map from host lyph ID to a set of chains (proteins) that are bundled in its layers.
- `layerCellLevelMap`: Maps layers to the cells they contain.
- `pairCellLevelMap`: A combined map that tracks which cells from lyph A might merge with cells from lyph B based on the coalescence.
- `lyphRectMap`: Maps lyph/layer IDs to their SVG rectangle representations for interaction handling.

### Visual Functionality
- **Merging Animation**: Uses D3 animations (`animate_mergeRects`) to show lyph A and lyph B moving toward each other to a central point, symbolizing the coalescence.
- **Cell Visualization**: If `showCells` is enabled, it draws internal chains (cells) within the lyph layers.
- **Interaction**: Clicking on a layer rectangle or a cell in the panel opens a `LyphPanel` for further detail.

## Lyph Panel (`lyphPanel.js`)

The `LyphPanel` provides a high-resolution view of one or more lyphs/cells.

### Purpose
- **Internal Structure**: Displays the layers of a lyph, respecting its topology (e.g., `BAG`, `CYST`, `TUBE`).
- **Provided Chains**: Visualizes proteins or chains that a lyph "provides" (e.g., proteins produced in a cell). These are often represented as star shapes.
- **Detailed Information**: Clicking on a "provided chain" (star) displays a small information card with the chain's ID, name, and description.

### Data Structures
- `lyphs`: An array of lyph objects to be displayed.
- `right`: A set of lyph IDs that should be oriented to the right (used for `BAG` topology orientation in merging views).
