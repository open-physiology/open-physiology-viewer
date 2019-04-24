import { Resource } from './resourceModel';
import { Group } from './groupModel';
import { LYPH_TOPOLOGY, Lyph } from "./shapeModel";
import { PROCESS_TYPE, Link, Node } from "./visualResourceModel";
import { COALESCENCE_TOPOLOGY } from "./coalescenceModel";
import { mergeGenResource, mergeGenResources, findResourceByID, generateGroup } from "./utils";
import {logger} from './logger';

/**
 * Channel model
 * @property group
 * @property materials
 * @property housingLyphs
 */
export class Channel extends Resource {

    /**
     * Create membrane channel group
     * @param parentGroup
     * @param channel
     */
  static expandTemplate(parentGroup, channel) {
      if ( !channel.id){
          logger.warn(`Skipped channel template - it must have (non-empty) ID!`); return;
      }

      channel.group = Group.createTemplateGroup(channel, parentGroup);

      let mcLyphs = [
          {
              "id"        : "mcInternal",
              "name"      : "Internal",
              "isTemplate": true,
              "supertype" : "mcTemplate",
              "topology"  : LYPH_TOPOLOGY.TUBE
          },
          {
              "id"        : "mcMembranous",
              "name"      : "Membranous",
              "isTemplate": true,
              "supertype" : "mcTemplate",
              "topology"  : LYPH_TOPOLOGY.TUBE
          },
          {
              "id"        : "mcExternal",
              "name"      : "External",
              "isTemplate": true,
              "supertype" : "mcTemplate",
              "topology"  : LYPH_TOPOLOGY.TUBE
          },
          {
              "id"        : "mcTemplate",
              "isTemplate": true,
              "layers"    : ["mcContent", "mcWall", "mcOuter"]
          },
          {
              "id"        : "mcContent",
              "name"      : "Content",
              "isTemplate": true
          },
          {
              "id"        : "mcWall",
              "name"      : "Wall",
              "isTemplate": true
          },
          {
              "id"        : "mcOuter",
              "name"      : "Outer",
              "isTemplate": true
          }
      ];

      //for the first channel, add templates to the parent group
      mcLyphs.forEach(lyph => {
          lyph.generated = true;
          parentGroup.lyphs = parentGroup.lyphs || [];
          if (!parentGroup.lyphs.find(x => x.id === lyph.id)){
              parentGroup.lyphs.push(lyph);
          }
      });

      let CHANNEL_LENGTH = 3;

      for (let i = 0; i < CHANNEL_LENGTH + 1; i++){
          let node = {
              "id"        : channel.id + "_node" + i,
              "name"      : channel.name + ": node " + i,
              "color"     : "#000",
              "skipLabel" : true,
              "generated" : true
          };
          mergeGenResource(channel.group, parentGroup, node, "nodes");
      }
      for (let i = 0; i < CHANNEL_LENGTH; i++){
          let lyph = {
              "id"        : channel.id + "_" + mcLyphs[i].id,
              "name"      : `${mcLyphs[i].name} of ${channel.name || "?"}`,
              "supertype" : mcLyphs[i].id,
              "generated" : true
          };

          //Each of the three MC segments will convey a Diffusive edge
          //Associate each Diffusive Edge with the material payload

          let link = {
              "id"            : channel.id + "_lnk" + (i+1),
              "name"          : `${channel.name || ""}: level ${i}`,
              "source"        : channel.group.nodes[i],
              "target"        : channel.group.nodes[i + 1],
              "conveyingLyph" : lyph.id,
              "conveyingType" : PROCESS_TYPE.DIFFUSIVE,
              "conveyingMaterials" : channel.materials,
              "color"        : "#000",
              "generated"     : true
          };
          mergeGenResource(channel.group, parentGroup, lyph, "lyphs");
          mergeGenResource(channel.group, parentGroup, link, "links");
      }

      channel.housingLyphs = channel.housingLyphs || [];

      //This is needed to merge Channel.housighLyphs into Lyph.channels for correct template derivation (lyph templates will pass channels to subtypes)
      channel.housingLyphs.forEach(lyphRef => {
          let lyph =  findResourceByID(parentGroup.lyphs, lyphRef);
          if (!lyph){
              logger.warn("Housing lyph not found while processing channel group", lyphRef);
              return;
          }
          lyph.channels = lyph.channels || [];
          if (!lyph.channels.find(x => x.id === channel.id)){
              lyph.channels.push(channel.id);
          }
      });
  }

    /**
     * Generate instances of channel groups for every conveyed housing lyph
     * @param parentGroup
     * @param channel
     */
  static createInstances(parentGroup, channel){

      if (!channel.group) {
          logger.warn("Cannot create channel instances: canonical group not found!");
          return;
      }

      let MEMBRANE_ANNOTATION = "GO:0016020";
      let membraneLyph     = parentGroup.lyphs.find(e => (e.external||[]).find(x => x === MEMBRANE_ANNOTATION || x.id === MEMBRANE_ANNOTATION));

      parentGroup.materials = parentGroup.materials || [];
      let membraneMaterial = parentGroup.materials.find(e => (e.external||[]).find(x => x === MEMBRANE_ANNOTATION || x.id === MEMBRANE_ANNOTATION));
      if (!membraneLyph && !membraneMaterial){
          logger.warn("Did not find a reference to a membrane lyph or material - validation of the housing lyphs will be skipped");
      }

      //This is needed to merge Lyph.channels for generated lyphs back to Channel.housingLyph
      parentGroup.lyphs.forEach(lyph => {
          if (lyph.channels && lyph.channels.includes(channel.id) && !channel.housingLyphs.includes(lyph.id)){
              logger.info("Found derivative of a housing lyph", lyph.id);
              channel.housingLyphs.push(lyph.id);
          }
      });

      channel.housingLyphs.forEach(lyphRef => {
            logger.info("Processing channel instance for lyph", lyphRef);
            let lyph =  findResourceByID(parentGroup.lyphs, lyphRef);

            if (!lyph){
                logger.warn("Housing lyph not found while creating instances", lyphRef);
                return;
            }

            if (lyph.isTemplate) {
                logger.info("Skipping channel instance for a lyph template", lyph.id);
                return;
            }

            //let isOk = validateHousingLyph(lyph);
            //if (isOk){

                let instance = createInstance(lyph.id);
                channel.instances = channel.instances || [];
                channel.instances.push(instance);
                parentGroup.groups.push(instance);
                embedToHousingLyph(lyph, instance);
            //}
      });

      //TODO fix!
      function validateHousingLyph(lyph){
            if ((lyph.layers||[]).length !== (this.group.links||[].length)) {
                logger.warn("The number of layers in the housing lyph does not match the number of links in its membrane channel", lyph);
                return false;
            }
            if (membraneLyph || membraneMaterial) {
                let middleLayer = lyph.layers && lyph.layers[1];
                let isOk = membraneLyph && middleLayer.isSubtypeOf(membraneLyph.id);
                if (!isOk && membraneMaterial) {
                    isOk = (middleLayer.materials || []).find(e => e === membraneMaterial.id || e.id === membraneMaterial.id);
                }
                if (!isOk) {
                    logger.warn("Second layer of a housing lyph is not a (subtype of) membrane", middleLayer, membraneLyph, membraneMaterial);
                }
                return isOk;
            }
            return true;
      }

      /**
         * Create a channel instance
         * @param prefix - instance id/name prefix
         * @returns Group
      */
      function createInstance(prefix){
          let instance = {
              "id"        : `${channel.id}_instance-${prefix}`,
              "name"      : `${channel.name} instance for lyph ${prefix}`,
              "generated" : true
          };
          ["links", "nodes", "lyphs"].forEach(prop => {
              instance[prop] = instance[prop] || [];
          });

          //Clone first node
          let prev_id = channel.group.nodes[0];
          let baseSrc = findResourceByID(parentGroup.nodes, prev_id);
          if (!baseSrc){
              logger.error("Failed to find first node of the channel group", prev_id);
              return instance;
          }
          let src = { "id": `${baseSrc.id}-${prefix}` };
          Node.clone(baseSrc, src);
          mergeGenResource(instance, parentGroup, src, "nodes");

          //Clone the rest of the chain resources: link, target node, conveying lyph
          prev_id = src.id;
          let links = parentGroup.links.filter(lnk => channel.group.links.includes(lnk.id));
          links.forEach(baseLnk => {
              let baseTrg  = findResourceByID(parentGroup.nodes, baseLnk.target);
              let baseLyph = findResourceByID(parentGroup.lyphs, baseLnk.conveyingLyph);
              let [lnk, trg, lyph] = [baseLnk, baseTrg, baseLyph].map(r => (r? { "id" : `${r.id}-${prefix}`}: r ));
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

          const addNode = (border, node) => {
              border.hostedNodes = border.hostedNodes || [];
              border.hostedNodes.push(node);
          };

          let layers = (lyph.layers||[]).filter(e => !!e);
          parentGroup.coalescences = parentGroup.coalescences || [];

          for (let i = 0; i < layers.length; i++){
              let layer = findResourceByID(parentGroup.lyphs, lyph.layers[i]);
              if (!layer){
                  logger.warn("Housing lyph layer not found", lyph, layers[i]);
                  return;
              }
              layer.border = layer.border || {};
              layer.border.borders = layer.border.borders || [{}, {}, {}, {}];
              addNode(layer.border.borders[0], instance.nodes[i]);
              if (i === layers.length - 1){ addNode(layer.border.borders[2], instance.nodes[instance.nodes.length - 1]); }

              let layerCoalescence = {
                  "id"           : `${layer.id}_channel-${instance.lyphs[i]}`,
                  "name"         : `${layer.name} channel #${instance.lyphs[i]}`,
                  "generated"    : true,
                  "topology"     : COALESCENCE_TOPOLOGY.EMBEDDING,
                  "lyphs"        : [layer.id, instance.lyphs[i]]
              };

              parentGroup.coalescences.push(layerCoalescence);
          }
      }
  }
}