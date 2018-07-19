import { keys, values, cloneDeep, merge, mergeWith} from 'lodash-bound';
import * as colorSchemes from 'd3-scale-chromatic';
import { Graph } from '../models/graphModel';
import { LINK_TYPES } from '../models/linkModel';
import { modelClasses } from '../models/utils';

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
    init({ nodes = [], links = [], lyphs = [], groups = [], materials = []}){

        /////////////////////////////////////////////////////////////////////
        //Constant parameters and helper functions
        /////////////////////////////////////////////////////////////////////
        const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];
        const propertyList = ["nodes", "lyphs", "links"];

        //assign random color to entities from the list if they dont have their own color
        const addColor = (array, defaultColor) => array.filter(obj => !obj.color)
            .forEach((obj, i) => { obj.color = defaultColor || colors[i % colors.length] });

        const colorLyphGroup = (lyphs, {color, length, reversed = false, offset}) => {
            if (!colorSchemes[color]) {
                console.warn("Unrecognized color scheme: ", color);
                return;
            }
            if (!length) { length = lyphs.length; }
            if (!offset) { offset = 0; }
            lyphs.forEach((lyphID, i) => {
                let lyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
                if (!lyph){
                    console.warn("Reference to lyph's ID not found", lyphID);
                    return;
                }
                lyph.color = colorSchemes[color](((reversed)? 1 - offset - i / length : offset + i / length));
            });
        };

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

        const expandGroupSettings = groups => {
            groups.forEach(group => {
                //assign properties
                (group.assign||[])::keys().forEach(property => {
                    if (group.assign[property] && this._graphData[property]) {
                        (group[property]||[]).map(id => this._graphData[property]
                            .find(e => e.id === id)).forEach(e => e::mergeWith(group.assign[property], noOverwrite));
                    }
                });
                //interpolate properties
                (group.interpolate||[])::keys().forEach(property => {
                    //TODO replace with JSONPath processing?
                    if (group.interpolate[property]) {
                        if (property === "nodes"){
                            if (group.interpolate[property].offset){
                                if ((group.nodes||[]).length > 0){
                                    let nodes = group.nodes.map(e => this._graphData.nodes.find(node => node.id === e));
                                    let spec = group.interpolate[property].offset;
                                    spec::mergeWith({
                                        "start": 0,
                                        "end": 1,
                                        "step": (spec.end - spec.start) / (nodes.length + 1)
                                    }, noOverwrite);
                                    nodes.forEach((node, i) => node.offset = spec.start + spec.step * ( i + 1 ) );
                                }
                            }
                        } else {
                            //color scheme is applied to the conveying lyphs of the links in a group
                            let lyphs = property.startsWith("conveying")?
                                group.links.map(e => this._graphData.links.find(lnk => lnk.id === e))
                                    .filter(lnk => !!lnk).map(lnk => lnk.conveyingLyph)
                                : group.lyphs;

                            if (property.endsWith("Layers")) {
                                lyphs.map(e => this._graphData.lyphs.find(lyph => lyph.id === e))
                                    .filter(lyph => !!lyph.layers).forEach(lyph =>
                                        colorLyphGroup(lyph.layers, group.interpolate[property]))
                            } else {
                                colorLyphGroup(lyphs, group.interpolate[property]);
                            }
                        }
                    }
                })
            });
        };

        const createInternalLyphs = (lyph) => {
            let newGroupIDs = {"nodes": [], "links": [], "lyphs": []};
            lyph.internalLyphs.forEach(innerLyphID => {
                let innerLyph = this._graphData.lyphs.find(lyph => lyph.id === innerLyphID);
                if (innerLyph) {
                    innerLyph::merge({
                        scale: {"height": 100, "width": 50},
                        belongsToLyph: lyph
                    });
                }
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
                newGroupIDs.lyphs.push(innerLyph.id);
                newGroupIDs.links.push(link.id);
            });
            return newGroupIDs;
        };

        const noOverwrite = (objVal, srcVal) => {
            if (objVal && objVal !== srcVal) { return objVal; }
            return srcVal;
        };


        ///////////////////////////////////////////////////////////////////

        //Copy entities from subgroups
        groups.filter(parent => parent.groups).forEach(group => {
            propertyList.forEach(property => {
                group[property] = [...group[property]||[], ...[].concat(
                    ...group.groups.map(subgroupID => {
                        let g = groups.find(g => g.id === subgroupID);
                        g.remove = true; //TODO introduce a property to decide whether to show the group on the panel
                        if (g){ return g[property]||[]; } else {
                            console.warn("Reference to unknown group found", subgroupID);
                        } return [];
                    })
                )]
            });
        });

        //Create an expanded input model
        this._graphData = {
            id: "graph1",
            assign: {
                nodes: {"charge": 10}
            },
            nodes    : [...nodes]    ::cloneDeep(),
            links    : [...links]    ::cloneDeep(),
            lyphs    : [...lyphs]    ::cloneDeep(),
            groups   : [...groups]   ::cloneDeep(),
            materials: [...materials]::cloneDeep()
        };

        //Auto-generate links, nodes and lyphs for ID's in groups if they do not exist in the main graph
        generateEntitiesFromGroupRefs(this._graphData.groups);

        //Assign group properties
        expandGroupSettings([this._graphData]);
        expandGroupSettings(this._graphData.groups);

        //Remove subgroups
        this.graphData.groups = this.graphData.groups.filter(g => !g.remove);
        this.graphData.groups.forEach(g => delete g.groups);

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

        //Color links and lyphs which do not have assigned colors yet
        addColor(this._graphData.links, "#000");
        addColor(this._graphData.lyphs);

        /*Find lyph templates, generate new layers and replicate template properties */

        let templates = this._graphData.lyphs.filter(lyph => lyph.isTemplate);
        templates.forEach(template => {
            (template.subtypes || []).forEach(subtypeRef => {
                let subtype = subtypeRef;
                if (typeof subtype === "string") {
                    subtype = this._graphData.lyphs.find(e => e.id === subtypeRef);
                }
                if (subtype){
                    subtype.layers = [];
                    (template.layers|| []).forEach(layerRef => {
                        let layerParent = layerRef;
                        if (typeof layerRef === "string"){
                            layerParent = this._graphData.lyphs.find(e => e.id === layerRef);
                        }
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
                        //Copy defined properties to newly generated lyphs
                        //TODO replace with JSONPath processing
                        if (template.assign && template.assign[newID]){
                            lyphLayer::mergeWith(template.assign[newID], noOverwrite);
                            createInternalLyphs(lyphLayer);
                        }

                        subtype.layers.push(newID);
                        if (!layerParent.subtypes){ layerParent.subtypes = []; }
                        layerParent.subtypes.push(newID);
                    });
                }
            })
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

        let conveyingLyphMap = {};
        this._graphData.links.filter(lnk => lnk.conveyingLyph).forEach(lnk => {
           if (!conveyingLyphMap[lnk.conveyingLyph]){
               conveyingLyphMap[lnk.conveyingLyph] = lnk.conveyingLyph;
           } else {
               console.error("It is not allowed to use the same lyph as conveying lyph for multiple processes (links): ", lnk.conveyingLyph);
           }
        });

        console.log("ApiNATOMY input model: ", this._graphData);

        //Create an ApiNATOMY model
        this._graphData = Graph.fromJSON(this._graphData, modelClasses, entitiesByID);

        console.log("ApiNATOMY graph: ", this._graphData);

        /*Map initial positional constraints to match the scaled image*/
        const axisLength = 1000;
        const scaleFactor = axisLength * 0.01;

        this._graphData.nodes.forEach(node => node.layout::keys().forEach(key => {node.layout[key] *= scaleFactor; }));
        this._graphData.links.filter(link => link.length).forEach(link => link.length *= 2 * scaleFactor);
    }

    get graphData(){
        return this._graphData;
    }
}