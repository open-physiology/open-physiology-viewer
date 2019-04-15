import { Resource } from './resourceModel';
import {isPlainObject, defaults, clone, merge} from 'lodash-bound';
import { LYPH_TOPOLOGY, Lyph } from "./shapeModel";
import { PROCESS_TYPE, Link } from "./visualResourceModel";
import { mergeGenResource, mergeGenResources } from "./utils";

/**
 * Channel model
 * @property group
 * @property materials
 * @property housingLyphs
 */
export class Channel extends Resource {

  /**
   * Create membrane channel group
   * @param json
   */
  static expandTemplate(parentGroup, channel) {
      if ( !channel.id){
          console.warn(`Skipped channel template - it must have (non-empty) ID!`); return;
      }

      channel.group = channel.group || {};
      channel.group::defaults({
          "id"        : "group_" + channel.id,
          "name"      : channel.name,
          "generated" : true
      });

      if (!parentGroup.groups) { parentGroup.groups = []; }
      parentGroup.groups.push(channel.group);

      if ( channel.group.links && (channel.group.links.length > 0)){
          console.warn(`Channel group contains extra links: ${channel.group.links}!`)
      }
      if ( channel.group.nodes && (channel.group.nodes.length > 0)){
          console.warn(`Channel group contains extra nodes: ${channel.group.nodes}!`)
      }

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
              "layers"    : ["mcContent", "mcWall", "mcExtra"]
          },
          {
              "id"        : "mcContent",
              "isTemplate": true
          },
          {
              "id"        : "mcWall",
              "isTemplate": true
          },
          {
              "id"        : "mcExtra",
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
  }

    /**
     * Generate instances of channel groups for every conveyed housing lyph
     * @param parentGroup
     * @param channel
     */
  static createInstances(parentGroup, channel){

      if (!channel.group) {
          console.warn("Cannot create channel instances: canonical group not found!");
          return;
      }

      let membraneLyph     = (parentGroup.lyphs||[]).find(e => (e.external||[]).find(x => x.id === "GO:0016020"));
      let membraneMaterial = (parentGroup.materials||[]).find(e => (e.external||[]).find(x => x.id === "GO:0016020"));
      if (!membraneLyph && !membraneMaterial){
          console.warn("Did not find a reference to a membrane lyph or material - validation of the housing lyph membrane layer will be skipped");
      }

      const getObj = (e, prop) => e::isPlainObject()? e: (parentGroup[prop]||[]).find(x => x.id === e);

      (channel.housingLyphs||[]).forEach(lyphRef => {
          let lyph =  getObj(lyphRef, "lyphs");
          if (!lyph){
              console.warn("Housing lyph not found", lyphRef);
              return;
          }
          if (lyph.isTemplate) {
              console.info("Skipping channel instance for a lyph template", lyph);
              return;
          }

          let isOk = validateHousingLyph(lyph);
          if (isOk){
              let instance = createInstance(lyph.id);
              channel.instances = channel.instances || [];
              channel.instances.push(instance);
              parentGroup.groups.push(instance);
          }
      });

      function validateHousingLyph(lyph){
          if ((lyph.layers||[]).length !== (this.group.links||[].length)) {
              console.warn("The number of layers in the housing lyph does not match the number of links in its membrane channel", lyph);
              return false;
          }
          if (membraneLyph || membraneMaterial) {
              let middleLayer = lyph.layers && lyph.layers[1];
              let isOk = membraneLyph && middleLayer.isSubtypeOf(membraneLyph.id);
              if (!isOk && membraneMaterial) {
                  isOk = (middleLayer.materials || []).find(e => e.id === membraneMaterial.id);
              }
              if (!isOk) {
                  console.warn("Second layer of a housing lyph is not a (subtype of) membrane", middleLayer, membraneLyph, membraneMaterial);
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
              instance[prop] = [];
          });

          let prev = channel.group.nodes[0]::clone();
          prev.id = `${prev.id}-${prefix}`;
          mergeGenResource(instance, parentGroup, prev, "nodes");
          channel.group.links.forEach(baseLnk => {
              let baseTrg  = getObj(baseLnk.target, "nodes");
              let baseLyph = getObj(baseLnk.conveyingLyph, "lyphs");
              let [lnk, trg, lyph] = [baseLnk, baseTrg, baseLyph].map(r => (r
                      ? r::clone()::merge({
                          "id"       : `${r.id}-${prefix}`,
                          "cloneOf"  : r.id,
                          "generated": true
                      })
                      : r
              ));
              lnk.source = prev.id;
              lnk.target = trg.id;
              Lyph.clone(parentGroup.lyphs, baseLyph, lyph);

              mergeGenResources(instance, parentGroup, [lnk, trg, lyph]);
              prev = lnk.target;
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

          (lyph.layers||[]).forEach((layerRef, i) => {
              let layer = getObj(layerRef, "lyphs");
              if (!layer){
                  console.warn("Housing lyph layer not found", lyph, layerRef);
                  return;
              }
              layer.border = layer.border || {};
              layer.border.borders = layer.border.borders || [{}, {}, {}, {}];
              layer.border.borders[0].hostedNodes = layer.border.borders[0].hostedNodes || [];
              layer.border.borders[0].hostedNodes.push(instance.nodes[i]);
          });
          lyph.layers[2].border.borders[2] = instance.nodes[3];

          //parentGroup.coalescences = parentGroup.coalescences || [];

          //The third layer of each MC segment will undergo an Embedding Coalescence with the layer of the Housing Lyph that contains it.
      }
  }
}