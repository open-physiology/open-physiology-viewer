import {GroupTemplate} from './groupTemplateModel';
import {Lyph} from "./shapeModel";
import {Node} from "./verticeModel";
import {Link} from "./edgeModel";

import {
    mergeGenResource,
    mergeGenResources,
    refToResource,
    getGenID,
    $Field,
    $Prefix, $SchemaClass
} from "./utils";
import {logger, $LogMsg} from './logger';

/**
 * Tree model
 * @property numInstances
 * @property branchingFactors
 */
export class Tree extends GroupTemplate {

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.Tree;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    /**
     * Generate instances of a given omega tree
     * @param parentGroup - model resources that may be referred from the template
     * @param tree - omega tree object
     */
    static createInstances(parentGroup, tree){
        if (!tree || !tree.chain){
            logger.warn($LogMsg.TREE_CHAIN_UNDEFINED, tree.id);
            return;
        }

        let chain = refToResource(tree.chain, parentGroup, $Field.chains);
        if (!chain || !chain.group || !chain.levels){
            logger.warn($LogMsg.TREE_NO_CHAIN, tree.id, tree.chain);
            return;
        }

        for (let i = 0; i < tree.numInstances; i++){
            let instance  = createInstance(i + 1);
            tree.instances = tree.instances || [];
            tree.instances.push(instance.id);
            parentGroup.groups.push(instance);
        }

        /**
         * Create a tree instance
         * @param instanceIndex - instance id/name instanceIndex
         * @returns Group
         */
        function createInstance(instanceIndex){
            tree.id = tree.id || getGenID(chain.id, $Prefix.tree);

            let instance = {
                [$Field.id]        : getGenID(tree.id, instanceIndex),
                [$Field.generated] : true
            };
            [$Field.links, $Field.nodes, $Field.lyphs].forEach(prop => {
                instance[prop] = instance[prop] || [];
            });

            let root = refToResource(chain.root, parentGroup, $Field.nodes);
            mergeGenResource(instance, parentGroup, root, $Field.nodes);

            let levels = chain.levels || [];

            let levelResources = {};

            for (let i = 0; i < levels.length; i++) {
                let lnk  = refToResource(levels[i], parentGroup, $Field.links);
                let trg  = refToResource(lnk.target, parentGroup, $Field.nodes)
                let lyph = refToResource(lnk.conveyingLyph, parentGroup, $Field.lyphs)

                if (!lnk) {
                    logger.info($LogMsg.TREE_NO_LEVEL_LINK, tree.id, levels[i], i);
                    lnk = {
                        [$Field.id]: levels[i],
                        [$Field.skipLabel]: true,
                        [$Field.generated]: true
                    };
                }
                if (!trg){
                    logger.info($LogMsg.TREE_NO_LEVEL_TARGET, tree.id, lnk.id, lnk.target);
                    trg = {
                        [$Field.id]: lnk.target,
                        [$Field.skipLabel]: true,
                        [$Field.generated]: true
                    };
                }

                if (lyph){ lyph.create3d = true; }
                levelResources[i] = [[lnk, trg, lyph]];
                mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
            }

            tree.branchingFactors = tree.branchingFactors || [];

            const MAX_GEN_RESOURCES = 1024;
            let count = 0;
            for (let i = 0; i < Math.min(levels.length, tree.branchingFactors.length); i++){
                levelResources[i].forEach((base, m) => {
                    for (let k = 1; k < tree.branchingFactors[i]; k++){ //Instances reuse chain objects
                        if (count > MAX_GEN_RESOURCES){
                            throw new Error($LogMsg.TREE_GEN_LIMIT, MAX_GEN_RESOURCES);
                        }
                        let prev_id = base[0].source;
                        for (let j = i; j < levels.length; j++) {
                            let baseResources = levelResources[j][0];
                            let [lnk, trg, lyph] = baseResources.map(r => (r ? {
                                [$Field.id] : getGenID(r.id, i+1, m+1, k, instanceIndex),
                                [$Field.skipLabel]: true,
                                [$Field.generated]: true
                            }: r));
                            lnk.target = trg.id;
                            lnk.conveyingLyph = lyph ? lyph.id : null;
                            lnk.source = prev_id;
                            Link.clone(baseResources[0], lnk);
                            Node.clone(baseResources[1], trg);
                            Lyph.clone(parentGroup, baseResources[2], lyph);
                            lyph.topology = baseResources[2].topology;
                            mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
                            levelResources[j].push([lnk, trg, lyph]);
                            prev_id = lnk.target;
                            count += 3;
                        }
                    }
                })
            }
            return instance;
        }
    }
}


