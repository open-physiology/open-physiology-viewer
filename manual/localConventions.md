# Local Conventions

Local conventions are used in ApiNATOMY models to map CURIE-style prefixes (Compact URIs) to full URI namespaces. This allows modellers to use short, readable identifiers for external resources while maintaining the ability to generate valid JSON-LD and resolve external references.

## Defining Local Conventions

In an ApiNATOMY JSON model, local conventions are defined as an array of objects, where each object contains a `prefix` and its corresponding `namespace`.

Example:
```json
{
  "localConventions": [
    {
      "prefix": "FMA",
      "namespace": "http://purl.org/sig/ont/fma/fma"
    },
    {
      "prefix": "RO",
      "namespace": "http://purl.obolibrary.org/obo/RO_"
    }
  ]
}
```

With these conventions, an external reference like `FMA:62955` can be automatically expanded to `http://purl.org/sig/ont/fma/fma62955`.

## Processing Local Conventions

The ApiNATOMY viewer processes local conventions in two main stages: JSON model parsing and JSON-LD generation.

### CURIE Expansion during Parsing

When a JSON model is loaded, the `replaceReferencesToExternal` function (in `src/model/utilsParser.js`) iterates through the model resources. If it encounters a string that starts with a defined prefix followed by a colon (e.g., `FMA:`), it replaces the prefix with the corresponding namespace URL.

This ensures that internal model representations use full URIs for external entities, avoiding ambiguity.

### JSON-LD Context Generation

Local conventions play a crucial role in enabling the conversion of ApiNATOMY JSON models to JSON-LD.

In `src/model/utilsJSONLD.js`, the `getJSONLDContext` function uses `localConventions` to build the `@context` for the JSON-LD output. For each convention, it adds a mapping to the context:

```javascript
(inputModel.localConventions || []).forEach((obj) =>
    curiesContext[obj.prefix] = {"@id": obj.namespace, "@prefix": true});
```

This allows the resulting JSON-LD to remain compact and readable while being strictly compliant with Semantic Web standards. The `@prefix: true` directive in JSON-LD 1.1 indicates that the prefix can be used to expand CURIEs within the document.

## Usage in Resource Annotation

Local conventions are typically used with properties like `external`, `references`, and `ontologyTerms`. 

Example of a lyph annotated with an ontology term using a local convention:
```json
{
  "id": "lyph_1",
  "name": "Heart",
  "ontologyTerms": ["FMA:7088"]
}
```

If `FMA` is defined in `localConventions`, the viewer will be able to resolve this term to its full URI and include it correctly in the exported JSON-LD graph.
