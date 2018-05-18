import { Entity } from './entityModel';
import { values } from 'lodash-bound';
import {LINK_TYPES} from './linkModel';
import {NODE_TYPES} from './nodeModel';

export class Graph extends Entity {
    _nodes: [];
    _links: [];

    getNodeByID(id){
        return this._nodes.find(node => node.id === id);
    }

    getLinkByID(id) {
        return this._links.find(link => link.id === id);
    }

    getLyphByID(id) {
        return (this.lyphs||[]).find(lyph => lyph.id === id);
    }

    getLyphByName(name) {
        return this.lyphs.find(lyph => lyph.name === name);
    }

    getLinkByLyphID(lyphID) {
        let res = this._links.find(link => link.conveyingLyph &&
            (link.conveyingLyph  === lyphID || link.conveyingLyph.id === lyphID));
        if (!res) {
            //For lyphs which are layers, return parent's link (does not work for ID's)
            res = this._links.find(link => link.conveyingLyph
                && link.conveyingLyph.hasLayer && link.conveyingLyph.hasLayer(lyphID))
        }
        return res;
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
        this.allNodes = this._nodes;
    }

    get nodes(){
        return this._nodes;
    }

    hideGroups(groups){
        if (!this._allLinks) { this._allLinks = this._links; }
        if (!this._allNodes) { this._allNodes = this._nodes; }

        this._hiddenLinks = [];
        this._hiddenNodes = [];

        //Remove hidden links from the current graph link set
        this._allLinks.filter(link => (groups||[]).find(group => group.belongsTo(link))
                && !this._hiddenLinks.find(lnk => lnk.id === link.id))
            .forEach(link => this._hiddenLinks.push(link));

        //Remove hidden nodes from the current graph node set
        this._allNodes.filter(node => (groups||[]).find(group => group.belongsTo(node))
                && !this._hiddenNodes.find(n => n.id === node.id))
            .forEach(node => this._hiddenNodes.push(node));

        this._links = this._allLinks.filter(link => !this._hiddenLinks.find(lnk => lnk.id === link.id));
        this._nodes = this._allNodes.filter(node => !this._hiddenNodes.find(n => n.id === node.id));

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

        //Update links in certain order
        [LINK_TYPES.SEMICIRCLE, LINK_TYPES.LINK, LINK_TYPES.INVISIBLE, LINK_TYPES.DASHED, LINK_TYPES.CONTAINER].forEach(
            linkType => {
                this._links.filter(link => link.type === linkType).forEach(link => {
                    link.updateViewObjects(state);
                });
            }
        );
    }
}
