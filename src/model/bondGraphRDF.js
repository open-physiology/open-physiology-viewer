import * as rdf from "rdflib";


export function createBG(bgLinks) {
    const store = rdf.graph();

    const prefixes = {
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
        cdt: 'https://w3id.org/cdt/',
        bg: 'http://celldl.org/ontologies/bond-graph#',
        lib: 'http://celldl.org/templates/vascular#',
        tpl: 'http://celldl.org/ontologies/model-template#'
    };

    const ns = {};
    for (const [key, value] of Object.entries(prefixes)) {
        ns[key] = rdf.Namespace(value);
    }

    const fake = "http://xxx.com#";
    const empty = "http://yyy.com#";

    function addComponent(store, model, templateName, input, output, params, values, isInput, isOutput) {
        const component = rdf.blankNode();
        const interface1 = rdf.blankNode();
        const interface2 = rdf.blankNode();
        const interface3 = rdf.blankNode();
        const quantities = rdf.blankNode();

        store.add(interface1, ns.bg('node'),  rdf.sym(empty+"u_"+input));
        store.add(interface1, ns.tpl('node'), rdf.sym(fake+params[0]));
        store.add(interface2, ns.bg('node'),  rdf.sym(empty+"v_"+output));
        store.add(interface2, ns.tpl('node'), rdf.sym(fake+params[1]));
        store.add(interface3, ns.bg('node'),  rdf.sym(empty+"u_" + output));
        store.add(interface3, ns.tpl('node'), rdf.sym(fake+params[2]));

        store.add(component, ns.tpl('template'), ns.lib(templateName));
        store.add(component, ns.tpl('interface'), interface1);
        store.add(component, ns.tpl('interface'), interface2);
        store.add(component, ns.tpl('interface'), interface3);

        store.add(model, ns.bg('component'), component);

        const ucum = rdf.namedNode(ns.cdt('ucum'));
        if (isInput) {
            store.add( rdf.sym(empty+"u_"+input), ns.bg('value'), rdf.literal(values[0], ucum));
        } else {
            if (isOutput) {
                store.add( rdf.sym(empty+"u_"+output), ns.bg('value'), rdf.literal(values[2], ucum));
            } else {
                store.add( rdf.sym(empty+"v_"+output), ns.bg('quantities'), quantities);
                store.add(quantities, ns.bg('quantity'), ns.lib('resistance'));
                store.add(quantities, ns.bg('name'),  rdf.sym(empty+'R_'+output));
                store.add(quantities, ns.bg('value'), rdf.literal(values[1], ucum));
            }
        }
    }

    function createBGLink(store, componentName, templateName, source, target, isInput, isOutput) {
        const model = rdf.sym(empty+componentName);
        store.add(model, ns.rdf('type'), ns.bg('Model'));
        store.add(model, ns.rdfs('label'), rdf.literal('ApiNATOMY model'));

        addComponent(store, model,
            templateName,
            source, target,
            ["pressure_1", "flow", "pressure_2"],
            ['16 kPa', '100 kPa.s/L', '5 kPa'],
            isInput, isOutput
        );
    }

    bgLinks.forEach(link => {
        const isInput = (link.source.targetOf || []).filter(lnk => lnk.isVisible && lnk.geometry !== "invisible").length === 0;
        const isOutput = (link.target.sourceOf || []).filter(lnk => lnk.isVisible && lnk.geometry !== "invisible").length === 0;
        createBGLink(store, 'apinatomy-model', 'segment-template', link.source.id, link.target.id, isInput, isOutput);
    });
    return store;
}

