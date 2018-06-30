import { Entity } from './entityModel';
import { values } from 'lodash-bound';
import { LINK_TYPES } from './linkModel';
import { Validator} from 'jsonschema';
import * as schema from '../data/manifest.json';
import { EventEmitter } from 'events';

const validator = new Validator();
import {ForceEdgeBundling} from "../three/d3-forceEdgeBundling";

export const graphEvent = new EventEmitter();

export class Graph extends Entity {
    _nodes: [];
    _links: [];

    static fromJSON(json, modelClasses = {}, entitiesByID) {
        let resVal = validator.validate(json, schema);
        if (resVal.errors && resVal.errors.length > 0){
            //graphEvent.emit(resVal);
            console.warn(resVal);
        }
        return super.fromJSON(json, modelClasses, entitiesByID);
    }

    set links(newLinks){
        this._links = newLinks;
        this._allLinks = this._links;
    }

    get links(){
        return this._links;
    }

    set nodes (newNodes){
        this._nodes = newNodes;
        this._allNodes = this._nodes;
    }

    get nodes(){
        return this._nodes;
    }

    hideGroups(groups){
        if (!this._allLinks) { this._allLinks = this._links; }
        if (!this._allNodes) { this._allNodes = this._nodes; }

        let hiddenLinks = [];
        let hiddenNodes = [];

        //Remove hidden links from the current graph link set
        this._allLinks.filter(link => (groups||[]).find(group => group.belongsTo(link))
                && !hiddenLinks.find(lnk => lnk.id === link.id))
            .forEach(link => hiddenLinks.push(link));

        //Remove hidden nodes from the current graph node set
        this._allNodes.filter(node => (groups||[]).find(group => group.belongsTo(node))
                && !hiddenNodes.find(n => n.id === node.id))
            .forEach(node => hiddenNodes.push(node));

        this._links = this._allLinks.filter(link => !hiddenLinks.find(lnk => lnk.id === link.id));
        this._nodes = this._allNodes.filter(node => !hiddenNodes.find(n => n.id === node.id));

        //If a lyph in a group to hide but its axis is not, make it invisible
        this._links.filter(link => link.conveyingLyph).forEach(link => {
            if ((groups||[]).find(group => group.belongsTo(link.conveyingLyph))){
                link.conveyingLyph.hidden = true;
            } else {
                delete link.conveyingLyph.hidden;
            }
        })
    }

    createViewObjects(state){
        //Draw all graph nodes, except for invisible nodes (node.type === CONTROL)
        this._nodes.filter(node => !node.hidden).forEach(node => {
            node.createViewObjects(state);
            node.viewObjects::values().forEach(obj => state.graphScene.add(obj));
        });

        this._links.forEach(link => {
            link.createViewObjects(state);
            link.viewObjects::values().forEach(obj => state.graphScene.add(obj));
            if (link.type === LINK_TYPES.INVISIBLE){
                link.viewObjects["main"].material.visible = false;
            }
        });
    }

    updateViewObjects(state){
        // Update nodes positions
        this._nodes.forEach(node => { node.updateViewObjects(state) });

        //Edge bundling
        const fBundling = ForceEdgeBundling()
            .nodes(this._nodes)
            .edges(this.links.filter(e => e.type === LINK_TYPES.PATH).map(edge => {
                return {
                    source: this._nodes.indexOf(edge.source),
                    target: this._nodes.indexOf(edge.target)
                };
            }));
        let res = fBundling();
        (res || []).forEach(path => {
            let lnk = this._links.find(e => e.source.id === path[0].id);
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
                this._links.filter(link => link.type === linkType).forEach(link => {
                    link.updateViewObjects(state);
                });
            }
        );
    }
}
