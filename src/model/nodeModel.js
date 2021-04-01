import {VisualResource} from './visualResourceModel';
import {
    getGenID,
    $Field,
    $Prefix,
    getID, findResourceByID, getOrCreateNode
} from "./utils";
import {keys, merge, pick, isString} from "lodash-bound";
import {$LogMsg, logger} from "./logger";

/**
 * The class to visualize Node resources in the force-directed graphs
 * @class
 * @property {number} val
 * @property {Array<Node>} controlNodes
 * @property {Link} hostedBy
 * @property {Link} sourceOf
 * @property {Link} targetOf
 * @property {Shape} internalIn
 * @property {Node} clones
 * @property {Node} cloneOf
 * @property {boolean} fixed
 * @property {Object} layout
 * @property {number} collide
 * @property {number} charge
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {Anchor} anchoredTo
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
                    (b.hostedNodes||[]).forEach(e => {
                        let nodeID = getID(e);
                        if (!nodeID || !nodeID::isString()){
                            logger.warn($LogMsg.RESOURCE_NO_ID, nodeID);
                            return;
                        }
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
            (lyph.internalNodes||[]).forEach(e => {
                let nodeID = getID(e);
                if (!nodeID || !nodeID::isString()){
                    logger.warn($LogMsg.RESOURCE_NO_ID, nodeID);
                    return;
                }
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
                if ((node.clones || []).length > 0) {
                    logger.info($LogMsg.NODE_CLONE_INTERNAL, node.id, node.clones);
                }
            }
        });
    }

    includeRelated(group){
        (this.clones||[]).forEach(clone => {
            let spacerLinks = (clone.sourceOf||[]).concat(clone.targetOf).filter(lnk => lnk && lnk.collapsible);
            spacerLinks.forEach(lnk => group.links.push(lnk));
            if (spacerLinks.length > 0){
                group.nodes.push(clone);
            }
            if (clone.hostedBy) {
                clone.hostedBy.hostedNodes = clone.hostedBy.hostedNodes || [];
                clone.hostedBy.hostedNodes.push(clone);
            }
        });
    }
}