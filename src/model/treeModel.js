import {GroupTemplate} from './groupTemplateModel';
import {Lyph} from "./shapeModel";
import {Link, Node} from "./visualResourceModel";
import {Coalescence} from "./coalescenceModel";
import {
    mergeGenResource,
    mergeGenResources,
    findResourceByID,
    getNewID,
    getGenID,
    addBorderNode,
    getID,
    compareResources,
    $Field,
    $Color,
    $Prefix
} from "./utils";
import {logger} from './logger';
import {defaults, isObject, isArray, flatten} from 'lodash-bound';

/**
 * Tree model
 * @property numInstances
 * @property branchingFactors
 */
export class Tree extends GroupTemplate {

    /**
     * Generate instances of a given omega tree
     * @param parentGroup - model resources that may be referred from the template
     * @param tree - omega tree object
     */
    static createInstances(parentGroup, tree){
        if (!tree || !tree.chain){
            logger.warn("Cannot create omega tree instances: canonical tree chain undefined!");
            return;
        }

        let chain = findResourceByID(parentGroup.chains, tree.chain);
        if (!chain || !chain.group || !chain.levels){
            logger.warn("Cannot create omega tree instances: canonical tree chain not found or empty");
            return;
        }

        for (let i = 0; i < tree.numInstances; i++){
            let instance  = createInstance(i + 1);
            tree.instances = tree.instances || [];
            tree.instances.push(instance);
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

            let root  = findResourceByID(parentGroup.nodes, chain.root);
            mergeGenResource(instance, parentGroup, root, $Field.nodes);

            let levels = chain.levels || [];

            let levelResources = {};

            for (let i = 0; i < levels.length; i++) {
                let lnk  = findResourceByID(parentGroup.links, levels[i]);
                let trg  = findResourceByID(parentGroup.nodes, lnk.target);
                let lyph = findResourceByID(parentGroup.lyphs, lnk.conveyingLyph);

                if (!lnk) {
                    logger.warn("Failed to find tree level link (created to proceed): ", tree.id, levels[i], i);
                    lnk = {
                        [$Field.id]: levels[i],
                        [$Field.generated]: true
                    };
                }
                if (!trg){
                    logger.warn("Failed to find tree level target node (created to proceed): ", tree.id, lnk.id, lnk.target);
                    trg = {
                        [$Field.id]: lnk.target,
                        [$Field.generated]: true
                    };
                }

                if (lyph){ lyph.create3d = true; }
                levelResources[i] = [[lnk, trg, lyph]];
                mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
            }

            tree.branchingFactors = tree.branchingFactors || [];

            const MAX_GEN_RESOURCES = 1000;
            let count = 0;
            for (let i = 0; i < Math.min(levels.length, tree.branchingFactors.length); i++){
                levelResources[i].forEach((base, m) => {
                    for (let k = 1; k < tree.branchingFactors[i]; k++){ //Instances reuse chain objects
                        if (count > MAX_GEN_RESOURCES){
                            throw new Error(`Reached maximum allowed number of generated resources per tree instance (${MAX_GEN_RESOURCES})!`);
                        }
                        let prev_id = base[0].source;
                        for (let j = i; j < levels.length; j++) {
                            let baseResources = levelResources[j][0];
                            let [lnk, trg, lyph] = baseResources.map(r => (r ? { [$Field.id] : getGenID(r.id, i+1, m+1, instanceIndex) }: r));
                            lnk.target = trg.id;
                            lnk.conveyingLyph = lyph ? lyph.id : null;
                            lnk.source = prev_id;
                            Link.clone(baseResources[0], lnk);
                            Node.clone(baseResources[1], trg);
                            Lyph.clone(parentGroup.lyphs, baseResources[2], lyph);
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


