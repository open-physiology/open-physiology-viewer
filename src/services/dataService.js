import { values, keys, cloneDeep, merge, mergeWith, isArray} from 'lodash-bound';
import { Graph} from '../models/graphModel';
import { LINK_TYPES } from '../models/linkModel';
import { modelClasses } from '../models/modelClasses';

import {assignPropertiesToJSONPath, noOverwrite} from '../models/utils';

/**
 * A class that assembles ApiNATOMY model from available data sources:
 * 1. Core graph definition
 * 2. Nervous system
 * 3. Kidney subsystems https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 * 4. Cardiac subsystems
 * 5. Spinatholamic tracts
 * ...
 */
export class DataService{
    /**
     * Prepare core ApiNATOMY graph
     */
    init(inputModel){
        /////////////////////////////////////////////////////////////////////
        //Constant parameters and helper functions
        /////////////////////////////////////////////////////////////////////
        const propertyList = ["nodes", "lyphs", "links"];

        const getLinkByLyphID = (lyphID) => {
            let res = this._graphData.links.find(link => link.conveyingLyph &&
            (link.conveyingLyph  === lyphID || link.conveyingLyph.id === lyphID));
            if (!res) {
                const hasLayer = (lyph, layerID) =>
                    (this._graphData.lyphs.find(e => e.id === lyph).layers||[])
                        .find(layer => layer === layerID);
                //For lyphs which are layers, return parent's link
                res = this._graphData.links.find(link => link.conveyingLyph && hasLayer(link.conveyingLyph, lyphID));
            }
            return res;
        };

        const generateEntitiesFromGroupRefs = groups => {
            //Copy entities from subgroups
            groups.filter(parent => parent.groups).forEach(group => {
                propertyList.forEach(property => {
                    group[property] = [...group[property]||[], ...[].concat(
                        ...group.groups.map(subgroupID => {
                            let g = groups.find(g => g.id === subgroupID);
                            if (!g.hasOwnProperty("inactive")) { g.inactive = true; }
                            if (g){ return g[property]||[]; } else {
                                console.warn("Reference to unknown group found", subgroupID);
                            } return [];
                        })
                    )]
                });
            });

            groups.forEach(group => {
                //generate node, link and lyph objects that are referred from a group but are not in the main graph
                propertyList.forEach(property => {
                    (group[property]||[]).forEach(id => {
                        let entity = this._graphData[property].find(e => e.id === id);
                        if (entity === undefined){
                            entity = {"id": id};
                            this._graphData[property].push(entity);
                        }
                    })
                });
            });
        };

        const createInternalLyphs = (lyph) => {
            let newGroupIDs = {"nodes": [], "links": [], "lyphs": []};
            lyph.internalLyphs.forEach(innerLyphID => {
                let innerLyph = this._graphData.lyphs.find(lyph => lyph.id === innerLyphID);
                if (!innerLyph) {
                    console.error("Could not find lyph definition for internal lyph ID: ", innerLyphID);
                    return;
                }

                innerLyph::merge({
                    scale: {"height": 100, "width": 50},
                    internalLyphInLyph: lyph
                });

                let innerLyphAxis = getLinkByLyphID(innerLyph.id);
                //Create link for inner lyphs if it does not exist
                if (!innerLyphAxis){
                    let [sNode, tNode] = ["s", "t"].map(prefix => ({
                        "id"       : `${prefix}${innerLyphID}`,
                        "name"     : `${prefix}${innerLyphID}`,
                        "color"    : "#ccc",
                        "val"      : 0.1,
                        "skipLabel": true
                    }));

                    [sNode, tNode].forEach(node => {
                        this._graphData.nodes.push(node);
                        newGroupIDs.nodes.push(node.id);
                    });

                    let axis = getLinkByLyphID(lyph.id);

                    let link = {
                        "id"            : `${sNode.id}_ ${tNode.id}`,
                        "source"        : sNode,
                        "target"        : tNode,
                        "length"        : axis? axis.length * 0.8: 5,
                        "type"          : LINK_TYPES.INVISIBLE,
                        "color"         : "#ccc",
                        "conveyingLyph" : innerLyphID
                    };
                    this._graphData.links.push(link);
                    newGroupIDs.links.push(link.id);
                } else {
                    newGroupIDs.links.push(innerLyphAxis.id);
                }
                newGroupIDs.lyphs.push(innerLyph.id);
            });
            return newGroupIDs;
        };

        const expandTemplates = () => {
            let templates = this._graphData.lyphs.filter(lyph => lyph.isTemplate);
            templates.forEach(template => {
                let subtypes = template.subtypes.map(subtypeRef => this._graphData.lyphs.find(e => e.id === subtypeRef));
                (subtypes || []).forEach(subtype => {
                    subtype.layers = [];
                    (template.layers|| []).forEach(layerRef => {
                        let layerParent = this._graphData.lyphs.find(e => e.id === layerRef);
                        if (!layerParent) {
                            console.warn("Generation error: template layer object not found: ", layerRef);
                            return;
                        }
                        let newID = `${layerParent.id}_${subtype.id}`;
                        let lyphLayer = {
                            "id"        : newID,
                            "name"      : `${layerParent.name} in ${subtype.name}`,
                            "supertype" : layerParent.id,
                            "color"     : layerParent.color
                        };
                        this._graphData.lyphs.push(lyphLayer);
                        subtype.layers.push(lyphLayer);
                    });
                });

                //Copy defined properties to newly generated lyphs
                if (template.assign){
                    if (!template.assign::isArray()){
                        console.warn("Cannot assign template properties: ", template.assign);
                        return;
                    }
                    template.assign.forEach(({path, value}) =>
                        assignPropertiesToJSONPath({path, value}, subtypes)
                    );
                }
            });
        };

        ///////////////////////////////////////////////////////////////////

        //Create an expanded input model
        this._graphData = inputModel::cloneDeep()::mergeWith({
            id: "mainModel",
            assign: [
                {
                    "path": "$.nodes",
                    "value": {"charge": 10}
                }
            ],
            nodes: [],
            links: [],
            lyphs: [],
            groups: [],
            materials: []
        }, noOverwrite);

        //Auto-generate links, nodes and lyphs for ID's in groups if they do not exist in the main graph
        generateEntitiesFromGroupRefs(this._graphData.groups);

        /*Find lyph templates, generate new layers and replicate template properties */
        expandTemplates();

        //Create nodes and links for internal lyphs, add them to the groups to which internal lyphs belong
        this._graphData.lyphs.filter(lyph => lyph.internalLyphs).forEach(lyph => {
            let newGroupIDs = createInternalLyphs(lyph);
            ["links", "nodes"].forEach(prop => {
                newGroupIDs[prop].forEach(e => {
                    this._graphData.groups.filter(g => (g.lyphs||[]).includes(lyph.id)).forEach(group => {
                            if (!group[prop]){ group[prop] = []; }
                           group[prop].push(e)
                        });
                    });
                })
        });

        //Coalescing lyphs attract by means of invisible links
        let coalescenceGroup = this._graphData.groups.find(g => g.id === "coalescences");
        if (coalescenceGroup){
            this._graphData.lyphs.filter(lyph => lyph.coalescesWith).forEach(lyph => {
                let lyphs = [lyph.id, ...lyph.coalescesWith];
                let coalescingLinks  = lyphs.map(lyphID => getLinkByLyphID(lyphID));
                coalescingLinks.forEach((link1, i) => {
                    coalescingLinks.forEach((link2, j) => {
                        if (i === j) { return; }
                        ["source", "target"].forEach(end => {
                            let link = {
                                "id"    : link1[end]+"_"+link2[end],
                                "source": link1[end],
                                "target": link2[end],
                                "length": 0.1,
                                "type": LINK_TYPES.FORCE
                            };
                            this._graphData.links.push(link);
                            if (!coalescenceGroup.links){ coalescenceGroup.links = []; }
                            coalescenceGroup.links.push(link.id);
                        });
                    })
                });
            });
        }

        //Important: the effect of this procedure depends on the order in which lyphs that share border nodes are selected
        //If the added dashed links create an overlap, one has to change the order of lyphs in the input file!
        const replaceBorderNodes = () => {
            //Replicate border nodes and create collapsible links
            let borderNodesByID = {};
            let lyphsWithBorders = this._graphData.lyphs.filter(lyph => ((lyph.border || {}).borders||[]).find(b => b.hostedNodes))
            lyphsWithBorders.forEach(lyph => {
                lyph.border.borders.forEach(b => {
                    (b.hostedNodes||[]).forEach(nodeID => {
                        if (!borderNodesByID[nodeID]){ borderNodesByID[nodeID] = []; }
                        borderNodesByID[nodeID].push(lyph);
                    });
                })
            });

            borderNodesByID::keys().forEach(nodeID => {
                if (borderNodesByID[nodeID].length > 1){
                    //groups that contain the node
                    let groups = this._graphData.groups.filter(g => (g.nodes||[]).includes(nodeID));
                    //links affected by the border node constraints
                    let links = this._graphData.links.filter(e => e.target === nodeID);
                    let node = this._graphData.nodes.find(e => e.id === nodeID);
                    //Unknown nodes will be detected by validation later, no need for logging here
                    if (!node){return;}

                    for (let i = 1, prev = nodeID; i < borderNodesByID[nodeID].length; i++){
                        let nodeClone = node::cloneDeep()::merge({
                            "id": nodeID + `_${i}`
                        });
                        this._graphData.nodes.push(nodeClone);
                        groups.forEach(g => g.nodes.push(nodeClone.id));
                        links.forEach(lnk => {lnk.target = nodeClone.id});

                        //lyph constraint - replace
                        borderNodesByID[nodeID][i].border.borders.forEach(b => {
                            let k = (b.hostedNodes||[]).indexOf(nodeID);
                            if (k > -1){ b.hostedNodes[k] = nodeClone.id; }
                        });
                        //create a collapsible link
                        let lnk = {
                            "id"    : `${prev}_${nodeClone.id}`,
                            "source": `${prev}`,
                            "target": `${nodeClone.id}`,
                            "type"  : LINK_TYPES.DASHED,
                            "length": 1,
                            "collapsible": true
                        };
                        this._graphData.links.push(lnk);
                        prev = nodeClone.id;
                    }
                }
            });
        };

        replaceBorderNodes();

        /////////////////////////////////////////////////////////////////////////
        /* Generate complete model */

        //Copy existing entities to a map to enable nested model instantiation
        let entitiesByID = {};
        
        entitiesByID[this._graphData.id] = this._graphData;
        this._graphData::values().filter(prop => prop::isArray()).forEach(array => array.forEach(e => {
            if (entitiesByID[e.id]) {
                console.error("Entity IDs are not unique: ", entitiesByID[e.id], e);
            }
            entitiesByID[e.id] = e;
        }));

        let conveyingLyphMap = {};
        this._graphData.links.filter(lnk => lnk.conveyingLyph).forEach(lnk => {
           if (lnk.conveyingLyph.isTemplate){
               console.warn("It is not allowed to use templates as conveying lyphs: ", lnk.conveyingLyph);
               delete lnk.conveyingLyph;
           }
           if (!conveyingLyphMap[lnk.conveyingLyph]){
               conveyingLyphMap[lnk.conveyingLyph] = lnk.conveyingLyph;
           } else {
               console.error("It is not allowed to use the same lyph as conveying lyph for multiple processes (links): ", lnk.conveyingLyph);
           }
        });

        //Create an ApiNATOMY model
        this._graphData = Graph.fromJSON(this._graphData, modelClasses, entitiesByID);
        console.info("ApiNATOMY graph: ", this._graphData);
    }

    get graphData(){
        return this._graphData;
    }
}