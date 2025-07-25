import {Resource} from './resourceModel';
import {Node} from './verticeModel';
import {Link} from './edgeModel';
import {Lyph} from './shapeModel';

import {isObject, unionBy, merge, keys, entries, isArray, pick, flatten} from 'lodash-bound';
import {
    $SchemaClass,
    $Field,
    $Color,
    $Prefix,
    schemaClassModels,
    getGenID,
    addColor,
    findResourceByID,
    getID,
    showGroups,
    getRefNamespace,
    refToResource,
    mergeGenResource,
    genResource,
    mergeRecursively, isIncluded, includeRef
} from './utils';
import {logger, $LogMsg} from './logger';

/**
 * Group (subgraph) in the connectivity model
 * @class
 * @property nodes
 * @property links
 * @property regions
 * @property lyphs
 * @property materials
 * @property references
 * @property groups
 * @property trees
 * @property channels
 * @property chains
 * @property coalescences
 * @property scaffolds
 * @property hostedBy
 * @property varianceSpecs
 * @property entitiesByID
 */
export class Group extends Resource {
    /**
     * Create a graph model from the JSON specification
     * @param json - input model
     * @param modelClasses - model resource classes
     * @param entitiesByID - global map of model resources
     * @param defaultNamespace
     * @returns {*} - Graph model - model suitable for visualization
     */
    static fromJSON(json, modelClasses = {}, entitiesByID, defaultNamespace) {
        json.class = json.class || $SchemaClass.Group;
        let namespace = json.namespace || defaultNamespace;

        if (json.generated) {
            return super.fromJSON(json, modelClasses, entitiesByID, namespace);
        }

        modelClasses.Chain.validateRoots(json.chains, json.nodes);

        /******************************************************************************************************/
        //create graph resource
        let res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        //copy nested references to resources to the parent group

        //Assign color to visual resources with no color in the spec
        addColor(res.links, $Color.Link);
        addColor(res.lyphs);

        res.assignScaffoldComponents();
        return res;
    }

    get clades() {
        return Array.from(new Set((this.varianceSpecs || []).map(vs => vs.clades || [])::flatten()));
    }

    getVarianceSpecForClade(clade) {
        let varianceSpecs = (this.varianceSpecs || []).filter(vs => vs.clades || []);

    }

    contains(resource, recursive = false) {
        let res = false;
        if (resource instanceof Node) {
            res = isIncluded(this.nodes, resource.id);
        }
        if (resource instanceof Lyph) {
            res = res || isIncluded(this.lyphs, resource.id);
        }
        if (resource instanceof Link) {
            res = res || isIncluded(this.links, resource.id);
        }
        if (recursive) {
            (this.groups || []).forEach(g => res = res || (g.contains && g.contains(resource)));
        }
        return res;
    }

    deleteFromGroup(lyph) {
        if (this.entitiesByID && this.entitiesByID[lyph.fullID]) {
            delete this.entitiesByID[lyph.fullID];
        }
        if (this.lyphsByID && this.lyphsByID[lyph.fullID]) {
            delete this.lyphsByID[lyph.fullID];
        }
        let idx = (this.lyphs || []).findIndex(e => e.fullID === lyph.fullID);
        if (idx > -1) {
            this.lyphs.splice(idx, 1);
        }
        if (this.coalescences) {
            this.coalescences = this.coalescences.filter(c => (c.lyphs || []).length > 1);
        }
        (this.groups || []).forEach(g => g.deleteFromGroup(lyph));
    }

    /**
     * Include related to resources to the group: node clones, internal lyphs and nodes
     */
    includeRelated() {
        //Add auto-created clones of boundary nodes and collapsible links, conveying lyphs,
        //internal nodes and internal lyphs to the group that contains the original lyph
        [$Field.lyphs, $Field.nodes, $Field.links].forEach(prop => {
            (this[prop] || []).forEach(res => {
                res.includeRelated && res.includeRelated(this);
                res.inGroups = res.inGroups || [];
                includeRef(res.inGroups, this);
            });
        });

        //If a group is hosted by a region, each its lyph is hosted by the region
        let host = this.hostedBy || this.generatedFrom && this.generatedFrom.hostedBy;
        if (host && host::isObject()) {
            host.hostedLyphs = host.hostedLyphs || [];
            (this.links || []).filter(link => link.conveyingLyph && !link.conveyingLyph.internalIn).forEach(link => {
                link.conveyingLyph.hostedBy = host;
                includeRef(host.hostedLyphs, link.conveyingLyph.id);
            });
            (this.nodes || []).forEach(node => node.charge = 20);
        }
        if (this.hidden){
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Generate a (dynamic) group
     * @param id
     * @param name
     * @param nodes
     * @param links
     * @param lyphs
     * @param modelClasses
     * @returns {*}
     */
    createGroup(id, name, nodes, links, lyphs, modelClasses) {
        const resources = {
            [$Field.nodes]: nodes,
            [$Field.links]: links,
            [$Field.lyphs]: lyphs
        }
        let group = findResourceByID(this.groups, id);
        let json = group || genResource({
            [$Field.id]: id,
            [$Field.name]: name
        }, "groupModel.createGroup (Group)");
        if (group) {
            [$Field.nodes, $Field.links, $Field.lyphs].forEach(prop => {
                group[prop] = (group[prop] || [])::unionBy(resources[prop], $Field.fullID);
                group[prop] = group[prop].filter(x => !!x && x.class);
            });
        } else {
            [$Field.nodes, $Field.links, $Field.lyphs].forEach(prop => json[prop] = resources[prop].map(e => e.fullID));
            group = modelClasses.Group.fromJSON(json, modelClasses, this.entitiesByID, this.namespace);
            this.groups.push(group);
        }
        group.description = "dynamic";
        return group;
    }

    includeLyphAxes(lyphs, links) {
        links = links || [];
        (lyphs || []).forEach(lyph => {
            if (lyph.conveys) {
                if (!isIncluded(links, lyph.conveys.id)) {
                    links.push(lyph.conveys);
                }
            }
        });
    };

    includeLinkEnds(links, nodes) {
        (links || []).forEach(lnk => {
            includeRef(nodes, lnk.source);
            includeRef(nodes, lnk.target);
        });
        (this.links || []).forEach(lnk => {
            if (lnk.collapsible && isIncluded(nodes, lnk.source.id) && isIncluded(nodes, lnk.target.id)) {
                links.push(lnk);
            }
        });
    };

    includeConveyingLyphs(links, lyphs) {
        (links || []).forEach(lnk => includeRef(lyphs, lnk.conveyingLyph));
    };

    /**
     * Replace references to lyph templates with references to auto-generated lyphs that inherit properties from templates
     * @param parentGroup - input model
     */
    static replaceReferencesToTemplates(parentGroup) {
        let changedLyphs = 0;
        let changedMaterials = 0;

        const replaceRefToTemplate = (ref, parent, ext = null) => {
            let refID = getID(ref);
            if (refID === parent.id) {
                logger.error($LogMsg.LYPH_TEMPLATE_LOOP, refID);
            }
            let template = refToResource(refID, parentGroup, $Field.lyphs);
            if (template && template.isTemplate) {
                changedLyphs++;
                const subtypeID = getGenID($Prefix.template, refID, parent.id, ext);
                let subtype = genResource({
                    [$Field.id]: subtypeID,
                    [$Field.name]: template.name,
                    [$Field.skipLabel]: true
                }, "groupModel.replaceRefToTemplate (Lyph)");
                if (refID !== parent.id) {
                    subtype.supertype = refID;
                }
                //NK: mergeGenResource assigns namespace and fullID
                mergeGenResource(undefined, parentGroup, subtype, $Field.lyphs);
                replaceAbstractRefs(subtype, $Field.layers);
                return subtype.id;
            }
            return ref;
        };

        const replaceAbstractRefs = (resource, key) => {
            if (!resource[key]) {
                return;
            }

            const replaceRefToMaterial = (ref) => {
                let refID = getID(ref);
                let lyphID = getGenID($Prefix.lyph, refID);
                let template = refToResource(lyphID, parentGroup, $Field.lyphs);
                if (!template || !template.isTemplate) {
                    let material = refToResource(refID, parentGroup, $Field.materials);
                    if (material) {
                        template = genResource({
                            [$Field.id]: lyphID,
                            [$Field.name]: material.name,
                            [$Field.isTemplate]: true,
                            [$Field.materials]: [refID],
                            [$Field.generatedFrom]: refID,
                            [$Field.skipLabel]: true
                        }, "groupModel.replaceRefToMaterial (Lyph)");
                        template::merge(material::pick([$Field.name, $Field.external, $Field.ontologyTerms, $Field.references, $Field.color]));
                        mergeGenResource(undefined, parentGroup, template, $Field.lyphs);
                    } else {
                        if (getRefNamespace(refID, parentGroup.namespace) !== parentGroup.namespace) {
                            //Reference does not exist
                            if (!refToResource(refID, parentGroup, $Field.lyphs)) {
                                logger.error($LogMsg.MATERIAL_REF_NOT_FOUND, resource.id, key, ref);
                            }
                        }
                    }
                }
                if (template) {
                    return template.id;
                }
                return ref;
            };

            const replaceLyphTemplates = ![$Field.subtypes, $Field.supertype, $Field.lyphTemplate, $Field.housingLyphs,
                $Field.housingLyphTemplates
                //, $Field.lyphs // NK property "lyphs" are needed for coalescences?
            ].includes(key);
            if (resource[key]::isArray()) {
                resource[key] = resource[key].map(ref => replaceRefToMaterial(ref));
                if (replaceLyphTemplates) {
                    resource[key] = resource[key].map((ref, idx) => replaceRefToTemplate(ref, resource, idx));
                }
            } else {
                resource[key] = replaceRefToMaterial(resource[key]);
                if (replaceLyphTemplates) {
                    resource[key] = replaceRefToTemplate(resource[key], resource);
                }
            }
        }

        (parentGroup::entries() || []).forEach(([relName, resources]) => {
            if (!resources::isArray()) {
                return;
            }
            let classNames = schemaClassModels[$SchemaClass.Group].relClassNames;
            if (classNames[relName]) {
                let refsToLyphs = schemaClassModels[classNames[relName]].selectedRelNames($SchemaClass.Lyph);
                if (!refsToLyphs) {
                    return;
                }
                (resources || []).forEach(resource => {
                    (resource::keys() || []).forEach(key => { // Do not replace valid references to templates
                        if (refsToLyphs.includes(key)) {
                            replaceAbstractRefs(resource, key);
                        } else {
                            //keys do not point to lyphs, but to nested objects that may contain lyphs

                            //generic code checking all nested objects would slow down the generator, so we only consider
                            //chain.levels as the most common case of the use of nested object definitions
                            (resource.levels || []).forEach(level => {
                                if (level.conveyingLyph) {
                                    replaceAbstractRefs(level, $Field.conveyingLyph);
                                }
                            });
                        }
                    });
                });
            }
        });
        if (changedLyphs > 0) {
            logger.info($LogMsg.GROUP_REF_TO_LYPH, changedLyphs);
        }
        if (changedMaterials > 0) {
            logger.info($LogMsg.GROUP_REF_TO_MAT, changedMaterials);
        }
    }

    /**
     * Generate groups from group templates, i.e. auto-create necessary nodes and links conveying given or generated lyphs
     * @param parentGroup - input model
     * @param modelClasses - model resource classes
     */
    static expandChainTemplates(parentGroup, modelClasses) {
        if (!modelClasses || modelClasses === {}) {
            return;
        }
        (parentGroup.chains || []).forEach(chain => {
            //expand chain templates, but not references
            if (chain::isObject()) {
                modelClasses.Chain.expandTemplate(parentGroup, chain);
            } else {
                logger.info($LogMsg.GROUP_TEMPLATE_OTHER, chain);
                parentGroup.groups = parentGroup.groups || [];
                parentGroup.groups.push(getGenID($Prefix.group, chain));
            }
        });
    }

    /**
     * Generate group template instances
     * @param json - input model
     * @param modelClasses - model resource classes
     */
    static createTemplateInstances(json, modelClasses) {
        if (!modelClasses) {
            return;
        }

        let relClassNames = schemaClassModels[$SchemaClass.Group].relClassNames;
        [$Field.trees, $Field.channels].forEach(relName => {
            let clsName = relClassNames[relName];
            if (!clsName) {
                logger.error($LogMsg.GROUP_TEMPLATE_NO_CLASS, relName);
            }
            (json[relName] || []).forEach(field => modelClasses[clsName].createInstances(json, field));
        })
    }

    /**
     * Create lyphs that inherit properties from templates
     * @param parentGroup
     * @param modelClasses - model resource classes
     */
    static expandLyphTemplates(parentGroup, modelClasses) {
        (parentGroup.lyphs || []).forEach(lyph => {
            if (lyph.isTemplate) {
                modelClasses.Lyph.expandTemplate(parentGroup, lyph);
            }
        });
        (parentGroup.lyphs || []).forEach(lyph => delete lyph._inactive);
    }

    /**
     * Generate subgraphs to model villi
     * @param parentGroup - input model
     * @param modelClasses - model resource classes
     */
    static expandVillusTemplates(parentGroup, modelClasses) {
        (parentGroup.lyphs || []).forEach(lyph => {
            if (lyph.villus) {
                lyph.villus.villusOf = lyph.id;
                modelClasses.Villus.expandTemplate(parentGroup, lyph.villus);
            }
        });
    }

    /**
     * Generate subgraphs to model housed chains
     * @param parentGroup - input model
     * @param modelClasses - model resource classes
     */
    static embedChainsToHousingLyphs(parentGroup, modelClasses) {
        (parentGroup.chains || []).forEach(chain => modelClasses.Chain.embedToHousingLyphs(parentGroup, chain));
        (parentGroup.chains || []).forEach(chain => {
            if (chain.housingLyphTemplates) {
                modelClasses.Chain.replicateToHousingLyphSubtypes(parentGroup, chain);
            } else {
                if (chain.isTemplate) {
                    logger.error($LogMsg.CHAIN_HOUSING_TEMPLATE, chain.id);
                }
            }
        });
    }

    assignHousingLyphs() {
        (this.lyphs || []).forEach(lyph => {
            let axis = lyph.axis;
            let housingLyph = axis && (axis.fasciculatesIn || axis.endsIn);
            if (housingLyph) {
                lyph.housingLyph = housingLyph;
            }
        });
    }

    markImported() {
        if (this.imported) {
            let relFieldNames = schemaClassModels[$SchemaClass.Group].filteredRelNames();
            relFieldNames.forEach(prop => {
                if (this[prop]::isArray()) {
                    this[prop]?.forEach(r => r.imported = true)
                } else {
                    if (this[prop]::isObject()) {
                        this[prop].imported = true;
                    }
                }
            });
        }
    }

    /**
     * Add resources from subgroups to the current group
     */
    mergeSubgroupResources() {
        let relFieldNames = schemaClassModels[$SchemaClass.Group].filteredRelNames([$SchemaClass.GroupTemplate])
            .filter(prop => ![$Field.seed, $Field.seedIn].includes(prop));
        mergeRecursively(this, $Field.groups, relFieldNames, $LogMsg.GROUP_SELF);
    }

    /**
     * Entities that belong to the group (resources excluding subgroups)
     * @returns {*[]}
     */
    get resources() {
        let res = [];
        let relFieldNames = schemaClassModels[$SchemaClass.Group].filteredRelNames([$SchemaClass.Group]);
        relFieldNames.forEach(property => res = res::unionBy((this[property] || []), $Field.fullID));
        return res.filter(r => r && r::isObject());
    }

    /**
     * Show subgroups of the current group. A resources is shown if it belongs to at least one visible subgroup
     * @param ids - selected subgroup identifiers
     */
    showGroups(ids) {
        showGroups(this.groups || [], ids);
    }

    /**
     * Hide current group (=hide all its entities)
     */
    hide() {
        this.hidden = true;
        this.resources.forEach(entity => {
            let visibleGroups = (entity.inGroups||[]).filter(g => !g.hidden);
            if (visibleGroups.length <= 1) entity.hidden = true;
        });
    }

    /**
     * Show current group (=show all its entities)
     */
    show() {
        this.hidden = false;
        this.resources.forEach(entity => delete entity.hidden);
    }

    /**
     * Groups that can be toggled on or off in the global graph
     * @returns {*[]}
     */
    get activeGroups() {
        return [...(this.groups || [])].filter(e => !e.inactive && (e.description !== "dynamic"));
    }

    get dynamicGroups() {
        return [...(this.groups || [])].filter(e => e.description === "dynamic");
    }

    get visibleGroups() {
        return [...(this.groups || [])].filter(e => !e.hidden);
    }

    assignScaffoldComponents() {
        const res = [...(this.scaffolds || [])];
        (this.scaffolds || []).forEach(scaffold =>
            (scaffold.components || []).forEach(component => {
                component._parent = scaffold;
                res.push(component);
            }));
        this.scaffoldComponents = res;
    }

    /**
     * Visible nodes
     * @returns {*[]}
     */
    get visibleNodes() {
        return (this.nodes || []).filter(e => e.isVisible);
    }

    /**
     * Visible links
     * @returns {*[]}
     */
    get visibleLinks() {
        return (this.links || []).filter(e => e.isVisible);
    }

    /**
     * Visible lyphs
     * @returns {*[]}
     */
    get visibleLyphs() {
        return (this.lyphs || []).filter(e => e.isVisible && e.axis && e.axis.isVisible);
    }

    get create3d() {
        return (this.lyphs || []).find(e => e.create3d);
    }


}

