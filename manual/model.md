# [JSON Schema](../schema/index.html)
 The ApiNATOMY input data is a JSON model that matches the [ApiNATOMY JSON Schema](../schema/index.html). The schema provides a contract between the input data and the lyph viewer component. Follow the link above to see the bootprint of the schema.
 
# Data Model
 In the nutshell, the lyph viewer expects as input a JSON object that 
  contains sets of entities which are either 
  nodes, links, lyphs, materials or groups which contain subsets of these entities. 
  Properties of these objects reflect the meaning and parameters of the associated physiological elements (connections, processes or tissue composition) as well as provide positioning constraints that help us to assemble them into structurally correct models of physiology. 
  
 In this manual, we explain, using small examples, how ApiNATOMY data model definitions render into graphical elements displayed by the lyph viewer. 

## Entity
 All ApiNATOMY modelling elements have a common ancestor, an abstract entity that defines common properties present in all objects of the model.
  
 All entities come with basic properties such as `id` and `name` to identify the physiological element, and `color` to display the corresponding visual object in the viewer. The identifiers of all entities must be unique, the tool will issue a warning if this is not the case. 
 
 Each object has a read-only property `class` (the user does not need to specify it, it is assigned automatically) that returns its class from the ApiNATOMY data model, such as `Node`, `Link`, `Lyph`, `Material` or `Group`. The property `external` may be used to keep a reference to an external data source that defines or describes the entity, i.e., the [Foundational Model of Anatomy (FMA)](http://si.washington.edu/projects/fma) ontology. 
  
 The property `infoFields` lists properties that are shown in the information panel of the viewer. These properties are typically set by default for all entities of the certain type, but may also be overridden for individual objects. For example, the following value of the `infoFields` property of a lyph object
 ```json
   {
       "infoFields": {
         "text"   : [ "id", "name", "topology" ],
         "objects": [ "axis" ],
         "lists"  : [ "layers" ]
       }
   }
 ```
 will instruct the viewer to show the lyph's `id`, `name`, and `topology` as simple text, the signature of the link representing its rotational `axis`, and a list of signatures for the lyph layers. 
  
 Each object can have auxiliary boolean parameters `hidden`, `inactive`, and `skipLabels` that influence on its visibility, possibility to highlight the corresponding visual object and the visibility of its text label(s) in the lyph viewer, respectively.

 The models of physiology systems may contain thousands or even millions of entities. While the majority of the information will come from existing data sources (publicly maintained data sets, ontologies, clinical trials, experiments, etc.), and converted to the expected format with the help of some data manipulation scripts, many properties in our model are specific for the lyph viewer. The derived input model has to be augmented with properties that help the viewer to produce a meaningful and clean graph layout. It is likely that it will take at least several attempts for the modeller to figure out the proper constraints for the intuitive visualization of a certain model. For example, one may want to draw links that represent all blood vessels as straight thick red lines or show neural connections as curved thin blue paths.
 
 To simplify the parameter setting process, we provide means to assign valid properties to subsets of entities in the model. 
 Each object may contain a property `assign` with two fields: `path` which contains a [JSONPath](https://www.npmjs.com/package/jsonpath) expression, and `value` object, that contains a JSON object to merge with each and every item in the set defined by the query in the `path`. For example, the following code assigns `color` and `scale` properties to all lyphs in the `Neural system` group:   
```json
  {
    "id"    : "group1",
    "name"  : "Neural system",
    "assign": {
        "path"    : "$.lyphs[*]",
         "value"  : {
           "color": "#aaa",
           "scale": { "width": 200, "height": 100 }
      }
    }
  }
```
  <img src="asset/assign.png" height="300px" caption = "Assigning properties to a group of lyphs">

 In addition to the assignment of properties, either individually or as part of a dynamic group, we allow users to apply color interpolating schemes and gradual distance offsets. This is done with the help of the object's property `interpolate`.
 If the JSONPath query returns a one dimensional array, the schema is applied to its elements. If the query produces a higher-dimensional array, the schema is iteratively applied to all one-dimensional splices of the array.
 For example, the following fragment colors three layers of every lyph in the ``Neural system`` group of lyphs using the shades of blue, starting from the opposite side of the color array with 25% offset to avoid very light and very dark shades:
 
 ```json
   {  
      "interpolate": { 
          "path"   : "$.lyphs[*].layers",
          "color"  : {
             "scheme": "interpolateBlues",
             "offset": 0.25,
             "length": 3,
             "reversed": true
          }
        }
    }
 ```
   <img src="asset/interpolate.png" height="300px" caption = "Assigning colors to a group of lyphs using a color interpolation scheme">

 For the details on supported color schemes, and specification format for interpolating colors and distance offsets, see the [ApiNATOMY JSON Schema](../schema/index.html) documentation.
     
## Node  
The ApiNATOMY model essentially defines a graph where the positions of nodes are computed by the force-directed layout. Nodes connect links which convey lyphs, the main modelling concept in the ApiNATOMY framework.

 Nodes are represented by spheres. The radius of the sphere is computed based on the value of the node's `val` property (the exact value depends also on the scaling factor, there is no well-defined physical characteristic associated with the numeric value of this property). 
 
 Properties `charge` and `collide` allow users to tune the forces applied to a specific node. 

 A modeller can control the positions of the nodes by assigning the desired location via the `layout` property. For example, the image below illustrates the graph for the 5 core nodes: 

```json
  {
    "nodes": [
        {
          "id"    : "a",
          "name"  : "a",
          "color" : "#808080",
          "val"   : 10,
          "fixed" : true,
          "layout": { "x" : 0, "y" : 0, "z" : 0 }
        },
        {
          "id"    : "c",
          "name"  : "c",
          "color" : "#D2691E",
          "val"   : 10,
          "layout": { "x" : 100, "y" : 0, "z" : 0 }
        },
        {
          "id"    : "n",
          "name"  : "n",
          "color" : "#D2691E",
          "val"   : 10,
          "layout": { "x" : -100, "y" : 0, "z" : 0 }
        },
        {
          "id"    : "L",
          "name"  : "L",
          "color" : "#ff0000",
          "val"   : 10,
          "layout": { "x" : 0, "y" : -75, "z" : 0 }
        },
        {
          "id"    : "R",
          "name"  : "R",
          "color" : "#7B68EE",
          "val"   : 10,
          "layout": { "x" : 0, "y" : 75, "z" : 0 }
        }
      ]
    }
```
  <img src="asset/nodes.png" height="300px" caption="Positioning nodes">

 In the above example, four nodes are positioned along `x` and `y` axes. The value of each coordinate is expected to be between -100 and 100, these numbers refer to the percentage of the lengths from the center of coordinates. The actual coordinates are then computed depending on the internal scaling factor. 

 The node `a` is placed to the center of coordinates. It is marked as `fixed`. Positions of fixed nodes are set to coincide with the desired positions in the `layout` property. For other types of nodes, the layout only defines the position the node is attracted to while its actual position `(x, y, z)` may be influenced by various factors, i.e., global forces in the graph, rigidity of the links, positions of other nodes, etc. Note that assigning (`x`, `y`, `z`) coordinates for the node in the model is ineffective as these properties are overridden by our graph layout algorithm and the initial settings will simply be ignored. The tool issues the corresponding warning if an unexpected property is present in the model. 

 It is important to retain in the model the containment and spacial adjacency relationships among entities. Several properties of a node object are used to constraint the positions of the node on a link, within a lyph or on its surface. It is also possible to define the desired position of a node in the graphical layout based on the positions of other nodes.
 
 To place a node on a link, we assign the link's ID to the node's property `host`.
 The related optional property `offset` can be used to indicate the offset in percentage from the start of the link. Thus, the definition below 
 ```json
    {
      "id"    : "nLR00",
      "host"  : "LR",
      "offset": 0.25
    }
 ```
 instructs the viewer to position the node `nLR00` at the quarter of the length of the link `LR`. 
 
 <img src="asset/host.png" height="300px" caption="Node hosted by a link">
 
 An alternative way to get the same result, is to include the node's ID to the `hostedNodes` property of the link.

 To place a node on a lyph, assign the lyph's ID to the node's `internalNodeInLyph` property. This will force the node to attract to the lyph's center. An alternative way to get the same result is to include the node's ID to the `internalNodes` property of the lyph.
 
 To place a node to the center of coordinates of a set of other nodes, list their ID's in the `controlNodes` array.
 
## Link 
 Links connect graph nodes and perform a number of functions in the ApiNATOMY framework, most notably, they model process flow and serve as rotational axes to position and scale conveying vessels and body elements at various scales (organs, tissues, cells, etc.).

 By default, all links are drawn as straight solid lines, this corresponds to the `type=link` setting. To apply another visualization method, we set the link's `type` to one of the supported values enumerated in the ApiNATOMY JSON Scheme. For example, `type="semicircle"` produces a spline that resembles a semicircle while `type="dashed"` corresponds to a straight dashed line. 
 ```json
  {
    "links": [
         {
           "id"        : "RL",
           "name"      : "Pulmonary",
           "source"    : "R",
           "target"    : "L",
           "type"      : "semicircle",
           "length"    : 75,
           "linkMethod": "Line2"
         },
         {
           "id"        : "LR",
           "name"      : "Systemic",
           "source"    : "L",
           "target"    : "R",
           "type"      : "semicircle",
           "length"    : 75,
           "linkMethod": "Line2"
         },
         {
           "id"     : "cn",
           "source" : "c",
           "target" : "n",
           "type"   : "dashed",
           "length" : 100
         }
       ]
    }
 ```
 <img src="asset/links.png" height="300px" caption = "Drawing links">
 
 Among other link types supported by the lyph viewer are `path` to draw graph edges bundled together, and `container` links to draw links not effected by force-directed layout. 
 
 There are also two auxiliary link types: `invisible` links which are never displayed themselves but serve as axes for the lyphs they convey. The `force` links have no corresponding visual objects and currently only serve the purpose of binding together selected nodes. The `invisible` links can either be defined explicitly in the model or auto-generated if a lyph that is an `internalLyph` of some other lyph is not conveyed by any user-defined link in the model. 
          
 The property `linkMethod` can be set to `Line2` to indicate that the link should be drawn as a thick line. This property was introduced to overcome a well-known WebGL [issue](https://mattdesl.svbtle.com/drawing-lines-is-hard) with drawing thick lines. It instructs the lyph viewer to use a custom vertex shader. The optional property `linewidth` can be used to specify how thick such links should be (its default value is 0.003).  
 
 The property `length` defines the desired distance between the link ends in terms of the percentage from the maximal allowed length (which is equal to the main axis length in the lyph viewer). The link force from the [d3-force-3d](https://github.com/vasturiano/d3-force-3d#links) module pushes the link's source and target nodes together or apart according to the desired distance. More details about these parameters can be found in the documentation of the module. 
 
 A link of any type can be set to be `collapsible`. A collapsible link exists only if its ends are constrained by the visible entities in the view, i.e., the link's source and target nodes must be inside of visible lyphs, on separate lyph borders or are hosted by other visible links. If this is not the case, the source and target nodes of the collapsible link are attracted to each other until they collide to look like a single node. 
 
 Collapsible links are auto-generated for the models where one node is constrained by two or more different entities meaning that it should be placed to several different locations. This functionality allows modellers to include the same semantic entity to various subsystems in the model, even if these subsystems are split by some space for readability. The auto-generated collapsible links are of type `dashed` to emphasize that the link is an auxiliary line that helps to locate duplicates of the same node.
 
 The screenshots below show the link chain representing the anterolateral apinothalamic tract in isolation and in combination with the neural system group. Observe that in the latter case the tract's nodes are bound to the neural system lyph borders with thin dashed transitions among pairs of replicated node instances. 
 
 <img src="asset/collapsible1.png" height="300px" caption = "Unconstrained collapsible links">
 
 <img src="asset/collapsible2.png" height="300px" caption = "Constrained collapsible links">
    
 Each link object must refer to its `source` and `target` nodes. 
 Although we never draw arrows, all links in the ApiNATOMY graph are directed links.
 It is possible to change the direction of the link without overriding the `source` and `target` properties. If the boolean property `reversed` is set to `true`, its direction vector starts in the `target` node and ends in the `source` node, this is useful if we want to turn the lyph it conveys by 180 degrees. 
 
 A link may have a conveying lyph which is set via its property `conveyingLyph`. The lyph conveyed by the link is placed to its center and uses the link as its rotational axis. The size of the lyph in the lyph viewer depends on the link's length, a more detailed of the size computation is given in the [Lyph](#lyph) section. Hence, one can define the same relationship from the other entity's perspective: by assigning the link's ID to the lyph's property `axis`. 
 
 The property `hostedNodes` may contain a set of nodes that are positioned on the link.
 This set should never include the link's source and target nodes.
 
## Lyph 
 Lyphs in the ApiNATOMY lyph viewer are shown as 2d rectangles either with straight or rounded corners. A lyph defines the layered tissue material that constitutes a body conduit vessel (a duct, canal, or other tube that contains or conveys a body fluid) when it is rotated around its axis. 
 
 The shape of the lyph is defined by its `topology`. The topology value `TUBE` represents a conduit with two open ends. The values of `BAG` and `BAG2` represent a conduit with one closed end. Finally, the topology value `CYST` represents a conduit with both ends closed (a capsule). 
 
 ```json
 {
 "lyphs": [
     {
       "id"      : "5",
       "name"    : "Kidney Lobus",
       "topology": "BAG",
       "external": "FMA:17881",
       "layers"  : [ "7", "6"],
       "scale"   : { "width": 50, "height": 50 },
       "axis"    : "k_l"
     },
     {
       "id"   : "6",
       "name" : "Cortex of Kidney Lobus",
       "topology": "BAG"
     },
     {
       "id"   : "7",
       "name" : "Medulla of Kidney Lobus",
       "topology": "BAG"
     }
   ]
 }
 ```
 In addition to the nodes and links created in the previous sections and a new link `k_l` with source node `k` and target node `l`, the code above produces a bag with two layers conveyed by the `k_l` link.
 
 <img src="asset/lyph.png" height="300px" caption = "Drawing lyphs">
 
 The center of the axial border of the lyph (see [Lyph border](#lyph-border)) always coincides with the center of its axis. The lyph's dimensions depend on its axis and can be controlled via the `scale` parameter. In this example, the lyph's length and height are half the length of the link's length (50%). If you do not want a lyph size to depend on the length of its axis, assign explicit values to the properties `width` and `height`.
 Lyph's properties `thickness` and `length` refer to the anatomical dimensions of the related conduits. At the moment, these parameters do not influence on the size of the graphical objects representing lyphs. 
   
 The lyph above consists of 2 layers. A layer is a lyph that rotates around its container lyph. The lyph's layers are specified in the property `layers` which contains an array of layers. Each layer object is also aware in what lyph it works as a layer via its field `layerInLyph`. Similarly to other bi-directional relationships, it is sufficient to specify only one part of it in the model, the related property is inferred automatically.
 By default, all layers get the equal area within the main lyph. Since all layers have the same height as the hosting lyph, the area they occupy depend on the width designated to each layer. The percentage of the width of the main lyph's width a layer occupies can be controlled via the `layerWidth` parameter. For instance, the code below, set the outer layers of all lyphs in the neural system group (see the example in the [Entity](#entity) section) to occupy 75% of their total width.
 ```json
  {
     "id"    : "largeOuterLayers",
     "name"  : "Enlarged outer layers of neural system lyphs",
     "lyphs" : ["155", "150", "145", "140", "135", "160"],
     "assign": [
       {
         "path" : "$.lyphs[*]",
         "value": {
           "layerWidth": 75
         }
       }
     ]
  }
 ```
 
 The property `internalNodes` may contain a set of nodes that have to be positioned on the lyph. Such nodes will be projected on the lyph's surface and attract to its center. Note that the viewer will not be able to render the graph if the positioning constraints are not satisfiable, i.e., if one tries to put the source or target node of the lyph's axis inside of the lyph, the force-directed layout method will not converge.
 
 The property `internalLyphs` is used to define the inner content of the lyph, i.e., neurons within the neural system parts. The related property, `internalLyphInLyph`, will indicate to which lyph the given lyph belongs. 
 
 Just like any other lyph, internal lyphs should have an axis of rotation to be hold in place. In practice, there may be elements with uncertain or unspecified position within a larger element, i.e., blood cells within blood fluid. Until the method of positioning of inner content within a lyph is clarified by the physiology experts, we auto-generate links and position them in a line along the radial axis of the container lyph.  
 
 It is possible to model a lyph within another lyph via explicit relationships, i.e., among its axis ends and lyph borders. 
 
 To sketch an entire process or a subsystem within a larger scale lyph, i.e., blood flow in kidney lobus, one may use the `hostedLyphs` property. Hosted lyphs get projected on the container lyph plane and get pushed to stay within its borders.
 
  ```json
       {
         "id"         : "5",
         "name"       : "Kidney Lobus",
         "topology"   : "BAG",
         "hostedLyphs": [ "60", "105", "63", "78", "24", "27", "30", "33" ]
       }
   ```
  <img src="asset/hostedLyphs.png" height="300px" alt = "Lyph on border">
  
  A list of materials used in a lyph is available via its field `materials`, i.e.,:
    ```json
      {
          "id"       : "112",
          "name"     : "Lumen of Pelvis",
          "topology" : "TUBE",
          "materials": [ "9", "13" ]
      }
    ```
 
 Often a model requires many lyphs with the same layer structure. To simplify the creation of sets of such lyphs, we introduced a notion of the lyph template. A lyph with property `isTemplate` set to true, serves as a prototype for all lyphs in its property `subtypes`: such lyphs inherit their layers from the their `supertype`. 
 In the example below, six lyphs are defined as subtypes of a generic cardiac lyph which works as a template to define their layer structure.
 
 ```json
 {
    "lyphs": [
         {
           "id"        : "994",
           "name"      : "Cardiac Lyphs Prototype",
           "layers"    : [ "999", "998", "997" ],
           "isTemplate": true,
           "subtypes"  : [ "1000", "1001", "1022", "1023", "1010", "1011" ]
         },
         {
           "id"   : "1000",
           "name" : "Right Ventricle"
         },
         {
           "id"   : "1010",
           "name" : "Left Ventricle"
         }
    ] 
 }
 ``` 
 <img src="asset/cardiac.png" height="300px" alt = "Lyph templates">
 
 Note that inheriting layer structure from the lyph template differs from assigning layers explicitly to all subtype lyphs, either individually or via the group's `assign` property. A lyph with the same ID cannot be used as a layer in two different  lyphs, that would imply that the same graphical object should appear in two different positions, and its dimensions and other context-dependent properties may vary as well. The code above instead implies that we replicate each of three template layers six times, i.e., 18 new lyphs are auto-generated and added to the model for the specification above.  
 
 It is possible to customize some of the `subtype` - `layer` pairs with the help of the context-dependent queries. For example, the code below

  ```json
  {//...
     "assign": [
       {
         "path": "$.[?(@.id=='1000')].layers[(@.length-1)]",
         "value": { "internalLyphs": [ "995" ] }
       },
       {
         "path": "$.[?(@.id=='1010')].layers[(@.length-1)]",
         "value": { "internalLyphs": [ "996" ] }
       }
     ]
  }
  ```  
  assigns `internalLyphs` to two outer most layers of lyphs `1000` and `1010` while other auto-generated layers remain unchanged. These internal lyphs can be seen as yellow cysts on the image above.

   The pair of properties `subtypes` and `supertype` can be used to specify a generalization relationship among lyphs without replicating their layer structure or any other properties. To trigger the derivation of layer structure, it is essential to set the `isTemplate` property to `true`. 
     
   Lyph coalescences can be defined via the `coalescesWith` property. Coalescing lyphs share the outer layer and the layout algorithm will try to align them.      

 
 ### Lyph border
 
 The lyph's topology is closely related to the notion of the lyph `border`. In the 2d view, a lyph border is its perimeter line, in 3d view, it is a surface area of the conduit defined by the lyph. 
 
 The lyph border is an object that extends `Entity` and inherits all its properties: it can have its own ID, a name, a reference to an external source, etc. A lyph can refer to its border via its `border` field.  However, practically, lyph borders do not make much sense without their hosting lyphs. Hence, we auto-generate lyph borders for all lyphs in the model and merge inline objects defining border content within a lyph with the generated object. The modeller should only specify entities hosted by the lyph's border if the model implies the anatomical relationships among the corresponding concepts.
    
 On each lyph border, i.e., the entire lyph perimeter, we distinguish 4 border segments: lyph's inner longitudinal (axial) border, first radial border, outer longitudinal border, and second radial border, roughly corresponding to the 4 sides of the lyph's rectangle. The axial border is always aligned with the lyph's axis (the link that conveys this lyph). All border segments can be accessed via the lyph border property `borders` which is always an array of 4 objects. 
 
 It is possible to place nodes and other lyphs on any of the border segments. 
 The `hostedNodes` property in the fragment below forces 3 nodes with the given identifiers to stick to the 2nd radial border of the Kidney Lobus lyph (see the screenshot illustrating the `hostedLyphs` property):
  
  ```json
     {
       "id"      : "5",
       "name"    : "Kidney Lobus",
       "topology": "BAG",
       "border"  : {
         "borders": [ {}, {}, {}, { "hostedNodes": [ "nPS013", "nLR05", "nLR15" ] } ]
       }
     }
  ```

 Similarly, in the next snippet, the model indicates that the 4th (2nd radial) border must convey the lyph with `id = "5"`.
 
 ```json
     {
       "id"      : "3",
       "name"    : "Renal Parenchyma",
       "topology": "BAG",
       "border"  : {
         "borders": [ {}, {}, {}, { "conveyingLyph": "5" } ]
       }
     }
  ```
 <img src="asset/lyphOnBorder.png" height="300px" alt = "Lyph on border"> 
 
 Here one may observe that the conveyed lyph is using the container lyph's border as its axis. To avoid a whole new level of complication in the modelling schema by supporting lyphs that rotate around border objects, we auto-generate implicit and invisible straight links that coincide with lyph borders conveying lyphs.   
      
## Material
 The ApiNATOMY model can contain definitions of materials, e.g.:
 ```json
   {
      "materials": [
           {
              "id"  : "9",
              "name": "Biological Fluid"
           },
           {
              "id"  : "13",
              "name": "Urinary Fluid"
           }
      ]
   }
 ```

 At the moment, we do not include material objects into the graph schematics.  Materials of a lyph can be displayed on the information panel if the `infoFields` property of the lyph is configured to show them.

## Group
 A group is a subset of entities from the ApiNATOMY model (which can also be seen as a  group) that have a common semantic meaning and/or a distinct set of visual characteristics. A group can include `nodes`, `links`, `lyphs`, `materials`, and other `groups` (subgroups) via the properties with the corresponding names.
 
 In the example below, we define a group of blood vessels by joining two subgroups, arterial and venous vessels.
 
 ```json
    {
      "groups": [
        {
          "id"    : "omega",
          "name"  : "Blood vessels",
          "groups": ["arterial", "venous"]
        },
        {
          "id"   : "arterial",
          "name" : "Arterial",
          "nodes": [ "nLR00", "nLR01", "nLR02", "nLR03", "nLR04", "nLR05" ],
          "links": [ "LR00", "LR01", "LR02", "LR03", "LR04" ]
        },
        {
          "id"   : "venous",
          "name" : "Venous",
          "nodes": [ "nLR10", "nLR11", "nLR12", "nLR13", "nLR14", "nLR15", "nLR16" ],
          "links": [ "LR10", "LR11", "LR12", "LR13", "LR14", "LR15" ]
        }
      ]
    }
 ```
 
 In the current version of the viewer, checkbox controls are added to the Control Panel for all top level groups so that users can see each of them in isolation or analyze the interaction among selected combinations of entities without overloading the view with unnecessary information. Since at the moment there is no functionality associated with various levels of group nesting, the content of nested groups is unfolded and copied to the top level groups. Note that if someone wants to hide or show a subgraph, it is not necessary to list lyphs conveyed by the graph links, the lyphs are considered part of the link definition for that purpose. However, if one wants to be able to toggle a certain set of lyphs but not their axes, the lyphs should be included to some group explicitly.  
    
    
 
 
  
 

