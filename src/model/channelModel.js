import {GroupTemplate} from './groupTemplateModel';
import {Lyph} from "./shapeModel";
import {Node} from "./verticeModel";
import {Link} from "./edgeModel";
import {Coalescence} from "./coalescenceModel";
import {
    $Field,
    $Color,
    $Prefix,
    $SchemaClass,
    mergeGenResource,
    mergeGenResources,
    getGenID,
    addBorderNode,
    refToResource,
    getNewID,
    genResource
} from "./utils";
import {logger, $LogMsg} from './logger';
import {isObject, values} from "lodash-bound";

/**
 * Channel model
 * @property materials
 * @property housingLyphs
 */
export class Channel extends GroupTemplate {

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.class = json.class || $SchemaClass.Channel;
        return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    static validateTemplate(channel) {
        if (!channel) {
            logger.warn($LogMsg.CHANNEL_UNDEFINED);
            return false;
        }
        if (!channel.id) {
            logger.warn($LogMsg.CHANNEL_NO_ID);
            return false;
        }
        return true;
    }

    static defineChannelLyphTemplates(parentGroup){
        //If there are channels in the model, add predefined channel lyph templates
        let channels = parentGroup.channelsByID? parentGroup.channelsByID::values(): [];
        if (channels.length > 0) {
            //Important: do not change the order of lyphs in this array
            let mcLyphs = [
                {
                    [$Field.id]: "mcInternal",
                    [$Field.name]: "Internal",
                    [$Field.supertype]: "mcTemplate",
                    [$Field.topology]: Lyph.LYPH_TOPOLOGY.TUBE,
                },
                {
                    [$Field.id]: "mcMembranous",
                    [$Field.name]: "Membranous",
                    [$Field.supertype]: "mcTemplate",
                    [$Field.topology]: Lyph.LYPH_TOPOLOGY.TUBE
                },
                {
                    [$Field.id]: "mcExternal",
                    [$Field.name]: "External",
                    [$Field.supertype]: "mcTemplate",
                    [$Field.topology]: Lyph.LYPH_TOPOLOGY.TUBE
                },
                {
                    [$Field.id]: "mcTemplate",
                    [$Field.layers]: ["mcContent", "mcWall", "mcOuter"]
                },
                {
                    [$Field.id]: "mcContent",
                    [$Field.name]: "Content",
                },
                {
                    [$Field.id]: "mcWall",
                    [$Field.name]: "Wall",
                },
                {
                    [$Field.id]: "mcOuter",
                    [$Field.name]: "Outer",
                }
            ];
            parentGroup.lyphs = parentGroup.lyphs || [];
            parentGroup.lyphsByID = parentGroup.lyphsByID || {};
            mcLyphs.forEach(lyph => {
                lyph.isTemplate = true;
                lyph = genResource(lyph, "channelModel.defineChannelLyphTemplates (Lyph)");
                parentGroup.lyphs.push(lyph);
                parentGroup.lyphsByID[lyph.id] = lyph;
            });
            parentGroup._mcLyphs = mcLyphs;
            channels.forEach(channel => {
                 if (channel::isObject()) {
                     this.expandTemplate(parentGroup, channel, mcLyphs);
                 }
            })
        }
    }

    /**
     * Create membrane channel group
     * @param parentGroup - model resources that may be referred from the template
     * @param channel - channel template in JSON
     * @param mcLyphs - channel lph templates
     */
    static expandTemplate(parentGroup, channel, mcLyphs) {
        if (!this.validateTemplate(channel)) {
            return;
        }
        channel.id = channel.id || getGenID($Prefix.channel, getNewID());
        channel.group = this.createTemplateGroup(channel, parentGroup);

        let CHANNEL_LENGTH = 3;

        for (let i = 0; i < CHANNEL_LENGTH + 1; i++) {
            let node = genResource({
                [$Field.id]       : getGenID(channel.id, $Prefix.node, i),
                [$Field.color]    : $Color.InternalNode,
                [$Field.val]      : 1,
                [$Field.skipLabel]: true
            }, "channelModel.expandTemplate (Node)");
            mergeGenResource(channel.group, parentGroup, node, $Field.nodes);
        }
        for (let i = 0; i < CHANNEL_LENGTH; i++) {
            let lyph = genResource({
                [$Field.id]       : getGenID(channel.id, $Prefix.lyph, mcLyphs[i].id),
                [$Field.supertype]: mcLyphs[i].id,
                [$Field.skipLabel]: true
            }, "channelModel.expandTemplate (Lyph)");

            //Each of the three MC segments will convey a Diffusive edge
            //Associate each Diffusive Edge with the material payload

            let link = genResource({
                [$Field.id]                : getGenID(channel.id, $Prefix.link, i + 1),
                [$Field.source]            : channel.group.nodes[i],
                [$Field.target]            : channel.group.nodes[i + 1],
                [$Field.conveyingLyph]     : lyph.id,
                [$Field.conveyingType]     : channel.conveyingType || Link.PROCESS_TYPE.DIFFUSIVE,
                [$Field.conveyingMaterials]: channel.materials,
                [$Field.color]             : $Color.Link,
                [$Field.skipLabel]         : true
            }, "channelModel.expandTemplate.1 (Link)");

            if (channel.length) {
                link.length = channel.length / CHANNEL_LENGTH;
            }
            mergeGenResource(channel.group, parentGroup, lyph, $Field.lyphs);
            mergeGenResource(channel.group, parentGroup, link, $Field.links);
        }

        channel.housingLyphs = channel.housingLyphs || [];

        //This is needed to merge Channel.housighLyphs into Lyph.channels for correct template derivation (lyph templates will pass channels to subtypes)
        channel.housingLyphs.forEach(lyphRef => {
            let lyph = refToResource(lyphRef, parentGroup, $Field.lyphs);
            if (!lyph) {
                logger.warn($LogMsg.CHANNEL_NO_HOUSING_LYPH, lyphRef, channel.id);
                return;
            }
            lyph.channels = lyph.channels || [];
            if (!lyph.channels.find(x => x === channel.id || x.id === channel.id)) {
                lyph.channels.push(channel.id);
            }
        });
    }

    /**
     * Generate instances of channel groups for every conveyed housing lyph
     * @param parentGroup - model resources that may be referred from the template
     * @param channel - channel object
     */
    static createInstances(parentGroup, channel) {

        if (!channel.group) {
            logger.warn($LogMsg.CHANNEL_NO_GROUP);
            return;
        }

        //This is needed to merge Lyph.channels for generated lyphs back to Channel.housingLyph
        (parentGroup.lyphs || []).forEach(lyph => {
            if (lyph.channels && lyph.channels.includes(channel.id) && !channel.housingLyphs.includes(lyph.id)) {
                channel.housingLyphs.push(lyph.id);
            }
        });

        (channel.housingLyphs || []).forEach(lyphRef => {
            let lyph = refToResource(lyphRef, parentGroup, $Field.lyphs);
            if (!lyph) {
                logger.warn($LogMsg.CHANNEL_NO_HOUSING_LYPH, lyphRef, channel.id);
                return;
            }

            if ((lyph.layers || []).length !== (channel.group.links || []).length) {
                logger.warn($LogMsg.CHANNEL_WRONG_NUM_LAYERS,
                    lyph, (lyph.layers || []).length, (channel.group.links || []).length);
                return;
            }

            if (lyph.isTemplate) {
                embedToHousingLyph(lyph, channel.group);
            } else {
                let instance = createInstance(lyph.id);
                channel.instances = channel.instances || [];
                channel.instances.push(instance);
                parentGroup.groups.push(instance);
                embedToHousingLyph(lyph, instance);
            }
        });

        /**
         * Create a channel instance
         * @param parentLyph - instance id/name parentLyph
         * @returns Group
         */
        function createInstance(parentLyph) {
            let instance = genResource({
                [$Field.id]        : getGenID(channel.id, $Prefix.instance, parentLyph),
                [$Field.skipLabel] : true
            }, "channelMode.createInstance (Group)");
            [$Field.links, $Field.nodes, $Field.lyphs].forEach(prop => {
                instance[prop] = instance[prop] || [];
            });

            //Clone first node
            let prevID = channel.group.nodes[0];
            let baseSrc = refToResource(prevID, parentGroup, $Field.nodes);
            if (!baseSrc) {
                logger.error($LogMsg.CHANNEL_NO_NODE, prevID);
                return instance;
            }
            let src = genResource({
                [$Field.id]: getGenID(baseSrc.id, parentLyph),
                [$Field.skipLabel]: true
            }, "channelMode.createInstance (Node)");
            Node.clone(baseSrc, src);
            mergeGenResource(instance, parentGroup, src, $Field.nodes);

            //Clone the rest of the chain resources: link, target node, conveying lyph
            prevID = src.id;
            parentGroup.links.forEach(baseLnk => {
                let baseTrg = refToResource(baseLnk.target, parentGroup, $Field.nodes);
                let baseLyph = refToResource(baseLnk.conveyingLyph, parentGroup, $Field.lyphs);
                let [lnk, trg, lyph] = [baseLnk, baseTrg, baseLyph].map(r => (
                    r ? genResource({
                            [$Field.id]: getGenID(r.id, parentLyph),
                            [$Field.skipLabel]: true
                        }, "channelModel.createInstance (Link, Node, Lyph")
                      : r));
                lnk.source = prevID;
                lnk.target = trg.id;
                lnk.conveyingLyph = lyph ? lyph.id : null;

                Node.clone(baseTrg, trg);
                Link.clone(baseLnk, lnk);
                Lyph.clone(parentGroup, baseLyph, lyph);

                mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
                prevID = lnk.target;
            });

            return instance;
        }

        /**
         * position channel link nodes on borders of the housing lyph layers
         * @param lyph - housing lyph
         * @param instance - channel instance group
         */
        function embedToHousingLyph(lyph, instance) {
            //Embed channel to the housing lyph
            let layers = (lyph.layers || []).filter(e => e);
            parentGroup.coalescences = parentGroup.coalescences || [];

            for (let i = 0; i < layers.length; i++) {
                let layer = refToResource(lyph.layers[i], parentGroup, $Field.lyphs);
                if (!layer) {
                    logger.warn($LogMsg.CHANNEL_NO_HOUSING_LAYER, lyph, layers[i]);
                    return;
                }

                if (!lyph.isTemplate) {
                    layer.border = layer.border || {};
                    layer.border.borders = layer.border.borders || [{}, {}, {}, {}];
                    addBorderNode(layer.border.borders[0], instance.nodes[i]);
                    if (i === layers.length - 1) {
                        addBorderNode(layer.border.borders[2], instance.nodes[instance.nodes.length - 1]);
                    }
                }

                let layerCoalescence = genResource({
                    [$Field.id]       : getGenID(layer.id, $Prefix.channel, instance.lyphs[i]),
                    [$Field.topology] : Coalescence.COALESCENCE_TOPOLOGY.EMBEDDING,
                    [$Field.lyphs]    : [layer.id, instance.lyphs[i]]
                }, "channelModel.embedToHousingLyph (Coalescence)");

                parentGroup.coalescences.push(layerCoalescence);
            }
        }
    }

    validate(parentGroup) {
        const MEMBRANE_ANNOTATION = "GO:0016020";
        const membrane = parentGroup.entitiesByID[MEMBRANE_ANNOTATION];
        if (membrane) {
            let membraneMaterials = (membrane.annotates || []).filter(r => r.class === $SchemaClass.Material);
            let membraneLyphs = (membrane.annotates || []).filter(r => r.class === $SchemaClass.Lyph);
            (this.housingLyphs || []).forEach(lyph => {
                if ((lyph.layers || []).length > 1) {
                    let isOk = (membraneLyphs || []).find(membraneLyph => lyph.layers[1].isSubtypeOf(membraneLyph.id));
                    if (!isOk) {
                        isOk = (membraneMaterials || []).find(membraneMaterial => lyph.layers[1].containsMaterial(membraneMaterial.id))
                    }
                    if (!isOk){
                        logger.warn($LogMsg.CHANNEL_WRONG_LAYER, lyph.layers[1]);
                    }
                } else {
                    logger.warn($LogMsg.CHANNEL_VALIDATION_SKIPPED);
                }
            })
        } else {
            logger.warn($LogMsg.CHANNEL_VALIDATION_SKIPPED, "No membrane (GO:0016020) definition!");
        }
    }
}
