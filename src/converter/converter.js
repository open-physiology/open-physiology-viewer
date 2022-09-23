import {$Field} from "../model/utils";
import {loadModel, generateFromJSON, fromJSONGenerated, fromJsonLD, mergeWithImports} from '../model/modelClasses';


function fromXLSXToJson(data) {
    let model = loadModel(data, ".xlsx", "xlsx");
    return JSON.stringify(model, null, 4);
}

async function fromJsonToGenerated(data) {
    let inputModel = JSON.parse(data);
    inputModel = await mergeWithImports(inputModel);
    let graphData = generateFromJSON(inputModel);
    if (typeof graphData.neurulator === "function") {
        graphData.neurulator();
    }
    return JSON.stringify(graphData.toJSON(3, {
        [$Field.border]: 3,
        [$Field.borders]: 3,
        [$Field.villus]: 3,
        [$Field.scaffolds]: 5
    }), null, 2);
}

function fromGeneratedToJsonLD(data) {
    let _generated = JSON.parse(data);
    let _model = fromJSONGenerated(_generated);
    return JSON.stringify(_model.entitiesToJSONLD(), null, 2);
}

async function fromJsonLDToFlattened(data, _callback) {
    let _jsonLD = JSON.parse(data);
    await fromJsonLD(_jsonLD, _callback);
}

exports.fromXLSXToJson = fromXLSXToJson;
exports.fromJsonToGenerated = fromJsonToGenerated;
exports.fromGeneratedToJsonLD = fromGeneratedToJsonLD;
exports.fromJsonLDToFlattened = fromJsonLDToFlattened;
