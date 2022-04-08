import {GroupTemplate} from './groupTemplateModel';
import {Lyph} from "./shapeModel";
import {Link} from "./edgeModel";
import {
    mergeGenResource,
    findResourceByID,
    getNewID,
    getGenID,
    addBorderNode,
    $Field,
    $Prefix, $SchemaClass
} from "./utils";
import {logger, $LogMsg} from './logger';

/**
 * Villus model
 * @property numLayers
 * @property numLevels
 * @property villusOf
 */
export class Villus extends GroupTemplate{

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.Villus;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    static expandTemplate(parentGroup, villus){
        if (!villus) {
            logger.warn($LogMsg.VILLUS_UNDEFINED);
            return;
        }

        if (!villus.villusOf){
            logger.warn($LogMsg.VILLUS_NO_HOST, villus);
            return;
        }

        let lyph = findResourceByID(parentGroup.lyphs, villus.villusOf);
        if (!lyph){
            logger.warn($LogMsg.VILLUS_NO_HOST_FOUND, villus);
            return;
        }

        if (lyph.isTemplate){
            logger.warn($LogMsg.VILLUS_ABSTRACT_HOST, lyph);
            return;
        }

        if (villus.numLayers > lyph.layers.length){
            logger.warn($LogMsg.VILLUS_TOO_LONG, lyph);
            return;
        }

        villus.numLayers = villus.numLayers || 0;
        villus.numLevels = villus.numLevels || 1;

        let prev = null;
        villus.id = villus.id || getNewID();
        villus.group = GroupTemplate.createTemplateGroup(villus, parentGroup);

        let lyphLayers = lyph.layers.map(layer2 => findResourceByID(parentGroup.lyphs, layer2));
        let sourceLayers = lyphLayers.slice(0, villus.numLayers).reverse();

        for (let i = villus.numLayers - 1; i >= 0; i--){
            let layer = lyphLayers[i];
            if (!layer){
                logger.warn($LogMsg.VILLUS_NO_HOST_LAYER, lyph.layers[i]);
                return;
            }
            layer.border = layer.border || {};
            layer.border.borders = layer.border.borders || [{}, {}, {}, {}];

            let node1 = (i === villus.numLayers - 1)? {
                [$Field.id]: getGenID($Prefix.villus, $Prefix.node, layer.id, 0),
                [$Field.skipLabel]: true,
                [$Field.generated]: true
            }: prev;

            if (i === villus.numLayers - 1){
                addBorderNode(layer.border.borders[2], node1.id);
                mergeGenResource(villus.group, parentGroup, node1, $Field.nodes);
            }
            let node2 = {
                [$Field.id]: getGenID($Prefix.villus, $Prefix.node, lyph.id, layer.id, i + 1),
                [$Field.skipLabel]: true,
                [$Field.generated]: true
            };
            addBorderNode(layer.border.borders[0], node2.id);
            mergeGenResource(villus.group, parentGroup, node2, $Field.nodes);

            let villus_layers = sourceLayers.slice(0, villus.numLayers - i).reverse().map(sourceLyph => {
                let targetLyph =  {
                    [$Field.id] : getGenID(lyph.id, layer.id, sourceLyph.id),
                    [$Field.skipLabel]: true,
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
                [$Field.id]        : getGenID($Prefix.villus, $Prefix.lyph, lyph.id, layer.id),
                [$Field.layers]    : villus_layers.reverse(),
                [$Field.topology]  : (i===0)? Lyph.LYPH_TOPOLOGY.BAG : Lyph.LYPH_TOPOLOGY.TUBE,
                [$Field.scale]     : {[$Field.width]: 40 * (villus.numLayers - i), [$Field.height]: 80},
                [$Field.skipLabel] : true,
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
                [$Field.skipLabel]     : true,
                [$Field.generated]     : true
            };
            mergeGenResource(villus.group, parentGroup, link, $Field.links);
            prev = node2;
        }
        //Assign villus to the last generated lyph
    }
}