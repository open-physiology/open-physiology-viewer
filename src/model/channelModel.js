import { Resource } from './resourceModel';
import {isPlainObject, defaults, unionBy} from 'lodash-bound';
import { LYPH_TOPOLOGY, Lyph } from "./shapeModel";
import { mergeGenResource } from "./utils";

/**
 * Channel model
 * @property group
 * @property materials
 * @property housingLyphs
 */
export class Channel extends Resource {

  /**
   * Create membrane channel components
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
          if (!parentGroup.lyphs.find(x => x.id === lyph.id)){ parentGroup.lyphs.push(lyph); }
      });

      let N = 3;
      for (let i = 0; i < N + 1; i++){
          let node = {
              "id"        : channel.id + "_node" + i,
              "name"      : channel.name + ": node " + i,
              "color"     : "#000",
              "skipLabel" : true,
              "generated" : true
          };
          mergeGenResource(channel.group, parentGroup, node, "nodes");
      }
      for (let i = 0; i < N; i++){
          let lyph = {
              "id"        : channel.id + "_" + mcLyphs[i].id,
              "supertype" : mcLyphs[i].id,
              "generated" : true
          };

          let link = {
              "id"            : channel.id + "_lnk" + (i+1),
              "name"          : `${channel.name || ""}: level ${i}`,
              "source"        : channel.group.nodes[i],
              "target"        : channel.group.nodes[i + 1],
              "conveyingLyph" : lyph.id,
              "color"         : "#000",
              "generated"     : true
          };
          mergeGenResource(channel.group, parentGroup, lyph, "lyphs");
          mergeGenResource(channel.group, parentGroup, link, "links");
      }

       //for all housing lyphs (lyphs with a membrane channel)
      let housingLyphs = channel.housingLyphs||[];
      housingLyphs = housingLyphs::unionBy(parentGroup.lyphs.filter(lyph => (lyph.channels||[]).includes(channel.id)), "id");

      const getObj = (e, prop) => e::isPlainObject()? e: (parentGroup[prop]||[]).find(x => x.id === e);

      housingLyphs.forEach(lyph => {
          if ((lyph.layers||[]).length < N) {
              console.warn("Housing lyph for membrane channel does not contain enough layers and will be skipped", lyph);
              return;
          }
          if ((lyph.layers||[]).length !== (channel.group.links||[].length)) {
              console.warn("The number of layers in the housing lyph does not match the number of links in its membrane channel", lyph);
              return;
          }

          (lyph.layers||[]).forEach((layerRef, i) => {
              let layer = getObj(layerRef, "lyphs");
              if (!layer::isPlainObject()){
                  console.warn("Failed to find the lyph's layer", lyph, layerRef);
              }

              //position channel link nodes on borders of the housing layers

          });
      });

      parentGroup.coalescences = parentGroup.coalescences || [];

      /**
       The third layer of each MC segment will undergo an Embedding Coalescence with the layer of the Housing Lyph that contains it.
       Each of the three MC segments will convey a Diffusive edge such that both nodes of the edge conveyed by the MC segment in the second (membranous) layer are shared by the other two Diffusive edges.
       Associate each Diffusive Edge with the Material payload provided above.
       */
  }
}