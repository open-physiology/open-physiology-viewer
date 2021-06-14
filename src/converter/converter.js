import {$Field} from "../model/utils";
import {loadModel, fromJSON, fromJSONGenerated, fromJsonLD} from '../model/modelClasses';


function fromXLSXToJson(data) {
    let model = loadModel(data, ".xlsx", "xlsx");
    let _json_model = JSON.stringify(model, null, 4);
    return _json_model;
}

function fromJsonToGenerated(data) {
    let graphData = fromJSON(JSON.parse(data));
    let result = JSON.stringify(graphData.toJSON(3, {
        [$Field.border]   : 3,
        [$Field.borders]  : 3,
        [$Field.villus]   : 3,
        [$Field.scaffolds]: 5
    }), null, 2);
    return result;
}

function fromGeneratedToJsonLD(data) {
    let _generated = JSON.parse(data);
    let _model = fromJSONGenerated(_generated);
    let result = JSON.stringify(_model.entitiesToJSONLD(), null, 2);
    return result;
}

async function fromJsonLDToFlattened(data, _callback) {
    let _jsonLD = JSON.parse(data);
    await fromJsonLD(_jsonLD, _callback);
}


exports.fromXLSXToJson = fromXLSXToJson;
exports.fromJsonToGenerated = fromJsonToGenerated;
exports.fromGeneratedToJsonLD = fromGeneratedToJsonLD;
exports.fromJsonLDToFlattened = fromJsonLDToFlattened;
