import { Entity } from './entityModel';
import { values, isObject, unionBy} from 'lodash-bound';
import { Link, LINK_TYPES } from './linkModel';
import { Node } from './nodeModel';
import { Validator} from 'jsonschema';
import * as schema from '../data/graphScheme.json';
import * as colorSchemes from 'd3-scale-chromatic';

const validator = new Validator();
import {ForceEdgeBundling} from "../three/d3-forceEdgeBundling";

const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];
const addColor = (entities, defaultColor) => (entities||[]).filter(e => e::isObject() && !e.color)
    .forEach((e, i) => { e.color = defaultColor || colors[i % colors.length] });

export class Graph extends Entity {

    /**
     * Create a graph model from the JSON specification
     * @param json - input model
     * @param modelClasses - recognized entity models
     * @param entitiesByID
     * @returns {*} - Graph model
     */
    static fromJSON(json, modelClasses = {}, entitiesByID) {

        let resVal = validator.validate(json, schema);
        if (resVal.errors && resVal.errors.length > 0){ console.warn(resVal); }

        let res  = super.fromJSON(json, modelClasses, entitiesByID);

        //Inherit objects from subgroups
        (res.groups||[]).forEach(group => {
            ["nodes", "lyphs", "links"].forEach(property => {
                res[property] = (res[property]||[])::unionBy(group[property], "id");
            });
        });

        const createAxis = (lyph) => {
            if (!lyph.conveyedBy) {
                let container = lyph.internalLyphInLyph;
                let [sNode, tNode] = ["s", "t"].map(prefix => (
                    modelClasses["Node"].fromJSON({
                        "id": `${prefix}${lyph.id}`,
                        "name": `${prefix}${lyph.id}`,
                        "color": "#ccc",
                        "val": 0.1,
                        "skipLabel": true
                    })));

                let link = modelClasses["Link"].fromJSON({
                    "id": `${sNode.id}_ ${tNode.id}`,
                    "source": sNode,
                    "target": tNode,
                    "length": container && container.axis? container.axis.length * 0.8 : 5,
                    "type": LINK_TYPES.INVISIBLE,
                    "color": "#ccc",
                    "conveyingLyph": lyph
                });
                lyph.conveyedBy = sNode.sourceIn = tNode.targetIn = link;
            }
        };
        //Add auto-created links and nodes for internal lyphs to relevant groups
        (res.lyphs||[]).filter(lyph => lyph.internalLyphInLyph).forEach(lyph => {
            createAxis(lyph);
            if (!res.belongsTo(lyph.conveyedBy)){
                if (!res.links) {res.links = [];}
                if (!res.nodes) {res.nodes = [];}
                res.links.push(lyph.conveyedBy);
                [lyph.conveyedBy.source, lyph.conveyedBy.target].forEach(node => res.nodes.push(node));
            }
        });

        //Add auto-created clones of boundary nodes to relevant groups
        (res.nodes||[]).filter(node => node.clones).forEach(node => {
                node.clones.forEach(clone => {
                    res.nodes.push(clone);
                    if (clone.host) {
                        clone.host.hostedNodes = clone.host.hostedNodes || [];
                        clone.host.hostedNodes.push(clone);
                    }
                });
            }
        );

        //Color links and lyphs which do not have assigned colors in the spec
        addColor(res.links, "#000");
        addColor(res.lyphs);

        return res;
    }

    get entities(){
        let entities = [...(this.nodes||[]), ...(this.links||[]), ...(this.lyphs||[])];
        (this.nodes||[]).forEach(lyph => {
            [...(lyph.layers||[]), ...(lyph.internalNodes||[]), ...(lyph.internalLyphs||[])].forEach(x => {
                if (!entities.find(e => e.id === x.id)){ entities.push(x); }
            })
        });
        return entities;
    }

    belongsTo(entity){
        return this.entities.find(e => (e === entity) || (e.id === entity.id && e.class === entity.class));
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

    get coalescenceGroup(){
        return (this.groups||[]).find(g => g.id === "coalescences");
    }

    get activeGroups(){
        return (this.groups||[]).filter(e => !e.inactive);
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
        return (this.lyphs||[]).filter(e => e.isVisible && e.axis.isVisible);
    }

    createViewObjects(state){
        //Draw all graph nodes, except for invisible nodes (node.type === CONTROL)
        this.visibleNodes.forEach(node => {
            node.createViewObjects(state);
            node.viewObjects::values().forEach(obj => state.graphScene.add(obj));
        });

        this.visibleLinks.forEach(link => {
            link.createViewObjects(state);
            link.viewObjects::values().forEach(obj => state.graphScene.add(obj));
            if (link.type === LINK_TYPES.INVISIBLE){
                link.viewObjects["main"].material.visible = false;
            }
        });

    }

    updateViewObjects(state){
        // Update nodes positions
        this.visibleNodes.forEach(node => { node.updateViewObjects(state) });

        //Edge bundling
        const fBundling = ForceEdgeBundling()
            .nodes(this.visibleNodes)
            .edges(this.visibleLinks.filter(e => e.type === LINK_TYPES.PATH).map(edge => {
                return {
                    source: this.nodes.indexOf(edge.source),
                    target: this.nodes.indexOf(edge.target)
                };
            }));
        let res = fBundling();
        (res || []).forEach(path => {
            let lnk = this.links.find(e => e.source.id === path[0].id);
            if (lnk){
                let dz = (path[path.length - 1].z - path[0].z) / path.length;
                for (let i = 1; i < path.length - 1; i++){ path[i].z = path[0].z + dz * i; }
                lnk.path = path;
            }
        });

        this.visibleLinks.forEach(link => { link.updateViewObjects(state); });
    }
}
