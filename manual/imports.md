# Imports Feature

The ApiNATOMY viewer supports a multi-model assembly feature that allows a model to import other models (graphs, scaffolds, or snapshots). This enables modellers to build complex, modular systems by reusing existing components.

## Defining Imports

Imports are specified in the top-level ApiNATOMY JSON model using the `imports` property, which is an array of URLs pointing to other JSON models.

Example:
```json
{
  "id": "main_model",
  "imports": [
    "https://models.apinatomy.org/kidney_scaffold.json",
    "https://models.apinatomy.org/vascular_group.json"
  ]
}
```

## Processing Imports

The viewer processes imports in two main steps: fetching and merging.

### Fetching (mergeWithImports)

The `mergeWithImports` function (in `src/model/modelClasses.js`) asynchronously fetches each model specified in the `imports` array. Once all models are successfully retrieved, they are passed to the `processImports` function.

### Merging (processImports)

The `processImports` function categorizes the imported models into:
- **Scaffolds**: Added to the `scaffolds` array of the parent model.
- **Groups (Graphs)**: Added to the `groups` array of the parent model.
- **Snapshots**: Added to the `snapshots` array of the parent model, allowing the UI to switch between different model states.

Imported models are marked with `imported: true` to distinguish them from native model components.

## Managing Nested Imports

ApiNATOMY supports nested imports, where an imported model can itself have an `imports` property. The viewer manages these through a flattening process:

1. When a model is imported, its own `imports` array is inspected.
2. Any URL in the nested `imports` array that is not already present in the parent model's `imports` array is added to it.
3. This ensures that all required dependencies are discovered and loaded at the top level, avoiding redundant fetches and simplifying the model structure during processing.

## Importing Scaffolds in Groups

If an imported group (graph) contains its own scaffolds, these scaffolds are "uplifted" to the top-level `scaffolds` array. This makes them accessible in the viewer's settings panel, allowing users to control their visibility and parameters regardless of where they were originally defined.
