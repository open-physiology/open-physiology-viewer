import {VisualResource} from './visualResourceModel';
import {
    $Field,
    $Prefix,
    $SchemaClass,
    findResourceByID, getFullID,
    getGenID,
    getID, getRefID,
    getRefNamespace,
    mergeGenResource,
    refToResource,
    genResource
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
        targetNode::merge(sourceNode::pick([$Field.color, $Field.hidden]));
        targetNode.skipLabel = true;
        targetNode.generated = true;
        if (!sourceNode.clones){
            sourceNode.clones = [];
        }
        //FIXME use fullID (requires revision to be able to find these nodes)?
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

        borderNodesByID::keys().forEach(nodeID => {
            let hostLyphs = borderNodesByID[nodeID];
            if (hostLyphs.length > 1){
                let node  = refToResource(nodeID, parentGroup, $Field.nodes, true);
                let prev = nodeID;
                hostLyphs.forEach((hostLyph, i) => {
                    if (i < 1) { return; }
                    let nodeClone = genResource({
                        [$Field.id]: getGenID(nodeID, $Prefix.clone, i),
                        [$Field.skipLabel]: true,
                        [$Field.hidden]: node.hidden
                    }, "verticeModel.replicateBorderNodes (Node)");
                    modelClasses.Node.clone(node, nodeClone);
                    if (!findResourceByID(parentGroup.nodes, nodeClone.id)) {
                        parentGroup.nodes.push(nodeClone);
                    }

                    let targetOfLinks = (parentGroup.links||[]).filter(e => getID(e.target) === nodeID && nodeOnBorder(e.source, hostLyph.id));
                    let sourceOfLinks = (parentGroup.links||[]).filter(e => getID(e.source) === nodeID && nodeOnBorder(e.target, hostLyph.id));
                    targetOfLinks.forEach(lnk => {lnk.target = nodeClone.id});
                    sourceOfLinks.forEach(lnk => {lnk.source = nodeClone.id});

                    hostLyphs[i].border.borders.forEach(b => {
                        let k = (b.hostedNodes||[]).indexOf(nodeID);
                        if (k > -1){ b.hostedNodes[k] = nodeClone.id; }
                    });
                    let lnk = modelClasses.Link.createCollapsibleLink(prev, nodeClone.id);
                    mergeGenResource(undefined, parentGroup, lnk, $Field.links);
                    prev = nodeClone.id;
                })
            }
        });
    }

    static replicateInternalNodes(parentGroup, modelClasses){
        let internalNodesByID = {};
        (parentGroup.lyphs||[]).forEach(lyph => this.addLyphToHostMap(lyph, lyph.internalNodes, internalNodesByID, parentGroup.namespace));

        const isEndBundledLink = (link, lyph) => (lyph.endBundles||[]).find(e => getRefID(e) === getRefID(link));

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
                    let k = hostLyph.internalNodes.indexOf(nodeFullID);
                    if (k === -1){
                        k = hostLyph.internalNodes.indexOf(nodeID);
                    }
                    if (k > -1){
                        hostLyph.internalNodes[k] = nodeClone.id;
                    }

                    //rewire affected links
                    let targetOfLinks = (parentGroup.links||[]).filter(e => getRefID(e.target) === nodeID && isEndBundledLink(e, hostLyph));
                    let sourceOfLinks = (parentGroup.links||[]).filter(e => getRefID(e.source) === nodeID && isEndBundledLink(e, hostLyph));
                    targetOfLinks.forEach(lnk => {
                        lnk.target = nodeClone.id;
                        allTargetLinks.push(lnk);
                    });
                    sourceOfLinks.forEach(lnk => {
                        lnk.source = nodeClone.id;
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
                            chains.forEach(e => {
                                let chain = refToResource(e, parentGroup, $Field.chains);
                                if (chain && chain.group){
                                    if (!chain.group.nodes.find(x => x === nodeClone.id || x.id === nodeClone.id)) {
                                        chain.group.nodes.push(nodeClone.id);
                                    }
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
                    mergeGenResource(undefined, parentGroup, lnk, $Field.links);
                });

                if (allSourceLinks.length > 0){
                    allTargetLinks.forEach(e => e.nextChainStartLevels = allSourceLinks.map(x => x.id));
                }
                if (allTargetLinks.length > 0) {
                    allSourceLinks.forEach(e => e.prevChainEndLevels = allTargetLinks.map(x => x.id));
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