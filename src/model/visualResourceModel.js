import {Resource} from './resourceModel';
import {
    getNewID,
    LINK_GEOMETRY,
    LINK_STROKE,
    PROCESS_TYPE,
    WIRE_GEOMETRY,
    getGenID,
    $Field,
    $Prefix,
    getID, findResourceByID, getOrCreateNode
} from "./utils";
import {keys, merge, pick} from "lodash-bound";
import {$LogMsg, logger} from "./logger";

/**
 * The class implementing common methods for the visual resources.
 * @class
 * @property {string} color - visual resource color
 * @property {Map<string, Object>} viewObjects - visual objects representing the resource
 * @property {boolean} hidden    - indicates whether the resource is currently hidden (invisible in the scene)
 * @property {boolean} skipLabel - excludes resource labels from the view
 * @property {Object} cloneOf
 */
export class VisualResource extends Resource{

    /**
     * @property INVISIBLE
     * @property LINK
     * @property SEMICIRCLE
     * @property RECTANGLE
     * @property ARC
     * @property SPLINE
     * @property PATH
     */
    static LINK_GEOMETRY = LINK_GEOMETRY;
    static LINK_STROKE   = LINK_STROKE;
    static PROCESS_TYPE  = PROCESS_TYPE;
    static WIRE_GEOMETRY = WIRE_GEOMETRY;

    /**
     * Determines whether the resource should appear in the scheme based on its 'hidden' attribute and other resource dependencies
     * @returns {boolean}
     */
    get isVisible(){
        return !this.hidden;
    }
}

/**
 * The class to represent scaffold anchor points
 */
export class Anchor extends VisualResource {
}

/**
 * The class to represent scaffold wires
 */
export class Wire extends VisualResource {
}

/**
 *  The class to visualize Node resources in the force-directed graphs
 * @class
 * @property {number} val
 * @property {Array<Node>} controlNodes
 * @property {Link} hostedBy
 * @property {Link} sourceOf
 * @property {Link} targetOf
 * @property {Shape} internalIn
 * @property {boolean} fixed
 * @property {Object} layout
 * @property {number} collide
 * @property {number} charge
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */
export class Node extends VisualResource {

    static clone(sourceNode, targetNode){
        if (!sourceNode) { return; }
        targetNode = targetNode || {};
        targetNode.cloneOf = sourceNode.id;
        targetNode.id = targetNode.id || getGenID(sourceNode.id, $Prefix.clone);
        targetNode::merge(sourceNode::pick([$Field.color]));
        targetNode.skipLabel = true;
        targetNode.generated = true;
        if (!sourceNode.clones){ sourceNode.clones = []; }
        sourceNode.clones.push(targetNode.id);
        return targetNode;
    }

    /**
     * Determines whether the node's position is constrained in the model
     */
    get isConstrained() {
        return !!((this.fixed && this.layout) ||
            //(this.controlNodes && this.controlNodes.length > 0) ||
            (this.hostedBy && this.hostedBy.isVisible) ||
            (this.internalIn && this.internalIn.isVisible));
    }

    /**
     * Replicate border nodes and create collapsible links
     * @param json
     * @param modelClasses
     */
    static replicateBorderNodes(json, modelClasses){
        let borderNodesByID = {};
        (json.lyphs||[]).forEach(lyph => {
            if (lyph.border && lyph.border.borders) {
                lyph.border.borders.forEach(b => {
                    (b.hostedNodes||[]).forEach(nodeID => {
                        if (!borderNodesByID[nodeID]){ borderNodesByID[nodeID] = []; }
                        borderNodesByID[nodeID].push(lyph);
                    });
                })
            }
        });

        //const isBundledLink = (link, lyph) => (lyph.bundles||[]).find(e => getID(e) === link.id);
        const nodeOnBorder = (node, lyphID) => (borderNodesByID[getID(node)]||[]).find(e => e.id === lyphID);

        borderNodesByID::keys().forEach(nodeID => {
            let hostLyphs = borderNodesByID[nodeID];
            if (hostLyphs.length > 1){
                let node  = getOrCreateNode(json.nodes, nodeID);
                let prev = nodeID;
                hostLyphs.forEach((hostLyph, i) => {
                    if (i < 1) { return; }
                    let nodeClone = {
                        [$Field.id]: getGenID(nodeID, $Prefix.clone, i),
                        [$Field.skipLabel]: true,
                        [$Field.generated]: true
                    };
                    modelClasses.Node.clone(node, nodeClone);
                    json.nodes.push(nodeClone);

                    let targetOfLinks = (json.links||[]).filter(e => getID(e.target) === nodeID && nodeOnBorder(e.source, hostLyph.id));
                    let sourceOfLinks = (json.links||[]).filter(e => getID(e.source) === nodeID && nodeOnBorder(e.target, hostLyph.id));
                    targetOfLinks.forEach(lnk => {lnk.target = nodeClone.id});
                    sourceOfLinks.forEach(lnk => {lnk.source = nodeClone.id});

                    hostLyphs[i].border.borders.forEach(b => {
                        let k = (b.hostedNodes||[]).indexOf(nodeID);
                        if (k > -1){ b.hostedNodes[k] = nodeClone.id; }
                    });
                    let lnk = modelClasses.Link.createCollapsibleLink(prev, nodeClone.id);
                    json.links.push(lnk);
                    prev = nodeClone.id;
                })
            }
        });
    }

    static replicateInternalNodes(json, modelClasses){
        let internalNodesByID = {};
        (json.lyphs||[]).forEach(lyph => {
            (lyph.internalNodes||[]).forEach(nodeID => {
                if (!internalNodesByID[nodeID]){ internalNodesByID[nodeID] = []; }
                internalNodesByID[nodeID].push(lyph);
            });
        });

        const isBundledLink = (link, lyph) => (lyph.bundles||[]).find(e => getID(e) === link.id);

        internalNodesByID::keys().forEach(nodeID => {
            let hostLyphs = internalNodesByID[nodeID];
            if (hostLyphs.length > 1){
                let node = getOrCreateNode(json.nodes, nodeID);
                if (node.generated) {
                    //if the node was generated, its internalIn property may be incorrectly set by chain generator
                    delete node.internalIn;
                }

                let allTargetLinks = [];
                let allSourceLinks = [];

                hostLyphs.forEach((hostLyph, i) => {
                    let nodeClone = {
                        [$Field.id]: getGenID(nodeID, $Prefix.join, i),
                        [$Field.skipLabel]: true,
                        [$Field.generated]: true
                    };
                    modelClasses.Node.clone(node, nodeClone);
                    json.nodes.push(nodeClone);
                    let k = hostLyph.internalNodes.indexOf(nodeID);
                    if (k > -1){ hostLyph.internalNodes[k] = nodeClone.id; }

                    //rewire affected links
                    let targetOfLinks = (json.links||[]).filter(e => getID(e.target) === nodeID && isBundledLink(e, hostLyph));
                    let sourceOfLinks = (json.links||[]).filter(e => getID(e.source) === nodeID && isBundledLink(e, hostLyph));
                    targetOfLinks.forEach(lnk => {
                        lnk.target = nodeClone.id;
                        allTargetLinks.push(lnk);
                    });
                    sourceOfLinks.forEach(lnk => {
                        lnk.source = nodeClone.id;
                        allSourceLinks.push(lnk);
                    });

                    let leafChains = targetOfLinks.map(e => e.levelIn);
                    let rootChains = sourceOfLinks.map(e => e.levelIn);

                    //Reset rootOf and leafOf and include generated node into relevant chain groups
                    const fixNodeChainRels = (chains, prop) => {
                        if (chains.length > 0){
                            nodeClone[prop] = chains;
                            if (node[prop]) {
                                node[prop] = node[prop].filter(e => !chains.includes(e));
                            }
                            chains.forEach(e => {
                                let chain = findResourceByID(json.chains, e);
                                if (chain && chain.group){
                                    chain.group.nodes.push(nodeClone.id);
                                    let relatedProp = prop === $Field.leafOf? $Field.leaf: $Field.root;
                                    chain[relatedProp] = nodeClone.id;
                                }
                            })
                        }
                    };

                    fixNodeChainRels(leafChains, $Field.leafOf);
                    fixNodeChainRels(rootChains, $Field.rootOf);

                    let lnk;
                    if (rootChains.length > 0) {
                        lnk = modelClasses.Link.createCollapsibleLink(node.id, nodeClone.id);
                    } else {
                        lnk = modelClasses.Link.createCollapsibleLink(nodeClone.id, node.id);
                    }
                    json.links.push(lnk);
                });

                if (allSourceLinks.length > 0){
                    allTargetLinks.forEach(e => e.nextChainStartLevels = allSourceLinks.map(x => x.id));
                }
                if (allTargetLinks.length > 0) {
                    allSourceLinks.forEach(e => e.prevChainEndLevels = allTargetLinks.map(x => x.id));
                }

                node.controlNodes = node.clones;
                logger.info($LogMsg.NODE_CLONE_INTERNAL, node.id, node.clones);
            }
        });
    }
}

/**
 *  The class to visualize processes (edges)
 * @class
 * @property source
 * @property target
 * @property directed
 * @property collapsible
 * @property geometry
 * @property conveyingLyph
 * @property conveyingType
 * @property conveyingMaterials
 * @property stroke
 * @property path
 * @property lineWidth
 * @property hostedNodes
 * @property onBorder
 * @property levelIn 
 */
export class Link extends VisualResource {

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.id = json.id || getNewID(entitiesByID);
        json.source = json.source || getGenID($Prefix.source, json.id);
        json.target = json.target || getGenID($Prefix.target, json.id);
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    static clone(sourceLink, targetLink){
        if (!sourceLink || !targetLink) { return; }
        targetLink.cloneOf = sourceLink.id;
        targetLink::merge(sourceLink::pick([$Field.conveyingType, $Field.conveyingMaterials, $Field.color]));
        targetLink.skipLabel = true;
        targetLink.generated = true;
    }

    static createCollapsibleLink(sourceID, targetID){
        return {
            [$Field.id]         : getGenID($Prefix.link, sourceID, targetID),
            [$Field.source]     : sourceID,
            [$Field.target]     : targetID,
            [$Field.stroke]     : LINK_STROKE.DASHED,
            [$Field.length]     : 1,
            [$Field.strength]   : 1,
            [$Field.collapsible]: true,
            [$Field.skipLabel]  : true,
            [$Field.generated]  : true
        };
    }

    get isVisible(){
        return (this.onBorder? this.onBorder.isVisible : super.isVisible) && this.source && this.source.isVisible && this.target && this.target.isVisible;
    }

    validateProcess(){
        if (this.conveyingLyph){
            let layers = this.conveyingLyph.layers || [this.conveyingLyph];
            if (layers[0] && layers[0].materials){
                if (this.conveyingType === PROCESS_TYPE.ADVECTIVE){
                    if (!this.conveyingMaterials || this.conveyingMaterials.length === 0){
                        this.conveyingMaterials = layers[0].materials;
                    } else {
                        let diff = (layers[0].materials || []).filter(x => !(this.conveyingMaterials||[]).find(e => e.id === x.id));
                        if (diff.length > 0){
                            logger.warn($LogMsg.PROCESS_NOT_ADVECTIVE, this.id, diff);
                        }
                    }
                } else {
                    let nonConveying = (this.conveyingMaterials||[]).filter(x => !(layers[0].materials || []).find(e => e.id === x.id));
                    if (nonConveying.length > 0){
                        logger.warn($LogMsg.PROCESS_NOT_DIFFUSIVE, this.id, nonConveying);
                    }
                }
            }
        }
    }
}

/**
 * The class to model Material resources
 */
export class Material extends VisualResource {}