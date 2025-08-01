import {GroupTemplate} from './groupTemplateModel';
import {Lyph} from "./shapeModel";
import {Node} from "./verticeModel";
import {Link, Wire} from "./edgeModel";
import {Coalescence} from "./coalescenceModel";

import {
    mergeGenResource,
    refToResource,
    refsToResources,
    getNewID,
    getGenID,
    getFullID,
    getID,
    isDefined,
    getGenName,
    addBorderNode,
    compareResources,
    getRefNamespace,
    genResource,
    findAllDerived,
    $Field,
    $Color,
    $Prefix,
    $SchemaClass, isIncluded, includeRef
} from "./utils";
import {logger, $LogMsg} from './logger';
import {defaults, isObject, flatten, isString, values, merge, clone} from 'lodash-bound';

/**
 * Chain model
 * @property {Array<Lyph>} lyphs
 * @property {Lyph} lyphTemplate
 * @property {Array<Link>} levels
 * @property {number} numLevels
 * @property {Array<Lyph>} housingLyphs
 * @property {Chain} housingChain
 * @property {Object} housingRange
 * @property housingLayers
 * @property {Wire} wiredTo
 * @property {number} wireStart
 * @property {number} wireEnd
 * @property {boolean} startFromLeaf
 * @property {Shape} hostedBy
 * @property {Node} root
 * @property {Node} leaf
 * @property chainTopology
 * @property {Array<Chain>} laterals
 * @property {Chain} lateralOf
 * @property {Lyph} housingLyphTemplates
 * @property {boolean} radial,
 * @property {Chain} generatedFrom
 * @property {Array<Chain>} generatedChains
 */
export class Chain extends GroupTemplate {

    /**
     * Generate an instance of class Chain to model ApiNATOMY chain
     * @param json - input model
     * @param modelClasses - ApiNATOMY class specification
     * @param entitiesByID - Global map of ApiNATOMY resources
     * @param namespace - default namespace to place the resource into
     * @returns {Resource} generated ApiNATOMY chain resource
     */
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.class = json.class || $SchemaClass.Chain;
        let res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        if (!res.housingLyphTemplates && !res.validateTopology()) {
            logger.error($LogMsg.CHAIN_WRONG_TOPOLOGY, res.id);
        }
        return res;
    }

    /**
     * Validate chain template
     * @param chain - chain template
     * @returns {boolean} - false if a problem is detected, and true otherwise
     */
    static validateTemplate(chain) {
        if (!chain) {
            logger.warn($LogMsg.CHAIN_UNDEFINED);
            return false;
        }
        if (chain.generated) {
            return false;
        }
        if (!(chain.numLevels || isDefined(chain.levels) || isDefined(chain.lyphs) ||
            isDefined(chain.housingLyphs) || chain.housingChain || isDefined(chain.housingLyphTemplates))) {
            logger.warn($LogMsg.CHAIN_SKIPPED, chain);
            return false;
        }
        return true;
    }

    /**
     * Generate a group from chain template
     * @param parentGroup - model resources that may be referred from the template
     * @param chain - chain template in JSON
     */
    static expandTemplate(parentGroup, chain) {
        if (!this.validateTemplate(chain)) {
            logger.error(`Chain template validation failed, chain skipped: ${chain.id}`);
            return;
        }
        chain.id = chain.id || getGenID($Prefix.chain, getNewID());
        chain.namespace = chain.namespace || parentGroup.namespace;
        chain.fullID = chain.fullID || getFullID(chain.namespace, chain.id);
        chain.name = chain.name || getGenName(chain.name || chain.id, $Prefix.group);
        chain.group = this.createTemplateGroup(chain, parentGroup);

        function setLinkProps(link, prevLink, N) {
            link.levelIn = link.levelIn || [];
            link.levelIn.push(chain.fullID || chain.id);
            if (chain.length) {
                link.length = chain.length / N;
            }
            if (prevLink) {
                prevLink.next = prevLink.next || [];
                if (!prevLink.next.includes(link.fullID || link.id)) {
                    prevLink.next.push(link.fullID || link.id);
                }
            }
            return link;
        }

        /**
         * Find definition of the lyph template to expand the chain
         * @returns {*} Lyph template object if found or its identifier otherwise
         */
        function getLyphTemplate() {
            let template = chain.lyphTemplate;
            if (template) {
                if (template::isObject()) {
                    if (!template.id) {
                        template.id = getGenID($Prefix.template, chain.id);
                    }
                    chain.lyphTemplate = template.id;
                } else {
                    //find lyph template to establish chain topology
                    template = refToResource(chain.lyphTemplate, parentGroup, $Field.lyphs);
                    if (!template) {
                        logger.error($LogMsg.CHAIN_LYPH_TEMPLATE_MISSING, chain.lyphTemplate);
                    }
                }
                mergeGenResource(chain.group, parentGroup, template, $Field.lyphs);
            }
            return template;
        }

        /**
         * Gives chain level lyph topology
         * @param level - level number, i.e., integer from 0 to n - 1
         * @param n - number of chain levels
         * @param template - chain lyph template
         * @returns {*} Level topology (BAG+/BAG2, TUBE, BAG-/BAG, or CYST)
         */
        function getLevelTopology(level, n, template) {
            if (template) {
                if (template.topology === Lyph.LYPH_TOPOLOGY.CYST && n === 1) {
                    return Lyph.LYPH_TOPOLOGY.CYST;
                }
                if (level === 0 &&
                    [Lyph.LYPH_TOPOLOGY["BAG+"], Lyph.LYPH_TOPOLOGY.BAG2, Lyph.LYPH_TOPOLOGY.CYST].includes(template.topology)) {
                    return Lyph.LYPH_TOPOLOGY.BAG2;
                }
                if (level === n - 1) {
                    if ([Lyph.LYPH_TOPOLOGY["BAG-"], Lyph.LYPH_TOPOLOGY.BAG, Lyph.LYPH_TOPOLOGY.CYST].includes(template.topology)) {
                        return Lyph.LYPH_TOPOLOGY.BAG;
                    }
                }
            }
            return Lyph.LYPH_TOPOLOGY.TUBE;
        }

        function extendLevels() {
            chain.levels = chain.levels || new Array(chain.numLevels);
            for (let i = 0; i < chain.levels.length; i++) {
                let level = refToResource(chain.levels[i], parentGroup, $Field.links);
                if (level) {
                    chain.levels[i] = level;
                    if (chain.levels[i]::isString()) {
                        chain.levels[i] = {
                            [$Field.id]: chain.levels[i]
                        };
                    }
                } else {
                    chain.levels[i] = {};
                }
            }
            //Match number of requested levels with the levels[i] array length
            if (chain.levels.length !== chain.numLevels) {
                let max = Math.max(chain.levels.length, chain.numLevels || 0);
                logger.info($LogMsg.CHAIN_NUM_LEVELS, chain.levels.length, max);
                for (let i = chain.levels.length; i < max; i++) {
                    chain.levels.push({});
                }
                chain.numLevels = max;
            }
        }

        /**
         * Generates chain group resources (nodes, links, and lyphs) from chain template with given sequence of lyphs
         */
        function deriveFromLyphs() {
            let lyphs = refsToResources(chain.lyphs, parentGroup, $Field.lyphs, true);

            if (chain.lyphTemplate) {
                let lyphTemplate = getLyphTemplate();
                lyphs.forEach(lyph => {
                    if (!lyph.supertype && !isDefined(lyph.layers)) {
                        lyph.supertype = chain.lyphTemplate;
                        Lyph.clone(parentGroup, lyphTemplate, lyph);
                    }
                });
            }

            chain.numLevels = lyphs.length;

            extendLevels();
            const N = chain.numLevels;

            for (let i = 0; i < N; i++) {
                lyphs[i].namespace = lyphs[i].namespace || getRefNamespace(lyphs[i]) || parentGroup.namespace;
                lyphs[i].fullID = getFullID(lyphs[i].namespace, lyphs[i].id);
                let existingLink = lyphs[i].conveys && refToResource(getFullID(lyphs[i].namespace, lyphs[i].conveys), parentGroup, $Field.links);
                const condition = lnk => getFullID(lyphs[i].namespace, lnk.conveyingLyph) === lyphs[i].fullID;
                if (!existingLink) {
                    existingLink = parentGroup.linksByID::values().find(condition) || (parentGroup.links || []).find(condition);
                }
                if (existingLink) {
                    chain.levels[i] = existingLink;
                }
            }

            let nodeIDs = new Array(N + 1);
            nodeIDs[0] = getFullID(parentGroup.namespace, chain.root);
            nodeIDs[N] = getFullID(parentGroup.namespace, chain.leaf);

            let existingNodes = new Array(N + 1);
            existingNodes[0] = refToResource(chain.root, parentGroup, $Field.nodes);
            existingNodes[N] = refToResource(chain.leaf, parentGroup, $Field.nodes);

            for (let i = 0; i < N; i++) {
                if (!existingNodes[i]) {
                    if (chain.levels[i]) {
                        if (chain.levels[i].source) {
                            const sourceFullID = getFullID(parentGroup.namespace, chain.levels[i].source);
                            if (nodeIDs[i]) {
                                if (nodeIDs[i] !== sourceFullID) {
                                    logger.warn($LogMsg.CHAIN_NODE_CONFLICT, chain.id, i, chain.levels[i], nodeIDs[i], chain.levels[i].source);
                                }
                            } else {
                                nodeIDs[i] = sourceFullID;
                            }
                        }
                        if (chain.levels[i].target) {
                            const targetFullID = getFullID(parentGroup.namespace, chain.levels[i].target);
                            if (nodeIDs[i + 1]) {
                                if (nodeIDs[i + 1] !== targetFullID) {
                                    logger.warn($LogMsg.CHAIN_NODE_CONFLICT, chain.id, i, chain.levels[i], nodeIDs[i + 1], chain.levels[i].source);
                                }
                            } else {
                                nodeIDs[i + 1] = targetFullID;
                            }
                        }
                        chain.levels[i].namespace = chain.levels[i].namespace || parentGroup.namespace;
                        chain.levels[i].fullID = chain.levels[i].fullID || getFullID(chain.levels[i].namespace, chain.levels[i].id);

                    }
                    existingNodes[i] = existingNodes[i] || refToResource(nodeIDs[i], parentGroup, $Field.nodes);
                }
            }
            existingNodes[N] = existingNodes[N] || refToResource(nodeIDs[N], parentGroup, $Field.nodes);

            for (let i = 0; i < N + 1; i++) {
                nodeIDs[i] = getID(nodeIDs[i]) || getGenID(chain.id, $Prefix.node, i);
                let node = existingNodes[i] || genResource({
                    [$Field.id]: nodeIDs[i],
                    [$Field.color]: $Color.InternalNode,
                    [$Field.val]: 1,
                    [$Field.skipLabel]: true
                }, "chainModel.deriveFromLyphs (Node)");
                //NK mergeGenResource assigns namespace and fullID
                mergeGenResource(chain.group, parentGroup, node, $Field.nodes);
            }

            //FIXME assign namespace to materials?
            let conveyingMaterials = lyphs.filter(lyph => lyph.layers && lyph.layers[0] && lyph.layers[0].materials)
                .map(lyph => lyph.layers[0].materials)::flatten();
            conveyingMaterials = [...new Set(conveyingMaterials)];
            if (conveyingMaterials.length > 1) {
                logger.warn($LogMsg.CHAIN_MAT_DIFF, chain.lyphs);
            }

            let prevLink;
            for (let i = 0; i < N; i++) {
                lyphs[i].namespace = lyphs[i].namespace || getRefNamespace(lyphs[i]) || parentGroup.namespace;
                lyphs[i].fullID = lyphs[i].fullID || getFullID(lyphs[i].namespace.lyphs[i].id);
                if (!chain.levels[i].id) {
                    chain.levels[i]::merge(genResource({
                        [$Field.id]: getGenID(chain.id, $Prefix.link, i + 1),
                        [$Field.source]: chain.group.nodes[i],
                        [$Field.target]: chain.group.nodes[i + 1],
                        [$Field.conveyingLyph]: lyphs[i].fullID,
                        [$Field.conveyingType]: chain.conveyingType || Link.PROCESS_TYPE.ADVECTIVE,
                        [$Field.conveyingMaterials]: conveyingMaterials,
                        [$Field.color]: chain.color || $Color.Link,
                        [$Field.skipLabel]: true
                    }, "chainModel.deriveFromLyphs (Link)"));
                }
                mergeGenResource(chain.group, parentGroup, chain.levels[i], $Field.links);
                includeRef(chain.group.lyphs,lyphs[i].fullID);
                lyphs[i].conveys = lyphs[i].conveys || chain.levels[i].fullID;
                prevLink = setLinkProps(chain.levels[i], prevLink, N);
                chain.levels[i] = chain.levels[i].fullID || chain.levels[i].id;
            }
            chain.root = chain.root || nodeIDs[0];
            chain.leaf = chain.leaf || nodeIDs[N];
        }

        /**
         *  Generates chain group resources (nodes, links, and lyphs) from chain template with given sequence of housing lyphs
         *  or (subrange of) housing chain
         */
        function deriveFromLevels() {
            if (chain.housingChain) {
                if (chain.housingLyphs) {
                    logger.warn($LogMsg.CHAIN_CONFLICT, chain);
                } else {
                    //Retrieve lyphs from housing chain
                    let housingChain = refToResource(chain.housingChain, parentGroup, $Field.chains);
                    if (!housingChain) {
                        logger.warn($LogMsg.CHAIN_NO_HOUSING, chain.id);
                        return;
                    }
                    chain.housingLyphs = housingChain.lyphs || [];
                    if (chain.housingRange) {
                        let min = Math.max(chain.housingRange.min, 0);
                        let max = Math.min(chain.housingRange.max, chain.housingLyphs.length);
                        chain.housingLyphs = chain.housingLyphs.slice(min, max);
                        logger.info($LogMsg.CHAIN_SLICE, housingChain.id, chain.housingLyphs.length);
                    }
                }
            }

            chain.numLevels = chain.numLevels || 0;
            if (!chain.numLevels && chain.housingLyphs) {
                chain.numLevels = chain.housingLyphs.length;
            }

            extendLevels();
            let N = chain.numLevels;

            let sources = chain.levels.map(l => l ? l.source : undefined);
            let targets = chain.levels.map(l => l ? l.target : undefined);
            sources[0] = sources[0] || chain.root;
            targets[N - 1] = targets[N - 1] || chain.leaf;
            if (chain.root && !getID(sources[0])) {
                sources[0].id = chain.root;
            }
            if (chain.leaf && !getID(targets[N - 1])) {
                targets[N - 1].id = chain.leaf;
            }

            for (let i = 1; i < N; i++) {
                if (sources[i] && targets[i - 1] && !compareResources(targets[i - 1], sources[i])) {
                    logger.error($LogMsg.CHAIN_LEVEL_ERROR, chain.id, i, targets[i - 1], sources[i]);
                }
            }

            const getNewNode = i => genResource({
                [$Field.id]: getGenID(chain.id, $Prefix.node, i),
                [$Field.namespace]: parentGroup.namespace,
                [$Field.color]: $Color.InternalNode,
                [$Field.val]: 1,
                [$Field.skipLabel]: true
            }, "chainModel.deriveFromLevels.getNewNode (Node)");

            for (let i = 0; i < N; i++) {
                sources[i] = sources[i] || ((i > 0) && targets[i - 1]) || getNewNode(i);
                sources[i] = refToResource(sources[i], parentGroup, $Field.nodes, true);
            }
            for (let i = 1; i < N; i++) {
                targets[i - 1] = sources[i];
            }
            targets[N - 1] = targets[N - 1] || getNewNode(N);
            targets[N - 1] = refToResource(targets[N - 1], parentGroup, $Field.nodes, true);
            chain.root = getID(sources[0]);
            chain.leaf = getID(targets[N - 1]);

            //Add generated nodes to the parent group
            for (let i = 0; i < N; i++) {
                mergeGenResource(chain.group, parentGroup, sources[i], $Field.nodes);
            }
            mergeGenResource(chain.group, parentGroup, targets[N - 1], $Field.nodes);

            //Create levels
            chain.lyphs = [];
            let prevLink = null;
            for (let i = 0; i < N; i++) {
                chain.levels[i] = chain.levels[i] || {};
                //Do not override existing properties
                let link = chain.levels[i];
                let linkID = link.id || getGenID(chain.id, $Prefix.link, i + 1);
                link::defaults(genResource({
                    [$Field.id]: linkID,
                    [$Field.namespace]: parentGroup.namespace,
                    [$Field.fullID]: getFullID(parentGroup.namespace, linkID),
                    [$Field.source]: getID(sources[i]),
                    [$Field.target]: getID(targets[i]),
                    [$Field.color]: chain.color || $Color.Link,
                    [$Field.skipLabel]: true
                }, "chainModel.deriveFromLevels (Link)"));

                prevLink = setLinkProps(link, prevLink, N);
                let lyphTemplate = getLyphTemplate();
                if (lyphTemplate && !chain.levels[i].conveyingLyph) {
                    //Only create ID, conveying lyphs will be generated and added to the group by the "expandTemplate" method
                    let lyph = genResource({
                        [$Field.id]: getGenID(chain.id, $Prefix.lyph, i + 1),
                        [$Field.supertype]: chain.lyphTemplate,
                        [$Field.conveys]: chain.levels[i].id,
                        [$Field.topology]: getLevelTopology(i, N, lyphTemplate),
                        [$Field.skipLabel]: true
                    }, "chainModel.deriveFromLevels (Lyph)");

                    if (chain.levelOntologyTerms?.length > i) {
                        includeRef(lyph.ontologyTerms, chain.levelOntologyTerms[i]);
                    }

                    //NK: mergeGenResource assigns namespace and fullID
                    mergeGenResource(chain.group, parentGroup, lyph, $Field.lyphs);
                    chain.levels[i].conveyingLyph = lyph.id;
                    Lyph.clone(parentGroup, lyphTemplate, lyph);
                }
                mergeGenResource(chain.group, parentGroup, chain.levels[i].conveyingLyph, $Field.lyphs);
                mergeGenResource(chain.group, parentGroup, chain.levels[i], $Field.links);
                includeRef(chain.group.lyphs, chain.levels[i].conveyingLyph);

                chain.lyphs[i] = chain.levels[i].conveyingLyph;
                chain.levels[i] = chain.levels[i].id; //Replace with ID to avoid resource definition duplication
            }
        }

        if (isDefined(chain.lyphs)) {
            if (isDefined(chain.levels)) {
                logger.warn($LogMsg.CHAIN_CONFLICT2, chain.fullID);
            }
            deriveFromLyphs(parentGroup, chain)
        } else {
            deriveFromLevels(parentGroup, chain);
        }
    }

    static getHostLyph(parentGroup, chain, i) {
        let hostLyph = refToResource(chain.housingLyphs[i], parentGroup, $Field.lyphs);
        if (hostLyph.layers) {
            let bundlingLayer;
            if (hostLyph.namespace !== parentGroup.namespace) {
                hostLyph.layers = hostLyph.layers.map(layerID => getFullID(hostLyph.namespace, layerID));
            }
            let layers = hostLyph.layers.map(layerID => refToResource(layerID, parentGroup, $Field.lyphs));
            layers = layers.filter(layer => !!layer);
            if (layers.length < (hostLyph.layers || []).length) {
                logger.warn($LogMsg.CHAIN_NO_HOUSING_LAYERS, hostLyph.layers, hostLyph.id);
                return;
            }
            //NK FIXME another namespace lyph can bundle the chain, consider more cases
            let nm = chain.namespace || parentGroup.namespace;
            // bundlingLayer = layers.find(e => (e.bundlesChains || []).find(t => t === chain.id ||
            //     (nm && t === getFullID(nm, chain.id))));
            //NK test
            bundlingLayer = layers.find(e => isIncluded(e.bundlesChains, chain.id, nm));
            let hostLayer = null;
            if (chain.housingLayers && chain.housingLayers.length > i) {
                if (chain.housingLayers[i] >= 0) {
                    if (chain.housingLayers[i] <= layers.length - 1) {
                        hostLayer = layers[chain.housingLayers[i]];
                    }
                } else {
                    //Negative housing layer means the chain passes through the given layer counting from the outermost
                    if (-chain.housingLayers[i] <= layers.length) {
                        hostLayer = layers[layers.length + chain.housingLayers[i]];
                    }
                }
                if (bundlingLayer && hostLayer && (bundlingLayer !== hostLayer)) {
                    logger.warn($LogMsg.CHAIN_CONFLICT3, bundlingLayer.id, hostLayer.id);
                }
            }
            hostLyph = bundlingLayer || hostLayer || hostLyph;
        }
        return hostLyph;
    }

    /**
     * Align chain levels along housing lyphs
     * @param parentGroup
     * @param chain
     */
    static embedToHousingLyphs(parentGroup, chain) {
        if (!chain || !chain.id || !chain.levels || !chain.housingLyphs) {
            return;
        }

        //FIXME the method is called passing fullID, a node may still be included twice if the list contains id
        const addInternalNode = (lyph, nodeID) => {
            lyph.internalNodes = lyph.internalNodes || [];
            if (!lyph.internalNodes.includes(nodeID)) {
                lyph.internalNodes.push(nodeID);
            }
        };

        if (chain.housingLyphs.length !== chain.levels.length) {
            logger.error($LogMsg.CHAIN_MISMATCH_HOUSING, chain.id, chain.housingLyphs.length, chain.levels.length);
        }

        let N = Math.min(chain.housingLyphs.length, chain.levels.length);

        for (let i = 0; i < N; i++) {
            let housingLyph = refToResource(chain.housingLyphs[i], parentGroup, $Field.lyphs);
            if (!housingLyph) {
                logger.warn($LogMsg.CHAIN_NO_HOUSING_LYPH, chain.housingLyphs[i]);
                return;
            }
            //A chain level can be "hosted" by the lyph, by its outermost layer, or by any other layer that bundles the chain or referred to .
            let hostLyph = this.getHostLyph(parentGroup, chain, i);
            let level = refToResource(chain.levels[i], parentGroup, $Field.links);
            if (!hostLyph || !level) {
                logger.warn($LogMsg.CHAIN_NO_HOUSING_LYPH, chain.housingLyphs[i], chain.levels[i], level, hostLyph);
                return;
            }

            let sameAsPrev = i > 0 && chain.housingLyphs[i] === chain.housingLyphs[i - 1];
            let sameAsNext = i < N - 1 && chain.housingLyphs[i] === chain.housingLyphs[i + 1];
            let sourceInternal = (i === 0);
            let targetInternal = (i === N - 1) || sameAsNext && !sameAsPrev;

            level.namespace = getRefNamespace(level, parentGroup.namespace);
            const levelFullID = getFullID(level.namespace, level.id);

            if (!hostLyph.isTemplate) {
                let sourceBorderIndex = chain.radial ? 2 : 1;
                let targetBorderIndex = chain.radial ? 0 : 3;
                if (chain.housingLayers) {
                    if (sameAsNext && chain.housingLayers.length > i) {
                        sourceBorderIndex = chain.housingLayers[i] > chain.housingLayers[i + 1] ? 0 : 2;
                    }
                    // sameAsPrev implies i > 0
                    if (sameAsPrev && chain.housingLayers.length >= i) {
                        targetBorderIndex = chain.housingLayers[i] < chain.housingLayers[i - 1] ? 2 : 0;
                    }
                }

                if (i === 0 || i === (N - 1)) {
                    hostLyph.endBundles = hostLyph.endBundles || [];
                    hostLyph.endBundles.push(levelFullID);
                } else {
                    hostLyph.bundles = hostLyph.bundles || [];
                    hostLyph.bundles.push(levelFullID);
                }
                hostLyph.border = hostLyph.border || {};
                hostLyph.border.borders = hostLyph.border.borders || [{}, {}, {}, {}];

                //Start and end nodes
                if (sourceInternal) {
                    addInternalNode(hostLyph, getFullID(level.namespace, level.source));
                } else {
                    addBorderNode(hostLyph.border.borders[targetBorderIndex], getFullID(level.namespace, level.source));
                }
                if (targetInternal) {
                    addInternalNode(hostLyph, getFullID(level.namespace, level.target));
                } else {
                    let targetNode = refToResource(level.target, parentGroup, $Field.nodes, true);
                    if (targetNode.generated) {
                        targetNode.skipLabel = true;
                    }
                    let targetClone = Node.clone(targetNode);
                    addBorderNode(hostLyph.border.borders[sourceBorderIndex], getFullID(level.namespace, targetClone.id));
                    let lnk = Link.createCollapsibleLink(targetClone, targetNode, chain.namespace);
                    level.target = targetClone.id;
                    mergeGenResource(chain.group, parentGroup, targetClone, $Field.nodes);
                    mergeGenResource(chain.group, parentGroup, lnk, $Field.links);
                }
            } else {
                //NK Many chains must be generated for each of the housing lyph instances
                chain.isTemplate = true;
            }

            housingLyph.namespace = housingLyph.namespace || getRefNamespace(housingLyph, parentGroup.namespace);
            housingLyph.fullID = getFullID(housingLyph.namespace, housingLyph.id);
            //Coalescence is always defined with the main housing lyph
            if (level.conveyingLyph) {
                let lyphCoalescence = genResource({
                    [$Field.id]: getGenID(housingLyph.id, $Prefix.coalescence, level.conveyingLyph),
                    [$Field.topology]: Coalescence.COALESCENCE_TOPOLOGY.EMBEDDING,
                    [$Field.lyphs]: [housingLyph.fullID, level.conveyingLyph]
                }, "chainModel.embedToHousingLyphs (Coalescence)");
                parentGroup.coalescences = parentGroup.coalescences || [];
                parentGroup.coalescences.push(lyphCoalescence);
            } else {
                logger.warn($LogMsg.CHAIN_NO_COALESCENCE, housingLyph.fullID, level.id);
            }
        }
    }

    static replicateToHousingLyphSubtypes(parentGroup, chain) {

        const processOne = (housingLyphTemplateID, startLayer) => {
            let housingLyphTemplate = refToResource(housingLyphTemplateID, parentGroup, $Field.lyphs);
            if (!housingLyphTemplate) {
                logger.error($LogMsg.CHAIN_HOUSING_TEMPLATE_UNDEFINED, chain.id);
                return;
            }
            if (!housingLyphTemplate.layers) {
                logger.error("Housing lyph template with no layers", chain.id);
                return;
            }
            const genChains = [];
            //All descendant specific lyphs
            let subtypes = housingLyphTemplate.isTemplate? findAllDerived(housingLyphTemplate.id, parentGroup.lyphsByID): [housingLyphTemplate];
            subtypes.forEach(lyph => {
                const genChainID = getGenID(chain.id, $Prefix.clone, lyph.id);
                let genChain = {
                    [$Field.id]: genChainID,
                    [$Field.namespace]: parentGroup.namespace,
                    [$Field.lyphTemplate]: chain.lyphTemplate,
                    [$Field.housingLyphs]: [],
                    [$Field.generatedFrom]: chain.id,
                    [$Field.radial]: true
                };
                if (chain.name) {
                    genChain.name = getGenName(chain.name, "in", lyph.name || lyph.id);
                }
                if (chain.levelOntologyTerms) {
                    genChain.levelOntologyTerms = chain.levelOntologyTerms;
                }
                let numLayers = (lyph.layers || []).length;
                let numLevels = numLayers - startLayer;
                if (chain.numLevels) {
                    numLevels = Math.min(chain.numLevels, numLevels);
                }
                for (let i = startLayer; i < startLayer + numLevels; i++) {
                    genChain.housingLyphs.push(getFullID(lyph.namespace, lyph.layers[i]));
                }
                genChains.push(genChain);

            });
            genChains.forEach(genChain => {
                parentGroup.chains.push(genChain);
                this.expandTemplate(parentGroup, genChain);
                this.embedToHousingLyphs(parentGroup, genChain);
            });
        }

        (chain.housingLyphTemplates || []).forEach((lt, i) => {
            let startLayer = 0;
            if ((chain.housingLayers || []).length > i) {
                startLayer = chain.housingLayers[i];
            }
            processOne(lt, startLayer);
        });
    }

    // Determines if a chain housed by lyph layers starts from the outermost layer
    get isHousedReversed(){
        let [startIdx, endIdx] = [-1, -1];
        //Determine whether the chains are aligned from root to leaf or from leaf to root;
        (this.levels || []).forEach((link, i) => {
            if (link.endsIn) {
                const hostLyph = link.endsIn;
                if (i === 0) {
                    startIdx = hostLyph.getLayerIndex();
                } else {
                    endIdx = hostLyph.getLayerIndex();
                }
            }
        });
        return startIdx > endIdx;
    }

    static validateRoots(chains, nodes) {
        const rootNodes = (nodes || []).filter(node => node.rootOf);
        (chains || []).forEach(chain => {
            if (chain::isObject() && !chain.root) {
                if (!rootNodes.find(node => node.rootOf === chain.fullID || node.rootOf === chain.id)) {
                    logger.warn($LogMsg.CHAIN_NO_ROOT_INPUT, chain.fullID || chain.id);
                }
            }
        });
    }

    /**
     * Resize generated chain lyphs to fit into hosting lyphs (housing lyph or its layer)
     * Optionally, adjust lyph sizes to be the same for the entire chain
     * @param sameWidth - boolean parameter to indicate that all chain lyphs should have the same width
     */
    resizeLyphs(sameWidth = true) {
        const MAX_WIDTH = 1000;
        const MIN_WIDTH = 5;
        let minWidth = MAX_WIDTH;
        (this.levels || []).forEach(lnk => {
            let lyph = lnk.conveyingLyph;
            if (!lyph) {
                logger.warn($LogMsg.CHAIN_NO_CONVEYING_LYPH, this.id, lnk.id)
                return;
            }
            if (lyph instanceof Lyph) {
                lyph.updateSize();
                minWidth = Math.min(minWidth, lyph.width);
            }
        });
        if (sameWidth && minWidth < MAX_WIDTH) {
            (this.levels || []).forEach(lnk => lnk.conveyingLyph && (lnk.conveyingLyph.width = Math.max(minWidth, MIN_WIDTH)));
        }
    }

    /**
     * Connect chains that share a source or target via nextChainStartLevels and prevChainEndLevels
     * Note: Housed chains connected via cloned or joint nodes must already have these properties set,
     * hence we do not analyze chain end clones.
     * Note: Chains are connected after relationship synchronization, so we must set both sides
     */
    connect() {
        if ((this.levels || []).length === 0) {
            if (this.housingLyphTemplates) {
                logger.info($LogMsg.CHAIN_TEMPLATE_SKIPPED, this.id);
            } else {
                logger.error($LogMsg.CHAIN_NO_LEVELS, this.id);
            }
            return;
        }

        const connectNeighbor = (host, neighbor, prop) => includeRef(host[prop], neighbor.id, neighbor.namespace);

        if (this.root) {
            (this.root.leafOf || []).forEach(prevChain => prevChain.levels &&
                connectNeighbor(this.levels[0], prevChain.levels[prevChain.levels.length - 1], $Field.prevChainEndLevels));

        } else {
            logger.warn($LogMsg.CHAIN_NO_ROOT, this.id)
        }
        if (this.leaf) {
            (this.leaf.rootOf || []).forEach(nextChain => nextChain.levels &&
                connectNeighbor(this.levels[this.levels.length - 1], nextChain.levels[0], $Field.nextChainStartLevels));
        } else {
            logger.warn($LogMsg.CHAIN_NO_LEAF, this.id)
        }
    }

    /**
     * Returns end anchors for constrained chains (wired or with anchored ends)
     * @returns {{start, end}} a pair of anchors corresponding to the root and the leaf of the chain
     */
    getScaffoldChainEnds() {
        let {start, end} = this.getWireEnds();
        if (!start) {
            start = this.root.anchoredTo;
        }
        if (!end) {
            end = this.leaf.anchoredTo;
        }
        return {start, end};
    }

    /**
     * Returns end anchors for wired chains.
     * @returns {{start, end}} a pair of anchors corresponding to the root and the leaf of the chain
     */
    getWireEnds() {
        let start = this.wiredTo ? this.wiredTo.source : undefined;
        let end = this.wiredTo ? this.wiredTo.target : undefined;
        if (this.startFromLeaf) {
            let tmp = start;
            start = end;
            end = tmp;
        }
        return {start, end};
    }

    /**
     * Checks if the chain end anchoring does not conflict with chain wiring
     * Note: call after scaffold resources are generated
     * @returns {boolean}
     */
    validateAnchoring() {
        if (this.wiredTo) {
            if (!(this.wiredTo instanceof Wire)) {
                logger.error($LogMsg.CHAIN_NO_WIRE, this.id, this.wiredTo);
                return;
            }
            let {start, end} = this.getWireEnds();
            if (this.root && this.root.achoredTo) {
                let id1 = getID(start);
                let id2 = getID(this.root.anchoredTo);
                if (id1 && id2 && id1 !== id2) {
                    logger.error($LogMsg.CHAIN_CONFLICT_ROOT, this.id, id1, id2);
                }
            }
            if (this.leaf && this.leaf.anchoredTo) {
                let id1 = getID(end);
                let id2 = getID(this.leaf.anchoredTo);
                if (id1 && id2 && id1 !== id2) {
                    logger.error($LogMsg.CHAIN_CONFLICT_LEAF, this.id, id1, id2);
                }
            }
        }
        return true;
    }

    /**
     * Checks whether the chain has valid topology, i.e., its lyphs comply with the pattern (BAG+/TUBE, TUBE,..., TUBE, BAG-/TUBE)
     * @returns {boolean} true if the topology is valid, false otherwise
     */
    validateTopology() {
        const n = (this.levels || []).length;
        if (n < 1) {
            return false;
        }
        if (n === 1) {
            return true;
        }
        for (let i = 1; i < n - 1; i++) {
            const lyph = this.levels[i].conveyingLyph;
            if (lyph && (lyph.topology || Lyph.LYPH_TOPOLOGY.TUBE) !== Lyph.LYPH_TOPOLOGY.TUBE) {
                return false;
            }
        }
        const startLyph = this.levels[0].conveyingLyph;
        if (startLyph && [Lyph.LYPH_TOPOLOGY["BAG-"], Lyph.LYPH_TOPOLOGY.BAG, Lyph.LYPH_TOPOLOGY.CYST].includes(startLyph.topology)) {
            return false;
        }
        const endLyph = this.levels[n - 1].conveyingLyph;
        return !(endLyph && [Lyph.LYPH_TOPOLOGY["BAG+"], Lyph.LYPH_TOPOLOGY.BAG2, Lyph.LYPH_TOPOLOGY.CYST].includes(endLyph.topology));
    }

    validateHousedChainRoute() {
        if (this.housingLyphs || this.housingChain) {
            if (!this.levels || this.levels.length < 1) {
                return;
            }
            let firstHost = this.levels[0].endsIn;
            if (firstHost?.isFirstLayer) {
                return;
            }
            for (let i = 1; i < this.levels.length; i++) {
                let hostLyph = this.levels[i].fasciculatesIn;
                if (hostLyph?.isFirstLayer) {
                    //Issue warning
                    logger.warn($LogMsg.CHAIN_WRONG_HOUSING, this.id);
                    return;
                }
            }
        }
    }
}
