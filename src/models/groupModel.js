import { getClassName } from './resourceModel';
import { Entity } from './entityModel';
import {values, isObject, unionBy, merge, keys, cloneDeep} from 'lodash-bound';
import {Link, LINK_GEOMETRY, LINK_STROKE} from './linkModel';
import {Node} from './nodeModel';
import * as colorSchemes from 'd3-scale-chromatic';
import {extractCoords} from '../three/utils';
import {ForceEdgeBundling} from "../three/d3-forceEdgeBundling";

const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];
const addColor = (entities, defaultColor) => (entities||[]).filter(e => e::isObject() && !e.color)
    .forEach((e, i) => { e.color = defaultColor || colors[i % colors.length] });

export class Group extends Entity {

    /**
     * Create a graph model from the JSON specification
     * @param json - input model
     * @param modelClasses - recognized entity models
     * @param entitiesByID
     * @returns {*} - Graph model
     */
    static fromJSON(json, modelClasses = {}, entitiesByID) {

        //Important: the effect of this procedure depends on the order in which lyphs that share border nodes are selected
        //If the added dashed links create an overlap, one has to change the order of lyphs in the input file!
        const replaceBorderNodes = (group) => {
            //Replicate border nodes and create collapsible links
            let borderNodesByID = {};
            let lyphsWithBorders = (group.lyphs||[]).filter(lyph => ((lyph.border || {}).borders||[]).find(b => b.hostedNodes));
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
                    let links = (group.links||[]).filter(e => e.target === nodeID);
                    let node  = (group.nodes||[]).find(e => e.id === nodeID);
                    //Unknown nodes will be detected by validation later, no need for logging here
                    if (!node){return;}

                    for (let i = 1, prev = nodeID; i < borderNodesByID[nodeID].length; i++){
                        let nodeClone = node::cloneDeep()::merge({
                            "id"     : nodeID + `_${i}`,
                            "cloneOf": nodeID
                        });
                        if (!node.clones){ node.clones = []; }
                        node.clones.push(nodeClone);

                        group.nodes.push(nodeClone);
                        links.forEach(lnk => {lnk.target = nodeClone.id});
                        //lyph constraint - replace
                        borderNodesByID[nodeID][i].border.borders.forEach(b => {
                            let k = (b.hostedNodes||[]).indexOf(nodeID);
                            if (k > -1){ b.hostedNodes[k] = nodeClone.id; }
                        });
                        //create a collapsible link
                        let lnk = {
                            "id"    : `${prev}_${nodeClone.id}`,
                            "source": `${prev}`,
                            "target": `${nodeClone.id}`,
                            "stroke": LINK_STROKE.DASHED,
                            "length": 1,
                            "collapsible": true
                        };
                        group.links.push(lnk);
                        prev = nodeClone.id;
                    }
                }
            });
        };
        replaceBorderNodes(json);

        let res  = super.fromJSON(json, modelClasses, entitiesByID);

        //Inherit objects from subgroups
        (res.groups||[]).forEach(group => {
            if (group.id === res.id || (res.inGroups||[]).find(e => e.id === group.id)) {
                console.warn("The model contains self-references or cyclic group dependencies: ", res.id, group.id);
                return;
            }
            let relFields = this.Model.relationships;
            let relFieldNames = (relFields||[])
                .filter(([key, spec]) => getClassName(spec) !== res.class)
                .map(e => e[0]);
            relFieldNames.forEach(property => { res[property] = (res[property]||[])::unionBy(group[property], "id"); });
        });

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
            if (!res.links) {res.links = [];}
            if (!res.nodes) {res.nodes = [];}
            res.links.push(link);
            [link.source, link.target].forEach(node => {
                res.nodes.push(node);
                if (entitiesByID) {
                    entitiesByID[node.id] = node;
                }
            });
            if (entitiesByID) {
                entitiesByID[link.id] = link;
            }
        };

        //Add auto-create axes for internal lyphs to the relevant groups
        (res.lyphs||[]).filter(lyph => lyph.internalInLyph || lyph.internalInRegion).forEach(lyph => {
            if (!lyph.conveyedBy) { createAxis(lyph, lyph.internalInLyph || lyph.internalInRegion); }
            if (!res.belongsTo(lyph.conveyedBy)) { addLinkToGroup(lyph.conveyedBy); }
        });

        //Add auto-created clones of boundary nodes to relevant groups
        (res.nodes||[]).filter(node => node.clones).forEach(node => {
                node.clones.forEach(clone => {
                    res.nodes.push(clone);
                    if (clone.hostedByLink) {
                        clone.hostedByLink.hostedNodes = clone.hostedByLink.hostedNodes || [];
                        clone.hostedByLink.hostedNodes.push(clone);
                    }
                });
            }
        );

        //Color entities which do not have assigned colors in the spec
        addColor(res.links, "#000");
        addColor(res.lyphs);
        addColor(res.regions, "#c0c0c0");
        return res;
    }

    get entities(){
        //this.constructor.Model.relationshipNames
        return [
            ...(this.nodes||[]),
            ...(this.links||[]),
            ...(this.lyphs||[]),
            ...(this.regions||[])
        ];
    }

    belongsTo(entity){
        return this.entities.find(e => (e === entity) || (e.id === entity.id));
    }

    hideGroups(groups){
        this.show();
        (groups || []).forEach(g => g.hide());
    }

    hide(){
        this.entities.forEach(entity => entity.hidden = true);
    }

    show(){
        this.entities.forEach(entity => delete entity.hidden);
    }

    get activeGroups(){
        return (this.groups||[]).filter(e => !e.inactive);
    }

    get visibleRegions(){
        return (this.regions||[]).filter(e => e.isVisible);
    }

    get visibleNodes(){
        let res = (this.nodes||[]).filter(e => e.isVisible);
        return res;
    }

    get visibleLinks(){
        return (this.links||[]).filter(e => e.isVisible &&
            this.visibleNodes.find(e2 => e2 === e.source) &&
            this.visibleNodes.find(e2 => e2 === e.target)
        );
    }

    get visibleLyphs(){
        return (this.lyphs||[]).filter(e => e.isVisible && e.axis.isVisible);
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
