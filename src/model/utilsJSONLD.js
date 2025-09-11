import {entries, isObject, merge, values} from "lodash-bound";
import schema from "./graphScheme.json";

let baseContext = {
    "@version": 1.1,
    "apinatomy": {
        "@id": "https://apinatomy.org/uris/readable/",
        "@prefix": true
    },
    "elements": {
        "@id": "https://apinatomy.org/uris/elements/",
        "@prefix": true
    },
    "owl": {
        "@id": "http://www.w3.org/2002/07/owl#",
        "@prefix": true
    },
    "rdf": {
        "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "@prefix": true
    },
    "rdfs": {
        "@id": "http://www.w3.org/2000/01/rdf-schema#",
        "@prefix": true
    },
    "name": "rdfs:label",
    "fullID": "@id",
    "class": {
        "@id": "rdf:type",
        "@type": "@id",
        "@context": {"@base": "https://apinatomy.org/uris/elements/"}
    },
    "topology": {
        "@id": "apinatomy:topology",
        "@type": "@id",
        "@context": {"@base": " "}
    },
};

/**
 * Generate a json-ld context from a json schema
 */
function schemaToContext(schema, context, id = null, prefix = "apinatomy:") {

    function schemaIsId(scm) {
        return scm::isObject() && (
            scm["$ref"] === "#/definitions/IdentifierScheme" ||
            scm.items && schemaIsId(scm.items) ||
            scm.anyOf && scm.anyOf.filter(schemaIsId).length !== 0);
    }

    if (schema.definitions) {
        schema.definitions::values().forEach(def => schemaToContext(def, context));
    } else {
        if (id !== null && schemaIsId(schema)) {
            context[id] = {
                "@id": prefix.concat(id),
                "@type": "@id"
            };
        } else {
            if (schema.properties) {
                schema.properties::entries()
                    .forEach(([pid, prop]) =>
                        context[pid] = schemaIsId(prop) ? {
                            "@id": prefix.concat(pid),
                            "@type": "@id"
                        } : prefix.concat(pid));
            }
        }
    }
    return context;
}

export function addJSONLDType(obj) {
    obj.class === "OntologyTerm" ?
        obj["@type"] = "owl:Class" :
        obj["@type"] = "owl:NamedIndividual";
    return obj;
}

export function getJSONLDContext(inputModel) {
    const m = "https://apinatomy.org/uris/models/";
    const uri = m.concat(inputModel.id);

    let curiesContext = {};
    (inputModel.localConventions || []).forEach((obj) =>
        curiesContext[obj.prefix] = {"@id": obj.namespace, "@prefix": true});

    let localContext = {
        "@base": uri.concat("/ids/"),
    };

    let contextPrefix = "local"; // FIXME not sure what the issue is here with "" ...
    localContext[contextPrefix] = localContext["@base"];

    let schemaContext = schemaToContext(schema, {});
    // local first so that any accidental collisions don't break everything
    // raw last so that it can override the autogen behavior
    let contexts = [localContext,
        curiesContext,
        schemaContext,
        baseContext];
    let context = {};
    contexts.forEach(sourceContext => context::merge(sourceContext));

    return ({
        "@context": context,
        "@graph": [
            {
                "@id": uri,
                "@type": ["apinatomy:GraphMetadata", "owl:Ontology"],
                "rdfs:label": inputModel.name,
                "apinatomy:hasGraph": {"@id": context["@base"].concat(inputModel.id)},
            }
        ]
    });
}