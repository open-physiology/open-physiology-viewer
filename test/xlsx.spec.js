import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect,
} from './test.helper';

import keastExcelModel from './excel/Keast_Flatmap_051420.xlsx';
import keastExcelEvilBagModel from './excel/Keast_Flatmap_evilBag.xlsx';
import testModel from './excel/test_model.xlsx';
import {loadModel, jsonToExcel, excelToJSON} from "../src/model/index";

import {modelClasses} from '../src/model/index';
import {levelTargetsToLevels} from "../src/model/utilsParser";

describe("Load Excel templates", () => {
    let graphData;
    beforeEach(() => {
        let keastModel = loadModel(keastExcelModel, "KeastModel", "xlsx", false);
        graphData = modelClasses.Graph.fromJSON(keastModel, modelClasses);
    });

    it("Excel model imported (KeastModel)", () => {
        expect(graphData).to.have.property("class");
        expect(graphData).to.be.instanceOf(modelClasses.Graph);

        expect(graphData).to.have.property("lyphs");
        expect(graphData.lyphs[0]).to.be.instanceOf(modelClasses.Lyph);
        expect(graphData.lyphs[0]).to.be.instanceOf(modelClasses.Shape);

        expect(graphData).to.have.property("nodes");
        expect(graphData.nodes[0]).to.be.instanceOf(modelClasses.Node);

        expect(graphData).to.have.property("links");
        expect(graphData.links[0]).to.be.instanceOf(modelClasses.Link);

        expect(graphData).to.have.property("groups");
        expect(graphData.groups[0]).to.be.instanceOf(modelClasses.Group);

        expect(graphData).to.have.property("chains");
        expect(graphData.chains[0]).to.be.instanceOf(modelClasses.Chain);
    });

    afterEach(() => {});
});

describe("Neurulate Excel template without out-of-memory error ", () => {
    let graphData;
    beforeEach(() => {
        let keastModel = loadModel(keastExcelEvilBagModel, "KeastModel", "xlsx", false);
        graphData = modelClasses.Graph.fromJSON(keastModel, modelClasses);
    });

    it("Excel model neurulated (KeastModel)", () => {
        expect(graphData).to.have.property("class");
        expect(graphData).to.be.instanceOf(modelClasses.Graph);

        graphData.neurulator();
        expect(graphData).to.have.property("lyphs");
        expect(graphData).to.have.property("groups");
        expect(graphData.groups[0]).to.be.instanceOf(modelClasses.Group);
        let dynamic = graphData.groups.filter(g => g.description === "dynamic");
        expect(dynamic.length).to.be.equal(33);
        let neurons = dynamic.filter(g => g.name.startsWith("Neuron"));
        expect(neurons.length).to.be.equal(19);
    });

    afterEach(() => {});
});

describe("Convert excel data to JSON", () => {
    let graphData;
    beforeEach(() => {
        let model = loadModel(testModel, "TestModel", "xlsx", false);
        graphData = modelClasses.Graph.fromJSON(model, modelClasses);
    });

    it("Excel model imported (TestModel)", () => {
        expect(graphData).to.have.property("class");
        expect(graphData).to.be.instanceOf(modelClasses.Graph);

        expect(graphData).to.have.property("lyphs");
        const s41 = graphData.lyphs.find(lyph => lyph.id === "S41");
        expect(s41).to.be.instanceOf(modelClasses.Lyph);
        expect(s41).to.have.property("internalLyphs");
        expect(s41.internalLyphs).to.be.an("array").that.has.length(4);
    });

    afterEach(() => {});
});

describe("Maps special Excel columns to ApiNATOMY JSON schema properties", () => {
    it("Maps levelTargets to levels", () => {
        let resource = {levelTargets: "0:n1,3:n3,,5:n5"};
        let modifiedResource = levelTargetsToLevels(resource);
        expect(modifiedResource).to.have.property("levels");
        expect(modifiedResource.levels).to.have.length(6);
        expect(modifiedResource.levels[0]).to.have.property("target").that.equals("n1");
        expect(modifiedResource.levels[3]).to.have.property("target").that.equals("n3");
        expect(modifiedResource.levels[5]).to.have.property("target").that.equals("n5");
    });

    //TODO Add test
    // it("Maps inner, radial1, outer, radial2 to border.borders", () => {
    // });
});

describe("Convert excel data to JSON and back", () => {
    let model;
    beforeEach(() => {
        model = loadModel(testModel, "TestModel", "xlsx", false);
    });

    it("JSON model converted to Excel)", () => {
        model.chains[0].levels = [null, {}, {"target": "n1"}];
        model.lyphs[0].border = {"borders": [{},{},{},{"hostedNodes": ["n2", "n3"]}]};
        let excel = jsonToExcel(model);
        let model2 = loadModel(excel, "TestModel", "xlsx", false);
        expect(model2).to.have.property("id").that.equals(model.id);
        expect(model2).to.have.property("name").that.equals(model.name);
        expect(model2).to.have.property("lyphs").that.has.length(model.lyphs.length);
        expect(model2).to.have.property("links").that.has.length(model.links.length);
        expect(model2).to.have.property("nodes").that.has.length(model.nodes.length);
        expect(model2).to.have.property("publications").that.has.length(model.publications.length);
        expect(model2).to.have.property("groups").that.has.length(model.groups.length);
        expect(model2).to.have.property("materials").that.has.length(model.materials.length);
        expect(model2).to.have.property("chains").that.has.length(model.chains.length);
        expect(model2.chains[0]).to.have.property("levels").that.has.length(3);
        expect(model2.lyphs[0]).to.have.property("border").that.has.property("borders").that.has.length(4);
        expect(model2.lyphs[0].border.borders[3]).to.have.property("hostedNodes").that.has.length(2);
    });

    afterEach(() => {});
});


