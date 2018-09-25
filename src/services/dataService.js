import { values, keys, cloneDeep, merge, defaults, isArray} from 'lodash-bound';
import { LINK_TYPES } from '../models/linkModel';
import { modelClasses } from '../models/modelClasses';

import {assignPropertiesToJSONPath } from '../models/utils';

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


        //Create an expanded input model
        this._graphData = inputModel::cloneDeep()::defaults({
            id: "mainModel",
            assign: [
                {
                    "path": "$.nodes",
                    "value": {"charge": 10}
                }
            ],
            nodes : [],
            links : [],
            lyphs : [],
            groups: [],
            materials: []
        });

        /*Find lyph templates, generate new layers and replicate template properties */
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
        expandTemplates();

        //Important: the effect of this procedure depends on the order in which lyphs that share border nodes are selected
        //If the added dashed links create an overlap, one has to change the order of lyphs in the input file!
        //TODO add created nodes to relevant nested groups
        const replaceBorderNodes = () => {
            //Replicate border nodes and create collapsible links
            let borderNodesByID = {};
            let lyphsWithBorders = this._graphData.lyphs.filter(lyph => ((lyph.border || {}).borders||[]).find(b => b.hostedNodes));
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
                    //links affected by the border node constraints
                    let links = this._graphData.links.filter(e => e.target === nodeID);
                    let node  = this._graphData.nodes.find(e => e.id === nodeID);
                    //Unknown nodes will be detected by validation later, no need for logging here
                    if (!node){return;}

                    for (let i = 1, prev = nodeID; i < borderNodesByID[nodeID].length; i++){
                        let nodeClone = node::cloneDeep()::merge({
                            "id"     : nodeID + `_${i}`,
                            "cloneOf": nodeID
                        });
                        if (!node.clones){ node.clones = []; }
                        node.clones.push(nodeClone);

                        this._graphData.nodes.push(nodeClone);
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
        /////////////////////////////////////////////////////////////////////////

        //Copy existing entities to a map to enable nested model instantiation
        let entitiesByID = {};
        
        entitiesByID[this._graphData.id] = this._graphData;
        ["nodes", "links", "lyphs", "groups"].forEach(prop => {
            (this._graphData[prop]||[]).forEach(e => {
                if (!e.id) { console.warn("Entity without ID is skipped: ", e); return; }
                if (entitiesByID[e.id]) { console.error("Entity IDs are not unique: ", entitiesByID[e.id], e); }
                entitiesByID[e.id] = e;
            })
        });

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

        //TODO warning if lyph coalesces with itself or misses axis

        //Create an ApiNATOMY model
        this._graphData = modelClasses["Graph"].fromJSON(this._graphData, modelClasses, entitiesByID);

        //Create force links to bind coalescing lyphs
        let coalescenceGroup = this._graphData.groups.find(g => g.id === "coalescences");
        if (!coalescenceGroup){
            coalescenceGroup = modelClasses["Graph"].fromJSON({
                    "id"      : "coalescences",
                    "name"    : "Coalescences",
                    "inactive": true
            });
            this._graphData.groups.push(coalescenceGroup);
        }
        coalescenceGroup.links = coalescenceGroup.links||[];

        this._graphData.lyphs.filter(lyph => lyph.coalescesWith).forEach(lyph => {
            lyph.coalescesWith.forEach(lyph2 => {
                if (lyph === lyph2 || !lyph.axis || !lyph2.axis) { return; }
                ["source", "target"].forEach(end => {
                    let link = modelClasses["Link"].fromJSON({
                        "id"    : end.charAt(0) + "_" + lyph.id + "_" + lyph2.id,
                        "source": lyph.axis[end],
                        "target": lyph2.axis[end],
                        "length": 0.1,
                        "type"  : LINK_TYPES.FORCE
                    });
                    this._graphData.links.push(link);
                    coalescenceGroup.links.push(link);
                });
            })
        });

        console.info("ApiNATOMY graph: ", this._graphData);
    }

    get graphData(){
        return this._graphData;
    }
}