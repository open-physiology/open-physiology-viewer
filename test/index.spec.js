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

//TODO goal - for every test model, check that logger does not contain unexpected warnings

describe("JSON Schema read correctly", () => {
    it("Link geometry types are loaded", () => {
        expect(modelClasses.Link.LINK_GEOMETRY).to.have.property("LINK");
        expect(modelClasses.Link.LINK_GEOMETRY).to.have.property("SEMICIRCLE");
        expect(modelClasses.Link.LINK_GEOMETRY).to.have.property("RECTANGLE");
        expect(modelClasses.Link.LINK_GEOMETRY).to.have.property("SPLINE");
        expect(modelClasses.Link.LINK_GEOMETRY).to.have.property("PATH");
        expect(modelClasses.Link.LINK_GEOMETRY).to.have.property("INVISIBLE");
        expect(modelClasses.Link.LINK_GEOMETRY).to.have.property("ARC"); //TODO new link type, add tests to check that it is drawn
    });

    it("Link stroke types are loaded", () => {
        expect(modelClasses.Link.LINK_STROKE).to.have.property("DASHED");
        expect(modelClasses.Link.LINK_STROKE).to.have.property("THICK");
    });

    it("Link process types are loaded", () => {
        expect(modelClasses.Link.PROCESS_TYPE).to.have.property("ADVECTIVE");
        expect(modelClasses.Link.PROCESS_TYPE).to.have.property("DIFFUSIVE");
    });

    it("Lyph topology types are loaded", () => {
        expect(modelClasses.Lyph.LYPH_TOPOLOGY).to.have.property("TUBE");
        expect(modelClasses.Lyph.LYPH_TOPOLOGY).to.have.property("CYST");
        expect(modelClasses.Lyph.LYPH_TOPOLOGY).to.have.property("BAG");
        expect(modelClasses.Lyph.LYPH_TOPOLOGY).to.have.property("BAG2");
        expect(modelClasses.Lyph.LYPH_TOPOLOGY).to.have.property("BAG-");
        expect(modelClasses.Lyph.LYPH_TOPOLOGY).to.have.property("BAG+");
        //TODO create models to test BAG- and BAG+ options
    });

    it("Coalescence topology types are loaded", () => {
        expect(modelClasses.Coalescence.COALESCENCE_TOPOLOGY).to.have.property("EMBEDDING");
        expect(modelClasses.Coalescence.COALESCENCE_TOPOLOGY).to.have.property("CONNECTING");
    });
});



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

//TODO add regression test for channels to make sure generated lyph order works