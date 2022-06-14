const fs = require('fs');
const { expect } = require("chai");
const { execSync } = require("child_process");

const test1 = () => {
    var folder_content = ""
    execSync(`node bin/converter.js -f id -t xlsx -o test1-folder -i ${process.env['MODEL_ID']} `);
    fs.readdirSync("test1-folder").forEach(file => {
        folder_content += file;
        folder_content += "\n";
    });
    return folder_content.toString();
};


const test2 = () => {
    var folder_content = ""
    execSync(`node bin/converter.js -f xlsx -o test2-folder -i test1-folder/model.xlsx `);
    fs.readdirSync("test2-folder").forEach(file => {
        folder_content += file;
        folder_content += "\n";
    });
    return folder_content.toString();
};

const test3 = () => {
  var folder_content = ""
  return execSync(`wc -l test2-folder/model.jsonld | awk '{print $1}' `).toString();
};


describe("CLI", () => {
  it("Should generated the model.xlsx from the id", () => {
    expect(test1()).to.have.string("model.xlsx");
  }).timeout(15000);
  it("Should generate all the other steps of the conversion", () => {
    expect(test2()).to.have.string('model.json', 'model-generated.json', 'model.jsonld');
  }).timeout(15000);
  it("Should check the number of lines in the jsonld file", () => {
    expect(test3()).to.have.string('178705');
    fs.rmdirSync('test1-folder', { recursive: true });
    fs.rmdirSync('test2-folder', { recursive: true });
  }).timeout(15000);
});

