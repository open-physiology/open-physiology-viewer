# Validation messages

The ApiNATOMY viewer allows users to create, edit, load and compose model specifications.
Naturally, such specifications may be incomplete or obsolete.
They may contain errors, inconsistencies, or conflicting definitions.
It is not possible to prevent all errors with just syntactic JSON-schema-based validation.
While creating resource map from serialized input model, the tool checks whether assumed constraints are satisfied and provides
corresponding log messages that may help users to debug and fix the model.


## Errors

```json
CHAIN_LEVEL_ERROR           : `A mismatch between link ends found at level`,
CHAIN_LYPH_TEMPLATE_MISSING : "Failed to find the lyph template definition in the parent group",

COALESCENCE_NO_LYPH         : "Unable to access lyph for coalescence definition",

EXCEL_DATA_TYPE_UNKNOWN     : "Excel to JSON: failed to determine data type",
EXCEL_INVALID_COLUMN_NAME   : "Excel to JSON: invalid column name",
EXCEL_NO_COLUMN_NAME        : "Excel to JSON: no column name",
EXCEL_PROPERTY_UNKNOWN      : "Excel to JSON: unrecognized property",
EXCEL_WRONG_ASSIGN_VALUE    : "Excel to JSON: wrong assign value",

GROUP_NO_LINK_VALIDATE      : "Link has no validateProcess function. Possible cause - misclassified resource",
GROUP_TEMPLATE_NO_CLASS     : "Could not find class definition for the field",

RESOURCE_JSON_PATH_ERROR    : "Failed to process JSONPath assignment statement",
RESOURCE_NO_REL_CLASS       : "Related resource class is undefined",
RESOURCE_NO_REL_PROPERTY    : "Related property specification is not found in the expected class",
RESOURCE_NO_ABSTRACT_CLASS  : "An abstract relationship field expects a reference to an existing resource or 'class' field in its value definition",
REF_UNDEFINED               : "Remaining references to undefined resources"
```

## Warnings
```json
 AUTO_GEN                    : "Auto-created missing resources",
 AUTO_GEN_EXTERNAL           : "Auto-created missing external resources",

 CHAIN_CONFLICT              : `Conflicting chain specification: both "housingLyphs" and "housingChain" are given. Proceeding with "housingLyphs"`,
 CHAIN_CONFLICT2             : `Conflicting chain specification: both "lyphs" and "levels" arrays are given. Proceeding with "lyphs"`,
 CHAIN_CONFLICT3             : `Conflicting specification of housing layer: layer's bundlesChains} property disagrees with the chain's housingLayers} property`,
 CHAIN_HOUSING_TEMPLATE      : "Housing lyph or its layer is a template",
 CHAIN_MAT_DIFF              : "Incorrectly defined chain pattern - innermost layers do not convey the same material",
 CHAIN_NO_COALESCENCE        : "Skipped a coalescence between a housing lyph and a conveying lyph of the chain level it bundles: the conveying lyph is not defined",
 CHAIN_NO_HOUSING            : `Incorrect chain specification: "housingChain" not found!`,
 CHAIN_NO_HOUSING_LYPH       : "Failed to find chain level housing lyph",
 CHAIN_NO_HOUSING_LAYERS     : "Failed to find all layers of the housing lyph",
 CHAIN_SKIPPED               : `Skipped faulty chain template. A correct chain template must have one of the following conditions met:
                                 (1) "numLevels" set to a positive number and non-empty "lyphTemplate",\n
                                 (2) non-empty list of "lyphs" to join to a chain,\n
                                 (3) non-empty list of "levels" which are (partially defined) links to join to a chain,\n
                                 (4) non-empty list of "housingLyphs",\n
                                 (5) non-empty "housingChain" reference with optional "housingRange" parameter`,
 CHAIN_UNDEFINED             : "Cannot expand undefined chain template",

 CHANNEL_NO_GROUP            : "Cannot create channel instances: canonical group not found",
 CHANNEL_NO_ID               : "Skipped channel template - it must have (non-empty) identifier",
 CHANNEL_NO_HOUSING_LYPH     : "Failed to find channel housing lyph",
 CHANNEL_NO_HOUSING_LAYER    : "Failed to find channel housing lyph layer",
 CHANNEL_NO_NODE             : "Failed to find channel group node",
 CHANNEL_UNDEFINED           : "Cannot expand undefined channel template",
 CHANNEL_VALIDATION_SKIPPED  : "Skipped validation of channel housing lyph: failed to find membrane lyph or material (GO:0016020)",
 CHANNEL_WRONG_LAYER         : "Second layer of the housing lyph is not a (subtype of) membrane (GO:0016020)",
 CHANNEL_WRONG_NUM_LAYERS    : "The number of layers in the housing lyph does not match the number of links in its membrane channel",

 COALESCENCE_NO_AXIS         : "A coalescing lyph is missing an axis",
 COALESCENCE_NO_INSTANCE     : "No lyph instances found for abstract coalescence",
 COALESCENCE_SELF            : "A lyph coalesces with itself or its layers",

 COMPONENT_SELF              : "The model contains self-references or cyclic component dependencies",

 EXCEL_NO_CLASS_NAME         : "Excel to JSON: class name not found",

 GROUP_GEN_NOT_EMPTY         : "Generated group already contains resources",
 GRAPH_LYPH_NO_AXIS          : "Failed to compute axis length for an internal lyph: axis undefined",
 GROUP_SELF                  : "The model contains self-references or cyclic group dependencies",

 LYPH_INTERNAL_NO_LAYER      : "Failed to locate layer lyph to reposition internal lyphs",
 LYPH_INTERNAL_OUT_RANGE     : "Failed to relocate internal lyph to layer: layer index out of range",
 LYPH_NO_TEMPLATE_LAYER      : "Template layer object not found",
 LYPH_SELF                   : "The lyph contains self-references or cyclic lyph dependencies",
 LYPH_SUBTYPE_HAS_OWN_LAYERS : "Subtype lyph already has layers, conflicts with generated layer definitions possible",

 PROCESS_NOT_ADVECTIVE       : "Incorrect advective process: not all innermost layer materials of the conveying lyph are conveyed by the link",
 PROCESS_NOT_DIFFUSIVE       : "Incorrect diffusive process: materials are not conveyed by the innermost layer of the conveying lyph:",

 REGION_ANCHORS_REMOVED      : "Removed internal anchors from region definition in group",
 REGION_FACETS_REMOVED       : "Removed facets from region definition in group",
 REGION_FACET_ERROR          : "Incorrectly defined region facet, skipping definition",
 REGION_FACET_NO_ANCHORS     : "Incorrectly defined region facet, source or target anchors not defined, skipping definition",
 REGION_FACET_NO_LAYOUT      : "Incorrectly defined region facet, source or target anchor layout not defined, skipping definition",

 RESOURCE_ARRAY_EXPECTED     : "Resource property should contain an array",
 RESOURCE_CLASS_UNKNOWN      : "Cannot create a relationship: unknown resource class",
 RESOURCE_COLOR_UNKNOWN      : "Unrecognized color scheme",
 RESOURCE_COLOR_NO_OBJECT    : "Cannot assign color to a non-object value",
 RESOURCE_DOUBLE_REF         : "Resource property should not refer to two distinct resources",
 RESOURCE_DUPLICATE          : "Duplicate resource definition",
 RESOURCE_IGNORE_FIELDS      : "Unknown parameter(s) may be ignored",
 RESOURCE_NUM_ID_TO_STR      : "Converted numeric ID to string",
 RESOURCE_NUM_VAL_TO_STR     : "Converted numeric value of the given resource field to string",
 RESOURCE_NO_CLASS           : "Cannot find resource class: property specification does not imply a reference",
 RESOURCE_NO_CLASS_DEF       : "Cannot find resource class definition",
 RESOURCE_NOT_UNIQUE         : "Resource IDs are not unique",

 TREE_CHAIN_UNDEFINED        : "Cannot create omega tree instances: canonical tree chain undefined!",
 TREE_NO_CHAIN               : "Cannot create omega tree instances: canonical tree chain not found or empty",

 VILLUS_ABSTRACT_HOST        : "Skipping generation of villus group for lyph template",
 VILLUS_NO_HOST              : "Incomplete villus definition: hosting lyph is missing",
 VILLUS_NO_HOST_FOUND        : "Could not find the villus hosting lyph definition in the parent group",
 VILLUS_NO_HOST_LAYER        : "Failed to generate a villus resource: hosting lyph layer is missing",
 VILLUS_TOO_LONG             : "Skipping incorrect villus template: number of villus layers cannot exceed the number of layers in the hosting lyph",
 VILLUS_UNDEFINED            : "Cannot expand undefined villus template"
```

## Information

```json
CHAIN_NUM_LEVELS            : "Corrected number of levels in the chain",
CHAIN_SLICE                 : "Sliced housing chain to match the number of lyphs in the housing range",

GROUP_REF_TO_LYPH           : "Number of replaced references to lyph templates",
GROUP_REF_TO_MAT            : "Number of replaced references to materials",
GROUP_TEMPLATE_OTHER        : "Found template defined in another group",

GRAPH_GEN_AXIS_ALL          : "Generated links for lyphs without axes",
GRAPH_GEN_AXIS_INTERNAL     : "Generated links for internal lyphs",

NODE_CLONE_INTERNAL         : "Cloned node to join housed chain ends",

RESOURCE_JSON_PATH          : "Created relationship via dynamic assignment (JSONPath expression)",
RESOURCE_NUM                : "Number of resources in the generated model",
RESOURCE_TO_LAYER           : "Placed resource into layer",

TREE_GEN_LIMIT              : "Reached maximum allowed number of generated resources per tree instance",
TREE_NO_LEVEL_LINK          : "Failed to find the tree level link, created to proceed",
TREE_NO_LEVEL_TARGET        : "Failed to find tree level target node, created to proceed"
```