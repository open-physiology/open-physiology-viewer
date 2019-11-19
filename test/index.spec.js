import {
	describe,
	it,
	beforeEach,
	afterEach,
	expect,
} from './test.helper';
import basalGanglia from './data/basalGanglia.json';
import uotWithChannels from './data/uotWithChannels.json';
import respiratory from './data/respiratory.json';

import {keys, entries} from 'lodash-bound';

import { modelClasses } from '../src/model/index';
import {VisualResource} from "../src/model/visualResourceModel";

//TODO for every test model, check that logger does not contain unexpected warnings

describe("Produce generated model - Basal Ganglia", () => {
    let graphData;
    beforeEach(() => {
        graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses);
    });

    it("Graph model created", () => {
        expect(graphData).to.have.a.property("class");
        expect(graphData).to.be.instanceOf(modelClasses.Graph);

        expect(graphData).to.have.a.property("lyphs");
        expect(graphData.lyphs[0]).to.be.instanceOf(modelClasses.Lyph);
        expect(graphData.lyphs[0]).to.be.instanceOf(modelClasses.Shape);

        expect(graphData).to.have.a.property("nodes");
        expect(graphData.nodes[0]).to.be.instanceOf(modelClasses.Node);

        expect(graphData).to.have.a.property("links");
        expect(graphData.links[0]).to.be.instanceOf(modelClasses.Link);

        expect(graphData).to.have.a.property("groups");
        expect(graphData.groups[0]).to.be.instanceOf(modelClasses.Group);

        expect(graphData).to.have.a.property("trees");
        expect(graphData.trees[0]).to.be.instanceOf(modelClasses.Tree);

        expect(graphData).to.have.a.property("materials");
        expect(graphData).to.have.a.property("references");
        expect(graphData).to.have.a.property("coalescences");
        expect(graphData).to.have.a.property("channels");
        expect(graphData).to.have.a.property("chains");

        //"generatedFrom" should not be populated from subgroups
        expect(graphData.generatedFrom).to.be.null;
    });

    afterEach(() => {
    });
});

describe("Serialize data - Respiratory System", () => {
    let graphData;
    beforeEach(() => {
        graphData = modelClasses.Graph.fromJSON(respiratory, modelClasses);
    });

    it("All mecessary fields serialized", () => {
        let serializedGraphData = graphData.toJSON();
        let excluded = ["infoFields", "entitiesByID", "logger"];
        let exported = graphData::entries().filter(([key, value]) => !!value && !excluded.includes(key));
        expect(serializedGraphData::keys().length).to.be.equal(exported.length);
    });

    it("All log messages serialized", () => {
        let serializedLogs = graphData.logger.print();
        expect(serializedLogs.length).to.be.equal(graphData.logger.entries.length);
    });

    afterEach(() => {
    });
});

describe("Generate groups from templates - UOT with channels", () => {
    let graphData;
    beforeEach(() => {
        graphData = modelClasses.Graph.fromJSON(uotWithChannels, modelClasses);
    });

    //TODO check errors in logs

    afterEach(() => {
    });
});