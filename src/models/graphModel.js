import { Group } from './groupModel';
import {entries, keys, isNumber, cloneDeep, defaults} from 'lodash-bound';
import { Validator} from 'jsonschema';
import * as schema from '../data/graphScheme.json';
import { Link, LINK_GEOMETRY } from "./linkModel";
import {Node} from "./nodeModel";

const validator = new Validator();

/**
 * Main APiNATOMY graph (a group with configuration options for the model viewer)
 */
export class Graph extends Group{

    static fromJSON(json, modelClasses = {}) {
        let resVal = validator.validate(json, schema);
        if (resVal.errors && resVal.errors.length > 0){ console.warn(resVal); }

        let model = json::cloneDeep()::defaults({
            id: "mainModel"
        });

        //Copy existing entities to a map to enable nested model instantiation
        let entitiesByID = {
            "waitingList": {}
        };

        //Check that lyphs are not conveyed by more than one link
        let conveyingLyphMap = {};
        (model.links||[]).filter(lnk => lnk.conveyingLyph).forEach(lnk => {
            if (lnk.conveyingLyph.isTemplate){
                console.warn("It is not allowed to use templates as conveying lyphs: ", lnk.conveyingLyph);
                delete lnk.conveyingLyph;
            }
            if (!conveyingLyphMap[lnk.conveyingLyph]){
                conveyingLyphMap[lnk.conveyingLyph] = lnk.conveyingLyph;
            } else {
                console.error("It is not allowed to use the same lyph as conveying lyph " +
                    "for multiple processes (links): ", lnk.conveyingLyph);
            }
        });

        //Create graph
        let res = super.fromJSON(model, modelClasses, entitiesByID);

        //Auto-create missing definitions for used references
        let added = [];
        entitiesByID.waitingList::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class){
                let clsName = modelClasses[obj.class].Model.relClassNames[key];
                if (clsName && (clsName !== "Shape")){ //TODO exclude all abstract classes
                    let e = modelClasses[clsName].fromJSON({"id": id}, modelClasses, entitiesByID);

                    //Include newly created entity to the main graph
                    let prop = this.Model.getRelNameByClsName(clsName);
                    if (prop) {
                        res[prop] = res[prop] ||[];
                        res[prop].push(e);
                    }
                    obj[key] = entitiesByID[e.id] = e;
                    added.push(e.id);
                }
            }
        });
        if (added.length > 0){
            added.forEach(id => delete entitiesByID.waitingList[id]);
            console.warn("Auto-created missing resources:", added);
        }

        if (entitiesByID.waitingList::keys().length > 0){
            console.warn("Incorrect model - found references to undefined resources: ", entitiesByID.waitingList);
        }
        res.syncRelationships(modelClasses, entitiesByID);
        res.createAxesForInternalLyphs(modelClasses, entitiesByID);

        res.entitiesByID = entitiesByID;

        //Create a coalescence group and force links to bind coalescing lyphs
        let coalescenceGroup = (res.groups||[]).find(g => g.id === "coalescences");
        if (!coalescenceGroup){
            coalescenceGroup = Group.fromJSON({
                "id"      : "coalescences",
                "name"    : "Coalescences",
                "inactive": true
            });
            res.groups = res.groups || [];
            res.groups.push(coalescenceGroup);
            entitiesByID[coalescenceGroup.id] = coalescenceGroup;
        }
        coalescenceGroup.links = coalescenceGroup.links||[];

        const createCoalescenceForces = (graph) => {
            (graph.lyphs||[]).filter(lyph => lyph.coalescesWith).forEach(lyph => {
                lyph.coalescesWith.forEach(lyph2 => {
                    if (lyph === lyph2 || (lyph.layers||[]).find(l => l.id === lyph2.id)
                        || (lyph.internalLyphs||[]).find(l => l.id === lyph2.id)){
                        console.warn("A lyph cannot coalesce with itself or its content", lyph, lyph2);
                        return;
                    }
                    if (!lyph.axis || !lyph2.axis) {
                        console.warn("A coalescing lyph is missing an axis", !lyph.axis? lyph: lyph2);
                        return;
                    }

                    ["source", "target"].forEach(end => {
                        let link = Link.fromJSON({
                            "id"       : end.charAt(0) + "_" + lyph.id + "_" + lyph2.id,
                            "source"   : lyph.axis[end],
                            "target"   : lyph2.axis[end],
                            "length"   : 0.1,
                            "geometry" : LINK_GEOMETRY.FORCE
                        });
                        graph.links.push(link);
                        coalescenceGroup.links.push(link);
                        entitiesByID[link.id] = link;
                    });
                })
            });
        };
        createCoalescenceForces(res);

        //Double link length so that 100% from the view length is turned into 100% from coordinate axis length
        (res.links||[]).filter(link => link.length).forEach(link => link.length *= 2);

        return res;
    }

    /**
     * Auto-generates links for internal lyphs
     * @param entitiesByID - a global resource map to include the generated resources
     */
    createAxesForInternalLyphs(modelClasses, entitiesByID){
        const createAxis = (lyph, container) => {
            let [sNode, tNode] = ["s", "t"].map(prefix => (
                Node.fromJSON({
                    "id"       : `${prefix}${lyph.id}`,
                    "name"     : `${prefix}${lyph.id}`,
                    "color"    : "#ccc",
                    "val"      : 0.1,
                    "skipLabel": true
                })));

            let link = Link.fromJSON({
                "id"           : `${lyph.id}-lnk`,
                "source"       : sNode,
                "target"       : tNode,
                "length"       : container && container.axis? container.axis.length * 0.8 : 5,
                "geometry"     : LINK_GEOMETRY.INVISIBLE,
                "color"        : "#ccc",
                "conveyingLyph": lyph,
                "skipLabel"    : true
            });
            lyph.conveyedBy = link;
            sNode.sourceOf = [link];
            tNode.targetOf = [link];

            if (!this.links) {this.links = [];}
            if (!this.nodes) {this.nodes = [];}
            this.links.push(link);
            [sNode, tNode].forEach(node => this.nodes.push(node));
        };

        //This runs before syncRelationships, it is important to revise all group lyphs!
        [...(this.lyphs||[]), ...(this.regions||[])]
            .filter(lyph => lyph.internalIn && !lyph.axis).forEach(lyph => createAxis(lyph, lyph.internalIn));
    }

    optionsProvider(clsName, id = undefined){
        let res = (this.entities||[]).filter(e => e.class === clsName);
        if (id) {
            //TODO exclude other invalid options
            res = res.filter(e => e.id !== id);
        }
    }

    scale(scaleFactor){
        const scalePoint = p => p::keys().filter(key => p[key]::isNumber()).forEach(key => {
                p[key] *= scaleFactor;
            });

        (this.lyphs||[]).forEach(lyph => {
            if (lyph.width)  {lyph.width  *= scaleFactor}
            if (lyph.height) {lyph.height *= scaleFactor}
        });
        (this.nodes||[]).filter(node => node.layout).forEach(node => scalePoint(node.layout));
        (this.links||[]).filter(link => link.length).forEach(link => link.length *= scaleFactor);
        (this.regions||[]).filter(region => region.points).forEach(region =>
           region.points.forEach(p => scalePoint(p)));
    }

    get coalescenceGroup(){
        return (this.groups||[]).find(g => g.id === "coalescences");
    }


}
