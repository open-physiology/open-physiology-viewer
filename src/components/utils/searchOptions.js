import {$Field, $SchemaClass} from "../../model";

export class SearchOptions {
    static addOptions(resources, searchOptions, clsName, prefix) {
        (resources || []).forEach(e => searchOptions.push({
            id: prefix + e.id,
            label: (e.name || '?') + ' (' + prefix + e.id + ')',
            type: e.isTemplate ? 'Template' : clsName
        }));
    }

    /**
     * Returns a list of lyph and material names joint with identifiers for search boxes in the GUI components
     * @param model
     * @returns {{id: *, label: string, type: string}[]}
     */
    static materialsAndLyphs(model, searchOptions = [], prefix = "") {
        this.addOptions(model.materials, searchOptions, $SchemaClass.Material, prefix);
        this.addOptions((model.lyphs || []).filter(e => e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
        this.addOptions((model.lyphs || []).filter(e => !e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
        (model.groups || []).forEach(g => {
            if (g.imported && g.namespace !== model.namespace) {
                this.materialsAndLyphs(g, searchOptions, g.namespace + ":");
            }
        });
        return searchOptions;
    }

    /**
     * Returns a list of lyph names joint with identifiers for search boxes in the GUI components
     * @param model
     * @returns {{id: *, label: string, type: string}[]}
     */
    static lyphs(model, searchOptions = [], prefix = "") {
        this.addOptions((model.lyphs || []).filter(e => e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
        this.addOptions((model.lyphs || []).filter(e => !e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
        //Imported
        (model.groups || []).forEach(g => {
            if (g.imported && g.namespace !== model.namespace) {
                this.lyphs(g, searchOptions, g.namespace + ":");
            }
        });
        return searchOptions;
    }

    static lyphTemplates(model, searchOptions = [], prefix = "") {
        this.addOptions((model.lyphs || []).filter(e => e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
        //Imported
        (model.groups || []).forEach(g => {
            if (g.imported && g.namespace !== model.namespace) {
                this.lyphTemplates(g, searchOptions, g.namespace + ":");
            }
        });
        return searchOptions;
    }

    static materialsAndLyphTemplates(model, searchOptions = [], prefix = "") {
        this.addOptions(model.materials, searchOptions, $SchemaClass.Material, prefix);
        this.addOptions((model.lyphs || []).filter(e => e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
        //Imported
        (model.groups || []).forEach(g => {
            if (g.imported && g.namespace !== model.namespace) {
                this.materialsAndLyphTemplates(g, searchOptions, g.namespace + ":");
            }
        });
        return searchOptions;
    }


    /**
     * Returns a list of lyph and material names joint with identifiers for search boxes in the GUI components
     * @param model
     * @param searchOptions
     * @param prefix
     * @returns {{id: *, label: string, type: string}[]}
     */
    static all(model, searchOptions = [], prefix = "") {
        let classNames = [$SchemaClass.Material, $SchemaClass.Lyph, $SchemaClass.Link, $SchemaClass.Node,
            $SchemaClass.Coalescence, $SchemaClass.Wire, $SchemaClass.Anchor, $SchemaClass.Region];
        [$Field.materials, $Field.lyphs, $Field.links, $Field.nodes, $Field.coalescences,
            $Field.wires, $Field.anchors, $Field.regions].forEach((prop, i) => {
            (model[prop] || []).forEach(e => searchOptions.push({
                id: e.id,
                label: (e.name || '?') + ' (' + e.id + ')',
                type: e.isTemplate ? 'Template' : classNames[i]
            }));
        });
        (model.groups || []).forEach(g => {
            if (g.imported && g.namespace !== model.namespace) {
                this.all(g, searchOptions, g.namespace + ":");
            }
        });
        return searchOptions;
    }
}