import { Group } from './groupModel';
import { Resource } from "./resourceModel";
//import {EDGE_STROKE} from "./utils";
import {
    entries, keys, values,
    isNumber, isArray, isObject, isString, isEmpty,
    pick, merge,
    cloneDeep, unionBy, sortBy
} from 'lodash-bound';
import {Validator} from 'jsonschema';
import schema from './graphScheme.json';
import {logger, $LogMsg} from './logger';
import {
    LYPH_TOPOLOGY,
    schemaClassModels,
    $Field,
    $Default,
    $SchemaClass,
    $Prefix,
    getGenID,
    getID,
    getGenName,
    prepareForExport,
    findResourceByID,
    collectNestedResources,
    getFullID, genResource,
    pickColor, deleteRecursively,
} from "./utils";
import {
    extractLocalConventions,
    extractModelAnnotation,
    validateValue,
    convertValue,
    levelTargetsToLevels,
    borderNamesToBorder,
    replaceReferencesToExternal
} from './utilsParser';
import * as jsonld from "jsonld/dist/node6/lib/jsonld";
import {Link} from "./edgeModel";
import * as XLSX from "xlsx";
import {v4 as uuidv4} from 'uuid';
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
    "fullID": "@id",
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
 * Connectivity model graph
 * @class
 * @property entitiesByID
 * @property namespace
 * @property localConventions
 * @property modelClasses
 */
export class Graph extends Group{

    /**
     * Process waiting list generated from json model
     * @param res           - ApiNATOMY connectivity model
     * @param entitiesByID  - map of entities by ID
     * @param namespace     - namespace
     * @param modelClasses  - modelClasses
     * @param castingMethod - method used for different casting if working from an intermediate step
     * @returns {*}
     */
    static processGraphWaitingList(res, entitiesByID, namespace, modelClasses, castingMethod) {
        let added = [];
        (entitiesByID.waitingList)::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class){
                //Do not create missing scaffold resources
                if ([$SchemaClass.Component, $SchemaClass.Region, $SchemaClass.Wire, $SchemaClass.Anchor].includes(obj.class)){
                    return;
                }
                let clsName = schemaClassModels[obj.class].relClassNames[key];
                if (clsName && !schemaClassModels[clsName].schema.abstract){
                    let e = Resource.createResource(id, clsName, res, modelClasses, entitiesByID, refs[0][0].namespace || namespace, castingMethod);
                    added.push(e.fullID);
                    //A created link needs end nodes
                    if (e instanceof modelClasses.Link) {
                        let i = 0;
                        const related = [$Field.sourceOf, $Field.targetOf];
                        e.applyToEndNodes(end => {
                            if (end::isString()) {
                                let s = Resource.createResource(end, $SchemaClass.Node, res, modelClasses, entitiesByID, e.namespace, castingMethod);
                                added.push(s.fullID);
                                s[related[i]] = [e];
                            }
                        });
                    }
                }
            }
        });

        if (added.length > 0) {
            added.forEach(id => delete entitiesByID.waitingList[id]);
            added = added.filter(id => !entitiesByID[id]);

            let resources = added.filter(id => entitiesByID[id].class !== $SchemaClass.External);
            if (resources.length > 0) {
                logger.warn($LogMsg.AUTO_GEN, resources);
            }

            let externals = added.filter(id => entitiesByID[id].class === $SchemaClass.External);
            if (externals.length > 0) {
                logger.warn($LogMsg.AUTO_GEN_EXTERNAL, externals);
            }
        }

        if (entitiesByID.waitingList::keys().length > 0){
            logger.error($LogMsg.REF_UNDEFINED, "model", entitiesByID.waitingList::keys());
        }

        res.syncRelationships(modelClasses, entitiesByID);
        res.modelClasses = modelClasses;
        res.uuid = uuidv4();
    }

    /**
     * Create expanded Graph model from the given JSON input model
     * @param json - input model
     * @param modelClasses - classes to represent model resources
     * @returns {Graph}
     */
    static fromJSON(json, modelClasses = {}) {
        const V = new Validator();
        delete schema.oneOf;
        schema.$ref = "#/definitions/Graph";
        let resVal = V.validate(json, schema);

        let inputModel = json::cloneDeep();
        inputModel.class = $SchemaClass.Graph;

        //Copy existing entities to a map to enable nested model instantiation
        /**
         * @property waitingList
         * @type {Object}
         */
        let entitiesByID = {
            waitingList: {}
        };
        inputModel.entitiesByID = entitiesByID;

        let defaultGroup;

        if (!inputModel.generated) {
            let count = 1;
            const prefix = [$Prefix.node, $Prefix.link];
            [$Field.nodes, $Field.links].forEach((prop, i) => (inputModel[prop] || []).forEach(e => {
                    if (e::isObject() && !e.id) {
                        e.id = getGenID(prefix[i], $Prefix.default, count++);
                        e.fullID = getFullID(inputModel.namespace, e.id);
                    }
                }
            ));
            inputModel.groups = inputModel.groups || [];

            //Collect resources necessary for template expansion from all groups
            let relFieldNames = [$Field.nodes, $Field.links, $Field.lyphs, $Field.materials, $Field.groups, $Field.channels,
                $Field.varianceSpecs];
            collectNestedResources(inputModel, relFieldNames, $Field.groups);

            modelClasses.Channel.defineChannelLyphTemplates(inputModel);

            replaceReferencesToExternal(inputModel, inputModel.localConventions);
            inputModel.groupsByID::values().forEach(json => {
                json.class = json.class || $SchemaClass.Group;
                replaceReferencesToExternal(json, json.localConventions || inputModel.localConventions);
            });

            modelClasses.Group.replaceReferencesToTemplates(inputModel);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Group.replaceReferencesToTemplates(json);
            });

            modelClasses.Group.expandLyphTemplates(inputModel, modelClasses);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Group.expandLyphTemplates(json, modelClasses);
            });

            modelClasses.Group.expandChainTemplates(inputModel, modelClasses);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Group.expandChainTemplates(json, modelClasses);
            });

            modelClasses.Group.expandVillusTemplates(inputModel, modelClasses);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Group.expandVillusTemplates(json, modelClasses);
            });

            modelClasses.Group.embedChainsToHousingLyphs(inputModel, modelClasses);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Group.embedChainsToHousingLyphs(json, modelClasses);
            });

            modelClasses.Group.createTemplateInstances(inputModel, modelClasses);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Group.createTemplateInstances(json, modelClasses);
            });

            //Clone nodes simultaneously required to be on two or more lyph borders
            modelClasses.Node.replicateBorderNodes(inputModel, modelClasses);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Node.replicateBorderNodes(json, modelClasses);
            });

           //Clone nodes simultaneously required to be on two or more lyphs
            modelClasses.Node.replicateInternalNodes(inputModel, modelClasses);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Node.replicateInternalNodes(json, modelClasses);
            });

           //Reposition internal resources
            modelClasses.Lyph.mapInternalResourcesToLayers(inputModel, modelClasses);
            inputModel.groupsByID::values().forEach(json => {
                modelClasses.Lyph.mapInternalResourcesToLayers(json, modelClasses);
            });
        }

        let res = super.fromJSON(inputModel, modelClasses, entitiesByID, inputModel.namespace);

        if (resVal.errors && resVal.errors.length > 0){
            logger.error($LogMsg.SCHEMA_GRAPH_ERROR, ...resVal.errors.map(e => e::pick("message", "instance", "path")));
        }

        //Auto-create missing definitions for used references
        this.processGraphWaitingList(res, entitiesByID, inputModel.namespace, modelClasses, undefined);

        if (!res.generated) {

            let noAxisLyphsInternal = (res.lyphs || []).filter(lyph => lyph.internalIn && !lyph.axis && !lyph.isTemplate);
            res.createAxes(noAxisLyphsInternal, modelClasses, entitiesByID);

            let noAxisLyphs = (res.lyphs || []).filter(lyph => lyph::isObject() && !lyph.conveys && !lyph.layerIn && !lyph.isTemplate);
            res.createAxes(noAxisLyphs, modelClasses, entitiesByID);
            (res.groups || []).forEach(group => group.includeRelated && group.includeRelated());
            (res.coalescences || []).forEach(r => r.createInstances(res, modelClasses));

            //Collect inherited externals
            (res.lyphs || []).forEach(lyph => {
                if (lyph.supertype) {
                    if (!lyph.collectInheritedExternals) {
                        logger.error($LogMsg.CLASS_ERROR_RESOURCE, lyph.id, lyph.class, "collectInheritedExternals");
                    } else {
                        lyph.collectInheritedExternals($Field.external, $Field.inheritedExternal);
                        lyph.collectInheritedExternals($Field.ontologyTerms, $Field.inheritedOntologyTerms);
                        lyph.collectInheritedExternals($Field.references, $Field.inheritedReferences);
                    }
                }
            });

            //Validate
            (res.links || []).forEach(r => r.validate ? r.validate() : logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r));
            (res.coalescences || []).forEach(r => r.validate ? r.validate() : logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r));
            (res.channels || []).forEach(r => r.validate ? r.validate(res) : logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r));

            //Connect chain's last level with the following chain's first level (issue #129)
            (res.chains || []).forEach(r => r.connect ? r.connect() : logger.error($LogMsg.CLASS_ERROR_UNDEFINED, r));
            //Assign helper property housingLyph for simpler Cypher queries
            (res.lyphs || []).forEach(lyph => {
                if (lyph instanceof modelClasses.Lyph) {
                    let axis = lyph.axis;
                    let housingLyph = axis && (axis.fasciculatesIn || axis.endsIn);
                    if (housingLyph) {
                        lyph.housingLyph = housingLyph;
                    }
                }
            });

            res.mergeSubgroupResources();
            deleteRecursively(res, $Field.group, "_processed");

            res.mergeScaffoldResources();
            (res.chains || []).forEach(chain => {
                if (chain instanceof modelClasses.Chain) {
                    chain.validateHousedChainRoute();
                    chain.validateAnchoring();
                    chain.resizeLyphs();
                } else {
                    logger.error($LogMsg.CLASS_ERROR_RESOURCE, "resizeLyphs", chain, modelClasses.Chain.name);
                }
            });

            //Set default group resources to hidden
            const defaultID = getGenID($Prefix.group, $Prefix.default);
            defaultGroup = modelClasses.Group.fromJSON(genResource({
                [$Field.id]: defaultID,
                [$Field.fullID]: getFullID(res.namespace, defaultID),
                [$Field.namespace]: res.namespace,
                [$Field.name]: "Ungrouped",
                [$Field.hidden]: true,
                [$Field.links]: (res.links || []).filter(e => !res.groups.find(group => findResourceByID(group.links, e.id))),
                [$Field.nodes]: (res.nodes || []).filter(e => !res.groups.find(group => findResourceByID(group.nodes, e.id)))
            }, "graphModel.fromJSON (Group)"));

            defaultGroup.includeRelated && defaultGroup.includeRelated();
            [$Field.nodes, $Field.links].forEach(prop => defaultGroup[prop].forEach(e => e.hidden = true));
            if (defaultGroup.links.length && defaultGroup.nodes.length) {
                res.groups.unshift(defaultGroup);
            }
            //res.createForceLinks();
            res.scaleFactor = 1;
        }

        if (res.groups) {
            res.groups.forEach(g => g.markImported());
            res.groups = res.groups::sortBy([$Field.namespace, $Field.name, $Field.id]);
        }
        if (res.scaffolds) {
            res.scaffolds = res.scaffolds::sortBy([$Field.namespace, $Field.name, $Field.id]);
        }

        res.generated = true;
        logger.info($LogMsg.GRAPH_RESOURCE_NUM, this.id, entitiesByID::keys().length);
        res.logger = logger;
        this.entitiesByID = entitiesByID;

        return res;
    }

    createForceLinks(){
        let group_json = genResource({
            [$Field.id]       : getGenID($Prefix.group, $Prefix.force),
            [$Field.name]     : "Force links",
            [$Field.hidden]   : false,
            [$Field.links]    : [],
            [$Field.nodes]    : []
        }, "graphModel.createForceLinks (Group)");
        //Create invisible links to generate attraction forces for housing lyphs of connected chains
        (this.links||[]).forEach(lnk => {
            if (lnk.collapsible){
                let nodes = lnk.createForceNodes();
                if (nodes[0] && nodes[0].class === $SchemaClass.Node
                    && nodes[1] && nodes[1].class === $SchemaClass.Node){
                    if ((nodes[0].id !== nodes[1].id)) {
                        let force_json = this.modelClasses.Link.createForceLink(nodes[0].id, nodes[1].id);
                        if (!findResourceByID(this.links, force_json.id)) {
                            let force = Link.fromJSON(force_json, this.modelClasses, this.entitiesByID, this.namespace);
                            [$Field.sourceOf, $Field.targetOf].forEach((prop, i) => {
                                nodes[i][prop] = nodes[i][prop] || [];
                                nodes[i][prop].push(force);
                            })
                            group_json.links.push(force.id);
                            this.links.push(force);
                        }
                    }
                } else {
                    logger.warn($LogMsg.LINK_FORCE_FAILED, getID(nodes[0]), getID(nodes[1]));
                }
            }
        })
        const group = Group.fromJSON(group_json, this.modelClasses, this.entitiesByID, this.namespace);
        if (group.links.length) {
            this.groups.unshift(group);
        }
    }

    /**
     * Generate the JSON input model from an Excel file (.xlsx)
     * @param inputModel   - Excel ApiNATOMY connectivity model
     * @param modelClasses - model resource classes
     * @returns {*}
     */
    static excelToJSON(inputModel, modelClasses = {}){
        let modelSchema = schemaClassModels[$SchemaClass.Graph];
        let model = inputModel::pick(modelSchema.relationshipNames.concat(["main", "localConventions"]));
        const borderNames = ["inner", "radial1", "outer", "radial2"];

        model::keys().forEach(relName => {
            let table = model[relName];
            if (!table) { return; }
            if (relName === "localConventions") {  // local conventions are not a resource
                extractLocalConventions(table);
            } else {
                let clsName = relName === "main" ? $SchemaClass.Graph : modelSchema.relClassNames[relName];
                if (!modelClasses[clsName]) {
                    logger.warn($LogMsg.EXCEL_NO_CLASS_NAME, relName);
                    return;
                }
                const convertModelValue = (key, value) => {
                    if (key === "levelTargets" || borderNames.includes(key)) {
                        return value;
                    }
                    let res = convertValue(clsName, key, value, borderNames);
                    if (relName === $Field.lyphs && (key === $Field.length || key === $Field.thickness)) {
                        res = {min: parseInt(res), max: parseInt(res)};
                    }
                    return res;
                };

                let headers = table[0] || [];
                for (let i = 1; i < table.length; i++) {
                    let resource = {};
                    table[i].forEach((value, j) => {
                        if (!validateValue(value, headers[j])) {
                            return;
                        }
                        let key = headers[j].trim();
                        try {
                            let res = convertModelValue(key, value);
                            if (res !== undefined) {
                                resource[key] = res;
                            }
                        } catch (e) {
                            logger.error($LogMsg.EXCEL_CONVERSION_ERROR, relName, key, value, "row #" + i, "column #" + j);
                        }
                    });
                    table[i] = resource;
                    try {
                        if (clsName === $SchemaClass.Lyph) {
                            table[i] = borderNamesToBorder(table[i], borderNames);
                        }
                        if (clsName === $SchemaClass.Chain) {
                            table[i] = levelTargetsToLevels(table[i]);
                        }
                    } catch (e) {
                        logger.error($LogMsg.EXCEL_CONVERSION_ERROR, relName, "row #" + i);
                    }
                }
            }
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
        XLSX.writeFile(wb, inputModel.id + "-converted.xlsx");
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
     * @param noAxisLyphs - a list of lyphs without axisnpm
     * @param modelClasses - model resource classes
     * @param entitiesByID - a global resource map to include the generated resources
     */
    createAxes(noAxisLyphs, modelClasses, entitiesByID){
        let group = (this.groups||[]).find(g => g.id === getGenID($Prefix.group, $Prefix.default));
        if (!group){
            group = {links: [], nodes: [], name: "Auto-created links"};
        }
        noAxisLyphs.forEach(lyph => {
            if (!lyph.createAxis){
                logger.error($LogMsg.CLASS_ERROR_RESOURCE, lyph);
                return;
            }
            let link = lyph.createAxis(modelClasses, entitiesByID, lyph.namespace);
            this.links.push(link);
            link.applyToEndNodes(end => this.nodes.push(end));
            if (group && !group.links.find(lnk => lnk.id === link.id)){
                group.links.push(link);
                link.applyToEndNodes(end => group.nodes.push(end));
            }
        });
        if (noAxisLyphs.length > 0){
            logger.info($LogMsg.GROUP_GEN_LYPH_AXIS, noAxisLyphs.map(x => x.id));
        }
        noAxisLyphs.forEach(lyph => lyph.assignAxisLength && lyph.assignAxisLength());
        if (group.name === "Auto-created links" && group.links.length > 0){
            const autoID = getGenID($Prefix.group, $Prefix.autoLinks);
            let autoGroup = modelClasses.Group.fromJSON(genResource({
                [$Field.id]: autoID,
                [$Field.fullID]: getFullID(this.namespace, autoID),
                [$Field.namespace]: this.namespace,
                [$Field.name]: group.name,
                [$Field.hidden]: true,
                [$Field.links]: group.links,
                [$Field.nodes]: group.nodes
            }, "graphModel.createAxes (Group)"));
            this.groups.push(autoGroup);
        }
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
        if (this.scaleFactor === scaleFactor){
            //The graph has been scaled - processing an expanded model
            return;
        }
        const scalePoint = p => ["x", "y", "z"].forEach(key => p[key]::isNumber() && (p[key] *= scaleFactor));
        (this.scaffolds||[]).forEach(scaffold => scaffold.scale(scaleFactor));
        (this.lyphs||[]).forEach(lyph => {
            if (lyph.width)  {lyph.width  *= scaleFactor}
            if (lyph.height) {lyph.height *= scaleFactor}
        });
        (this.nodes||[]).forEach(e => e.layout && scalePoint(e.layout));
        (this.links||[]).forEach(e => {
            if (e::isObject()) {
                e.length = (e.length || $Default.EDGE_LENGTH) * scaleFactor;
                e.arcCenter && scalePoint(e.arcCenter);
                e.controlPoint && scalePoint(e.controlPoint);
            }
        });
        this.scaleFactor = scaleFactor;
    }

    /**
     * Serialize the map of all resources to JSONLD
     */
    entitiesToJSONLD(){
        let m = "https://apinatomy.org/uris/models/";
        let uri = m.concat(this.id);

        let curiesContext = {};
        (this.localConventions || []).forEach((obj) =>
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
    static entitiesToJSONLDFlat(res, callback){
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

            //BAG = target closed
            const expandSource = (t === LYPH_TOPOLOGY.TUBE) || (t === LYPH_TOPOLOGY.BAG) || lnk.collapsible;
            const expandTarget = (t === LYPH_TOPOLOGY.TUBE) || (t === LYPH_TOPOLOGY.BAG2) || lnk.collapsible;

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

            let res = true;

            const filterForce = links => (links||[]).filter(lnk => lnk.description !== "force");

            const allEndsValid = (node, sourceTopology, targetTopology) => {
                const sourceOfLinks = filterForce(node.sourceOf);
                const targetOfLinks = filterForce(node.targetOf);
                const n = sourceOfLinks.length + targetOfLinks.length;
                if (n > 1) {
                    sourceOfLinks.forEach(lnk1 => res = res && isValid(lnk1, sourceTopology));
                    targetOfLinks.forEach(lnk1 => res = res && isValid(lnk1, targetTopology));
                } else {
                    res = false;
                }
            }
            if (expandSource){
                allEndsValid(lnk.source, LYPH_TOPOLOGY.BAG, LYPH_TOPOLOGY.BAG2);
            }
            if (expandTarget){
                allEndsValid(lnk.target, LYPH_TOPOLOGY.BAG2, LYPH_TOPOLOGY.BAG);
            }
            return res;
        }

        if (dfs(lnk0)){
            const groupNodes = [];
            const groupLyphs = [];

            this.includeLinkEnds(groupLinks, groupNodes);
            this.includeConveyingLyphs(groupLinks, groupLyphs);
            groupLyphs.forEach(lyph => lyph._processed = true); //exclude reachable lyphs

            const groupColor = pickColor();
            groupLinks.forEach(lnk => {
                //lnk.stroke = EDGE_STROKE.THICK;
                lnk.color = groupColor;
            });

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
            if (groupLinks.length > 0) {
                return this.createGroup(groupId, groupName, groupNodes, groupLinks, groupLyphs, this.modelClasses);
            }
        } else {
            //Clean all after unsuccessful crawling
            (groupLinks||[]).forEach(lnk => delete lnk._processed);
        }
    }

    getCurrentState(){
        let json =  {
            [$Field.visibleGroups]: this.visibleGroups.map(g => g.id)
        }
        json.scaffolds = [];
        (this.scaffolds||[]).forEach(s => {
            json.scaffolds.push(s.getCurrentState())
        })
        return json;
    }

    removeLyph(lyph){
        let removed = lyph.clearReferences();
        if (!removed) {
            logger.error($LogMsg.LYPH_REMOVE_FAIL, this.id);
        } else {
            removed.forEach(lyph => this.deleteFromGroup(lyph));
        }
        return removed;
    }
}
