import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect,
} from './test.helper';

import keastExcelModel from './excel/Keast_Flatmap_051420.xlsx';
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


