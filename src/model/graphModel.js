import { Group } from './groupModel';
import { Resource } from "./resourceModel";
import {
    entries, keys, values,
    isNumber, isArray, isObject, isString, isEmpty,
    pick, omit, merge,
    cloneDeep, defaults, unionBy
} from 'lodash-bound';
import { Validator} from 'jsonschema';
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
    getGenName
} from "./utils";
import {getItemType, strToValue} from './utilsParser';
import * as jsonld from "jsonld/dist/node6/lib/jsonld";

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
        "@context": {
            "@base": "https://apinatomy.org/uris/elements/"
        }
    },
    "topology": {
        "@id": "apinatomy:topology",
        "@type": "@id",
        "@context": {"@base": "https://apinatomy.org/uris/readable/"}
    },
};

/**
 * Generate a json-ld context from a json schema
 *
 */
function schemaToContext(schema, context, id=null, prefix="apinatomy:") {

    function schemaIsId(scm) {
        return scm::isObject() && (
            scm["$ref"] === "#/definitions/IdentifierScheme" ||
                scm.items && schemaIsId(scm.items) ||
                scm.anyOf && scm.anyOf.filter(schemaIsId).length !== 0);
    }

    if (schema.definitions) {
        schema.definitions::entries()
            .forEach(([did, def]) => schemaToContext(def, context));
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
 * @property namespace
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

        //Copy existing entities to a map to enable nested model instantiation
        let inputModel = json::cloneDeep()::defaults({id: "mainGraph"});
        let namespace = inputModel.namespace;

        inputModel.groups = inputModel.groups || [];
        let group = {
            [$Field.id]       : getGenID($Prefix.group, $Prefix.default),
            [$Field.name]     : "Ungrouped",
            [$Field.generated]: true,
            [$Field.links]    : (inputModel.links || []).map(e => getID(e)),
            [$Field.nodes]    : (inputModel.nodes || []).map(e => getID(e))
        };
        inputModel.groups.unshift(group);

        /**
         * @property waitingList
         * @type {Object}
         */
        let entitiesByID = {
            waitingList: {}
        };

        //Create graph
        let res = super.fromJSON(inputModel, modelClasses, entitiesByID, namespace);

        //Auto-create missing definitions for used references
        let added = [];
        (entitiesByID.waitingList)::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class){
                let clsName = modelClasses[obj.class].Model.relClassNames[key];
                if (clsName && !modelClasses[clsName].Model.schema.abstract){
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

        //Log info about the number of generated resources
        logger.info($LogMsg.RESOURCE_NUM, entitiesByID::keys().length);

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
            res.createAxesForInternalLyphs(modelClasses, entitiesByID, namespace);
            res.createAxesForAllLyphs(modelClasses, entitiesByID, namespace);
            //res.validate(modelClasses);
            (res.groups||[]).forEach(group => group.includeRelated());
            (res.coalescences || []).forEach(r => r.createInstances(res, modelClasses));
            //Collect inherited externals
            (res.lyphs||[]).forEach(lyph => {
                if (lyph.supertype) {
                    lyph.collectInheritedExternals();
                }
            });
        }

        //Validate link processes
        (res.links||[]).forEach(link => {
            if (link instanceof modelClasses.Link){
                link.validateProcess();
                if (link.source.sourceOf.length === 1 && link.target.targetOf === 1){
                    link.geometry = modelClasses.Link.LINK_GEOMETRY.INVISIBLE;
                    link.source.invisible = true;
                    link.target.invisible = true;
                }
            } else {
                logger.error($LogMsg.CLASS_ERROR_RESOURCE, "validateProcess", link, modelClasses.Link.name);
            }
        });

        //Validate coalescences
        (res.coalescences || []).forEach(r => r.validate());

        //Validate channels
        (res.channels || []).forEach(r => r.validate(res));

        res.generated = true;
        res.mergeScaffoldResources();

        res.logger = logger;
        res.modelClasses = modelClasses;
        return res;
    }

    validate(modelClasses){
        let relClassNames = this.constructor.Model.relClassNames;

        const isClassValid = (r, clsName) => {
            let res = r instanceof modelClasses[clsName];
            if (!res){
                logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r);
            }
            return res;
        };

        relClassNames.forEach(([key, clsName]) => {
            if (this[key]) {
                if (this[key]::isArray()) {
                    this[key] = this[key].filter(r => isClassValid(r, clsName));
                } else {
                    if (isClassValid(this[key], clsName)){
                        this[key] = null;
                    }
                }
            }
        });
    }

    /**
     * Generate the JSON input model from an Excel file (.xlsx)
     * @param inputModel   - Excel ApiNATOMY connectivity model
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

            const validateValue = (value, j) => {
                if (!value){ return false; }
                if (!headers[j]) {
                    logger.error($LogMsg.EXCEL_NO_COLUMN_NAME);
                    return false;
                }
                if (!headers[j]::isString()) {
                    logger.error($LogMsg.EXCEL_INVALID_COLUMN_NAME, headers[j])
                    return false;
                }
                return true;
            }

            if (relName === "localConventions") {  // local conventions are not a resource
                for (let i = 1; i < table.length; i++) {
                    let convention = {};
                    table[i].forEach((value, j) => {
                        if (!validateValue(value, j)) { return; }
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
            let fields = modelClasses[clsName].Model.fieldMap;
            let propNames = modelClasses[clsName].Model.propertyNames;

            const convertValue = (key, value) => {
                if (!fields[key]) {
                    logger.warn($LogMsg.EXCEL_PROPERTY_UNKNOWN, clsName, key);
                    return;
                }
                let res = value.toString();
                if (res.length === 0) { return; } //skip empty properties

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
                    if (!validateValue(value, j)) { return; }
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
            //Remove headers and empty objects
            model[relName] = model[relName].filter((obj, i) => (i > 0) && !obj::isEmpty());
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

    createDynamicGroup(qNumber, qName, json, modelClasses = {}){

        const {nodes, links, lyphs} = json;
        this.groups = this.groups || [];

        //Query response group
        this.includeLyphAxes(lyphs, links);
        this.includeConveyingLyphs(links, lyphs);
        this.includeLinkEnds(links, nodes);
        this.createGroup(qNumber, `QR ${qNumber}: ${qName}`, nodes, links, lyphs, modelClasses);

        //Only chains
        let chainLinks = links.filter(e => e.fasciculatesIn);
        let chainNodes = [];
        this.includeLinkEnds(chainLinks, chainNodes);
        this.createGroup(qNumber + "_chains", `QR ${qNumber}: chains`, chainNodes, chainLinks, [], modelClasses);

        //Only chain lyphs
        let chainLyphs = [];
        this.includeConveyingLyphs(chainLinks, chainLyphs);
        this.createGroup(qNumber + "_chainLyphs", `QR ${qNumber}: chain lyphs`, [], [], chainLyphs, modelClasses);

        //Only housing lyphs
        let housingLyphs = lyphs.filter(e => e.bundles);
        housingLyphs.forEach(e => e.layerIn && housingLyphs.push(e.layerIn));
        let housingLinks = [];
        let housingNodes = [];
        this.includeLyphAxes(housingLyphs, housingLinks);
        this.includeConveyingLyphs(housingLinks, housingLyphs);
        this.includeLinkEnds(housingLinks, housingNodes);
        this.createGroup(qNumber + "_housing", `QR ${qNumber}: housing`, housingNodes, housingLinks, housingLyphs, modelClasses);
    }

    /**
     * Auto-generates links for internal lyphs
     * @param modelClasses - model resource classes
     * @param entitiesByID - a global resource map to include the generated resources
     * @param namespace
     */
    createAxesForInternalLyphs(modelClasses, entitiesByID, namespace){
        let noAxisLyphs = (this.lyphs||[]).filter(lyph => lyph.internalIn && !lyph.axis && !lyph.isTemplate);
        noAxisLyphs.forEach(lyph => {
            let link = lyph.createAxis(modelClasses, entitiesByID, namespace);
            this.links.push(link);
            this.nodes.push(link.source);
            this.nodes.push(link.target);
        });
        if (noAxisLyphs.length > 0){
            logger.info($LogMsg.GROUP_GEN_LYPH_AXIS, noAxisLyphs.map(x => x.id));
        }
        noAxisLyphs.forEach(lyph => lyph.assignAxisLength());
    }

    /**
     * Auto-generate links for lyphs without axes which are not layers or templates
     * @param modelClasses - model resource classes
     * @param entitiesByID - a global resource map to include the generated resources
     * @param namespace
     */
    createAxesForAllLyphs(modelClasses, entitiesByID, namespace){
        let noAxisLyphs = (this.lyphs||[]).filter(lyph => lyph::isObject() && !lyph.conveys && !lyph.layerIn && !lyph.isTemplate);

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
        const scalePoint = p => p::keys().forEach(key => p[key]::isNumber() && (p[key] *= scaleFactor));

        if (this.scaffoldResources) {
            (this.scaffoldResources.anchors || []).forEach(e => e.layout && scalePoint(e.layout));
            (this.scaffoldResources.wires || []).forEach(e => e::isObject() && (e.length = (e.length || 10) * scaleFactor));
            (this.scaffoldResources.regions || []).forEach(e => (e.points||[]).forEach(p => scalePoint(p)));
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
        (this.regions||[]).forEach(e => (e.points||[]).forEach(p => scalePoint(p)));
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
            if (!(v::isObject() && ("@id" in v) && v["@id"].includes("apinatomy:"))) {
                if (!(typeof(v) === "string" && v.includes("apinatomy:"))) {
                    if (k !== "class") {
                        //console.log(k, v);
                        context[k] = v;
                    }
                }
            }
        });
        jsonld.flatten(res).then(flat => jsonld.compact(flat, context).then(compact => callback(compact)));
    }

    //Find paths which are topologically similar to a cyst
    neurulator() {
        const bags = (this.lyphs || []).filter(lyph => !lyph.isTemplate && !lyph.layerIn &&
            [LYPH_TOPOLOGY.BAG, LYPH_TOPOLOGY.BAG2, LYPH_TOPOLOGY["BAG-"], LYPH_TOPOLOGY["BAG+"], LYPH_TOPOLOGY["CYST"]].includes(lyph.topology));
        while (bags.length > 0){
            let targetLyph = bags.pop();
            if (!bags._processed){
                this.neurulateFromTarget(targetLyph);
            }
        }
        (this.lyphs||[]).forEach(lyph => delete lyph._processed);
    }

    neurulateFromTarget(targetLyph){
        targetLyph._processed = true;
        let lnk0 = targetLyph.conveys;
        if (!lnk0){ return; } //ignore lyphs without axes, e.g., templates or layers
        let t0 = lnk0.conveyingLyph && lnk0.conveyingLyph.topology;
        if (t0 === LYPH_TOPOLOGY.CYST) {
            return [lnk0];
        }
        let groupLinks = [];

        function dfs(lnk) {
            if (lnk._processed) { return true; }
            let t = lnk.conveyingTopology;
            if (t === LYPH_TOPOLOGY.CYST){
                return false;
            }
            groupLinks.push(lnk);
            const expandSource = (t === LYPH_TOPOLOGY.TUBE) || (t === LYPH_TOPOLOGY.BAG) || lnk.collapsible; //BAG = target closed, TODO check with "reversed"
            const expandTarget = (t === LYPH_TOPOLOGY.TUBE) || (t === LYPH_TOPOLOGY.BAG2) || lnk.collapsible;
            lnk._processed = true;

            let res = true;

            const isValid = (lnk1, topology) => {
                return lnk1._processed || (lnk1.conveyingTopology !== topology) && dfs(lnk1);
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
            delete lnk._processed;
            return res;
        }

        if (dfs(lnk0)){
            const groupNodes = [];
            const groupLyphs = [];
            this.includeLinkEnds(groupLinks, groupNodes);
            this.includeConveyingLyphs(groupLinks, groupLyphs);
            groupLyphs.forEach(lyph => lyph._processed = true); //exclude reachable lyphs
            this.createGroup(getGenID("cyst", targetLyph.id), getGenName("Cyst group from", targetLyph.id), groupNodes, groupLinks, groupLyphs, this.modelClasses);
        }
    }
}