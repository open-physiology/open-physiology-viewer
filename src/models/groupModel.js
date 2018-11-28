import { Resource } from './resourceModel';
import {values, isObject, unionBy, merge, keys, cloneDeep, isNumber} from 'lodash-bound';
import {Link, LINK_GEOMETRY, LINK_STROKE} from './linkModel';
import {Node} from './nodeModel';
import * as colorSchemes from 'd3-scale-chromatic';
import {extractCoords} from '../three/utils';
import {ForceEdgeBundling} from "../three/d3-forceEdgeBundling";
import {Lyph} from "./lyphModel";

const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];
const addColor = (entities, defaultColor) => (entities||[]).filter(e => e::isObject() && !e.color)
    .forEach((e, i) => { e.color = defaultColor || colors[i % colors.length] });

export class Group extends Resource {

    /**
     * Create a graph model from the JSON specification
     * @param json - input model
     * @param modelClasses - recognized entity models
     * @param entitiesByID
     * @returns {*} - Graph model
     */
    static fromJSON(json, modelClasses = {}, entitiesByID = null) {

        //New entities will be auto-generated in the raw JSON format
        this.replaceBorderNodes(json);

        addColor((json.lyphs||[]).filter(e => e.isTemplate));
        this.expandTreeTemplates(json, modelClasses);
        this.expandLyphTemplates(json.lyphs);

        let res  = super.fromJSON(json, modelClasses, entitiesByID);

        res.mergeSubgroupEntities();
        res.createAxesForInternalLyphs(entitiesByID);

        //Color entities which do not have assigned colors in the spec
        addColor(res.regions, "#c0c0c0");
        addColor(res.links, "#000");
        addColor(res.lyphs);

        return res;
    }

    static expandTreeTemplates(json, modelClasses){
        if (!modelClasses){ return; }
        (json.trees||[]).forEach((tree, i) => {
                tree.id = tree.id || (json.id + "_tree_" + i);
                modelClasses["Tree"].expandTemplate(json, tree);
            }
        );
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
        let lyphsWithBorders = (json.lyphs||[]).filter(lyph => ((lyph.border || {}).borders||[]).find(b => b.hostedNodes));
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
                //groups that contain the node
                //links affected by the border node constraints
                let links = (json.links||[]).filter(e => e.target === nodeID);
                let node  = (json.nodes||[]).find(e => e.id === nodeID);
                //Unknown nodes will be detected by validation later, no need for logging here
                if (!node){return;}

                for (let i = 1, prev = nodeID; i < borderNodesByID[nodeID].length; i++){
                    let nodeClone = node::cloneDeep()::merge({
                        "id"     : nodeID + `_${i}`,
                        "cloneOf": nodeID
                    });
                    if (!node.clones){ node.clones = []; }
                    node.clones.push(nodeClone);

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
        this.groups = (this.groups||[])::unionBy(this.trees, "id");

        (this.groups||[]).forEach(group => {
            if (group.id === this.id || (this.inGroups||[]).find(e => e.id === group.id)) {
                console.warn("The model contains self-references or cyclic group dependencies: ", this.id, group.id);
                return;
            }
            let relFieldNames = this.constructor.Model.filteredRelNames(["Tree", "Group", "Graph"]);
            relFieldNames.forEach(property => { this[property] = (this[property]||[])::unionBy(group[property], "id"); });
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

    /**
     * Auto-generates links for internal lyphs
     * @param entitiesByID - a global resource map to include the generated resources
     */
    createAxesForInternalLyphs(entitiesByID){
        /**
         * Create an axis for a lyph
         * @param lyph - lyph without axis
         * @param container - lyph's container to size the auto-created link
         */
        const createAxis = (lyph, container) => {
            let [sNode, tNode] = ["s", "t"].map(prefix => (
                Node.fromJSON({
                    "id"   : `${prefix}${lyph.id}`,
                    "name" : `${prefix}${lyph.id}`,
                    "color": "#ccc",
                    "val"  : 0.1,
                    "skipLabel": true
                })));

            let link = Link.fromJSON({
                "id"      : `${sNode.id}_ ${tNode.id}`,
                "source"  : sNode,
                "target"  : tNode,
                "length"  : container && container.axis? container.axis.length * 0.8 : 5,
                "geometry": LINK_GEOMETRY.INVISIBLE,
                "color"   : "#ccc",
                "conveyingLyph": lyph
            });
            lyph.conveyedBy = sNode.sourceIn = tNode.targetIn = link;
        };

        const addLinkToGroup = (link) => {
            if (!this.links) {this.links = [];}
            if (!this.nodes) {this.nodes = [];}
            this.links.push(link);
            [link.source, link.target].forEach(node => {
                this.nodes.push(node);
                if (entitiesByID) { entitiesByID[node.id] = node; }
            });
            if (entitiesByID) { entitiesByID[link.id] = link; }
        };

        //Add auto-create axes for internal lyphs to the relevant groups
        (this.lyphs||[]).filter(lyph => lyph.internalIn).forEach(lyph => {
            if (!lyph.conveyedBy) { createAxis(lyph, lyph.internalIn); }
            if (!this.belongsTo(lyph.conveyedBy)) { addLinkToGroup(lyph.conveyedBy); }
        });

    }

    /**
     * Entities that belong to the group (resources excluding subgroups)
     * @returns {*[]}
     */
    get entities(){
        let res = [];
        let relFieldNames = this.constructor.Model.filteredRelNames([this.constructor.name]); //Exclude groups
        relFieldNames.forEach(property => {
            if (this[property]) { res = [...res, ...(this[property] ||[])]}
        });
        return res.filter(e => !!e);
    }

    /**
     * Check whether the given entity belongs to the group
     * @param entity - resource
     * @returns {*|void}
     */
    belongsTo(entity){
        return this.entities.find(e => (e === entity) || (e.id === entity.id));
    }

    /**
     * Hide given subgroups of the current group
     * @param groups - selected subgroups
     */
    hideGroups(groups){
        this.show();
        (groups || []).forEach(g => g.hide());
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
        return (this.groups||[]).filter(e => !e.inactive);
    }

    get visibleRegions(){
        return (this.regions||[]).filter(e => e.isVisible);
    }

    get visibleNodes(){
        return (this.nodes||[]).filter(e => e.isVisible);
    }

    get visibleLinks(){
        return (this.links||[]).filter(e => e.isVisible &&
            this.visibleNodes.find(e2 => e2 === e.source) &&
            this.visibleNodes.find(e2 => e2 === e.target)
        );
    }

    get visibleLyphs(){
       return (this.lyphs||[]).filter(e => e.isVisible && e.axis && e.axis.isVisible);
    }

    createViewObjects(state){
        this.visibleNodes.forEach(node => {
            node.createViewObjects(state);
            node.viewObjects::values().forEach(obj => state.graphScene.add(obj));
        });

        this.visibleLinks.forEach(link => {
            link.createViewObjects(state);
            link.viewObjects::values().forEach(obj => state.graphScene.add(obj));
            if (link.geometry === LINK_GEOMETRY.INVISIBLE){
                link.viewObjects["main"].material.visible = false;
            }
        });

        this.visibleRegions.forEach(region => {
            region.createViewObjects(state);
            region.viewObjects::values().forEach(obj => state.graphScene.add(obj));
        });
    }

    updateViewObjects(state){
        // Update nodes positions
        this.visibleNodes.forEach(node => { node.updateViewObjects(state) });

        //Edge bundling
        const fBundling = ForceEdgeBundling()
            .nodes(this.visibleNodes)
            .edges(this.visibleLinks.filter(e => e.geometry === LINK_GEOMETRY.PATH).map(edge => {
                return {
                    source: this.nodes.indexOf(edge.source),
                    target: this.nodes.indexOf(edge.target)
                };
            }));
        let res = fBundling();
        (res || []).forEach(path => {
            let lnk = this.links.find(e => e.source.id === path[0].id && e.target.id === path[path.length -1 ].id);
            if (lnk){
                let dz = (path[path.length - 1].z - path[0].z) / path.length;
                for (let i = 1; i < path.length - 1; i++){
                    path[i].z = path[0].z + dz * i;
                }
                lnk.path = path.slice(1, path.length - 2).map(p => extractCoords(p));
            }
        });

        this.visibleLinks.forEach(link => { link.updateViewObjects(state); });

        this.visibleRegions.forEach(region => { region.updateViewObjects(state); });
    }
}
