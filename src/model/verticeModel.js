import {VisualResource} from './visualResourceModel';
import {
    $Field,
    $Prefix,
    $SchemaClass,
    findResourceByID,
    getFullID,
    getGenID,
    getID, getRefID,
    getRefNamespace,
    mergeGenResource,
    refToResource,
    genResource,
    findIndex
} from "./utils";
import {keys, merge, pick, isString, isArray, flatten} from "lodash-bound";
import {$LogMsg, logger} from "./logger";

export class Vertice extends VisualResource{
    /**
     * Determines whether the anchor's position is constrained in the model
     */
    get isConstrained() {
        return (this.hostedBy && this.hostedBy.isVisible) ||
            (this.internalIn && this.internalIn.isVisible);
    }
}

/**
 * The class to represent scaffold anchor points
 * @class
 * @property {Anchor} hostedAnchors
 */
export class Anchor extends Vertice {

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.Anchor;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    includeRelated(group){}
}

/**
 * The class to visualize Node resources in the force-directed graphs
 * @class
 * @property {number} val
 * @property {Array<Node>} controlNodes
 * @property {Boolean} invisible
 * @property {Link} hostedBy
 * @property {Link} sourceOf
 * @property {Link} targetOf
 * @property {Shape} internalIn
 * @property {number} internalInLayer
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
 * @property {Chain} rootOf
 * @property {Chain} leafOf
 */
export class Node extends Vertice {

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.Node;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    static clone(sourceNode, targetNode){
        if (!sourceNode) { return; }
        targetNode = targetNode || {};
        targetNode.cloneOf = sourceNode.id;
        targetNode.id = targetNode.id || getGenID(sourceNode.id, $Prefix.clone);
        targetNode::merge(sourceNode::pick([$Field.color, $Field.hidden, $Field.namespace]));
        targetNode.skipLabel = true;
        targetNode.generated = true;
        if (!sourceNode.clones){
            sourceNode.clones = [];
        }
        sourceNode.clones.push(targetNode.fullID || targetNode.id);
        return targetNode;
    }

    /**
     * Determines whether the node's position is constrained in the model
     */
    get isConstrained() {
        return (this.fixed && this.layout) || super.isConstrained;
    }

    /**
     * Replicate border nodes and create collapsible links
     * @param parentGroup
     * @param modelClasses
     */
    static replicateBorderNodes(parentGroup, modelClasses){
        let borderNodesByID = {};
        (parentGroup.lyphs||[]).forEach(lyph => {
            if (lyph.border && lyph.border.borders) {
                lyph.border.borders.forEach(b =>
                    this.addLyphToHostMap(lyph, b.hostedNodes, borderNodesByID, parentGroup.namespace))
            }
        });

        const nodeOnBorder = (node, lyphID) => (borderNodesByID[getID(node)]||[]).find(e => e.id === lyphID);

        borderNodesByID::keys().forEach(nodeFullID => {
            let hostLyphs = borderNodesByID[nodeFullID];
            if (hostLyphs.length > 1){
                const nodeID = getRefID(nodeFullID);
                let node  = refToResource(nodeFullID, parentGroup, $Field.nodes, true);
                let prev = node;
                hostLyphs.forEach((hostLyph, i) => {
                    if (i < 1) { return; }
                    let nodeClone = genResource({
                        [$Field.id]: getGenID(nodeID, $Prefix.clone, i),
                        [$Field.skipLabel]: true,
                        [$Field.hidden]: node.hidden
                    }, "verticeModel.replicateBorderNodes (Node)");
                    modelClasses.Node.clone(node, nodeClone);
                    mergeGenResource(undefined, parentGroup, nodeClone, $Field.nodes);

                    let targetOfLinks = (parentGroup.links||[]).filter(e => getRefID(e.target) === nodeID && nodeOnBorder(e.source, hostLyph.id));
                    let sourceOfLinks = (parentGroup.links||[]).filter(e => getRefID(e.source) === nodeID && nodeOnBorder(e.target, hostLyph.id));
                    //These arrays may miss links from other namespaces, try to discover them in another way
                    (hostLyph.bundles||[]).forEach(lnkRef => {
                        let lnk = refToResource(lnkRef, parentGroup, $Field.links);
                        if (lnk){
                            if (lnk.source === nodeID && !findResourceByID(sourceOfLinks, lnk.id)){
                                sourceOfLinks.push(lnk);
                            }
                            if (lnk.target === nodeID && !findResourceByID(targetOfLinks, lnk.id)){
                                targetOfLinks.push(lnk);
                            }
                        }
                    });

                    targetOfLinks.forEach(lnk => lnk.target = nodeClone.fullID);
                    sourceOfLinks.forEach(lnk => lnk.source = nodeClone.fullID);

                    hostLyphs[i].border.borders.forEach(b => {
                        let k = findIndex(b.hostedNodes, nodeFullID, parentGroup.namespace);
                        if (k > -1){
                            b.hostedNodes[k] = nodeClone.fullID;
                        }
                    });
                    let lnk = modelClasses.Link.createCollapsibleLink(prev, nodeClone);
                    mergeGenResource(undefined, parentGroup, lnk, $Field.links);
                    prev = nodeClone;
                })
            }
        });
    }

    static replicateInternalNodes(parentGroup, modelClasses){
        let internalNodesByID = {};
        (parentGroup.lyphs||[]).forEach(lyph => this.addLyphToHostMap(lyph, lyph.internalNodes, internalNodesByID, parentGroup.namespace));

        internalNodesByID::keys().forEach(nodeFullID => {
            let hostLyphs = internalNodesByID[nodeFullID];
            if (hostLyphs.length > 1){
                const nodeID = getRefID(nodeFullID);
                let node = refToResource(nodeFullID, parentGroup, $Field.nodes, true);
                if (node.generated) {
                    //if the node was generated, its internalIn property may be incorrectly set by chain generator
                    delete node.internalIn;
                }

                let allTargetLinks = [];
                let allSourceLinks = [];

                hostLyphs.forEach((hostLyph, i) => {
                    let nodeClone = genResource({
                        [$Field.id]        : getGenID(nodeID, $Prefix.join, i),
                        [$Field.hidden]    : true,
                        [$Field.skipLabel] : true
                    }, "verticeModel.replicateInternalNodes (Node)");
                    modelClasses.Node.clone(node, nodeClone);

                    mergeGenResource(undefined, parentGroup, nodeClone, $Field.nodes);
                    let k = findIndex(hostLyph.internalNodes, nodeFullID, parentGroup.namespace);
                    if (k > -1){
                        hostLyph.internalNodes[k] = nodeClone.fullID;
                    }

                    let targetOfLinks = [];
                    let sourceOfLinks = [];
                    //Note: this method won't rewire links with ends internal in several lyphs if they are not endBundled
                    //Property 'endBundles' is set for chain levels if the chain is housed
                    (hostLyph.endBundles||[]).forEach(lnkRef => {
                        let lnk = refToResource(lnkRef, parentGroup, $Field.links);
                        if (lnk){
                            if (lnk.source === nodeID){
                                sourceOfLinks.push(lnk);
                            }
                            if (lnk.target === nodeID){
                                targetOfLinks.push(lnk);
                            }
                        }
                    });

                    targetOfLinks.forEach(lnk => {
                        lnk.target = nodeClone.fullID;
                        allTargetLinks.push(lnk);
                    });
                    sourceOfLinks.forEach(lnk => {
                        lnk.source = nodeClone.fullID;
                        allSourceLinks.push(lnk);
                    });

                    let leafChains = targetOfLinks.map(e => e.levelIn)::flatten();
                    let rootChains = sourceOfLinks.map(e => e.levelIn)::flatten();

                    //Reset rootOf and leafOf and include generated node into relevant chain groups
                    const fixNodeChainRels = (chains, prop) => {
                        if (chains.length > 0){
                            nodeClone[prop] = chains;
                            if (node[prop]) {
                                node[prop] = node[prop].filter(e => !chains.includes(e));
                            }
                            chains.forEach(chainID => {
                                let chain = refToResource(chainID, parentGroup, $Field.chains);
                                if (chain && chain.group) {
                                    mergeGenResource(chain.group, parentGroup, nodeClone, $Field.nodes);
                                    let relatedProp = prop === $Field.leafOf ? $Field.leaf : $Field.root;
                                    chain[relatedProp] = nodeClone.fullID;
                                }
                            })
                        }
                    };

                    fixNodeChainRels(leafChains, $Field.leafOf);
                    fixNodeChainRels(rootChains, $Field.rootOf);

                    let lnk;
                    if (rootChains.length > 0) {
                        lnk = modelClasses.Link.createCollapsibleLink(node, nodeClone);
                    } else {
                        lnk = modelClasses.Link.createCollapsibleLink(nodeClone, node);
                    }
                    mergeGenResource(undefined, parentGroup, lnk, $Field.links);
                });

                if (allSourceLinks.length > 0){
                    allTargetLinks.forEach(lnk => lnk.nextChainStartLevels = allSourceLinks.map(x => x.id));
                }
                if (allTargetLinks.length > 0) {
                    allSourceLinks.forEach(lnk => lnk.prevChainEndLevels = allTargetLinks.map(x => x.id));
                }

                // node.controlNodes = node.clones;
                if ((node.clones || []).length > 0) {
                    logger.info($LogMsg.NODE_CLONE_INTERNAL, node.id, node.clones);
                }
            }
        });
    }

    /**
     * Adds internal lyph nodes to the global resource map
     * @param hostLyph
     * @param nodes
     * @param resMap
     * @param namespace
     * @returns {Object} Updated resource map
     */
    static addLyphToHostMap(hostLyph, nodes, resMap, namespace){
        if (nodes && !nodes::isArray()){
            logger.warn($LogMsg.RESOURCE_ARRAY_EXPECTED, hostLyph.id,
                $Field.hostedNodes + " or " + $Field.internalNodes, nodes);
            return;
        }
        (nodes||[]).forEach(e => {
            let nodeFullID = getFullID(getRefNamespace(e, namespace), e);
            if (!nodeFullID || !nodeFullID::isString()) {
                logger.warn($LogMsg.RESOURCE_NO_ID, nodeFullID);
            } else {
                resMap[nodeFullID] = resMap[nodeFullID] || [];
                if (!findResourceByID(resMap[nodeFullID], hostLyph.id)) {
                    resMap[nodeFullID].push(hostLyph);
                }
            }
        });
        return resMap;
    }

    includeRelated(group){
        (this.clones||[]).forEach(clone => {
            let spacerLinks = (clone.sourceOf||[]).concat(clone.targetOf).filter(lnk => lnk && lnk.collapsible);
            spacerLinks.forEach(lnk => !group.contains(lnk) && group.links.push(lnk));
            if (spacerLinks.length > 0 && !group.contains(clone)){
                group.nodes.push(clone);
            }
            if (clone.hostedBy) {
                clone.hostedBy.hostedNodes = clone.hostedBy.hostedNodes || [];
                if (!findResourceByID(clone.hostedBy.hostedNodes, clone.id, clone.namespace)) {
                    clone.hostedBy.hostedNodes.push(clone);
                }
            }
        });
    }
}