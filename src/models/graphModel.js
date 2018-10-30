import { Entity } from './entityModel';
import { keys, values, isObject, unionBy, isNumber} from 'lodash-bound';
import { Link, LINK_GEOMETRY } from './linkModel';
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
            ["nodes", "links", "lyphs", "regions"].forEach(property => {
                res[property] = (res[property]||[])::unionBy(group[property], "id");
            });
        });

        const createAxis = (lyph, container) => {
            let [sNode, tNode] = ["s", "t"].map(prefix => (
                modelClasses["Node"].fromJSON({
                    "id"   : `${prefix}${lyph.id}`,
                    "name" : `${prefix}${lyph.id}`,
                    "color": "#ccc",
                    "val"  : 0.1,
                    "skipLabel": true
                })));

            let link = modelClasses["Link"].fromJSON({
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
            [link.source, link.target].forEach(node => res.nodes.push(node));
        };

        (res.lyphs||[]).filter(lyph => lyph.internalLyphInLyph || lyph.internalLyphInRegion).forEach(lyph => {
            if (!lyph.conveyedBy) { createAxis(lyph, lyph.internalLyphInLyph || lyph.internalLyphInRegion); }
            if (!res.belongsTo(lyph.conveyedBy)) { addLinkToGroup(lyph.conveyedBy); }
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
        addColor(res.regions, "#c0c0c0");

        return res;
    }

    get entities(){
        return [...(this.nodes||[]), ...(this.links||[]), ...(this.lyphs||[]),...(this.regions||[])];
    }

    scale(axisLength){
        const scalePoint = p => p::keys().filter(key => p[key]::isNumber()).forEach(key => {
                p[key] *= axisLength * 0.01;
            });
        (this.nodes||[]).filter(node => node.layout).forEach(node => scalePoint(node.layout));
        (this.links||[]).filter(link => link.length).forEach(link => link.length *= 2 * axisLength * 0.01);
        (this.regions||[]).filter(region => region.points).forEach(region =>
           region.points.forEach(p => scalePoint(p)));
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
            let lnk = this.links.find(e => e.source.id === path[0].id);
            if (lnk){
                let dz = (path[path.length - 1].z - path[0].z) / path.length;
                for (let i = 1; i < path.length - 1; i++){ path[i].z = path[0].z + dz * i; }
                lnk.path = path;
            }
        });

        this.visibleLinks.forEach(link => { link.updateViewObjects(state); });

        this.visibleRegions.forEach(region => { region.updateViewObjects(state); });
    }
}
