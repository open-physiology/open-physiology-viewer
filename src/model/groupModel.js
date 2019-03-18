import { Resource } from './resourceModel';
import { isObject, unionBy, merge, keys, cloneDeep, entries, isArray, intersectionBy} from 'lodash-bound';
import {LINK_STROKE, PROCESS_TYPE, Node} from './visualResourceModel';
import {Lyph} from "./shapeModel";
import {addColor} from './utils';

/**
 *  Group (subgraph) model
 * @class
 * @property nodes
 * @property links
 * @property regions
 * @property lyphs
 * @property materials
 * @property references
 * @property groups
 * @property trees
 * @property inGroups
 */
export class Group extends Resource {
    /**
     * Create a graph model from the JSON specification
     * @param json - input model
     * @param modelClasses - model resource classes
     * @param entitiesByID - global map of model resources
     * @returns {*} - Graph model - model suitable for visualization
     */
    static fromJSON(json, modelClasses = {}, entitiesByID = null) {

        //New entities will be auto-generated in the raw JSON format
        this.replaceBorderNodes(json);

        //replace references to templates
        this.replaceReferencesToLyphTemplates(json, modelClasses);
        this.expandTreeTemplates(json, modelClasses);
        this.expandLyphTemplates(json.lyphs);
        this.createTreeInstances(json, modelClasses);

        let res  = super.fromJSON(json, modelClasses, entitiesByID);
        res.mergeSubgroupEntities();
        res.validateMaterialEdges();

        //Color entities which do not have assigned colors in the spec
        addColor(res.regions, "#c0c0c0");
        addColor(res.links, "#000");
        addColor(res.lyphs);

        return res;
    }

    /**
     * Replace references to lyph templates with references to auto-generated lyphs that inherit properties from templates
     * @param json - input model
     * @param modelClasses - model resource classes
     */
    static replaceReferencesToLyphTemplates(json, modelClasses){

        let changed = 0;
        const replaceRefToTemplate = (ref, parentID) => {
            let template = (json.lyphs || []).find(e => e.id === ref && e.isTemplate);
            if (template) {
                changed++;
                let subtype = {
                    "id"       : ref + "_" + parentID,
                    "supertype": template.id
                };
                json.lyphs.push(subtype);
                replaceRefsToTemplates(subtype, "layers");
                return subtype.id;
            }
            return ref;
        };

        const replaceRefsToTemplates = (resource, key) => {
            if (!resource[key]) { return; }
            if (resource[key]::isArray()) {
                resource[key] = resource[key].map(ref => replaceRefToTemplate(ref, resource.id))
            } else {
                resource[key] = replaceRefToTemplate(resource[key], resource.id);
            }
        };

        (json::entries()||[]).forEach(([groupRelName, resources]) => {
            if (!resources::isArray()) { return; }
            let groupClassNames = this.Model.relClassNames;
            if (groupClassNames[groupRelName]) {
                let refsToLyphs = modelClasses[groupClassNames[groupRelName]].Model.selectedRelNames("Lyph");
                if (!refsToLyphs){ return; }
                (resources || []).forEach(resource => {
                    //if (resource.isTemplate) {return; }
                    (resource::keys() || []).forEach(key => { // Do not replace valid references to templates
                        if (refsToLyphs.includes(key) && !["subtypes", "supertype", "lyphTemplate"].includes(key)) {
                            replaceRefsToTemplates(resource, key);
                        }
                    })
                })
            }
        });
        if (changed > 0){
            console.info("Replaced references to lyph templates:", changed);
        }
    }

    /**
     * Generate canonical omega trees from tree templates, i.e. auto-create necessary nodes and links, adn copy tree template to all tree levels
     * @param json - input model
     * @param modelClasses - model resource classes
     */
    static expandTreeTemplates(json, modelClasses){
        if (!modelClasses){ return; }
        (json.trees||[]).forEach((tree, i) => {
                tree.id = tree.id || (json.id + "_tree_" + i);
                modelClasses["Tree"].expandTemplate(json, tree);
            }
        );
    }

    /**
     * Generate omega tree instances
     * @param json - input model
     * @param modelClasses - model resource classes
     */
    static createTreeInstances(json, modelClasses){
        (json.trees||[]).forEach(tree => {
            if (!tree.group) { this.expandTreeTemplates(json, modelClasses); }
            modelClasses["Tree"].createInstance(json, tree)
        });
    }

    static expandLyphTemplates(lyphs){
        let templates = (lyphs||[]).filter(lyph => lyph.isTemplate);
        templates.forEach(template => Lyph.expandTemplate(lyphs, template));
    }

    /**
     * Replicate border nodes and create collapsible links
     * The effect of this procedure depends on the order in which lyphs that share border nodes are selected
     * If the added dashed links create an overlap, one has to change the order of lyphs in the input file!
     * @param json - group model defined by user
     */
    static replaceBorderNodes(json){
        let borderNodesByID = {};
        let lyphsWithBorders = (json.lyphs||[]).filter(lyph => lyph.border && (lyph.border.borders||[])
            .find(b => b && b.hostedNodes)); //TODO if link's reference is used this will fail
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

                for (let i = 1, prev = nodeID; i < borderNodesByID[nodeID].length; i++){
                    let nodeClone = node::cloneDeep()::merge({
                        "id"     : nodeID + `_${i}`,
                        "cloneOf": nodeID,
                        "class"  : "Node"
                    });
                    if (!node.clones){ node.clones = []; }
                    node.clones.push(nodeClone.id);
                    json.nodes.push(nodeClone);

                    links.forEach(lnk => {lnk.target = nodeClone.id});
                    //lyph constraint - replace
                    borderNodesByID[nodeID][i].border.borders.forEach(b => {
                        let k = (b.hostedNodes||[]).indexOf(nodeID);
                        if (k > -1){ b.hostedNodes[k] = nodeClone.id; }
                    });
                    //create a collapsible link
                    let lnk = {
                        "id"         : `${prev}_${nodeClone.id}`,
                        "source"     : `${prev}`,
                        "target"     : `${nodeClone.id}`,
                        "stroke"     : LINK_STROKE.DASHED,
                        "length"     : 1,
                        "collapsible": true
                    };
                    json.links.push(lnk);
                    prev = nodeClone.id;
                }
            }
        });
    }

    /**
     * Add entities from subgroups to the current group
     */
    mergeSubgroupEntities(){

        (this.groups||[]).forEach(group => {
            if (group.id === this.id || (this.inGroups||[]).find(e => e.id === group.id)) {
                console.warn("The model contains self-references or cyclic group dependencies: ", this.id, group.id);
                return;
            }
            let relFieldNames = this.constructor.Model.filteredRelNames(this.constructor.Model.groupClsNames);
            relFieldNames.forEach(property => {
                this[property] = (this[property]||[])::unionBy(group[property], "id");
            });
        });

        //Add auto-created clones of boundary nodes to relevant groups
        (this.nodes||[]).filter(node => node && node.clones).forEach(node => {
            node.clones.forEach(clone => {
                this.nodes.push(clone);
                if (clone.hostedBy) {
                    clone.hostedBy.hostedNodes = clone.hostedBy.hostedNodes || [];
                    clone.hostedBy.hostedNodes.push(clone);
                }
            });
        });
    }

    validateMaterialEdges(){
        let edges = [];
        (this.links||[]).forEach(lnk => {
            if (lnk.conveyingLyph){
                let layers = lnk.conveyingLyph.layers || [lnk.conveyingLyph];
                if (layers[0] && layers[0].materials){
                    if (lnk.conveyingType === PROCESS_TYPE.ADVECTIVE){
                        if (!lnk.conveyingMaterials || lnk.conveyingMaterials.length === 0){
                            lnk.conveyingMaterials = layers[0].materials;
                        } else {
                            let diff = (layers[0].materials || []).filter(x => !(lnk.conveyingMaterials||[]).find(e => e.id === x.id));
                            if (diff.length > 0){
                                console.log("Incorrect advective process: not all innermost layer materials of the conveying lyph are conveyed by the link", lnk, diff);
                            }
                        }
                    } else {
                        let nonConveying = (lnk.conveyingMaterials||[]).filter(x => !(layers[0].materials || []).find(e => e.id === x.id));
                        if (nonConveying.length > 0){
                            console.warn("Incorrect diffusive process: materials are not conveyed by the innermost layer of the conveying lyph:", lnk, nonConveying);
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
    get entities(){
        let res = [];
        let relFieldNames = this.constructor.Model.filteredRelNames(this.constructor.Model.groupClsNames); //Exclude groups
        relFieldNames.forEach(property => res = res::unionBy((this[property] ||[]), "id"));
        return res.filter(e => !!e && e::isObject());
    }

    /**
     * Show subgroups of the current group. A resources is shown if it belongs to at least one visible subgroup
     * @param groups - selected subgroups
     */
    showGroups(groups){
        this.show(); //show all entities that are in the main group
        (this.groups || []).filter(group => !groups.has(group)).forEach(g => g.hide()); //hide entities from hidden groups
        (this.groups || []).filter(group => groups.has(group)).forEach(g => g.show()); //show entities that are in visible groups
    }

    /**
     * Hide current group (=hide all its entities)
     */
    hide(){
        this.entities.forEach(entity => entity.hidden = true);
    }

    /**
     * Show current group (=show all its entities)
     */
    show(){
        this.entities.forEach(entity => delete entity.hidden);
    }

    /**
     * Get groups that can be toggledon or off in the global graph
     * @returns {T[]}
     */
    get activeGroups(){
        return [...(this.groups||[])].filter(e => !e.inactive);
    }

    get visibleRegions(){
        return (this.regions||[]).filter(e => e.isVisible);
    }

    get visibleNodes(){
        return (this.nodes||[]).filter(e => e.isVisible ||
            e.sourceOf && e.sourceOf.isVisible ||
            e.targetOf && e.targetOf.isVisible
        );
    }

    get visibleLinks(){
        return (this.links||[]).filter(e => e.isVisible);
    }

    get visibleLyphs(){
       return (this.lyphs||[]).filter(e => e.isVisible && e.axis && e.axis.isVisible);
    }

    /**
     * Experimental - export visible object positions (or points)
     */
    export(){
        const getCoords = (obj) => ({"x": Math.round(obj.x), "y": Math.round(obj.y), "z": Math.round(obj.z)});

        return {
            regions: this.visibleRegions.map(region => ({
                "id"     : region.id,
                "points" : (region.points || []).map(p => getCoords(p)),
                "center" : getCoords(region.center)
            })),
            lyphs: this.visibleLyphs.map(lyph => ({
                "id"     : lyph.id,
                "points" : (lyph.points || []).map(p => getCoords(p)),
                "center" : getCoords(lyph.center)
            })),
            nodes: this.visibleNodes.map(node => ({
                "id"     : node.id,
                "center" : getCoords(node)
            })),
            links: this.visibleLinks.map(link => ({
                "id"     : link.id,
                "source" : link.source.id,
                "target" : link.target.id,
                "points" : (link.points || []).map(p => getCoords(p))
            }))
        };
    }

}

