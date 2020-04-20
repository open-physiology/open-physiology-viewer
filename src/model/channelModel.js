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
    $Field,
    $Color,
    $Prefix
} from "./utils";
import {logger} from './logger';

/**
 * Channel model
 * @property materials
 * @property housingLyphs
 */
export class Channel extends GroupTemplate {

    /**
     * Create membrane channel group
     * @param parentGroup - model resources that may be referred from the template
     * @param channel - channel template in JSON
     */
    static expandTemplate(parentGroup, channel) {
        if (!channel){
            logger.warn("Cannot expand undefined channel template");
            return;
        }

        if (!channel.id) {
            logger.warn(`Skipped channel template - it must have (non-empty) ID!`);
            return;
        }

        channel.group = this.createTemplateGroup(channel, parentGroup);

        //Important: do not change the order of lyphs in this array
        let mcLyphs = [
            {
                [$Field.id]        : "mcInternal",
                [$Field.name]      : "Internal",
                [$Field.supertype] : "mcTemplate",
                [$Field.topology]  : Lyph.LYPH_TOPOLOGY.TUBE,
            },
            {
                [$Field.id]        : "mcMembranous",
                [$Field.name]      : "Membranous",
                [$Field.supertype] : "mcTemplate",
                [$Field.topology]  : Lyph.LYPH_TOPOLOGY.TUBE
            },
            {
                [$Field.id]        : "mcExternal",
                [$Field.name]      : "External",
                [$Field.supertype] : "mcTemplate",
                [$Field.topology]  : Lyph.LYPH_TOPOLOGY.TUBE
            },
            {
                [$Field.id]     : "mcTemplate",
                [$Field.layers] : ["mcContent", "mcWall", "mcOuter"]
            },
            {
                [$Field.id]        : "mcContent",
                [$Field.name]      : "Content",
            },
            {
                [$Field.id]        : "mcWall",
                [$Field.name]      : "Wall",
            },
            {
                [$Field.id]        : "mcOuter",
                [$Field.name]      : "Outer",
            }
        ];
        mcLyphs.forEach(lyph => {
            lyph.isTemplate = true;
            lyph.generated = true;

            //for the first channel, add templates to the parent group
            parentGroup.lyphs = parentGroup.lyphs || [];
            if (!parentGroup.lyphs.find(x => x.id === lyph.id)) {
                parentGroup.lyphs.push(lyph);
            }
        });

        let CHANNEL_LENGTH = 3;

        for (let i = 0; i < CHANNEL_LENGTH + 1; i++) {
            let node = {
                [$Field.id]       : getGenID(channel.id, $Prefix.node, i),
                [$Field.color]    : $Color.Node,
                [$Field.skipLabel]: true,
                [$Field.generated]: true
            };
            mergeGenResource(channel.group, parentGroup, node, $Field.nodes);
        }
        for (let i = 0; i < CHANNEL_LENGTH; i++) {
            let lyph = {
                [$Field.id]       : getGenID(channel.id, $Prefix.lyph, mcLyphs[i].id),
                [$Field.supertype]: mcLyphs[i].id,
                [$Field.generated]: true
            };

            //Each of the three MC segments will convey a Diffusive edge
            //Associate each Diffusive Edge with the material payload

            let link = {
                [$Field.id]           : getGenID(channel.id, $Prefix.link, i + 1),
                [$Field.source]       : channel.group.nodes[i],
                [$Field.target]       : channel.group.nodes[i + 1],
                [$Field.conveyingLyph]: lyph.id,
                [$Field.conveyingType]: channel.conveyingType || Link.PROCESS_TYPE.DIFFUSIVE,
                [$Field.conveyingMaterials]: channel.materials,
                [$Field.color]        : $Color.Link,
                [$Field.generated]    : true
            };
            if (channel.length){
                link.length = channel.length / CHANNEL_LENGTH;
            }

            mergeGenResource(channel.group, parentGroup, lyph, $Field.lyphs);
            mergeGenResource(channel.group, parentGroup, link, $Field.links);
        }

        channel.housingLyphs = channel.housingLyphs || [];

        //This is needed to merge Channel.housighLyphs into Lyph.channels for correct template derivation (lyph templates will pass channels to subtypes)
        channel.housingLyphs.forEach(lyphRef => {
            let lyph = findResourceByID(parentGroup.lyphs, lyphRef);
            if (!lyph) {
                logger.warn("Housing lyph not found while processing channel group", lyphRef);
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
            logger.warn("Cannot create channel instances: canonical group not found!");
            return;
        }

        //This is needed to merge Lyph.channels for generated lyphs back to Channel.housingLyph
        (parentGroup.lyphs||[]).forEach(lyph => {
            if (lyph.channels && lyph.channels.includes(channel.id) && !channel.housingLyphs.includes(lyph.id)) {
                logger.info("Found derivative of a housing lyph", lyph.id);
                channel.housingLyphs.push(lyph.id);
            }
        });

        (channel.housingLyphs||[]).forEach(lyphRef => {
            logger.info("Processing channel instance for lyph", lyphRef);
            let lyph = findResourceByID(parentGroup.lyphs, lyphRef);

            if (!lyph) {
                logger.warn("Housing lyph not found while creating instances", lyphRef);
                return;
            }

            if ((lyph.layers||[]).length !== (channel.group.links||[]).length) {
                logger.warn("The number of layers in the housing lyph does not match the number of links in its membrane channel",
                    lyph, (lyph.layers||[]).length, (channel.group.links||[]).length);
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
            let instance = {
                [$Field.id]        : getGenID(channel.id, $Prefix.instance, parentLyph),
                [$Field.generated] : true
            };
            [$Field.links, $Field.nodes, $Field.lyphs].forEach(prop => {
                instance[prop] = instance[prop] || [];
            });

            //Clone first node
            let prev_id = channel.group.nodes[0];
            let baseSrc = findResourceByID(parentGroup.nodes, prev_id);
            if (!baseSrc) {
                logger.error("Failed to find first node of the channel group", prev_id);
                return instance;
            }
            let src = {
                [$Field.id]: getGenID(baseSrc.id, parentLyph),
                [$Field.generated]: true
            };
            Node.clone(baseSrc, src);
            mergeGenResource(instance, parentGroup, src, $Field.nodes);

            //Clone the rest of the chain resources: link, target node, conveying lyph
            prev_id = src.id;
            let links = parentGroup.links.filter(lnk => channel.group.links.includes(lnk.id));
            links.forEach(baseLnk => {
                let baseTrg = findResourceByID(parentGroup.nodes, baseLnk.target);
                let baseLyph = findResourceByID(parentGroup.lyphs, baseLnk.conveyingLyph);
                let [lnk, trg, lyph] = [baseLnk, baseTrg, baseLyph].map(r => (r ? {
                    [$Field.id]: getGenID(r.id, parentLyph),
                    [$Field.generated]: true
                } : r));
                lnk.source = prev_id;
                lnk.target = trg.id;
                lnk.conveyingLyph = lyph ? lyph.id : null;

                Node.clone(baseTrg, trg);
                Link.clone(baseLnk, lnk);
                Lyph.clone(parentGroup.lyphs, baseLyph, lyph);

                mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
                prev_id = lnk.target;
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

            let layers = (lyph.layers || []).filter(e => !!e);
            parentGroup.coalescences = parentGroup.coalescences || [];

            for (let i = 0; i < layers.length; i++) {
                let layer = findResourceByID(parentGroup.lyphs, lyph.layers[i]);
                if (!layer) {
                    logger.warn("Housing lyph layer not found", lyph, layers[i]);
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

                let layerCoalescence = {
                    [$Field.id]       : getGenID(layer.id, $Prefix.channel, instance.lyphs[i]),
                    [$Field.generated]: true,
                    [$Field.topology] : Coalescence.COALESCENCE_TOPOLOGY.EMBEDDING,
                    [$Field.lyphs]    : [layer.id, instance.lyphs[i]]
                };

                parentGroup.coalescences.push(layerCoalescence);
            }
        }
    }

    validate(parentGroup){
        let MEMBRANE_ANNOTATION = "GO:0016020";
        const findMembrane = (array) => (array||[]).find(e => (e.external || []).find(x => (x.id? x.id: x) === MEMBRANE_ANNOTATION));

        let membraneLyph     = findMembrane(parentGroup.lyphs);
        let membraneMaterial = findMembrane(parentGroup.materials);
        if (membraneLyph || membraneMaterial) {
            (this.housingLyphs||[]).forEach(lyph => {
                if ((lyph.layers||[]).length > 1) {
                    let isOk = membraneLyph && lyph.layers[1].isSubtypeOf(membraneLyph.id);
                    if (!isOk) {
                        isOk = membraneMaterial && lyph.layers[1].containsMaterial(membraneMaterial.id);
                        if (!isOk) {
                            logger.warn(`Second layer of a housing lyph is not a (subtype of) membrane (externals - GO:0016020, id - 
                                ${membraneLyph? membraneLyph.id: membraneMaterial.id} ): `, lyph.layers[1]);
                        }
                    }
                    return isOk;
                }
            })
        } else {
            logger.warn("Did not find a reference to a membrane lyph or material - validation of the housing lyphs is skipped");
        }
    }
}
