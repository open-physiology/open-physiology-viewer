#!/usr/bin/env node

global.self = {};
global.window = {};

const yargs = require("yargs");
const ConversionHandler = require('./model/filehandler');

const options = yargs
 .usage("Usage: ")
 .option("i", { alias: "input", describe: "Input data to convert", type: "string", demandOption: true})
 .option("o", { alias: "output", describe: "Name used for the output folder", type: "string", demandOption: false})
 .option("f", { alias: "from", describe: "From which step of the conversion we are starting", type: "string", choices: [ "id", "xlsx", "json", "json-resources", "json-ld" ], demandOption: true})
 .option("t", { alias: "to", describe: "To which step of the conversion we want to go", type: "string", choices: [ "xlsx", "json", "json-resources", "json-ld", "json-flattened" ], demandOption: false})
 .argv;

to_convert = new ConversionHandler(options.f, options.t, options.i, options.o);
to_convert.convertAll();
