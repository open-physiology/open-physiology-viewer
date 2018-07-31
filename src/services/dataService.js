import {
  keys,
  values,
  cloneDeep,
  merge,
  mergeWith,
  isObject
} from 'lodash-bound';
import {
  Graph
} from '../models/graphModel';
import {
  LINK_TYPES
} from '../models/linkModel';
import {
  modelClasses
} from '../models/utils';

import * as colorSchemes from 'd3-scale-chromatic';
const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];
const colorSchemeOffset = 0.25; //Colors at the beginning and at the end of the color arrays are too dark or too light, so we skip some percentage

const JSONPath = require('JSONPath');

/**
 * A class that assembles ApiNATOMY model from available data sources:
 * 1. Core graph definition
 * 2. Nervous system
 * 3. Kidney subsystems https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 * 4. Cardiac subsystems
 * 5. Spinatholamic tracts
 * ...
 */
export class DataService {
  /**
   * Prepare core ApiNATOMY graph
   */
  init({
    nodes = [],
    links = [],
    lyphs = [],
    groups = [],
    materials = []
  }) {

    /////////////////////////////////////////////////////////////////////
    //Constant parameters and helper functions
    /////////////////////////////////////////////////////////////////////
    const propertyList = ["nodes", "lyphs", "links"];

    const colorLyphsExt = (lyphs, colorFn, numColors, reversed = false) => {
      lyphs.forEach((lyphID, i) => {
        let lyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
        lyph.color = colorFn(((reversed) ? 1 - colorSchemeOffset - i / numColors : colorSchemeOffset + i / numColors));
      });
    };

    const getLinkByLyphID = (lyphID) => {
      let res = this._graphData.links.find(link => link.conveyingLyph &&
        (link.conveyingLyph === lyphID || link.conveyingLyph.id === lyphID));
      if (!res) {
        const hasLayer = (lyph, layerID) =>
          (this._graphData.lyphs.find(e => e.id === lyph).layers || [])
          .find(layer => layer === layerID);
        //For lyphs which are layers, return parent's link
        res = this._graphData.links.find(link => link.conveyingLyph && hasLayer(link.conveyingLyph, lyphID));
      }
      return res;
    };

    const generateEntitiesFromGroupRefs = groups => {
      groups.forEach(group => {
        //generate node, link and lyph objects that are referred from a group but are not in the main graph
        propertyList.forEach(property => {
          (group[property] || []).forEach(id => {
            let entity = this._graphData[property].find(e => e.id === id);
            if (entity === undefined) {
              entity = {
                "id": id
              };
              this._graphData[property].push(entity);
            }
          })
        });
      });
    };



    const createInternalLyphs = (lyph) => {
      let newGroupIDs = {
        "nodes": [],
        "links": [],
        "lyphs": []
      };
      lyph.internalLyphs.forEach(innerLyphID => {
        let innerLyph = this._graphData.lyphs.find(lyph => lyph.id === innerLyphID);
        if (innerLyph.lyph_composition === "Neural nucleus") {

          // if (innerLyph) {
          //     innerLyph::merge({
          //         scale: {"height": 100, "width": 50},
          //         belongsToLyph: lyph
          //     });
          // }
          let [sNode, tNode] = ["s", "t"].map(prefix => ({
            "id": `${prefix}${innerLyphID}`,
            "name": `${prefix}${innerLyphID}`,
            "color": "#ccc",
            "val": 0.01,
            "skipLabel": false
          }));
          [sNode, tNode].forEach(node => {
            this._graphData.nodes.push(node);
            newGroupIDs.nodes.push(node.id);
          });

          let axis = getLinkByLyphID(lyph.id);

          let link = {
            "id": `${sNode.id}_ ${tNode.id}`,
            "source": sNode,
            "target": tNode,
            "length": axis ? axis.length * 0.8 : 5,
            "type": LINK_TYPES.INVISIBLE,
            "color": "#ccc",
            "conveyingLyph": innerLyphID
          };
          this._graphData.links.push(link);
          newGroupIDs.lyphs.push(innerLyph.id);
          newGroupIDs.links.push(link.id);
        }

      });
      return newGroupIDs;
    };

    const noOverwrite = (objVal, srcVal) => {
      if (objVal && objVal !== srcVal) {
        return objVal;
      }
      return srcVal;
    };


    ///////////////////////////////////////////////////////////////////

    //Copy entities from subgroups
    groups.filter(parent => parent.groups).forEach(group => {
      propertyList.forEach(property => {
        group[property] = [...group[property] || [], ...[].concat(
          ...group.groups.map(subgroupID => {
            let g = groups.find(g => g.id === subgroupID);
            g.remove = true; //TODO introduce a property to decide whether to show the group on the panel
            if (g) {
              return g[property] || [];
            } else {
              console.warn("Reference to unknown group found", subgroupID);
            }
            return [];
          })
        )]
      });
    });

    //Create an expanded input model
    this._graphData = {
      id: "graph1",
      assign: {
        nodes: {
          "charge": 0
        }
      },
      nodes: [...nodes]::cloneDeep(),
      links: [...links]::cloneDeep(),
      lyphs: [...lyphs]::cloneDeep(),
      groups: [...groups]::cloneDeep(),
      materials: [...materials]::cloneDeep()
    };


    console.log("ApiNATOMY graph --*-- PRE --*-- linking: ", JSON.stringify(this._graphData));

    //Auto-generate links, nodes and lyphs for ID's in groups if they do not exist in the main graph
    // generateEntitiesFromGroupRefs(this._graphData.groups);

    //Create nodes and links for internal lyphs, add them to the groups to which internal lyphs belong
    this._graphData.lyphs.filter(lyph => lyph.internalLyphs).forEach(lyph => {
      if (lyph.lyph_composition === "CNS layer" || lyph.lyph_composition === "CNS segment") {
        console.log("lyph.lyph_composition: ", lyph.lyph_composition);
        let newGroupIDs = createInternalLyphs(lyph);
        ["links", "nodes"].forEach(prop => {
          newGroupIDs[prop].forEach(e => {
            this._graphData.groups.filter(g => (g.lyphs || []).includes(lyph.id)).forEach(group => {
              if (!group[prop]) {
                group[prop] = [];
              }
              group[prop].push(e)
            });
          });
        })
      }

    });

    //Coalescing lyphs attract by means of invisible links
    let coalescenceGroup = this._graphData.groups.find(g => g.id === "coalescences");
    if (coalescenceGroup) {
      this._graphData.lyphs.filter(lyph => lyph.coalescesWith).forEach(lyph => {
        let lyphs = [lyph.id, ...lyph.coalescesWith];
        let coalescingLinks = lyphs.map(lyphID => getLinkByLyphID(lyphID));
        coalescingLinks.forEach((link1, i) => {
          coalescingLinks.forEach((link2, j) => {
            if (i === j) {
              return;
            }
            ["source", "target"].forEach(end => {
              let link = {
                "id": link1[end] + "_" + link2[end],
                "source": link1[end],
                "target": link2[end],
                "length": 0.1,
                "type": LINK_TYPES.FORCE
              };
              this._graphData.links.push(link);
              if (!coalescenceGroup.links) {
                coalescenceGroup.links = [];
              }
              coalescenceGroup.links.push(link.id);
            });
          })
        });
      });
    }

    /*Find lyph templates, generate new layers and replicate template properties */

    let templates = this._graphData.lyphs.filter(lyph => lyph.isTemplate);
    templates.forEach(template => {
      (template.subtypes || []).forEach(subtypeRef => {
        let subtype = subtypeRef;
        if (typeof subtype === "string") {
          subtype = this._graphData.lyphs.find(e => e.id === subtypeRef);
        }
        if (subtype) {
          subtype.layers = [];
          (template.layers || []).forEach(layerRef => {
            let layerParent = layerRef;
            if (typeof layerRef === "string") {
              layerParent = this._graphData.lyphs.find(e => e.id === layerRef);
            }
            if (!layerParent) {
              console.warn("Generation error: template layer object not found: ", layerRef);
              return;
            }
            let newID = `${layerParent.id}_${subtype.id}`;
            let lyphLayer = {
              "id": newID,
              "name": `${layerParent.name} in ${subtype.name}`,
              "supertype": layerParent.id,
              "color": layerParent.color
            };
            this._graphData.lyphs.push(lyphLayer);
            //Copy defined properties to newly generated lyphs
            //TODO replace with JSONPath processing
            if (template.assign && template.assign[newID]) {
              lyphLayer::mergeWith(template.assign[newID], noOverwrite);
              createInternalLyphs(lyphLayer);
            }

            subtype.layers.push(newID);
            if (!layerParent.subtypes) {
              layerParent.subtypes = [];
            }
            layerParent.subtypes.push(newID);
          });
        }
      })
    });


    let groupsByName = {};
    this._graphData.groups.forEach(g => groupsByName[g.name] = g);

    let neuralSystemName = "Central Nervous System CNS segment tree";

    // neuralSystemName = "Neural system";

    console.log("groupsByName: ", groupsByName);
    let maxLayers = Math.max(...groupsByName[neuralSystemName].lyphs.map(lyphID =>
      (this._graphData.lyphs.find(lyph => lyph.id === lyphID).layers || []).length));

    console.log("max layers", maxLayers);
    console.log("groupsByName[neuralSystemName].lyphs: ", groupsByName[neuralSystemName].lyphs);
    groupsByName[neuralSystemName].lyphs.forEach(lyphID => {
      console.log("lyphID: ", lyphID);

      let ependymalLyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
      console.log("ependymalLyph: ", ependymalLyph);
      colorLyphsExt(ependymalLyph.layers, colorSchemes.interpolateBlues, maxLayers, true);
    });

    /////////////////////////////////////////////////////////////////////////
    /* Generate complete model */

    //Copy existing entities to a map to enable nested model instantiation
    let entitiesByID = {};

    entitiesByID[this._graphData.id] = this._graphData;
    this._graphData::values().filter(prop => Array.isArray(prop)).forEach(array => array.forEach(e => {
      if (entitiesByID[e.id]) {
        console.error("Entity IDs are not unique: ", entitiesByID[e.id], e);
      }
      entitiesByID[e.id] = e;
    }));




    // let conveyingLyphMap = {};
    // this._graphData.links.filter(lnk => lnk.conveyingLyph).forEach(lnk => {
    //    if (!conveyingLyphMap[lnk.conveyingLyph]){
    //        conveyingLyphMap[lnk.conveyingLyph] = lnk.conveyingLyph;
    //    } else {
    //        console.error("It is not allowed to use the same lyph as conveying lyph for multiple processes (links): ", lnk.conveyingLyph);
    //    }
    // });
    console.log("ApiNATOMY graph post-linking: ", JSON.stringify(this._graphData));


    //Create an ApiNATOMY model
    // console.log("ApiNATOMY graph: ", JSON.stringify(this._graphData));

    this._graphData = Graph.fromJSON(this._graphData, modelClasses, entitiesByID);

    /*Map initial positional constraints to match the scaled image*/
    const axisLength = 1000;
    const scaleFactor = axisLength * 0.01;

    this._graphData.nodes.forEach(node => node.layout::keys().forEach(key => {
      node.layout[key] *= scaleFactor;
    }));
    this._graphData.links.filter(link => link.length).forEach(link => link.length *= 2 * scaleFactor);
  }

  get graphData() {
    return this._graphData;
  }
}
