# Versioning and Metadata

The ApiNATOMY viewer uses several mechanisms to track and ensure consistency between the input model, its internal representation, and the schema it adheres to.

## Schema Versioning (graphScheme.json)

The core data model for ApiNATOMY is defined in `src/model/graphScheme.json`. This JSON schema provides the contract for all input data. To ensure that the generated model is consistent with the schema it was validated against, the viewer computes a hash of the current schema and stores it in the model:

- `inputModel.schemaVersion`: A hash representing the current version of the ApiNATOMY schema.

## Input Model Versioning

During the model generation process (`generateFromJSON` in `src/model/modelClasses.js`), the viewer automatically assigns a version identifier to the input model:

- `inputModel.version`: A hash of the input model itself. This helps to identify whether the source data has changed between different sessions or exports.

Additionally, the viewer ensures each model has a unique `id` and `namespace`:

- `id`: If not provided, it defaults to `"main"`.
- `namespace`: If not provided, it is generated based on the model ID (e.g., `"nm_main"`). The `fullID` of each resource is then formed by combining its local identifier with this namespace, ensuring uniqueness in multi-model assemblies.

## Generated Model Versioning

The viewer maintains its own build version, which can be seen in the about dialog and UI components. This version follows the format `YYYY.MM.DD.build_count` and is updated automatically during each build.

## Versioning in JSON-LD

When the model is exported to JSON-LD, the viewer uses `@version 1.1` in its context to support advanced features like CURIE expansion and scoped contexts. Metadata about the model is also included in the JSON-LD `@graph` under the `apinatomy:GraphMetadata` type, linking back to the input model's metadata.
