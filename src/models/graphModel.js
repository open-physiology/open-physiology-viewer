import { Entity } from './entityModel';
import { keys, values, mergeWith, isObject, isArray} from 'lodash-bound';
import { definitions } from '../data/manifest.json';
import { LINK_TYPES } from './linkModel';
import { Validator} from 'jsonschema';
import * as schema from '../data/manifest.json';
import * as colorSchemes from 'd3-scale-chromatic';
import {noOverwrite, JSONPath } from './utils.js';

const validator = new Validator();
import {ForceEdgeBundling} from "../three/d3-forceEdgeBundling";

const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];
const addColor = (entities, defaultColor) => (entities||[]).filter(e => e::isObject() && !e.color)
    .forEach((e, i) => { e.color = defaultColor || colors[i % colors.length] });

export class Graph extends Entity {

    static fromJSON(json, modelClasses = {}, entitiesByID) {

        const colorGroupEntities = (entities, {scheme, length, reversed = false, offset}) => {
            if (!colorSchemes[scheme]) {
                console.warn("Unrecognized color scheme: ", scheme);
                return;
            }
            if (!length) { length = entities.length; }
            if (!offset) { offset = 0; }

            const getColor = i => colorSchemes[scheme](((reversed)? 1 - offset - i / length : offset + i / length));
            const assignColor = items => {
                (items||[]).forEach((item, i) => {
                    if (!item::isObject()) {
                        console.warn("Cannot assign color to a non-object value");
                        return;
                    }
                    //If entity is an array, the schema is applied to each of it's items (e.g. to handle layers of lyphs in a group)
                    if (item::isArray()){
                        assignColor(item);
                    } else {
                        item.color = getColor(i);
                    }
                });
            };
            assignColor(entities);
        };
        const interpolateGroupProperties = (group) => {
            (group.interpolate||[]).forEach(({path, offset, color}) => {
                let entities = path? JSONPath({json: group, path: path}): group.nodes || [];
                if (offset){
                    offset::mergeWith({
                        "start": 0,
                        "end": 1,
                        "step": (offset.end - offset.start) / (entities.length + 1)
                    }, noOverwrite);
                    entities.forEach((e, i) => e.offset = offset.start + offset.step * ( i + 1 ) );
                }
                if (color){
                    colorGroupEntities(entities, color);
                }
            })
        };

        let resVal = validator.validate(json, schema);
        if (resVal.errors && resVal.errors.length > 0){ console.warn(resVal); }

        let res  = super.fromJSON(json, modelClasses, entitiesByID);

        //Interpolation schemes do not contain IDs/references, so it is easier to process them in the expanded model
        interpolateGroupProperties(res);

        //Color links and lyphs which do not have assigned colors in the spec
        addColor(res.links, "#000");
        addColor(res.lyphs);

        //Remove subgroups
        res.groups = (res.groups||[]).filter(g => !g.remove);
        (res.groups||[]).forEach(g => delete g.groups);

        return res;
    }

    get entities(){
        return [...(this.nodes||[]), ...(this.links||[]), ...(this.lyphs||[])];
    }

    belongsTo(entity){
        return this.entities.find(e => (e === entity) || (e.id === entity.id && e.class === entity.class));
    }

    hideGroups(groups){
        this.entities.forEach(entity => {
            if ((groups || []).find(group => group.belongsTo(entity))) {
                entity.hidden = true;
            } else {
                delete entity.hidden;
            }
        });
    }

    get visibleNodes(){
        return this.nodes.filter(e => e.isVisible);
    }

    get visibleLinks(){
        return this.links.filter(e => e.isVisible &&
            this.visibleNodes.find(e2 => e2 === e.source) &&
            this.visibleNodes.find(e2 => e2 === e.target)
        );
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
                for (let i = 1; i < path.length - 1; i++){
                    path[i].z = path[0].z + dz * i;
                }
                lnk.path = path;
            }
        });

        //Update links in certain order
        [LINK_TYPES.SEMICIRCLE, LINK_TYPES.LINK, LINK_TYPES.INVISIBLE, LINK_TYPES.DASHED, LINK_TYPES.CONTAINER, LINK_TYPES.PATH].forEach(
            linkType => {
                this.visibleLinks.filter(link => link.type === linkType).forEach(link => {
                    link.updateViewObjects(state);
                });
            }
        );
    }
}
