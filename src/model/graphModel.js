import { Group } from './groupModel';
import { Resource } from "./resourceModel";
import {
    entries, keys, values,
    isNumber, isArray, isObject, isString, isEmpty,
    pick, omit, merge,
    cloneDeep, defaults, unionBy
} from 'lodash-bound';
import {Validator} from 'jsonschema';
import schema from './graphScheme.json';
import {logger, $LogMsg} from './logger';
import {
    $Field,
    $SchemaClass,
    $Prefix,
    $SchemaType,
    getGenID,
    getFullID,
    getID,
    LYPH_TOPOLOGY,
    getGenName, schemaClassModels,
    prepareForExport, findResourceByID
} from "./utils";
import {
    extractModelAnnotation,
    getItemType,
    strToValue,
    validateValue,
    levelTargetsToLevels,
    borderNamesToBorder
} from './utilsParser';
import * as jsonld from "jsonld/dist/node6/lib/jsonld";
import {Link} from "./edgeModel";
import * as XLSX from "xlsx";
//Do not include modelClasses here, it creates circular dependency

export { schema };

let baseContext = {
    "@version": 1.1,
    "apinatomy": {"@id": "https://apinatomy.org/uris/readable/",
                  "@prefix": true},
    "elements": {
        "@id": "https://apinatomy.org/uris/elements/",
        "@prefix": true
    },
    "owl": {
        "@id": "http://www.w3.org/2002/07/owl#",
        "@prefix": true
    },
    "rdf": {
        "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "@prefix": true
    },
    "rdfs": {
        "@id": "http://www.w3.org/2000/01/rdf-schema#",
        "@prefix": true
    },
    "name": "rdfs:label",
    "id": "@id",
    "class": {
        "@id": "rdf:type",
        "@type": "@id",
        "@context": {"@base": "https://apinatomy.org/uris/elements/"}
    },
    "topology": {
        "@id": "apinatomy:topology",
        "@type": "@id",
        "@context": {"@base": "https://apinatomy.org/uris/readable/"}
    },
};

/**
 * Generate a json-ld context from a json schema
 */
function schemaToContext(schema, context, id=null, prefix="apinatomy:") {

    function schemaIsId(scm) {
        return scm::isObject() && (
            scm["$ref"] === "#/definitions/IdentifierScheme" ||
                scm.items && schemaIsId(scm.items) ||
                scm.anyOf && scm.anyOf.filter(schemaIsId).length !== 0);
    }

    if (schema.definitions) {
        schema.definitions::values().forEach(def => schemaToContext(def, context));
    } else {
        if (id !== null && schemaIsId(schema)) {
            context[id] = {
                "@id": prefix.concat(id),
                "@type": "@id"};
        } else {
            if (schema.properties) {
                schema.properties::entries()
                    .forEach(([pid, prop]) =>
                        context[pid] = schemaIsId(prop) ? {
                                "@id": prefix.concat(pid),
                                "@type": "@id"
                            } : prefix.concat(pid));
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
 * @property namespace
 * @property localConventions
 * @property modelClasses
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

        //Validate using Graph schema
        delete schema.oneOf;
        schema.$ref = "#/definitions/Graph";
        let resVal = V.validate(json, schema);

        //Copy existing entities to a map to enable nested model instantiation
        let inputModel = json::cloneDeep()::defaults({id: "mainGraph"});
        let namespace = inputModel.namespace;

        /**
         * @property waitingList
         * @type {Object}
         */
        let entitiesByID = {
            waitingList: {}
        };

        let count = 1;
        const prefix = [$Prefix.node, $Prefix.link];
        [$Field.nodes, $Field.links].forEach((prop, i) => (inputModel[prop]||[]).forEach(e => {
                if (e::isObject && !e.id){
                    e.id = getGenID(prefix[i], $Prefix.default, count++);
                }
            }
        ));

        inputModel.groups = inputModel.groups || [];
        let defaultGroup = {
            [$Field.id]       : getGenID($Prefix.group, $Prefix.default),
            [$Field.name]     : "Ungrouped",
            [$Field.generated]: true,
            [$Field.hidden]   : true,
            [$Field.links]    : (inputModel.links || []).map(e => getID(e)),
            [$Field.nodes]    : (inputModel.nodes || []).map(e => getID(e))
        };
        inputModel.groups.unshift(defaultGroup);

        //Create graph
        inputModel.class = $SchemaClass.Graph;
        let res = super.fromJSON(inputModel, modelClasses, entitiesByID, namespace);

        //Auto-create missing definitions for used references
        let added = [];
        (entitiesByID.waitingList)::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class){
                let clsName = schemaClassModels[obj.class].relClassNames[key];
                //Do not create missing scaffold resources
                if ([$SchemaClass.Region, $SchemaClass.Wire, $SchemaClass.Anchor].includes(obj.class)){
                    return;
                }
                if (clsName && !schemaClassModels[clsName].schema.abstract){
                    let e = modelClasses.Resource.createResource(id, clsName, res, modelClasses, entitiesByID, namespace);
                    added.push(e.id);
                    //A created link needs end nodes
                    if (e instanceof modelClasses.Link) {
                        let i = 0;
                        const related = [$Field.sourceOf, $Field.targetOf];
                        e.applyToEndNodes(end => {
                            if (end::isString()) {
                                let s = modelClasses.Resource.createResource(end, $SchemaClass.Node, res, modelClasses, entitiesByID, namespace);
                                added.push(s.id);
                                s[related[i]] = [e];
                            }
                        });
                    }
                }
            }
        });

        if (resVal.errors && resVal.errors.length > 0){
            logger.error($LogMsg.SCHEMA_GRAPH_ERROR, ...resVal.errors.map(e => e::pick("message", "instance", "path")));
        }

        if (added.length > 0){
            added.forEach(id => delete entitiesByID.waitingList[id]);
            let resources = added.filter(id => entitiesByID[getFullID(namespace,id)].class !== $SchemaClass.External);
            if (resources.length > 0) {
                logger.warn($LogMsg.AUTO_GEN, resources);
            }

            let externals = added.filter(id => entitiesByID[getFullID(namespace,id)].class === $SchemaClass.External);
            if (externals.length > 0){
                logger.warn($LogMsg.AUTO_GEN_EXTERNAL, externals);
            }
        }

        if (entitiesByID.waitingList::keys().length > 0){
            logger.error($LogMsg.REF_UNDEFINED, "model", entitiesByID.waitingList::keys());
        }

        res.syncRelationships(modelClasses, entitiesByID, namespace);

        res.entitiesByID = entitiesByID;

        if (!res.generated) {
            let noAxisLyphsInternal = (res.lyphs||[]).filter(lyph => lyph.internalIn && !lyph.axis && !lyph.isTemplate);
            res.createAxes(noAxisLyphsInternal, modelClasses, entitiesByID, namespace);
            let noAxisLyphs = (res.lyphs||[]).filter(lyph => lyph::isObject() && !lyph.conveys && !lyph.layerIn && !lyph.isTemplate);
            res.createAxes(noAxisLyphs, modelClasses, entitiesByID, namespace);
            res.includeToGroups();
            (res.groups||[]).forEach(group => res.includeRelated && group.includeRelated());
            (res.coalescences || []).forEach(r => r.createInstances(res, modelClasses));
            //Collect inherited externals
            (res.lyphs||[]).forEach(lyph => {
                if (lyph.supertype) {
                    lyph.collectInheritedExternals();
                }
            });
        }

        //Validate
        (res.links||[]).forEach(r => r.validate? r.validate(): logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r));
        (res.coalescences||[]).forEach(r => r.validate? r.validate(): logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r));
        (res.channels||[]).forEach(r =>  r.validate? r.validate(res): logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r));

        //Connect chain's last level with the following chain's first level (issue #129)
        (res.chains||[]).forEach(r => r.connect? r.connect(): logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r));

        const faultyExternal = [];
        (res.external || []).forEach(r => {
            if (!(res.localConventions||[]).find(c => r.id.startsWith(c.prefix))) {
                faultyExternal.push(r.id);
            }
        });
        if (faultyExternal.length > 0){
            logger.error($LogMsg.EXTERNAL_NO_MAPPING, faultyExternal);
        }

        //Assign helper property housingLyph for simpler Cypher queries
        (res.lyphs||[]).forEach(lyph => {
            if (lyph instanceof modelClasses.Lyph) {
                let axis = lyph.axis;
                let housingLyph = axis && (axis.fasciculatesIn || axis.endsIn);
                if (housingLyph) {
                    lyph.housingLyph = housingLyph
                }
            }
        });

        res.generated = true;
        res.mergeScaffoldResources();

        (res.chains||[]).forEach(chain => {
            if (chain instanceof modelClasses.Chain) {
                chain.validateAnchoring();
                chain.resizeLyphs();
            } else {
                logger.error($LogMsg.CLASS_ERROR_RESOURCE, "resizeLyphs", chain, modelClasses.Chain.name);
            }
        });

        //Set default group resources to hidden
        defaultGroup = res.groups.find(g => g.id === defaultGroup.id);
        //Clean up default group from resources automatically included to other groups
        [$Field.nodes, $Field.links, $Field.lyphs].forEach(prop => {
            let newSet = [];
            (defaultGroup[prop]||[]).forEach(e => {
                let container = res.groups.find(group => (group.id !== defaultGroup.id) && findResourceByID(group[prop], e.id));
                if (!container){
                    newSet.push(e);
                }
            });
            defaultGroup[prop] = newSet;
        });
        [$Field.nodes, $Field.links].forEach(prop => defaultGroup[prop].forEach(e => e.hidden = true));
        //Remove "Ungrouped" if empty
        if (!defaultGroup.links.length && !defaultGroup.nodes.length){
            res.groups.shift();
        }

        res.modelClasses = modelClasses;
        res.createForceLinks();

        //Log info about the number of generated resources
        logger.info($LogMsg.GRAPH_RESOURCE_NUM, this.id, entitiesByID::keys().length);
        res.logger = logger;
        return res;
    }

    createForceLinks(){
        let group_json = {
            [$Field.id]       : getGenID($Prefix.group, $Prefix.force),
            [$Field.name]     : "Force links",
            [$Field.generated]: true,
            [$Field.hidden]   : false,
            [$Field.links]    : [],
            [$Field.nodes]    : []
        };
        //Create invisible links to generate attraction forces for housing lyphs of connected chains
        (this.links||[]).forEach(lnk => {
            if (lnk.collapsible){
                let housingLyphs = [null, null];
                [$Field.source, $Field.target].forEach((prop, i) => {
                    let border = lnk[prop] && lnk[prop].hostedBy;
                    if (border) {
                        housingLyphs[i] = border.onBorder && border.onBorder.host;
                    } else {
                        housingLyphs[i] = lnk[prop] && lnk[prop].internalIn;
                    }
                    while (housingLyphs[i] && (housingLyphs[i].container || housingLyphs[i].host)) {
                       housingLyphs[i] = housingLyphs[i].container || housingLyphs[i].host;
                    }
                });
                let nodes = [null, null];
                [$Field.source, $Field.target].forEach((prop, i) => {
                    nodes[i] = housingLyphs[i] && housingLyphs[i].conveys && housingLyphs[i].conveys[prop];
                    if (!nodes[i]){
                        //Create a tension link between lyph end and free floating end of collapsible link
                        nodes[i] = lnk[prop];
                    }
                });
                if (nodes[0] && nodes[1] && (nodes[0].id !== nodes[1].id)){
                    let force_json = this.modelClasses.Link.createForceLink(nodes[0].id, nodes[1].id);
                    if (!this.links.find(x => x.id === force_json.id)){
                        let force = Link.fromJSON(force_json, this.modelClasses, this.entitiesByID, this.namespace);
                        this.links.push(force);
                        group_json.links.push(force);
                        [$Field.sourceOf, $Field.targetOf].forEach((prop, i) => {
                            nodes[i][prop] = nodes[i][prop] || [];
                            nodes[i][prop].push(force);
                        })
                    }
                }
            }
        })
        const group = Group.fromJSON(group_json, this.modelClasses, this.entitiesByID, this.namespace);
        this.groups.unshift(group);
    }

    includeToGroups(){
        let relClassNames = schemaClassModels[$SchemaClass.Graph].relClassNames::keys();
        relClassNames.forEach((key) => (this[key]||[]).forEach(r => r.includeToGroup && r.includeToGroup(key)));
    }

    /**
     * Generate the JSON input model from an Excel file (.xlsx)
     * @param inputModel   - Excel ApiNATOMY connectivity model
     * @param modelClasses - model resource classes
     * @returns {*}
     */
    static excelToJSON(inputModel, modelClasses = {}){
        let graphSchema = schemaClassModels[$SchemaClass.Graph];
        let model = inputModel::pick(graphSchema.relationshipNames.concat(["main", "localConventions"]));
        const borderNames = ["inner", "radial1", "outer", "radial2"];

        model::keys().forEach(relName => {
            let table = model[relName];
            if (!table) { return; }
            let headers = table[0] || [];

            if (relName === "localConventions") {  // local conventions are not a resource
                for (let i = 1; i < table.length; i++) {
                    let convention = {};
                    table[i].forEach((value, j) => {
                        if (!validateValue(value, headers[j])) { return; }
                        let key = headers[j].trim();
                        convention[key] = value;
                    });
                    table[i] = convention;
                }
                model[relName] = model[relName].filter((obj, i) => (i > 0) && !obj::isEmpty());
                return;
            }
            let clsName = relName === "main"? $SchemaClass.Graph: graphSchema.relClassNames[relName];
            if (!modelClasses[clsName]) {
                logger.warn($LogMsg.EXCEL_NO_CLASS_NAME, relName);
                return;
            }
            let fields = schemaClassModels[clsName].fieldMap;
            let propNames = schemaClassModels[clsName].propertyNames;
            const convertValue = (key, value) => {
                if (key === "levelTargets" || borderNames.includes(key)) {
                    return value;
                }
                if (!fields[key]) {
                    logger.warn($LogMsg.EXCEL_PROPERTY_UNKNOWN, clsName, key);
                    return;
                }
                let res = value.toString().trim();
                if (res.length === 0) { return; } //skip empty properties
                while (res.endsWith(',')){
                    res = res.slice(0, -1).trim();
                }
                if (relName === $Field.lyphs && (key === $Field.length || key === $Field.thickness)) {
                    res = {min: parseInt(res), max: parseInt(res)};
                } else {
                    let itemType = getItemType(fields[key]);
                    if (!itemType){
                        logger.error($LogMsg.EXCEL_DATA_TYPE_UNKNOWN, relName, key, value);
                    }
                    if (!(itemType === $SchemaType.STRING && propNames.includes(key))) {
                        res = res.replace(/\s/g, '');
                    }
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
                        res = strToValue(fields[key].type === $SchemaType.ARRAY, itemType, res);
                    }
                }
                return res;
            };

            for (let i = 1; i < table.length; i++) {
                let resource = {};
                table[i].forEach((value, j) => {
                    if (!validateValue(value, headers[j])) { return; }
                    let key = headers[j].trim();
                    let res = convertValue(key, value);
                    if (res !== undefined) {
                         resource[key] = res;
                     }
                });
                table[i] = resource;
                if (clsName === $SchemaClass.Lyph) {
                    table[i] = borderNamesToBorder(table[i], borderNames);
                }
                if (clsName === $SchemaClass.Chain) {
                    table[i] = levelTargetsToLevels(table[i]);
                }
            }
            //Remove headers and empty objects
            model[relName] = model[relName].filter((obj, i) => (i > 0) && !obj::isEmpty());
        });
        extractModelAnnotation(model);
        return model;
    }

    /**
     * Convert input JSON model to Excel
     * @param json - input model
     */
    static jsonToExcel(json) {
        const propNames = schemaClassModels[$SchemaClass.Graph].propertyNames.filter(x => x !== "localConventions");
        const sheetNames = ["localConventions", ...schemaClassModels[$SchemaClass.Graph].relationshipNames];
        let inputModel = json::cloneDeep();
        prepareForExport(inputModel, $Field.groups, propNames, sheetNames);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        inputModel::keys().forEach(key => {
            const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(inputModel[key]||[]);
    		XLSX.utils.book_append_sheet(wb, ws, key);
        })
        XLSX.writeFile(wb, (inputModel.id||"mainGraph") + "-converted.xlsx");
        return wb;
    }

    /**
     * Create dynamic group for query results
     * @param qNumber - Query number
     * @param qName - Group name
     * @param json  - Group content
     * @param modelClasses - Resource class definitions
     */
    createDynamicGroup(qNumber, qName, json, modelClasses = {}){

        const {nodes, links, lyphs} = json;
        this.groups = this.groups || [];

        //Query response group
        this.includeLyphAxes(lyphs, links);
        this.includeConveyingLyphs(links, lyphs);
        this.includeLinkEnds(links, nodes);
        this.createGroup(getGenID($Prefix.group, qNumber), `QR ${qNumber}: ${qName}`, nodes, links, lyphs, modelClasses);

        //Only chains
        let chainLinks = links.filter(e => e.fasciculatesIn || e.endsIn);
        let chainNodes = [];
        this.includeLinkEnds(chainLinks, chainNodes);
        this.createGroup(getGenID($Prefix.group, qNumber, "chains"), `QR ${qNumber}: chains`, chainNodes, chainLinks, [], modelClasses);

        //Only chain lyphs
        let chainLyphs = [];
        this.includeConveyingLyphs(chainLinks, chainLyphs);
        this.createGroup(getGenID($Prefix.group, qNumber, "chainLyphs"), `QR ${qNumber}: chain lyphs`, [],[], chainLyphs, modelClasses);

        //Only housing lyphs
        let housingLyphs = lyphs.filter(e => e.bundles || e.endBundles);
        housingLyphs.forEach(e => e.layerIn && housingLyphs.push(e.layerIn));
        let housingLinks = [];
        let housingNodes = [];
        this.includeLyphAxes(housingLyphs, housingLinks);
        this.includeConveyingLyphs(housingLinks, housingLyphs);
        this.includeLinkEnds(housingLinks, housingNodes);
        this.createGroup(getGenID($Prefix.group, qNumber, "housing"), `QR ${qNumber}: housing`, housingNodes, housingLinks, housingLyphs, modelClasses);
    }

    /**
     * Auto-generate links for lyphs without axes
     * @param noAxisLyphs - a list of lyphs without axis
     * @param modelClasses - model resource classes
     * @param entitiesByID - a global resource map to include the generated resources
     * @param namespace
     */
    createAxes(noAxisLyphs, modelClasses, entitiesByID, namespace){
        let group = (this.groups||[]).find(g => g.id === getGenID($Prefix.group, $Prefix.default));
        noAxisLyphs.forEach(lyph => {
            let link = lyph.createAxis(modelClasses, entitiesByID, namespace);
            this.links.push(link);
            link.applyToEndNodes(end => this.nodes.push(end));
            if (group){
                group.links.push(link);
                link.applyToEndNodes(end => group.nodes.push(end));
            }
        });
        if (noAxisLyphs.length > 0){
            logger.info($LogMsg.GROUP_GEN_LYPH_AXIS, noAxisLyphs.map(x => x.id));
        }
        noAxisLyphs.forEach(lyph => lyph.assignAxisLength());
    }

    /**
     * Add entities from sub-components to the current component
     */
    mergeScaffoldResources(){
        let scaffoldResources = {};
        (this.scaffolds||[]).forEach(scaffold => {
            let relFieldNames = schemaClassModels[$SchemaClass.Scaffold].filteredRelNames([$SchemaClass.Component]);
            relFieldNames.forEach(prop => {
                if (scaffold[prop]::isArray()){
                    scaffoldResources[prop] = (scaffoldResources[prop]||[])::unionBy(scaffold[prop], $Field.id);
                    scaffoldResources[prop] = scaffoldResources[prop].filter(x => x.class);
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
        const scalePoint = p => ["x", "y", "z"].forEach(key => p[key]::isNumber() && (p[key] *= scaleFactor));
        if (this.scaffoldResources) {
            (this.scaffoldResources.anchors || []).forEach(e => e.layout && scalePoint(e.layout));
            (this.scaffoldResources.wires || []).forEach(e => e::isObject()
                && e.geometry === this.modelClasses.Wire.WIRE_GEOMETRY.ELLIPSE && e.radius && scalePoint(e.radius));
            (this.scaffoldResources.wires || []).forEach(e => e::isObject() && (e.length = (e.length || 10) * scaleFactor));
            (this.scaffoldResources.regions || []).forEach(e => (e.points||[]).forEach(p => !p.hostedBy && scalePoint(p)));
        }
        (this.lyphs||[]).forEach(lyph => {
            if (lyph.width)  {lyph.width  *= scaleFactor}
            if (lyph.height) {lyph.height *= scaleFactor}
        });
        (this.nodes||[]).forEach(e => e.layout && scalePoint(e.layout));
        (this.links||[]).forEach(e => {
            if (e::isObject()) {
                e.length = (e.length || 10) * scaleFactor;
                e.arcCenter && scalePoint(e.arcCenter);
                e.controlPoint && scalePoint(e.controlPoint);
            }
        });
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
                 "apinatomy:hasGraph": {"@id": context["@base"].concat(this.id)},
                }
            ]
        };

        function addType(obj) {
            obj.class === "OntologyTerm" ?
                obj["@type"] = "owl:Class" :
                obj["@type"] = "owl:NamedIndividual" ;
            return obj;
        }

        (this.entitiesByID||{})::values()
            .forEach(obj => res["@graph"].push((obj instanceof Resource) ? addType(obj.toJSON()) : obj));

        return res;
    }

    /**
     * Serialize the map of all resources to flattened jsonld
     */
    entitiesToJSONLDFlat(callback){
        let res = this.entitiesToJSONLD();
        let context = {};
        res['@context']::entries().forEach(([k, v]) => {
            if (!(v::isObject() && ("@id" in v) && v["@id"].includes("apinatomy:"))) {
                if (!(typeof(v) === "string" && v.includes("apinatomy:"))) {
                    if (k !== "class") {
                        context[k] = v;
                    }
                }
            }
        });
        jsonld.flatten(res).then(flat => jsonld.compact(flat, context).then(compact => callback(compact)));
    }

    //Find paths which are topologically similar to a cyst
    neurulator() {
        let bags = (this.lyphs || []).filter(lyph => !lyph.isTemplate && !lyph.layerIn &&
            [LYPH_TOPOLOGY.BAG, LYPH_TOPOLOGY.BAG2, LYPH_TOPOLOGY["BAG-"], LYPH_TOPOLOGY["BAG+"], LYPH_TOPOLOGY["CYST"]].includes(lyph.topology));
        while (bags.length > 0){
            let seed = bags.pop();
            if (!seed._processed){
                this.neurulateFromSeed(seed);
            }
        }
        (this.lyphs||[]).forEach(lyph => delete lyph._processed);
        (this.links||[]).forEach(link => delete link._processed);
        (this.groups||[]).forEach(g => {
            //Include content of dynamic groups into aggregator groups
            if ((g.dynamicGroups || []).length > 0){
                g.mergeSubgroupResources();
            }
        })
        return this;
    }

    neurulateFromSeed(seed){
        seed._processed = true;
        let lnk0 = seed.conveys;
        if (!lnk0){ return; } //ignore lyphs without axes, e.g., templates or layers
        let t0 = lnk0.conveyingLyph && lnk0.conveyingLyph.topology;
        if (t0 === LYPH_TOPOLOGY.CYST) {
            return [lnk0];
        }
        let groupLinks = [];

        function dfs(lnk) {
            if (lnk._processed) { return true; }
            lnk._processed = true;

            let t = lnk.conveyingTopology;
            if (t === LYPH_TOPOLOGY.CYST){
                return false;
            }

            groupLinks.push(lnk);
            const expandSource = (t === LYPH_TOPOLOGY.TUBE) || (t === LYPH_TOPOLOGY.BAG) || lnk.collapsible; //BAG = target closed, TODO check with "reversed"
            const expandTarget = (t === LYPH_TOPOLOGY.TUBE) || (t === LYPH_TOPOLOGY.BAG2) || lnk.collapsible;

            let res = true;

            const isValid = (lnk1, topology) => {
                if (lnk1._processed) {
                    return true;
                }
                const goodEnd = lnk1.conveyingTopology === topology;
                if (goodEnd){
                    groupLinks.push(lnk1);
                }
                return goodEnd || dfs(lnk1);
            }
            if (expandSource){
                const node = lnk.source;
                const n = (node.sourceOf||[]).length + (node.targetOf||[]).length;
                if (n > 1) {
                    (node.sourceOf||[]).forEach(lnk1 => res = res && isValid(lnk1, LYPH_TOPOLOGY.BAG));
                    (node.targetOf||[]).forEach(lnk1 => res = res && isValid(lnk1, LYPH_TOPOLOGY.BAG2));
                } else {
                    res = false;
                }
            }
            if (expandTarget){
                const node = lnk.target;
                const n = (node.sourceOf||[]).length + (node.targetOf||[]).length;
                if (n > 1) {
                    (node.sourceOf||[]).forEach(lnk1 => res = res && isValid(lnk1, LYPH_TOPOLOGY.BAG2));
                    (node.targetOf||[]).forEach(lnk1 => res = res && isValid(lnk1, LYPH_TOPOLOGY.BAG));
                } else {
                    res = false;
                }
            }
            return res;
        }

        if (dfs(lnk0)){
            const groupNodes = [];
            const groupLyphs = [];
            this.includeLinkEnds(groupLinks, groupNodes);
            this.includeConveyingLyphs(groupLinks, groupLyphs);
            groupLyphs.forEach(lyph => lyph._processed = true); //exclude reachable lyphs

            let groupId = getGenID($Prefix.group, seed.id);
            let groupName = getGenName("Generated group for", seed.id);

            //Find a group with seed that contains any of the group lyphs
            let groups = (this.groups||[]).filter(g => g.seed && groupLyphs.find(lyph => lyph.id === g.seed.id));
            if (groups.length === 1){
                groupId = groups[0].id;
                groupName = groups[0].name || groupName;
            } else {
                if (groups.length > 1) {
                    logger.warn($LogMsg.GROUP_SEED_DUPLICATE, groups.map(g => g.seed.id));
                }
            }
            return this.createGroup(groupId, groupName, groupNodes, groupLinks, groupLyphs, this.modelClasses);
        }
    }
}
