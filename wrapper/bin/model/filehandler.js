const fs = require('fs');
const axios = require("axios");
const converter = require('../../../dist/converter');
const conversionSteps = {
    "id": "xlsx",
    "xlsx": "json",
    "json": "json-resources",
    "json-resources": "json-ld",
    "json-ld": "json-flattened",
};

const convertedExtensions = {
    "xlsx": ".xlsx",
    "json": ".json",
    "json-resources": "-generated.json",
    "json-ld": ".jsonld",
    "json-flattened": "-flattened.jsonld",
};


class ConversionHandler {
    _date = new Date();
    _destination_folder = "converted-" + this._date.toISOString().replace('T', '_').replace(/:|\./g, '-');
    constructor(from, to, input, output) {
        if (from === undefined || input === undefined) {
            throw new Error('The input has not been provided.');
        }

        if (output) {
            this._destination_folder = output;
        }

        if (!fs.existsSync(this._destination_folder)) {
            fs.mkdirSync(this._destination_folder);
        } else {
            this._destination_folder = this._destination_folder + this._date.toISOString().replace('T', '_').replace(/:|\./g, '-');
            fs.mkdirSync(this._destination_folder);
            console.log("The output folder given already exists, the data are saved in " + this._destination_folder);
        }

        this.to = to;
        this.from = from;
        this.input = input;
        this.result = this.input;
    };

    _conversion_methods = {
        "id": async (input) => {
            return this.#fromIdToXlsx(input);
        },
        "xlsx": (input) => {
            return this.#fromXlsxToJson(input);
        },
        "json": (input) => {
            return this.#fromJsonToGenerated(input);
        },
        "json-resources": (input) => {
            return this.#fromGeneratedToLD(input);
        },
        "json-ld": async (input) => {
            return this.#fromLDToFlattened(input);
        }
    };

    async #fromIdToXlsx(id) {
        var that = this;
        const file_id = that._destination_folder + "/model_id.txt"
        fs.writeFileSync(file_id, id);
        const url = "https://docs.google.com/spreadsheets/d/" + id + "/export?format=xlsx";
        return await axios.get(
            url,
            {
                responseType: 'arraybuffer',
                headers: {
                    Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }}).then(res => {
            const _filename = that._destination_folder + "/model" + convertedExtensions["xlsx"];
            fs.writeFileSync(_filename, res.data);
            return _filename;
        });
    }

    #fromXlsxToJson(file) {
        try {
            if (fs.existsSync(file)) {
                const filename = this._destination_folder + "/model" + convertedExtensions["json"];
                const _xlsx = fs.readFileSync(file, 'binary');
                const _json_model = converter.fromXLSXToJson(_xlsx);
                fs.writeFileSync(filename, _json_model);
                return filename;
            } else {
                throw new Error('The file given in input does not exist or is not located where specified.')
            }
        } catch(err) {
            throw new Error('An error has been encoutered during the conversion from XLSX to Json.')
        }
    }

    #fromJsonToGenerated(file) {
        try {
            if (fs.existsSync(file)) {
                const filename = this._destination_folder + "/model" + convertedExtensions["json-resources"];
                const _json = fs.readFileSync(file, 'binary');
                const _generated = converter.fromJsonToGenerated(_json);
                fs.writeFileSync(filename, _generated);
                return filename;
            } else {
                throw new Error('The file given in input does not exist or is not located where specified.')
            }
        } catch(err) {
            throw new Error('An error has been encoutered during the conversion from XLSX to Json.')
        }
    }

    #fromGeneratedToLD(file) {
        try {
            if (fs.existsSync(file)) {
                const filename = this._destination_folder + "/model" + convertedExtensions["json-ld"];
                const _generated = fs.readFileSync(file, 'binary');
                const result = converter.fromGeneratedToJsonLD(_generated);
                fs.writeFileSync(filename, result);
                return filename;
            } else {
                throw new Error('The file given in input does not exist or is not located where specified.')
            }
        } catch(err) {
            throw new Error('An error has been encoutered during the conversion from XLSX to Json.')
        }
    }

    #fromLDToFlattened(file) {
        try {
            if (fs.existsSync(file)) {
                const filename = this._destination_folder + "/model" + convertedExtensions["json-flattened"];
                const _jsonld = fs.readFileSync(file, 'binary');
                const _callback = function callback(res) {
                    const _flattened = JSON.stringify(res, null, 2);
                    fs.writeFileSync(filename, _flattened);
                    return filename;
                };
                converter.fromJsonLDToFlattened(_jsonld, _callback);
            } else {
                throw new Error('The file given in input does not exist or is not located where specified.')
            }
        } catch(err) {
            throw new Error('An error has been encoutered during the conversion from XLSX to Json.')
        }
    }

    #cancelIntermediateSteps() {
        for (const step of Object.keys(conversionSteps)) {
            if (conversionSteps[step] == this.to) {
                break;
            }
            fs.unlinkSync(this._destination_folder + "/model" + convertedExtensions[conversionSteps[step]]);
        }
    }

    async convertAll() {
        let startConverting = false;
        if (this.to !== undefined) {
            for (const step of Object.keys(conversionSteps)) {
                if (step === this.from || startConverting) {
                    startConverting = true;
                    this.result = await this._conversion_methods[step](this.result);
                }
                if (conversionSteps[step] == this.to) {
                    break;
                }
            }
            this.#cancelIntermediateSteps();
        } else {
            for (const step of Object.keys(conversionSteps)) {
                if (step === this.from || startConverting) {
                    startConverting = true;
                    this.result = await this._conversion_methods[step](this.result);
                }
            }
        }
    }
}

module.exports = ConversionHandler
