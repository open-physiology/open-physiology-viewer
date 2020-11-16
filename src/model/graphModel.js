import { Group } from './groupModel';
import { Resource } from "./resourceModel";
import { Node, Link } from "./visualResourceModel";
import {
    entries,
    keys,
    isNumber,
    cloneDeep,
    defaults,
    isArray,
    isObject,
    isString,
    pick,
    values,
    omit,
    merge, unionBy
} from 'lodash-bound';
import { Validator} from 'jsonschema';
import schema from './graphScheme.json';
import {logger, $LogMsg} from './logger';
import {$Field, $SchemaClass, $Color, $Prefix, getGenID, getSchemaClass, $SchemaType} from "./utils";
import * as jsonld from "jsonld/dist/node6/lib/jsonld";

export { schema };
const DEFAULT_LENGTH = 4;

let baseContext = {
    "@version": 1.1,
    "apinatomy": {"@id": "https://apinatomy.org/uris/readable/",
                  "@prefix": true},
    "elements": {"@id": "https://apinatomy.org/uris/elements/",
                 "@prefix": true},
    "owl": {"@id": "http://www.w3.org/2002/07/owl#",
            "@prefix": true},
    "rdf": {"@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "@prefix": true},
    "rdfs": {"@id": "http://www.w3.org/2000/01/rdf-schema#",
             "@prefix": true},
    "name": "rdfs:label",
    "id": "@id",
    "class": {"@id": "rdf:type",
              "@type": "@id",
              "@context": {"@base": "https://apinatomy.org/uris/elements/"}},
    "topology": {"@id": "apinatomy:topology",
                 "@type": "@id",
                 "@context": {"@base": "https://apinatomy.org/uris/readable/"}},
};

/**
 * Generate a json-ld context from a json schema
 *
 */
function schemaToContext(schema, context, id=null, prefix="apinatomy:") {


    function schemaIsId(scm) {
        return scm::isObject() && (
            scm["$ref"] == "#/definitions/IdentifierScheme" ||
                scm.items && schemaIsId(scm.items) ||
                scm.anyOf && scm.anyOf.filter(schemaIsId).length !== 0);
    }

    if (schema.definitions) {
        schema.definitions::entries()
            .forEach(([did, def]) => {
                schemaToContext(def, context);});
    } else {
        if (id !== null && schemaIsId(schema)) {
            context[id] = {"@id": prefix.concat(id),
                "@type": "@id"};
        } else {
            if (schema.properties) {
                schema.properties::entries()
                    .forEach(([pid, prop]) =>
                        context[pid] = schemaIsId(prop) ?
                            {"@id": prefix.concat(pid),
                                "@type": "@id"} :
                            prefix.concat(pid));
            }
        }
    }
    return context;
}

/**
 * The main model graph (the group with configuration options for the model viewer)
 * @class
 * @property entitiesByID
 * @property config
 */
export class Graph extends Group{

    /**
     * Create expanded Graph model from the given JSON input model
     * @param json - input model
     * @param modelClasses - classes to represent model resources
     * @returns {Graph}
     */
    static fromJSON(json, modelClasses = {}) {
        const V = new Validator();
        let resVal = V.validate(json, schema);
        logger.clear();
        if (resVal.errors && resVal.errors.length > 0){
            logger.warn(resVal);
        }

        let model = json::cloneDeep()::defaults({id: "mainGraph"});

        //Copy existing entities to a map to enable nested model instantiation

        let entitiesByID = {
            waitingList: {}
        };

        //Create graph
        let res = super.fromJSON(model, modelClasses, entitiesByID);

        //Auto-create missing definitions for used references
        let added = [];
        (entitiesByID.waitingList)::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class){
                let clsName = modelClasses[obj.class].Model.relClassNames[key];
                if (clsName && !modelClasses[clsName].Model.schema.abstract){
                    let e = modelClasses[clsName].fromJSON({
                        [$Field.id]        : id,
                        [$Field.generated] : true
                    }, modelClasses, entitiesByID);

                    //Do not show labels for generated visual resources
                    if (e.prototype instanceof modelClasses[$SchemaClass.VisualResource]){
                        e.skipLabel = true;
                    }

                    //Include newly created entity to the main graph
                    let prop = modelClasses[this.name].Model.selectedRelNames(clsName)[0];
                    if (prop) {
                        res[prop] = res[prop] ||[];
                        res[prop].push(e);
                    }
                    entitiesByID[e.id] = e;
                    added.push(e.id);
                }
            }
        });

        //Log info about the number of generated resources
        logger.info($LogMsg.RESOURCE_NUM, entitiesByID::keys().length);

        if (added.length > 0){
            added.forEach(id => delete entitiesByID.waitingList[id]);
            let resources = added.filter(id => entitiesByID[id].class !== $SchemaClass.External);
            if (resources.length > 0) {
                logger.warn($LogMsg.AUTO_GEN, resources);
            }

            let externals = added.filter(id => entitiesByID[id].class === $SchemaClass.External);
            if (externals.length > 0){
                logger.warn($LogMsg.AUTO_GEN_EXTERNAL, externals);
            }
        }

        if ((entitiesByID.waitingList)::keys().length > 0){
            logger.error($LogMsg.REF_UNDEFINED, entitiesByID.waitingList);
        }

        res.syncRelationships(modelClasses, entitiesByID);

        res.entitiesByID = entitiesByID;

        if (!res.generated) {
            res.createAxesForInternalLyphs(modelClasses, entitiesByID);
            res.createAxesForAllLyphs(modelClasses, entitiesByID);
            (res.coalescences || []).forEach(r => r.createInstances(res, modelClasses));
        }

        //Collect inherited externals
        (res.lyphs||[]).filter(lyph => lyph.supertype).forEach(r => r.collectInheritedExternals());

        //Validate coalescences
        (res.coalescences || []).forEach(r => r.validate());

        //Validate channels
        (res.channels || []).forEach(r => r.validate(res));

        //Double link length so that 100% from the view length is turned into 100% from coordinate axis length
        (res.links||[]).filter(link => link::isObject()).forEach(link => {
            if (!link.length) { link.length = DEFAULT_LENGTH; }
            link.length *= 2
        }); 
        delete res.waitingList;

        res.generated = true;
        res.mergeScaffoldResources();

        res.logger = logger;
        return res;
    }

    /**
     * Generate the JSON input model from an Excel file (.xlsx)
     * @param inputModel   - Excel ApiNATOMY model
     * @param modelClasses - model resource classes
     * @returns {*}
     */
    static excelToJSON(inputModel, modelClasses = {}){
        let graphSchema = modelClasses[this.name].Model;
        let model = inputModel::pick(graphSchema.relationshipNames.concat(["main", "localConventions"]));
        const borderNames = ["inner", "radial1", "outer", "radial2"];

        model::keys().forEach(relName => {
            let table = model[relName];
            if (!table) { return; }
            let headers = table[0] || [];
            if (relName === "localConventions") {  // local conventions are not a reasource
                for (let i = 1; i < table.length; i++) {
                    let convention = {};
                    table[i].forEach((value, j) => {
                        if (!value) { return; }
                        if (!headers[j]) {
                            logger.error($LogMsg.EXCEL_NO_COLUMN_NAME);
                            return;
                        }
                        if (!headers[j]::isString()) {
                            logger.error($LogMsg.EXCEL_INVALID_COLUMN_NAME, headers[j]);
                            return;
                        }
                        let key = headers[j].trim();
                        convention[key] = value;
                    });

                    table[i] = convention;
                }
                model[relName] = model[relName].slice(1);
                return;
            }
            let clsName = relName === "main"? $SchemaClass.Graph: graphSchema.relClassNames[relName];
            if (!modelClasses[clsName]) {
                logger.warn($LogMsg.EXCEL_NO_CLASS_NAME, relName);
                return;
            }
            let fields = modelClasses[clsName].Model.fieldMap;
            let propNames = modelClasses[clsName].Model.propertyNames;

            /**
             * Get expected field type
             * @param schema
             * @returns {*|string}
             */
            function getItemType(schema){
                let itemType = schema.type || $SchemaType.STRING;
                if (schema.$ref) {
                    let cls = getSchemaClass(schema.$ref);
                    if (cls) {
                        itemType = getItemType(cls);
                    } else {
                        itemType = $SchemaType.OBJECT;
                    }
                }
                if (schema.type === $SchemaType.ARRAY || schema.items) {
                    itemType = getItemType(schema.items);
                }
                return itemType;
            }

            const convertValue = (key, value) => {
                if (!fields[key]) {
                    logger.warn($LogMsg.EXCEL_PROPERTY_UNKNOWN, clsName, key);
                    return;
                }
                let res = value.toString();
                if (res.length === 0) { return; } //skip empty properties

                let itemType = getItemType(fields[key]);
                if (!itemType){
                    logger.error($LogMsg.EXCEL_DATA_TYPE_UNKNOWN, relName, key, value);
                }

                if (!(itemType === $SchemaType.STRING && propNames.includes(key))) {
                    res = res.replace(/\s/g, '');
                }
                const strToValue = x => (itemType === $SchemaType.NUMBER) ? parseInt(x)
                            : (itemType === $SchemaType.BOOLEAN) ? (x.toLowerCase() === "true")
                            : (itemType === $SchemaType.OBJECT) ? JSON.parse(x)
                                : x;

                if (relName === $Field.lyphs && (key === $Field.length || key === $Field.thickness)) {
                    res = {min: parseInt(res), max: parseInt(res)};
                } else {
                    if (key === $Field.assign) {
                        res = res.split(";").map(expr => {
                            let [path, value] = expr.split("=");
                            let [propName, propValue] = value.split(":").map(x => x.trim());
                            if (propName && propValue) {
                                propValue = propValue.toString().split(",");
                                let borderIndex = borderNames.indexOf(propName);
                                if (borderIndex > -1) {
                                    path = path + `.border.borders[${borderIndex}]`;
                                    value = {hostedNodes: propValue};
                                } else {
                                    value = {[propName]: propValue};
                                }
                            } else {
                                logger.error($LogMsg.EXCEL_WRONG_ASSIGN_VALUE, value);
                            }
                            return {"path": "$." + path, "value": value}
                        });
                    } else {
                        if (fields[key].type === $SchemaType.ARRAY) {
                            res = res.split(",").map(x => strToValue(x.trim()));
                        } else {
                            res = strToValue(res.trim());
                        }
                    }
                }
                return res;
            };

            for (let i = 1; i < table.length; i++) {
                let resource = {};
                table[i].forEach((value, j) => {
                    if (!value){ return; }
                    if (!headers[j]) {
                        logger.error($LogMsg.EXCEL_NO_COLUMN_NAME);
                        return;
                    }
                    if (!headers[j]::isString()) {
                        logger.error($LogMsg.EXCEL_INVALID_COLUMN_NAME, headers[j]);
                        return;
                    }
                    let key = headers[j].trim();
                    let res = convertValue(key, value);
                    if (res){ resource[key] = res; }
                });

                table[i] = resource;
                let borderConstraints = resource::pick(borderNames);
                if (borderConstraints::values().filter(x => !!x).length > 0) {
                    table.border = {borders: borderNames.map(borderName => borderConstraints[borderName] ? {hostedNodes: [borderConstraints[borderName]]} : {})};
                }
                table[i] = resource::omit(borderNames);
            }
            model[relName] = model[relName].slice(1);
        });

        if (model.main){
            if (model.main[0]::isArray()){
                model.main[0].forEach(({key: value}) => model[key] = value);
            } else {
                if (model.main[0]::isObject()){
                    model::merge(model.main[0]);
                }
            }
            delete model.main;
        }
        return model;
    }

    /**
     * Auto-generates links for internal lyphs
     * @param modelClasses - model resource classes
     * @param entitiesByID - a global resource map to include the generated resources
     */
    createAxesForInternalLyphs(modelClasses, entitiesByID){
        const createAxis = lyph => {
            let [sNode, tNode] = [$Prefix.source, $Prefix.target].map(prefix => (
                Node.fromJSON({
                    [$Field.id]        : getGenID(prefix, lyph.id),
                    [$Field.color]     : $Color.InternalNode,
                    [$Field.val]       : 0.1,
                    [$Field.skipLabel] : true,
                    [$Field.generated] : true
                }, modelClasses, entitiesByID)));

            let link = Link.fromJSON({
                [$Field.id]           : getGenID($Prefix.link, lyph.id),
                [$Field.source]       : sNode.id,
                [$Field.target]       : tNode.id,
                [$Field.geometry]     : Link.LINK_GEOMETRY.INVISIBLE,
                [$Field.color]        : $Color.InternalLink,
                [$Field.conveyingLyph]: lyph.id,
                [$Field.skipLabel]    : true,
                [$Field.generated]    : true
            }, modelClasses, entitiesByID);
            sNode.sourceOf = [link];
            tNode.targetOf = [link];
            lyph.conveys = link;

            this.links.push(link);
            [sNode, tNode].forEach(node => this.nodes.push(node));
        };

        let internalLyphsWithNoAxis = (this.lyphs||[]).filter(lyph => lyph.internalIn && !lyph.axis && !lyph.isTemplate);
        internalLyphsWithNoAxis.forEach(lyph => createAxis(lyph));
        if (internalLyphsWithNoAxis.length > 0){
            logger.info($LogMsg.GRAPH_GEN_AXIS_INTERNAL, internalLyphsWithNoAxis.map(x => x.id));
        }

        const assignAxisLength = (lyph, container) => {
            if (!lyph.axis){
                logger.warn($LogMsg.GRAPH_LYPH_NO_AXIS, lyph);
                return;
            }
            if (container.axis) {
                //TODO lyph can be internal in a region - dynamically compute length based on region width or length
                if (!container.axis.length && container.container) {
                    assignAxisLength(container, container.container);
                }
                lyph.axis.length = container.axis && container.axis.length ? container.axis.length * 0.8 : DEFAULT_LENGTH;
            }
        };

        [...(this.lyphs||[]), ...(this.regions||[])].filter(lyph => lyph.internalIn).forEach(lyph => assignAxisLength(lyph, lyph.internalIn));
    }

    /**
     * Auto-generate links for lyphs without axes which are not layers or templates
     * @param modelClasses - model resource classes
     * @param entitiesByID - a global resource map to include the generated resources
     */
    createAxesForAllLyphs(modelClasses, entitiesByID){
        let group = {
            [$Field.id]        : getGenID($Prefix.group, this.id, "auto-links"),
            [$Field.name]      : "Generated links",
            [$Field.generated] : true,
            [$Field.links]     : [],
            [$Field.nodes]     : []
        };

        const createAxis = lyph => {
            let [sNode, tNode] = [$Prefix.source, $Prefix.target].map(prefix => Node.fromJSON({
                [$Field.id]        : getGenID(prefix, lyph.id),
                [$Field.color]     : $Color.Node,
                [$Field.skipLabel] : true,
                [$Field.generated] : true
            }, modelClasses, entitiesByID));

            let link = Link.fromJSON({
                [$Field.id]           : getGenID($Prefix.link, lyph.id),
                [$Field.source]       : sNode.id,
                [$Field.target]       : tNode.id,
                [$Field.geometry]     : Link.LINK_GEOMETRY.LINK,
                [$Field.color]        : $Color.Link,
                [$Field.conveyingLyph]: lyph.id,
                [$Field.skipLabel]    : true,
                [$Field.generated]    : true
            }, modelClasses, entitiesByID);

            sNode.sourceOf = [link];
            tNode.targetOf = [link];
            lyph.conveys = link;

            this.links.push(link);
            group.links.push(link.id);
            [sNode, tNode].forEach(node => {
                this.nodes.push(node);
                group.nodes.push(node.id);
            });
        };

        let lyphsWithoutAxis = (this.lyphs||[]).filter(lyph => !lyph.conveys && !lyph.layerIn && !lyph.isTemplate);
        lyphsWithoutAxis.forEach(lyph => createAxis(lyph));
        if (lyphsWithoutAxis.length > 0){
            logger.info($LogMsg.GRAPH_GEN_AXIS_ALL, lyphsWithoutAxis.map(x => x.id));
        }

        if (group.links.length > 0){
            if (!this.groups){
                this.groups = [];
            }
            group = Group.fromJSON(group, modelClasses, entitiesByID);
            this.groups.push(group);
        }
    }

    /**
     * Add entities from sub-components to the current component
     */
    mergeScaffoldResources(){
        let scaffoldResources = {};
        (this.scaffolds||[]).forEach(scaffold => {
            let relFieldNames = scaffold.constructor.Model.filteredRelNames([$SchemaClass.Component]);
            relFieldNames.forEach(property => {
                if (scaffold[property]::isArray()){
                    scaffoldResources[property] = (scaffoldResources[property]||[])::unionBy(scaffold[property], $Field.id);
                    scaffoldResources[property] = scaffoldResources[property].filter(x => x.class);
                }
            });
        });
        this.scaffoldResources = scaffoldResources;
    }

    /**
     * Scale dimensions of visual resources (length, height and width, coordinates of border points)
     * @param scaleFactor {number} - scaling factor
     */
    scale(scaleFactor){
        const scalePoint = p => p::keys().filter(key => p[key]::isNumber()).forEach(key => {
            p[key] *= scaleFactor;
        });

        if (this.scaffoldResources) {
            (this.scaffoldResources.anchors || []).filter(e => e.layout).forEach(e => scalePoint(e.layout));
            (this.scaffoldResources.wires || []).filter(e => e::isObject() && !!e.length).forEach(e => e.length *= scaleFactor);
            (this.scaffoldResources.regions || []).filter(e => e.points).forEach(e => e.points.forEach(p => scalePoint(p)));
        }
        
        (this.lyphs||[]).forEach(lyph => {
            if (lyph.width)  {lyph.width  *= scaleFactor}
            if (lyph.height) {lyph.height *= scaleFactor}
        });

        (this.nodes||[]).filter(e => e.layout).forEach(e => scalePoint(e.layout));
        (this.links||[]).filter(e => e::isObject() && !!e.length).forEach(e => e.length *= scaleFactor);
        (this.regions||[]).filter(e => e.points).forEach(e => e.points.forEach(p => scalePoint(p)));
    }

    /**
     * Serialize the map of all resources in JSON
     */
    entitiesToJSON(){
        let res = {
            "id": this.id,
            "resources": {}
        };
        (this.entitiesByID||{})::entries().forEach(([id,obj]) =>
            res.resources[id] = (obj instanceof Resource) ? obj.toJSON() : obj);
        return res;
    }

    /**
     * Serialize the map of all resources to JSONLD
     */
    entitiesToJSONLD(){
        let m = "https://apinatomy.org/uris/models/";
        let uri = m.concat(this.id);

        let curiesContext = {};
        let localConventions = this.localConventions || [];
        localConventions.forEach((obj) =>
            // FIXME warn on duplicate curies?
            curiesContext[obj.prefix] = {"@id": obj.namespace, "@prefix": true});

        let localContext = {
            "@base": uri.concat("/ids/"),
        };

        let contextPrefix = "local"; // FIXME not sure what the issue is here with "" ...
        localContext[contextPrefix] = localContext["@base"];

        let schemaContext = schemaToContext(schema, {});
        // local first so that any accidental collisions don't break everything
        // raw last so that it can override the autogen behavior
        let contexts = [localContext,
                        curiesContext,
                        schemaContext,
                        baseContext];
        let context = {};
        contexts.forEach(sourceContext => context::merge(sourceContext));

        let res = {
            "@context": context,
            "@graph": [
                {"@id": uri,
                 "@type": ["apinatomy:GraphMetadata", "owl:Ontology"],
                 "rdfs:label": this.name,
                 "apinatomy:hasGraph": context["@base"].concat(this.id),
                }
            ]
        };

        function addType(obj) {
            obj.class === "External" ?
                obj["@type"] = "owl:Class" :
                obj["@type"] = "owl:NamedIndividual" ;
            return obj;
        }

        (this.entitiesByID||{})::entries()
            .forEach(([id,obj]) =>
                res["@graph"].push((obj instanceof Resource) ? addType(obj.toJSON()) : obj));

        return res;
    }

    /**
     * Serialize the map of all resources to flattened jsonld
     */
    entitiesToJSONLDFlat(callback){
        let res = this.entitiesToJSONLD();
        let context = {};
        res['@context']::entries().forEach(([k, v]) => {
            if (v::isObject() && "@id" in v && v["@id"].includes("apinatomy:")) {
            } else if (typeof(v) === "string" && v.includes("apinatomy:")) {
            } else if (k === "class") { // class uses @context @base which is not 1.0 compatible
            } else {
                context[k] = v;
            }});
        // TODO reattach context for rdflib-jsonld prefix construction
        jsonld.flatten(res).then(flat => {
            jsonld.compact(flat, context).then(compact => {
                callback(compact)})});
    }
}
