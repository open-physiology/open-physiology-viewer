import { Resource } from './resourceModel';
import {isObject, unionBy, merge, keys, entries, isArray, pick} from 'lodash-bound';
import {getGenID, addColor, $SchemaClass, $Field, $Color, $Prefix, findResourceByID} from './utils';
import {logger} from './logger';
import {Villus} from "./villusModel";

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

        //replace references to templates
        this.replaceReferencesToTemplates(json, modelClasses);

        //create group resources from templates
        this.expandGroupTemplates(json, modelClasses);

        //create lyphs that inherit properties from templates
        this.expandLyphTemplates(json.lyphs, modelClasses);

        //create villi
        this.createVilli(json, modelClasses);

        /******************************************************************************************************/
        /*the following methods have to be called after expandLyphTemplates to have access to generated layers*/

        //align generated groups and housing lyphs
        (json.chains||[]).forEach(chain => modelClasses.Chain.embedToHousingLyphs(json, chain));

        //create instances of group templates (e.g., trees and channels)
        this.createTemplateInstances(json, modelClasses);

        //Clone nodes simultaneously required to be on two or more lyph borders
        this.replaceBorderNodes(json, modelClasses);

        //Reposition internal resources
        this.internalResourcesToLayers(json.lyphs);

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
            logger.info("Replaced references to lyph templates:", changedLyphs);
        }
        if (changedMaterials > 0){
            logger.info("Replaced references to materials:", changedMaterials);
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
            (json[relName]||[]).forEach((field, i) => {
                    field.id = field.id || getGenID(json.id, relName, i);
                    modelClasses[clsName].expandTemplate(json, field);
                }
            );
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
     * @param lyphs
     * @param modelClasses
     */
    static expandLyphTemplates(lyphs, modelClasses){
        let templates = (lyphs||[]).filter(lyph => lyph.isTemplate);
        templates.forEach(template => modelClasses.Lyph.expandTemplate(lyphs, template));
        templates.forEach(template => delete template._inactive);
    }

    /**
     * Generate subgraphs to model villi
     * @param json
     * @param modelClasses
     */
    static createVilli(json, modelClasses){
        (json.lyphs||[]).filter(lyph => lyph.villus).forEach(lyph => {
            lyph.villus.villusOf = lyph.id;
            modelClasses.Villus.expandTemplate(json, lyph.villus);
        })
    }

    /**
     * Replicate border nodes and create collapsible links
     * The effect of this procedure depends on the order in which lyphs that share border nodes are selected
     * If the added dashed links create an overlap, change the order of lyphs in the input file
     * @param json
     * @param modelClasses
     */
    static replaceBorderNodes(json, modelClasses){
        let borderNodesByID = {};
        let lyphsWithBorders = (json.lyphs||[]).filter(lyph => lyph.border && (lyph.border.borders||[])
            .find(b => b && b.hostedNodes));

        lyphsWithBorders.forEach(lyph => {
            lyph.border.borders.forEach(b => {
                (b.hostedNodes||[]).forEach(nodeID => {
                    if (!borderNodesByID[nodeID]){ borderNodesByID[nodeID] = []; }
                    borderNodesByID[nodeID].push(lyph);
                });
            })
        });

        borderNodesByID::keys().forEach(nodeID => {
            if (borderNodesByID[nodeID].length > 1){
                //links affected by the border node constraints
                let links = (json.links||[]).filter(e => e.target === nodeID);
                let node  = (json.nodes||[]).find(e => e.id === nodeID);
                //Unknown nodes will be detected by validation later, no need for logging here
                if (!node){return;}

                borderNodesByID[nodeID] = borderNodesByID[nodeID].reverse();

                for (let i = 1, prev = nodeID; i < borderNodesByID[nodeID].length; i++){
                    let nodeClone = { [$Field.id]: getGenID(nodeID, $Prefix.clone, i)};
                    modelClasses.Node.clone(node, nodeClone);
                    json.nodes.push(nodeClone);

                    links.forEach(lnk => {lnk.target = nodeClone.id});
                    borderNodesByID[nodeID][i].border.borders.forEach(b => {
                        let k = (b.hostedNodes||[]).indexOf(nodeID);
                        if (k > -1){ b.hostedNodes[k] = nodeClone.id; }
                    });
                    let lnk = modelClasses.Link.createCollapsibleLink(prev, nodeClone.id);
                    json.links.push(lnk);
                    prev = nodeClone.id;
                }
            }
        });
    }

    /**
     * Assign internal resources to generated lyph layers
     * @param lyphs
     */
    static internalResourcesToLayers(lyphs){
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
                this.nodes.push(clone);
                let spacerLinks = (clone.sourceOf||[]).concat(clone.targetOf).filter(lnk => lnk && lnk.collapsible);
                spacerLinks.forEach(lnk => this.links.push(lnk));

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

    findGeneratedFromIDs(ids){
        if (!ids || !ids::isArray()) {return [];}
        return (this.groups||[]).filter(g => ids.find(id => g.isGeneratedFromID(id)));
    }

    isGeneratedFromID(id){
        return (this.id === id) || (this.generatedFrom && this.generatedFrom.id === id);
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

