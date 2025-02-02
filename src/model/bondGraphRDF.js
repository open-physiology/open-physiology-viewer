import * as rdf from "rdflib";

const prefixes = {
    rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd:  'http://www.w3.org/2001/XMLSchema#',
    bg:   'http://celldl.org/ontologies/bondgraph#',
    lib:  'http://celldl.org/templates/vascular#',
    tpl:  'http://celldl.org/ontologies/model-template#', //This does not exist yet
    //TODO Added this to get rid of "JS error, Profile: NamedNode IRI must be absolute"
    apinatomy: 'http://apinatomy.org/models/vascular#',
};

const ns = {};
for (const [key, value] of Object.entries(prefixes)) {
    ns[key] = rdf.Namespace(value);
}

export function addTemplate(store, templateName){
    const segmentTemplate = ns.lib(templateName);
    store.add(segmentTemplate, ns.rdf('type'), ns.tpl('Template'));
    store.add(segmentTemplate, ns.rdfs('label'), rdf.literal('Vascular segment template'));
    store.add(segmentTemplate, ns.bg('model'), rdf.sym('https://models.physiomeproject.org/exposure/segment-model'));

    // Add ports
    const port1 = rdf.blankNode();
    store.add(port1, ns.rdf('type'), ns.tpl('Port'));
    store.add(port1, ns.tpl('id'), ns.lib(`${templateName}-node-1`));
    store.add(port1, ns.rdfs('label'), rdf.literal('Input pressure'));

    const port2 = rdf.blankNode();
    store.add(port2, ns.rdf('type'), ns.tpl('Port'));
    store.add(port2, ns.tpl('id'), ns.lib(`${templateName}-node-2`));
    store.add(port2, ns.rdfs('label'), rdf.literal('Output pressure'));

    store.add(segmentTemplate, ns.tpl('port'), port1);
    store.add(segmentTemplate, ns.tpl('port'), port2);

    // Add parameters
    const parameter = rdf.blankNode();
    store.add(parameter, ns.rdf('type'), ns.tpl('Parameter'));
    store.add(parameter, ns.tpl('id'), ns.lib('segment-parameter-1'));
    store.add(parameter, ns.rdfs('label'), rdf.literal('Parameter description'));

    // Units, min, max, and default values can be added here as additional triples.
    store.add(segmentTemplate, ns.tpl('parameter'), parameter);

    // Add states
    const state = rdf.blankNode();
    store.add(state, ns.rdf('type'), ns.tpl('State'));
    store.add(state, ns.tpl('id'), ns.lib('segment-state-1'));
    store.add(state, ns.rdfs('label'), rdf.literal('State description'));
    // Units, min, max, and default values can be added here as additional triples.

    store.add(segmentTemplate, ns.tpl('state'), state);
}

function addComponent(store, model, template, port1, port2, id1, id2) {
    const component = rdf.blankNode();
    store.add(model, ns.bg('component'), component);
    store.add(component, ns.tpl('template'), template);

    const connection1 = rdf.blankNode();
    store.add(component, ns.tpl('connection'), connection1);
    store.add(connection1, ns.tpl('port'), port1);
    store.add(connection1, ns.tpl('id'), id1);

    const connection2 = rdf.blankNode();
    store.add(component, ns.tpl('connection'), connection2);
    store.add(connection2, ns.tpl('port'), port2);
    store.add(connection2, ns.tpl('id'), id2);
}

export function createBGLink(store, componentName, templateName, source, target) {
    const model = ns.apinatomy(componentName);
    store.add(model, ns.rdf('type'), ns.bg('Model'));
    addComponent(store, model,
        ns.lib(templateName),
        ns.lib(`${templateName}-node-1`),
        ns.lib(`${templateName}-node-2`),
        ns.tpl(`${source}`),
        ns.tpl(`${target}`)
    );
}