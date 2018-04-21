import { Model } from './model';
import { assign } from 'lodash-bound';
import {LINK_TYPES} from './linkModel';
import {NODE_TYPES} from './nodeModel';

export class GraphModel extends Model {
    _nodes: [];
    _links: [];
    //coalescences: [];

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Graph";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    getNodeByID(id){
        return this._nodes.find(node => node.id === id);
    }

    getLinkByID(id) {
        return this._links.find(link => link.id === id);
    }

    getLinkByLyphID(lyphID) {
        return this._links.find(link => link.conveyingLyph &&
            (link.conveyingLyph  === lyphID || link.conveyingLyph.id === lyphID));
    }

    //TODO these should be methods of the model, not graph

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

    toggleLinks({hideTrees, hideCoalescences, hideContainers}){
        if (!this._allLinks) { this._allLinks = this._links; }
        if (!this._allNodes) { this._allNodes = this._nodes; }

        const isOmegaLink = (link) =>  link.source.type === NODE_TYPES.OMEGA;
        const isOmegaNode = (node) =>  node.type === NODE_TYPES.OMEGA;
        const isCoalescenceLink = (link) =>  link.type === LINK_TYPES.COALESCENCE;
        const isContainerLink = (link) => link.type === LINK_TYPES.CONTAINER;
        const isContainerNode = (node) => node.hidden; //TODO refactor, at the moment all hidden nodes belong to container links

        const reviseLinks = () => {
            this._links = this._allLinks.filter(link => !this._hiddenLinks.find(lnk => lnk.id === link.id));
            this._nodes = this._allNodes.filter(node => !this._hiddenNodes.find(n => n.id === node.id));
        };

        this._hiddenLinks = [];
        this._hiddenNodes = [];

        if (hideTrees){
            this._allLinks.filter(link => isOmegaLink(link) && !this._hiddenLinks.find(lnk => lnk.id === link.id))
                .forEach(link => this._hiddenLinks.push(link));
            this._allNodes.filter(node=> isOmegaNode(node) && !this._hiddenNodes.find(n => n.id === node.id))
                .forEach(node => this._hiddenNodes.push(node));
        }

        if (hideCoalescences){
            this._allLinks.filter(link => isCoalescenceLink(link) && !this._hiddenLinks.find(lnk => lnk.id === link.id))
                .forEach(link => this._hiddenLinks.push(link));
        }

        if (hideContainers){
            this._allLinks.filter(link => isContainerLink(link) && !this._hiddenLinks.find(lnk => lnk.id === link.id))
                .forEach(link => this._hiddenLinks.push(link));
            this._allNodes.filter(node=> isContainerNode(node) && !this._hiddenNodes.find(n => n.id === node.id))
                .forEach(node => this._hiddenNodes.push(node));

            //     //Clean layout set for internal lyphs
        //     //TODO simplify after bi-directional relationships are defined
        //     // this._containerLinks
        //     //     .filter(link => link.conveyingLyph && link.conveyingLyph.internalLyphs)
        //     //     .forEach(lyphID => {
        //     //         let lnk = this.getLinkByLyphID(lyphID);
        //     //         if (lnk.source.layout) { delete lnk.source.layout;}
        //     //         if (lnk.target.layout) { delete lnk.target.layout;
        //     //         }
        //     //     })
        //
        //     //Alternatively, clean all layout constraints imposed by containers
        //     // this.links.forEach(link => {
        //     //     ["source", "target"].forEach(end => {
        //     //         if (link[end].layout && link[end].layout.reason === "container"){
        //     //             delete link[end].layout;
        //     //         }
        //     //     })
        //     // });
        //
        }

        reviseLinks();
    }

    createViewObjects(state){
        //Draw all graph nodes, except for invisible nodes (node.type === CONTROL)
        this._nodes.filter(node => !node.hidden).forEach(node => {
            node.createViewObjects(state);
            Object.values(node.viewObjects).forEach(obj => state.graphScene.add(obj));
        });

        this._links.forEach(link => {
            link.createViewObjects(state);
            Object.values(link.viewObjects).forEach(obj => state.graphScene.add(obj));
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
