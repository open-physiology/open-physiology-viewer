import { Resource } from './resourceModel';
import {isObject, unionBy, merge, keys, entries, isArray, pick} from 'lodash-bound';
import {getGenID, addColor, $SchemaClass, $Field, $Color, $Prefix, findResourceByID, getID} from './utils';
import {logger} from './logger';
import {$GenEventMsg} from "./genEvent";

/**
 * Group (subgraph) model
 * @class
 * @property nodes
 * @property links
 * @property regions
 * @property lyphs
 * @property materials
 * @property references
 * @property groups
 * @property trees
 * @property channels
 * @property coalescences
 */
export class Group extends Resource {
    /**
     * Create a graph model from the JSON specification
     * @param json - input model
     * @param modelClasses - model resource classes
     * @param entitiesByID - global map of model resources
     * @returns {*} - Graph model - model suitable for visualization
     */
    static fromJSON(json, modelClasses = {}, entitiesByID) {

        if (json.generated) {
            return super.fromJSON(json, modelClasses, entitiesByID);
        }

        //Regions in groups are simple areas, facets and anchors can be used in scaffolds only
        (json.regions||[]).forEach(region => {
            if ((region.facets||[]).length > 0){
                logger.warn("Removed facets from region definition in group", json.id, region.id, region.facets);
            }
            delete region.facets;
            if ((region.internalAnchors||[]).length > 0){
                logger.warn("Removed internal anchors from region definition in group", json.id, region.id, region.internalAnchors);
            }
            delete region.internalAnchors;
        });

        //correct lyph definitions by marking layers of templates as templates
        modelClasses.Lyph.markAsTemplate(json.lyphs);

        //replace references to templates
        this.replaceReferencesToTemplates(json, modelClasses);

        //create group resources from templates
        this.expandGroupTemplates(json, modelClasses);

        //create lyphs that inherit properties from templates
        this.expandLyphTemplates(json.lyphs, modelClasses);

        //create villus
        this.expandVillusTemplates(json, modelClasses);

        /******************************************************************************************************/
        /*the following methods have to be called after expandLyphTemplates to have access to generated layers*/

        //align generated groups and housing lyphs
        (json.chains||[]).forEach(chain => modelClasses.Chain.embedToHousingLyphs(json, chain));

        //create instances of group templates (e.g., trees and channels)
        this.createTemplateInstances(json, modelClasses);

        //Clone nodes simultaneously required to be on two or more lyph borders
        this.replicateBorderNodes(json, modelClasses);

        //Clone nodes simultaneously required to be on two or more lyphs
        this.replicateInternalNodes(json, modelClasses);

        //Reposition internal resources
        this.mapInternalResourcesToLayers(json.lyphs);

        /******************************************************************************************************/
        //create graph resource
        let res  = super.fromJSON(json, modelClasses, entitiesByID);

        //copy nested references to resources to the parent group
        res.mergeSubgroupEntities();

        //Add conveying lyphs to groups that contain links
        (res.links||[]).forEach(link => {
            if (link.conveyingLyph && !res.lyphs.find(lyph => lyph.id === link.conveyingLyph.id)){
                res.lyphs.push(link.conveyingLyph);
            }
        });

        //validate process edges
        res.validateProcessEdges(modelClasses);

        //Assign color to visual resources with no color in the spec
        addColor(res.regions, $Color.Region);
        addColor(res.links, $Color.Link);
        addColor(res.lyphs);

        return res;
    }

    /**
     * Replace references to lyph templates with references to auto-generated lyphs that inherit properties from templates
     * @param json - input model
     * @param modelClasses - model resource classes
     */
    static replaceReferencesToTemplates(json, modelClasses){

        let changedLyphs = 0;
        let changedMaterials = 0;

        const replaceRefToMaterial = (ref) => {
            let lyphID = getGenID($Prefix.material, ref);
            let template = (json.lyphs || []).find(e => (e.id === lyphID) && e.isTemplate);
            if (!template){
                let material = (json.materials || []).find(e => e.id === ref);
                if (material) {
                    template = {
                        [$Field.id]            : lyphID,
                        [$Field.name]          : material.name,
                        [$Field.isTemplate]    : true,
                        [$Field.materials]     : [material.id],
                        [$Field.generatedFrom] : material.id,
                        [$Field.skipLabel]     : true,
                        [$Field.generated]     : true
                    };
                    template::merge(material::pick([$Field.name, $Field.external, $Field.color]));
                    json.lyphs.push(template);
                }
            }
            if (template){
                return template.id;
            }
            return ref;
        };

        const replaceRefToTemplate = (ref, parent) => {
            let template = (json.lyphs || []).find(e => e.id === ref && e.isTemplate);
            if (template) {
                changedLyphs++;
                let subtype = {
                    [$Field.id]        : getGenID($Prefix.template, ref, parent.id),
                    [$Field.name]      : template.name,
                    [$Field.supertype] : template.id,
                    [$Field.skipLabel] : true,
                    [$Field.generated] : true
                };
                if (!findResourceByID(json.lyphs, subtype.id)){
                    json.lyphs.push(subtype);
                    replaceAbstractRefs(subtype, $Field.layers);
                }
                return subtype.id;
            }
            return ref;
        };

        const replaceAbstractRefs = (resource, key) => {
            if (!resource[key]) { return; }
            const replaceLyphTemplates = ![$Field.subtypes, $Field.supertype, $Field.lyphTemplate, $Field.housingLyphs, $Field.lyphs].includes(key);
            if (resource[key]::isArray()) {
                resource[key] = resource[key].map(ref => replaceRefToMaterial(ref));
                if (replaceLyphTemplates){
                    resource[key] = resource[key].map(ref => replaceRefToTemplate(ref, resource));
                }
            } else {
                resource[key] = replaceRefToMaterial(resource[key]);
                if (replaceLyphTemplates) {
                    resource[key] = replaceRefToTemplate(resource[key], resource);
                }
            }
        };

        (json::entries()||[]).forEach(([relName, resources]) => {
            if (!resources::isArray()) { return; }
            let classNames = modelClasses[this.name].Model.relClassNames;
            if (classNames[relName]) {
                let refsToLyphs = modelClasses[classNames[relName]].Model.selectedRelNames($SchemaClass.Lyph);
                if (!refsToLyphs){ return; }
                (resources || []).forEach(resource => {
                    (resource::keys() || []).forEach(key => { // Do not replace valid references to templates
                        if (refsToLyphs.includes(key)) { replaceAbstractRefs(resource, key); }
                    })
                })
            }
        });
        if (changedLyphs > 0){
            logger.info(...$GenEventMsg.REF_TO_LYPH(changedLyphs));
        }
        if (changedMaterials > 0){
            logger.info(...$GenEventMsg.REF_TO_MAT(changedMaterials));
        }
    }

    /**
     * Generate groups from group templates, i.e. auto-create necessary nodes and links conveying given or generated lyphs
     * @param json - input model
     * @param modelClasses - model resource classes
     */
    static expandGroupTemplates(json, modelClasses){
        if (!modelClasses){ return; }
        let relClassNames = modelClasses[this.name].Model.relClassNames;
        [$Field.channels, $Field.chains].forEach(relName => {
            let clsName = relClassNames[relName];
            if (!clsName){
                logger.error(`Could not find class definition for the field ${relName}`)
            }
            (json[relName]||[]).forEach((template, i) => {
                if (template::isObject()) {//expand group templates, but not references
                    template.id = template.id || getGenID(json.id, relName, i);
                    modelClasses[clsName].expandTemplate(json, template);
                } else {
                    logger.info("Found template defined in another group", template);
                    //logger.info("Added references to generated groups", template);
                    json[$Field.groups] = json[$Field.groups] || [];
                    json[$Field.groups].push(getGenID($Prefix.group, template));
                }
            });
        });
    }

    /**
     * Generate group template instances
     * @param json - input model
     * @param modelClasses - model resource classes
     */
    static createTemplateInstances(json, modelClasses){
        if (!modelClasses){ return; }

        let relClassNames = this.Model.relClassNames;
        [$Field.trees, $Field.channels].forEach(relName => {
            let clsName = relClassNames[relName];
            if (!clsName){ logger.error(`Could not find class definition for the field ${relName}`); }
            (json[relName]||[]).forEach(field => modelClasses[clsName].createInstances(json, field));
        })
    }

    /**
     * Create lyphs that inherit properties from templates
     * @param lyphs - input model lyphs
     * @param modelClasses - model resource classes
     */
    static expandLyphTemplates(lyphs, modelClasses){
        let templates = (lyphs||[]).filter(lyph => lyph.isTemplate);
        templates.forEach(template => modelClasses.Lyph.expandTemplate(lyphs, template));
        templates.forEach(template => delete template._inactive);
    }

    /**
     * Generate subgraphs to model villi
     * @param json - input model
     * @param modelClasses - model resource classes
     */
    static expandVillusTemplates(json, modelClasses){
        (json.lyphs||[]).filter(lyph => lyph.villus).forEach(lyph => {
            lyph.villus.villusOf = lyph.id;
            modelClasses.Villus.expandTemplate(json, lyph.villus);
        })
    }

    static getOrCreateNode(nodes, nodeID){
        let node  = (nodes||[]).find(e => e.id === nodeID);
        if (!node){
            node = {
                [$Field.id]: nodeID,
                [$Field.skipLabel]: true,
                [$Field.generated]: true
            };
            if (!nodes){ nodes = []; }
            nodes.push(node);
        }
        return node;
    }

    /**
     * Replicate border nodes and create collapsible links
     * @param json
     * @param modelClasses
     */
    static replicateBorderNodes(json, modelClasses){
        let borderNodesByID = {};
        (json.lyphs||[]).forEach(lyph => {
            if (lyph.border && lyph.border.borders) {
                lyph.border.borders.forEach(b => {
                    (b.hostedNodes||[]).forEach(nodeID => {
                        if (!borderNodesByID[nodeID]){ borderNodesByID[nodeID] = []; }
                        borderNodesByID[nodeID].push(lyph);
                    });
                })
            }
        });

        //const isBundledLink = (link, lyph) => (lyph.bundles||[]).find(e => getID(e) === link.id);
        const nodeOnBorder = (node, lyphID) => (borderNodesByID[getID(node)]||[]).find(e => e.id === lyphID);

        borderNodesByID::keys().forEach(nodeID => {
            let hostLyphs = borderNodesByID[nodeID];
            if (hostLyphs.length > 1){
                let node  = Group.getOrCreateNode(json.nodes, nodeID);
                let prev = nodeID;
                hostLyphs.forEach((hostLyph, i) => {
                    if (i < 1) { return; }
                    let nodeClone = {
                        [$Field.id]: getGenID(nodeID, $Prefix.clone, i),
                        [$Field.skipLabel]: true,
                        [$Field.generated]: true
                    };
                    modelClasses.Node.clone(node, nodeClone);
                    json.nodes.push(nodeClone);

                    let targetOfLinks = (json.links||[]).filter(e => getID(e.target) === nodeID && nodeOnBorder(e.source, hostLyph.id));
                    let sourceOfLinks = (json.links||[]).filter(e => getID(e.source) === nodeID && nodeOnBorder(e.target, hostLyph.id));
                    // let targetOfLinks = (json.links||[]).filter(e => getID(e.target) === nodeID && isBundledLink(e, hostLyph));
                    // let sourceOfLinks = (json.links||[]).filter(e => getID(e.source) === nodeID && isBundledLink(e, hostLyph));
                    targetOfLinks.forEach(lnk => {lnk.target = nodeClone.id});
                    sourceOfLinks.forEach(lnk => {lnk.source = nodeClone.id});

                    hostLyphs[i].border.borders.forEach(b => {
                        let k = (b.hostedNodes||[]).indexOf(nodeID);
                        if (k > -1){ b.hostedNodes[k] = nodeClone.id; }
                    });
                    let lnk = modelClasses.Link.createCollapsibleLink(prev, nodeClone.id);
                    json.links.push(lnk);
                    prev = nodeClone.id;
                })
            }
        });
    }

    static replicateInternalNodes(json, modelClasses){
        let internalNodesByID = {};
        (json.lyphs||[]).forEach(lyph => {
            (lyph.internalNodes||[]).forEach(nodeID => {
                if (!internalNodesByID[nodeID]){ internalNodesByID[nodeID] = []; }
                internalNodesByID[nodeID].push(lyph);
            });
        });

        const isBundledLink = (link, lyph) => (lyph.bundles||[]).find(e => getID(e) === link.id);

        internalNodesByID::keys().forEach(nodeID => {
            let hostLyphs = internalNodesByID[nodeID];
            if (hostLyphs.length > 1){
                let node = Group.getOrCreateNode(json.nodes, nodeID);
                if (node.generated) {
                    //if the node was generated, its internalIn property may be incorrectly set by chain generator
                    delete node.internalIn;
                }

                let allTargetLinks = [];
                let allSourceLinks = [];

                hostLyphs.forEach((hostLyph, i) => {
                    let nodeClone = {
                        [$Field.id]: getGenID(nodeID, $Prefix.join, i),
                        [$Field.skipLabel]: true,
                        [$Field.generated]: true
                    };
                    modelClasses.Node.clone(node, nodeClone);
                    json.nodes.push(nodeClone);
                    let k = hostLyph.internalNodes.indexOf(nodeID);
                    if (k > -1){ hostLyph.internalNodes[k] = nodeClone.id; }

                    //rewire affected links
                    let targetOfLinks = (json.links||[]).filter(e => getID(e.target) === nodeID && isBundledLink(e, hostLyph));
                    let sourceOfLinks = (json.links||[]).filter(e => getID(e.source) === nodeID && isBundledLink(e, hostLyph));
                    targetOfLinks.forEach(lnk => {
                        lnk.target = nodeClone.id;
                        allTargetLinks.push(lnk);
                    });
                    sourceOfLinks.forEach(lnk => {
                        lnk.source = nodeClone.id;
                        allSourceLinks.push(lnk);
                    });

                    let leafChains = targetOfLinks.map(e => e.levelIn);
                    let rootChains = sourceOfLinks.map(e => e.levelIn);

                    //Reset rootOf and leafOf and include generated node into relevant chain groups
                    const fixNodeChainRels = (chains, prop) => {
                        if (chains.length > 0){
                            nodeClone[prop] = chains;
                            if (node[prop]) {
                                node[prop] = node[prop].filter(e => !chains.includes(e));
                            }
                            chains.forEach(e => {
                                let chain = findResourceByID(json.chains, e);
                                if (chain && chain.group){
                                    chain.group.nodes.push(nodeClone.id);
                                    let relatedProp = prop === $Field.leafOf? $Field.leaf: $Field.root;
                                    chain[relatedProp] = nodeClone.id;
                                }
                            })
                        }
                    };

                    fixNodeChainRels(leafChains, $Field.leafOf);
                    fixNodeChainRels(rootChains, $Field.rootOf);

                    let lnk;
                    if (rootChains.length > 0) {
                        lnk = modelClasses.Link.createCollapsibleLink(node.id, nodeClone.id);
                    } else {
                        lnk = modelClasses.Link.createCollapsibleLink(nodeClone.id, node.id);
                    }
                    json.links.push(lnk);
                });

                if (allSourceLinks.length > 0){
                    allTargetLinks.forEach(e => e.nextChainStartLevels = allSourceLinks.map(x => x.id));
                }
                if (allTargetLinks.length > 0) {
                    allSourceLinks.forEach(e => e.prevChainEndLevels = allTargetLinks.map(x => x.id));
                }

                node.controlNodes = node.clones;
                logger.info("Cloned node to join housed chain ends", node.id, node.clones);
            }
        });
    }

    /**
     * Assign internal resources to generated lyph layers
     * @param lyphs
     */
    static mapInternalResourcesToLayers(lyphs){
        //TODO check that properties like fascilitatesIn and bundles are also updated
        function moveResourceToLayer(resourceIndex, layerIndex, lyph, prop){
            if (layerIndex < lyph.layers.length){
                let layer = findResourceByID(lyphs, lyph.layers[layerIndex]);
                if (layer){
                    layer[prop] = layer[prop] || [];
                    let internalResourceID = lyph[prop][resourceIndex]::isObject()? lyph[prop][resourceIndex].id: lyph[prop][resourceIndex];
                    if (internalResourceID && !layer[prop].find(x => x === internalResourceID)){
                        layer[prop].push(internalResourceID);
                    }
                    logger.info("Placed resource into layer", internalResourceID, layer.id, prop, layer[prop]);
                    lyph[prop][resourceIndex] = null;
                } else {
                    logger.warn("Failed to locate layer lyph to reposition internal lyphs", lyph, layerIndex, lyph.layers[layerIndex]);
                }
            } else {
                logger.warn("Failed to relocate internal lyph to layer: layer index out of range", layerIndex, lyph.layers.length, lyph.id, resourceIndex);
            }
        }
        (lyphs||[]).filter(lyph => lyph.layers && lyph.internalLyphs && lyph.internalLyphsInLayers).forEach(lyph=> {
            for (let i = 0; i < Math.min(lyph.internalLyphs.length, lyph.internalLyphsInLayers.length); i++){
                moveResourceToLayer(i, lyph.internalLyphsInLayers[i], lyph, $Field.internalLyphs);
            }
            lyph.internalLyphs = lyph.internalLyphs.filter(x => !!x);
        });

        (lyphs||[]).filter(lyph => lyph.layers && lyph.internalNodes && lyph.internalNodesInLayers).forEach(lyph=> {
            for (let i = 0; i < Math.min(lyph.internalNodes.length, lyph.internalNodesInLayers.length); i++){
                moveResourceToLayer(i, lyph.internalNodesInLayers[i], lyph, $Field.internalNodes);
            }
            lyph.internalNodes = lyph.internalNodes.filter(x => !!x);
        });
    }

    /**
     * Add entities from subgroups to the current group
     */
    mergeSubgroupEntities(){
        //Place references to subgroup resources to the current group
        (this.groups||[]).forEach(group => {
            if (group.id === this.id) {
                logger.warn("The model contains self-references or cyclic group dependencies: ", this.id, group.id);
                return;
            }
            let relFieldNames = this.constructor.Model.filteredRelNames([$SchemaClass.Group, $SchemaClass.GroupTemplate]);
            relFieldNames.forEach(property => {
                if (group[property]::isArray()){
                    this[property] = (this[property]||[])::unionBy(group[property], $Field.id);
                    this[property] = this[property].filter(x => x.class);
                }
            });
        });

        //Add auto-created clones of boundary nodes and collapsible links they connect to the group that contains the original node
        (this.nodes||[]).filter(node => node && node.clones).forEach(node => {
            node.clones.forEach(clone => {
                let spacerLinks = (clone.sourceOf||[]).concat(clone.targetOf).filter(lnk => lnk && lnk.collapsible);
                spacerLinks.forEach(lnk => this.links.push(lnk));
                if (spacerLinks.length > 0){
                    this.nodes.push(clone);
                }
                if (clone.hostedBy) {
                    clone.hostedBy.hostedNodes = clone.hostedBy.hostedNodes || [];
                    clone.hostedBy.hostedNodes.push(clone);
                }
            });
        });
    }

    /**
     * Validate process edges
     * @param modelClasses
     */
    validateProcessEdges(modelClasses){
        (this.links||[]).forEach(lnk => {
            if (lnk.conveyingLyph){
                let layers = lnk.conveyingLyph.layers || [lnk.conveyingLyph];
                if (layers[0] && layers[0].materials){
                    if (lnk.conveyingType === modelClasses.Link.PROCESS_TYPE.ADVECTIVE){
                        if (!lnk.conveyingMaterials || lnk.conveyingMaterials.length === 0){
                            lnk.conveyingMaterials = layers[0].materials;
                        } else {
                            let diff = (layers[0].materials || []).filter(x => !(lnk.conveyingMaterials||[]).find(e => e.id === x.id));
                            if (diff.length > 0){
                                logger.warn("Incorrect advective process: not all innermost layer materials of the conveying lyph are conveyed by the link", lnk, diff);
                            }
                        }
                    } else {
                        let nonConveying = (lnk.conveyingMaterials||[]).filter(x => !(layers[0].materials || []).find(e => e.id === x.id));
                        if (nonConveying.length > 0){
                            logger.warn("Incorrect diffusive process: materials are not conveyed by the innermost layer of the conveying lyph:", lnk, nonConveying);
                        }
                    }
                }
            }
        });
    }

    /**
     * Entities that belong to the group (resources excluding subgroups)
     * @returns {*[]}
     */
    get resources(){
        let res = [];
        let relFieldNames = this.constructor.Model.filteredRelNames([$SchemaClass.Group]);
        relFieldNames.forEach(property => res = res::unionBy((this[property] ||[]), $Field.id));
        return res.filter(e => !!e && e::isObject());
    }

    /**
     * Show subgroups of the current group. A resources is shown if it belongs to at least one visible subgroup
     * @param groups - selected subgroups
     */
    showGroups(groups){
        this.show(); //show all entities that are in the main group
        (this.groups || []).filter(g => (g instanceof Group) && !groups.has(g)).forEach(g => g.hide()); //hide entities from hidden groups
        (this.groups || []).filter(g => (g instanceof Group) && groups.has(g)).forEach(g => g.show());  //show entities that are in visible groups
    }

    /**
     * Hide current group (=hide all its entities)
     */
    hide(){
        this.resources.forEach(entity => entity.hidden = true);
    }

    /**
     * Show current group (=show all its entities)
     */
    show(){
        this.resources.forEach(entity => delete entity.hidden);
    }

    /**
     * Find groups generated from given resource IDs
     * @param ids - resource IDs
     * @returns {*}
     */
    findGeneratedFromIDs(ids){
        if (!ids || !ids::isArray()) {return [];}
        return (this.groups||[]).filter(g => ids.find(id => g.isGeneratedFromID(id)));
    }

    /**
     * Groups that can be toggled on or off in the global graph
     * @returns {*[]}
     */
    get activeGroups(){
        return [...(this.groups||[])].filter(e => !e.inactive);
    }

    /**
     * Visible regions
     * @returns {*[]}
     */
    get visibleRegions(){
        return (this.regions||[]).filter(e => e.isVisible);
    }

    /**
     * Visible nodes
     * @returns {*[]}
     */
    get visibleNodes(){
        return (this.nodes||[]).filter(e => e.isVisible);
    }

    /**
     * Visible links
     * @returns {*[]}
     */
    get visibleLinks(){
        return (this.links||[]).filter(e => e.isVisible);
    }

    /**
     * Visible lyphs
     * @returns {*[]}
     */
    get visibleLyphs(){
       return (this.lyphs||[]).filter(e => e.isVisible && e.axis && e.axis.isVisible);
    }

    get create3d(){
        return (this.lyphs||[]).find(e => e.create3d);
    }
}

