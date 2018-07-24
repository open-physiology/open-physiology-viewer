import { Entity } from './entityModel';
import { keys, values, mergeWith, isObject} from 'lodash-bound';
import { LINK_TYPES } from './linkModel';
import { Validator} from 'jsonschema';
import * as schema from '../data/manifest.json';
import { EventEmitter } from 'events';
import * as colorSchemes from 'd3-scale-chromatic';
const JSONPath = require('JSONPath');

const validator = new Validator();
import {ForceEdgeBundling} from "../three/d3-forceEdgeBundling";

export const graphEvent = new EventEmitter();

const noOverwrite = (objVal, srcVal) => {
    if (objVal && objVal !== srcVal) { return objVal; }
    return srcVal;
};
const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];
const addColor = (entities, defaultColor) => (entities||[]).filter(e => e::isObject() && !e.color)
    .forEach((e, i) => { e.color = defaultColor || colors[i % colors.length] });
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
            if (Array.isArray(item)){
                assignColor(item);
            } else {
                item.color = getColor(i);
            }
        });
    };
    assignColor(entities);
};
const interpolateGroupProperties = (group) => {
    (group.interpolate||[]).forEach(spec => {
        let entities = spec.path? JSONPath({json: group, path: spec.path}): group.nodes || [];
        if (spec.offset){
            spec.offset::mergeWith({
                "start": 0,
                "end": 1,
                "step": (spec.offset.end - spec.offset.start) / (entities.length + 1)
            }, noOverwrite);
            entities.forEach((e, i) => e.offset = spec.offset.start + spec.offset.step * ( i + 1 ) );
        }
        if (spec.color){
            colorGroupEntities(entities, spec.color);
        }
    })
};

export class Graph extends Entity {

    static fromJSON(json, modelClasses = {}, entitiesByID) {

        let resVal = validator.validate(json, schema);
        if (resVal.errors && resVal.errors.length > 0){
            //graphEvent.emit(resVal);
            console.warn(resVal);
        }

        //Group properties must be assigned before creating the model because IDs in the "assign" object are not replaced with references
        const assignGroupProperties = (group) => {
            (group.assign||[])::keys().forEach(property => {
                if (group.assign[property] && json[property]) {
                    (group[property]||[]).map(id => json[property]
                        .find(e => e.id === id)).forEach(e => e::mergeWith(group.assign[property], noOverwrite));
                }
            });
            (group.groups||[]).forEach(g => assignGroupProperties(g));
        };

        assignGroupProperties(json);
        //Color links and lyphs which do not have assigned colors in the spec
        addColor(json.links, "#000");
        addColor(json.lyphs);

        let res  = super.fromJSON(json, modelClasses, entitiesByID);
        //Interpolation schemes do not contain IDs/references, so it is easier to process them in the expanded model
        interpolateGroupProperties(res);

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
        return this.nodes.filter(e => !e.hidden);
    }

    get visibleLinks(){
        return this.links.filter(e => !e.hidden);
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
