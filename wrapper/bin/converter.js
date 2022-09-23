#!/usr/bin/env node
global.self = {};
global.window = {};
global.crypto = require('crypto')
global.XMLHttpRequest = require('xhr2');

const yargs = require("yargs");
const ConversionHandler = require('./model/filehandler');

const options = yargs
 .usage("Usage: ")
 .option("i", { alias: "input", describe: "Input data to convert", type: "string", demandOption: true})
 .option("o", { alias: "output", describe: "Name used for the output folder", type: "string", demandOption: false})
 .option("f", { alias: "from", describe: "From which step of the conversion we are starting", type: "string", choices: [ "id", "xlsx", "json", "json-resources", "json-ld" ], demandOption: true})
 .option("t", { alias: "to", describe: "To which step of the conversion we want to go", type: "string", choices: [ "xlsx", "json", "json-resources", "json-ld", "json-flattened" ], demandOption: false})
 .argv;

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason)
    console.error('Was called with the following options',
                  [options.f,
                   options.t,
                   (options.f.includes("id") ? options.i.slice(0, 5) : options.i),
                   options.o])
    process.exit(1)
});

to_convert = new ConversionHandler(options.f, options.t, options.i, options.o);
to_convert.convertAll();
