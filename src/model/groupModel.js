import {Resource} from './resourceModel';
import {isObject, unionBy, merge, keys, entries, isArray, pick} from 'lodash-bound';
import {getGenID, addColor, $SchemaClass, $Field, $Color, $Prefix, findResourceByID, showGroups} from './utils';
import {logger, $LogMsg} from './logger';

/**
 * Group (subgraph) in the connectivity model
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
 * @property chains
 * @property coalescences
 * @property scaffolds
 * @property hostedBy
 */
export class Group extends Resource {
    /**
     * Create a graph model from the JSON specification
     * @param json - input model
     * @param modelClasses - model resource classes
     * @param entitiesByID - global map of model resources
     * @param defaultNamespace
     * @returns {*} - Graph model - model suitable for visualization
     */
    static fromJSON(json, modelClasses = {}, entitiesByID, defaultNamespace) {

        let namespace = json.namespace || defaultNamespace;
        if (json.generated) {
            return super.fromJSON(json, modelClasses, entitiesByID, namespace);
        }

        //Regions in groups are simple areas, ignore facets and border anchors
        (json.regions||[]).forEach(region => modelClasses.Region.reduceGroupTemplate(json, region));

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
        modelClasses.Node.replicateBorderNodes(json, modelClasses);

        //Clone nodes simultaneously required to be on two or more lyphs
        modelClasses.Node.replicateInternalNodes(json, modelClasses);

        //Reposition internal resources
        modelClasses.Lyph.mapInternalResourcesToLayers(json.lyphs);

        /******************************************************************************************************/
        //create graph resource
        let res  = super.fromJSON(json, modelClasses, entitiesByID, namespace);

        (res.chains||[]).forEach(chain => chain.resizeLyphs());

        //copy nested references to resources to the parent group
        res.mergeSubgroupResources();

        //Assign color to visual resources with no color in the spec
        addColor(res.regions, $Color.Region);
        addColor(res.links, $Color.Link);
        addColor(res.lyphs);

        return res;
    }

    /**
     * Include related to resources to the group: node clones, internal lyphs and nodes
     */
    includeRelated(){
        //Add auto-created clones of boundary nodes and collapsible links, conveying lyphs,
        //internal nodes and internal lyphs to the group that contains the original lyph
        [$Field.nodes, $Field.links, $Field.lyphs].forEach(prop => {
            this[prop].forEach(res => res instanceof Resource && res.includeRelated(this));
        });

        //If a group is hosted by a region, each its lyph is hosted by the region
        let host = this.hostedBy || this.generatedFrom && this.generatedFrom.hostedBy;
        if (host){
            host.hostedLyphs = host.hostedLyphs || [];
            (this.links||[]).filter(link => link.conveyingLyph && !link.conveyingLyph.internalIn).forEach(link => {
                link.conveyingLyph.hostedBy = host;
                if (!host.hostedLyphs.find(e => e.id === link.conveyingLyph.id)){
                    host.hostedLyphs.push(link.conveyingLyph);
                }
            });
            (this.nodes||[]).forEach(node => node.charge = 20);
        }
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
            logger.info($LogMsg.GROUP_REF_TO_LYPH, changedLyphs);
        }
        if (changedMaterials > 0){
            logger.info($LogMsg.GROUP_REF_TO_MAT, changedMaterials);
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
                logger.error($LogMsg.GROUP_TEMPLATE_NO_CLASS, relName);
            }
            (json[relName]||[]).forEach((template, i) => {
                if (template::isObject()) {//expand group templates, but not references
                    template.id = template.id || getGenID(json.id, relName, i);
                    modelClasses[clsName].expandTemplate(json, template);
                } else {
                    logger.info($LogMsg.GROUP_TEMPLATE_OTHER, template);
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
            if (!clsName){
                logger.error($LogMsg.GROUP_TEMPLATE_NO_CLASS, relName);
            }
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
        (json.lyphs||[]).forEach(lyph => {
            if (lyph.villus) {
                lyph.villus.villusOf = lyph.id;
                modelClasses.Villus.expandTemplate(json, lyph.villus);
            }
        });
    }

    /**
     * Add resources from subgroups to the current group
     */
    mergeSubgroupResources(){
        //Place references to subgroup resources to the current group
        let relFieldNames = this.constructor.Model.filteredRelNames([$SchemaClass.Group, $SchemaClass.GroupTemplate]);
        (this.groups||[]).forEach(group => {
            if (group.id === this.id) {
                logger.warn($LogMsg.GROUP_SELF, this.id, group.id);
                return;
            }
            relFieldNames.forEach(property => {
                if (group[property]::isArray()){
                    this[property] = (this[property]||[])::unionBy(group[property], $Field.id);
                    this[property] = this[property].filter(x => !!x && x.class);
                }
            });
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
        return res::res.filter(r => !!r && r::isObject());
    }

    /**
     * Show subgroups of the current group. A resources is shown if it belongs to at least one visible subgroup
     * @param ids - selected subgroup identifiers
     */
    showGroups(ids){
        //this.show();
        showGroups(this.groups||[], ids);
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
        return (this.links||[]).filter(e => e.isVisible)
            // .sort((a, b) => {
            // //Sort links for processing: lyphs that are not hostd by other lyphs can be processed first
            // if (a.conveyingLyph && b.conveyingLyph){
            //     if (!a.conveyingLyph.host) {
            //         return -1;
            //     } else {
            //         if (!b.conveyingLyph.host){
            //             return 1;
            //         }
            //     }
            // }
            // return 0;})
            ;
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

