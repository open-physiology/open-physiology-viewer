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
import {loadModel} from "../src/model/index";

import {modelClasses} from '../src/model/index';

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


