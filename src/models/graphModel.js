import { Entity } from './entityModel';
import { values } from 'lodash-bound';
import {LINK_TYPES} from './linkModel';
import {NODE_TYPES} from './nodeModel';

export class Graph extends Entity {
    _nodes: [];
    _links: [];
    _lyphs: [];

    getNodeByID(id){
        return this._nodes.find(node => node.id === id);
    }

    getLinkByID(id) {
        return this._links.find(link => link.id === id);
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

    //TODO simplify - define groups and hide based on where an item is in the group
    toggleLinks({hideTrees, hideCoalescences, hideContainers, hideNeurons}){
        if (!this._allLinks) { this._allLinks = this._links; }
        if (!this._allNodes) { this._allNodes = this._nodes; }

        const isOmegaLink       = link => link.source.type === NODE_TYPES.OMEGA;
        const isOmegaNode       = node => node.type === NODE_TYPES.OMEGA;

        const isCoalescenceLink = link => link.type === LINK_TYPES.COALESCENCE;
        const isContainerLink   = link => link.type === LINK_TYPES.CONTAINER;

        const isNeuronLyph      = lyph => lyph && (
            (lyph.groups||[]).some(group => group.name === "Neurons") || isNeuronLyph(lyph.layerInLyph));
        const isNeuronLink      = link => isNeuronLyph(link.conveyingLyph) ||
            link.source.belongsToLyph || link.target.belongsToLyph;
        const isNeuronNode      = node => (node.links.length === node.links.every(link => isNeuronLink(link)).length)
            || node.belongsToLyph; //Only neurons have inner nodes at the moment

        const reviseLinks = () => {
            this._links = this._allLinks.filter(link => !this._hiddenLinks.find(lnk => lnk.id === link.id));
            this._nodes = this._allNodes.filter(node => !this._hiddenNodes.find(n => n.id === node.id));
        };

        this._hiddenLinks = [];
        this._hiddenNodes = [];

        this._allLinks.filter(link => ( hideTrees && isOmegaLink(link)
            || hideCoalescences && isCoalescenceLink(link)
            || hideContainers   && isContainerLink(link)
            || hideNeurons      && isNeuronLink(link)
        ) && !this._hiddenLinks.find(lnk => lnk.id === link.id)).forEach(link => this._hiddenLinks.push(link));

        this._allNodes.filter(node => ( hideTrees && isOmegaNode(node)
            || hideNeurons    && isNeuronNode(node)
        )
        && !this._hiddenNodes.find(n => n.id === node.id)).forEach(node => this._hiddenNodes.push(node));

        reviseLinks();
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
            if (link.type === LINK_TYPES.BORDER){
                link.viewObjects["main"].material.visible = false;
            }
        });
    }

    updateViewObjects(state){
        // Update nodes positions
        this._nodes.forEach(node => { node.updateViewObjects(state) });

        //Update links in certain order
        [LINK_TYPES.PATH, LINK_TYPES.LINK, LINK_TYPES.BORDER, LINK_TYPES.AXIS, LINK_TYPES.CONTAINER].forEach(
            linkType => {
                this._links.filter(link => link.type === linkType).forEach(link => {
                    link.updateViewObjects(state);
                });
            }
        );
    }
}
