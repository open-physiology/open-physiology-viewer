import {Resource} from './resourceModel';
import {logger, $LogMsg} from "./logger";
import {keys, values, uniqBy} from 'lodash-bound';
import {
    $Field,
    $SchemaClass,
    $Prefix,
    COALESCENCE_TOPOLOGY,
    getGenID,
    genResource,
    isIncluded, $Color, mergeGenResource, getGenName, includeRef
} from "./utils";

/**
 * Coalescence model
 * @property lyphs
 * @property chainTopology
 * @property generatedFrom
 */
export class Coalescence extends Resource {

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.class = json.class || $SchemaClass.Coalescence;
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    /**
     * @property EMBEDDING
     * @property CONNECTING
     * @type {Object}
     */
    static COALESCENCE_TOPOLOGY = COALESCENCE_TOPOLOGY;

    /**
     * Replicates coalescences defined on abstract lyphs to their subtypes
     * @param inputModel  - global group/graph (to refer to other resources)
     * @param modelClasses - model resource classes
     */
    createInstances(inputModel, modelClasses) {
        if (this.abstract || !this.lyphs) {
            return;
        }
        let lyphMap = {};

        this.lyphs.forEach(lyphOrMat => {
            if (!lyphOrMat) {
                logger.error($LogMsg.COALESCENCE_NO_LYPH, this.id, this.lyphs);
                return;
            }
            if (lyphOrMat.isTemplate) {
                //TODO find derived lyph instances recursively?
                //TODO do not define coalescences for layers of abstract lyphs?
                lyphMap[lyphOrMat.id] = lyphOrMat.subtypes || [];
            } else {
                if (lyphOrMat.class === $SchemaClass.Material) {
                    lyphMap[lyphOrMat.id] = (inputModel.lyphs || []).filter(e => e.generatedFrom === lyphOrMat);
                }
            }
        });
        if (lyphMap::keys().length > 0) {
            //coalescence was defined on abstract lyphs - generate coalescence instances
            this.lyphs.forEach(lyph => {
                if (!(lyph.id in lyphMap)) {
                    lyphMap[lyph.id] = [lyph];
                }
            });

            let lyphInstances = lyphMap::values();
            let emptySet = lyphInstances.find(lyphs => lyphs.length === 0);
            if (emptySet) {
                logger.warn($LogMsg.COALESCENCE_NO_INSTANCE, this, lyphInstances);
                return;
            }

            const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
            const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

            let coalescingLyphs = cartesian(...lyphInstances);

            coalescingLyphs.forEach((lyphs, i) => {
                let uniqueLyphs = lyphs::uniqBy(e => e.id);
                if (uniqueLyphs.length <= 1) {
                    return;
                }

                //FIXME generated in joint model without namespace (is it a problem?)
                let coalescence = genResource({
                    [$Field.id]: getGenID(this.id, $Prefix.instance, i + 1),
                    [$Field.topology]: this.topology,
                    [$Field.generatedFrom]: this,
                    [$Field.lyphs]: uniqueLyphs
                }, "coalescenceModel.createInstances (Coalescence)");
                let instance = this.constructor.fromJSON(coalescence, modelClasses, inputModel.entitiesByID, inputModel.namespace);

                //it is ok to add newly create coalescences to the parent group coalescence set as they won't be further processed
                inputModel.coalescences.push(instance);
            });
            this.abstract = true;
        }
    }

    /**
     * Validate whether the lyphs in the coalescence template are allowed to coalesce (e.g., lyph layers cannot coalesce with their container, etc.)
     */
    validate() {
        if (this.abstract || !this.lyphs || !this.lyphs[0]) {
            return;
        }
        let lyph = this.lyphs[0];
        this.lyphs.forEach((lyph2, i) => {
            if (i <= 0) {
                return;
            }
            if ((lyph.layerIn && lyph.layerIn.id === lyph2.id) || (lyph2.layerIn && lyph2.layerIn.id === lyph.id)) {
                logger.warn($LogMsg.COALESCENCE_SELF, lyph, lyph2);
            }
            if (this.topology === Coalescence.COALESCENCE_TOPOLOGY.CONNECTING) {
                if (!lyph.axis || !lyph2.axis) {
                    logger.warn($LogMsg.COALESCENCE_NO_AXIS, !lyph.axis ? lyph.id : lyph2.id);
                }
                lyph2.angle = 180; //subordinate coalescing lyph should turn to its master
            }
        })
    }

    /**
     * Checks whether the coalescence resource defines an abstract template (coalescence of abstract lyphs or materials)
     * @returns {boolean}
     */
    get isTemplate() {
        return !!(this.lyphs || []).find(lyphOrMat => lyphOrMat.isTemplate || lyphOrMat.class === $SchemaClass.Material);
    }

    createNodes(group, parentGroup) {
        let nodeID = getGenID($Prefix.node, this.id);
        //If coalescence node exists, do nothing
        if (isIncluded(parentGroup.nodes, nodeID)) return;

        let node = {
            [$Field.id]: nodeID,
            [$Field.name]: this.name,
            [$Field.val]: 5,
            [$Field.fixed]: true,
            [$Field.color]: $Color.Coalescence,
            [$Field.representsCoalescence]: this.fullID
        }
        mergeGenResource(group, parentGroup, node, $Field.nodes);
        (this.lyphs || []).forEach((lyph, i) => {
            let lyphNode = {
                [$Field.id]: getGenID(nodeID, i),
                [$Field.name]: this.name,
                [$Field.invisible]: true,
                [$Field.internalIn]: lyph.fullID
            }
            mergeGenResource(group, parentGroup, lyphNode, $Field.nodes);
            let link = {
                [$Field.id]: getGenID($Prefix.link, this.id, i),
                [$Field.name]: getGenName("Coalescing lyph", i, this.name || this.id),
                [$Field.stroke]: "dashed",
                [$Field.source]: node.id,
                [$Field.target]: lyphNode.id
            }
            mergeGenResource(group, parentGroup, link, $Field.links);
            includeRef(group.lyphs, lyph.fullID);
        });
        return node;
    }

    createNodeGroup(parentGroup) {
        parentGroup.nodes = parentGroup.nodes || [];
        parentGroup.links = parentGroup.links || [];
        parentGroup.groups = parentGroup.groups || [];
        let group = {
            [$Field.id]: getGenID($Prefix.group, "cls", this.id),
            [$Field.name]: getGenName("Coalescence group", this.name || this.id),
            [$Field.hidden]: true,
            [$Field.nodes]: [],
            [$Field.links]: [],
            [$Field.lyphs]: [],
        }
        parentGroup.groups.push(group);
        return group;
    }
}