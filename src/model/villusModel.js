import {GroupTemplate} from './groupTemplateModel';
import {Lyph} from "./shapeModel";
import {Link} from "./edgeModel";
import {
    mergeGenResource,
    getNewID,
    getGenID,
    addBorderNode,
    $Field,
    $Prefix, $SchemaClass, refToResource, genResource
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

        let lyph = refToResource(villus.villusOf, parentGroup, $Field.lyphs);
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

        let lyphLayers = lyph.layers.map(layer2 => refToResource(layer2, parentGroup, $Field.lyphs));
        let sourceLayers = lyphLayers.slice(0, villus.numLayers).reverse();

        for (let i = villus.numLayers - 1; i >= 0; i--){
            let layer = lyphLayers[i];
            if (!layer){
                logger.warn($LogMsg.VILLUS_NO_HOST_LAYER, lyph.layers[i]);
                return;
            }
            layer.border = layer.border || {};
            layer.border.borders = layer.border.borders || [{}, {}, {}, {}];

            let node1 = (i === villus.numLayers - 1)? genResource({
                [$Field.id]: getGenID($Prefix.villus, $Prefix.node, layer.id, 0),
                [$Field.skipLabel]: true
            }, "villusModel.expandTemplate.1 (Node)"): prev;

            if (i === villus.numLayers - 1){
                addBorderNode(layer.border.borders[2], node1.id);
                mergeGenResource(villus.group, parentGroup, node1, $Field.nodes);
            }
            let node2 = genResource({
                [$Field.id]: getGenID($Prefix.villus, $Prefix.node, lyph.id, layer.id, i + 1),
                [$Field.skipLabel]: true
            }, "villusModel.expandTemplate.2 (Node)");
            addBorderNode(layer.border.borders[0], node2.id);
            mergeGenResource(villus.group, parentGroup, node2, $Field.nodes);

            let villus_layers = sourceLayers.slice(0, villus.numLayers - i).reverse().map(sourceLyph => {
                let targetLyph = genResource({
                    [$Field.id] : getGenID(lyph.id, layer.id, sourceLyph.id),
                    [$Field.skipLabel]: true
                }, "villusModel.expandTemplate (Lyph)");
                Lyph.clone(parentGroup, sourceLyph, targetLyph);
                return targetLyph;
            });

            villus_layers.forEach(newLayer => mergeGenResource(villus.group, parentGroup, newLayer, $Field.lyphs));
            villus_layers = villus_layers.map(x => x.id);

            let villusLyph = genResource({
                [$Field.id]        : getGenID($Prefix.villus, $Prefix.lyph, lyph.id, layer.id),
                [$Field.layers]    : villus_layers.reverse(),
                [$Field.topology]  : (i===0)? Lyph.LYPH_TOPOLOGY.BAG : Lyph.LYPH_TOPOLOGY.TUBE,
                [$Field.scale]     : {[$Field.width]: 40 * (villus.numLayers - i), [$Field.height]: 80},
                [$Field.skipLabel] : true
            }, "villusModel.expandTemplate.2 (Lyph)");

            mergeGenResource(villus.group, parentGroup, villusLyph, $Field.lyphs);

            let link = genResource({
                [$Field.id]            : getGenID($Prefix.villus, $Prefix.link, layer.id),
                [$Field.source]        : node1.id,
                [$Field.target]        : node2.id,
                [$Field.conveyingLyph] : villusLyph.id,
                [$Field.geometry]      : Link.LINK_GEOMETRY.INVISIBLE,
                [$Field.skipLabel]     : true
            }, "villusModel.expandTemplate (Link)");
            mergeGenResource(villus.group, parentGroup, link, $Field.links);
            prev = node2;
        }
        //Assign villus to the last generated lyph
    }
}