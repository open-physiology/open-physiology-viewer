import { Model } from './model';
import { assign } from 'lodash-bound';
import {LINK_TYPES} from './linkModel';
import {NODE_TYPES} from './nodeModel';


export class GraphModel extends Model {
    nodes: [];
    links: [];
    //coalescences: [];

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Graph";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    getNodeByID(id){
        return this.nodes.find(node => node.id === id);
    }

    getLinkByID(id) {
        return this.links.find(link => link.id === id);
    }

    createViewObjects(state){
        //Draw all graph nodes, except for invisible nodes (node.type === CONTROL)
        //TODO it may be useful to draw control nodes, so there may be needed a separate attribute for visibility
        this.nodes.filter(node => !node.hidden).forEach(node => {
            node.createViewObjects(state);
            Object.values(node.viewObjects).forEach(obj => state.graphScene.add(obj));
        });

        this.links.forEach(link => {
            link.createViewObjects(state);
            Object.values(link.viewObjects).forEach(obj => state.graphScene.add(obj));
        });
    }

    updateViewObjects(state){
        // Update nodes positions
        this.nodes.forEach(node => { node.updateViewObjects(state) });

        // Update links position for paths, compute positions of omega nodes
        this.links.filter(link => link.type === LINK_TYPES.PATH).forEach(link => {
            link.updateViewObjects(state)}
        );

        // Update links position for straight solid links
        this.links.filter(link => link.type === LINK_TYPES.LINK).forEach(link => {
            link.updateViewObjects(state)
        });

        //Update axis
        this.links.filter(link => link.type === LINK_TYPES.AXIS).forEach(link => {
            link.updateViewObjects(state)
        });

        //Update containers
        this.links.filter(link => link.type === LINK_TYPES.CONTAINER).forEach(link => {
            link.updateViewObjects(state)
        });
    }
}
