import {GroupTemplate} from './groupTemplateModel';
import {Lyph} from "./shapeModel";
import {Link} from "./visualResourceModel";
import {
    mergeGenResource,
    findResourceByID,
    getNewID,
    getGenID,
    addBorderNode,
    $Field,
    $Prefix
} from "./utils";
import {logger} from './logger';

/**
 * Villus model
 * @property numLayers
 * @property numLevels
 * @property villusOf
 */
export class Villus extends GroupTemplate{

    static expandTemplate(parentGroup, villus){
        if (!villus) {
            logger.warn("Cannot expand undefined villus template");
            return;
        }

        if (!villus.villusOf){
            logger.warn("Incomplete villus definition - hosting lyph is missing", villus);
            return;
        }

        let lyph = findResourceByID(parentGroup.lyphs, villus.villusOf);
        if (!lyph){
            logger.error("Could not find the villus hosting lyph definition in the parent group", villus);
            return;
        }

        if (lyph.isTemplate){
            logger.warn("Skipping generation of villus group for lyph template", lyph);
            return;
        }

        if (villus.numLayers > lyph.layers.length){
            logger.warn(`Skipping incorrect villus template: number of villus layers cannot exceed the number of layers in the lyph`, lyph);
            return;
        }

        villus.numLayers = villus.numLayers || 0;
        villus.numLevels = villus.numLevels || 1;

        let prev;
        villus.id = villus.id || getNewID();
        villus.group = GroupTemplate.createTemplateGroup(villus, parentGroup);

        let lyphLayers = lyph.layers.map(layer2 => findResourceByID(parentGroup.lyphs, layer2));
        let sourceLayers = lyphLayers.slice(0, villus.numLayers).reverse();

        for (let i = villus.numLayers - 1; i >= 0; i--){
            let layer = lyphLayers[i];
            if (!layer){
                logger.error(`Error while generating a villus object - could not locate a layer resource: `, lyph.layers[i]);
                return;
            }
            layer.border = layer.border || {};
            layer.border.borders = layer.border.borders || [{}, {}, {}, {}];

            let node1 = (i === villus.numLayers - 1)? {
                [$Field.id]: getGenID($Prefix.villus, $Prefix.node, layer.id, 0),
                [$Field.generated]: true
            }: prev;

            if (i === villus.numLayers - 1){
                addBorderNode(layer.border.borders[2], node1.id);
                mergeGenResource(villus.group, parentGroup, node1, $Field.nodes);
            }
            let node2 = {
                [$Field.id]: getGenID($Prefix.villus, $Prefix.node, lyph.id, layer.id, i + 1),
                [$Field.generated]: true
            };
            addBorderNode(layer.border.borders[0], node2.id);
            mergeGenResource(villus.group, parentGroup, node2, $Field.nodes);

            let villus_layers = sourceLayers.slice(0, villus.numLayers - i).reverse().map(sourceLyph => {
                let targetLyph =  {
                    [$Field.id] : getGenID(lyph.id, layer.id, sourceLyph.id),
                    [$Field.generated] : true
                };
                Lyph.clone(parentGroup.lyphs, sourceLyph, targetLyph);
                return targetLyph;
            });

            villus_layers.forEach(newLayer => {
                mergeGenResource(villus.group, parentGroup, newLayer, $Field.lyphs);
            });
            villus_layers = villus_layers.map(x => x.id);

            let villusLyph = {
                [$Field.id]      : getGenID($Prefix.villus, $Prefix.lyph, lyph.id, layer.id),
                [$Field.layers]  : villus_layers.reverse(),
                [$Field.topology]: (i===0)? Lyph.LYPH_TOPOLOGY.BAG : Lyph.LYPH_TOPOLOGY.TUBE,
                [$Field.scale]   : {"width": 40 * (villus.numLayers - i), "height": 80},
                [$Field.generated] : true
            };
            // if (i === 0 && villus.numLevels > 0){
            //     villus = {
            //         "numLayers": villus.numLayers,
            //         "numLevels": villus.numLevels - 1
            //     }
            // }

            mergeGenResource(villus.group, parentGroup, villusLyph, $Field.lyphs);

            let link = {
                [$Field.id]            : getGenID($Prefix.villus, $Prefix.link, layer.id),
                [$Field.source]        : node1.id,
                [$Field.target]        : node2.id,
                [$Field.conveyingLyph] : villusLyph.id,
                [$Field.geometry]      : Link.LINK_GEOMETRY.INVISIBLE,
                [$Field.generated]     : true
            };
            mergeGenResource(villus.group, parentGroup, link, $Field.links);
            prev = node2;
        }
        //Assign villus to the last generated lyph
    }
}