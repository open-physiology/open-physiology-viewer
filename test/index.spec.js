import {
	describe,
	it,
	before,
	after,
	expect,
} from './test.helper';
import basalGanglia from './data/basalGanglia.json';
import respiratory from './data/respiratory.json';
import villus from './data/basicVillus';
import lyphOnBorder from './data/basicLyphOnBorder';
import keast from './data/keastSpinalFull.json';

import {keys, entries} from 'lodash-bound';
import {modelClasses} from '../src/model/index';


describe("JSON Schema loads correctly", () => {
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
    });

    it("Coalescence topology types are loaded", () => {
        expect(modelClasses.Coalescence.COALESCENCE_TOPOLOGY).to.have.property("EMBEDDING");
        expect(modelClasses.Coalescence.COALESCENCE_TOPOLOGY).to.have.property("CONNECTING");
    });
});

describe("Generate model (Basal Ganglia)", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses);
    });

    it("Graph model created", () => {

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

        expect(graphData).to.have.property("materials");
        expect(graphData).to.have.property("references");
        expect(graphData).to.have.property("coalescences");
        expect(graphData).to.have.property("channels");
        expect(graphData).to.have.property("chains");

        //"generatedFrom" should not be populated from subgroups
        expect(graphData.generatedFrom).to.be.a('null');
    });

    it("Related properties synchronized", () => {
        //Link.conveyingLyphs vs Lyph.conveys
        const bg = graphData.lyphs.find(x => x.id === "bg");
        expect(bg).to.have.property("conveys");
        expect(bg.conveys).to.be.instanceOf(modelClasses.Link);
        expect(bg.conveys).to.have.property("id").that.equal("main");

        //Link.source vs Node.sourceOf
        const nodeA = graphData.nodes.find(x => x.id === "a");
        expect(nodeA).to.have.property("sourceOf");
        expect(nodeA.sourceOf).to.be.an('array').that.has.length(1);
        expect(nodeA.sourceOf[0]).to.be.instanceOf(modelClasses.Link);
        expect(nodeA.sourceOf[0]).to.have.property("id").that.equal("main");

        //Link.target vs Node.targetOf
        const nodeB = graphData.nodes.find(x => x.id === "b");
        expect(nodeB).to.have.property("targetOf");
        expect(nodeB.targetOf).to.be.an('array').that.has.length(1);
        expect(nodeB.targetOf[0]).to.be.instanceOf(modelClasses.Link);
        expect(nodeB.targetOf[0]).to.have.property("id").that.equal("main");

        //Lyph.layers vs Lyph.layerIn (on abstract lyph)
        [ "cytosol", "plasma", "fluid"].forEach(id => {
            let lyph = graphData.lyphs.find(x => x.id === id);
            expect(lyph).to.be.instanceOf(modelClasses.Lyph);
            expect(lyph).to.have.property("layerIn");
            expect(lyph.layerIn).to.have.property("id").that.equal("neuronBag");
        });

        //Lyph.internalLyphs vs Lyph.internalIn
        ["putamen", "gpe", "gpi"].forEach(id => {
            let lyph = graphData.lyphs.find(x => x.id === id);
            expect(lyph).to.be.instanceOf(modelClasses.Lyph);
            expect(lyph).to.have.property("internalIn");
            expect(lyph.internalIn).to.have.property("id").that.equal("bg");
        });

        //Lyph.subtypes vs Lyph.supertype
        const neuron = graphData.lyphs.find(x => x.id === "neuronBag");
        expect(neuron).to.have.property("subtypes");
        expect(neuron.subtypes).to.be.an('array').that.has.length(7);
        let subtypes = neuron.subtypes.map(x => x.id);
        expect(subtypes).to.include("hillock");

        //Border.hostedNodes vs Node.hostedBy
        const n3 = graphData.nodes.find(x => x.id === "n3");
        expect(n3).to.have.property("hostedBy");
        expect(n3.hostedBy).to.be.instanceOf(modelClasses.Link);
    });

});

describe("Serialize data", () => {
    let graphData;

    it("All necessary fields serialized (respiratory system)", () => {
        graphData = modelClasses.Graph.fromJSON(respiratory, modelClasses);
        let serializedGraphData = graphData.toJSON();
        let excluded = ["infoFields", "entitiesByID", "logger"];
        let exported = graphData::entries().filter(([key, value]) => !!value && !excluded.includes(key));
        expect(serializedGraphData::keys().length).to.be.equal(exported.length);
        let serializedLogs = graphData.logger.print();
        expect(serializedLogs.length).to.be.equal(graphData.logger.entries.length);
    });

    it("Nested villus resource serialized", () => {
        graphData = modelClasses.Graph.fromJSON(villus, modelClasses);
        let serializedGraphData = graphData.toJSON(3, {"villus": 3});
        let lyph = serializedGraphData.lyphs.find(e => e.id === "l1");
        expect(lyph).to.be.an('object');
        expect(lyph).to.have.property("villus");
        expect(lyph.villus).to.have.property("id");
        expect(lyph.villus).to.have.property("class");
        expect(lyph.villus.class).to.be.equal("Villus");
    });

    it("Borders serialized", () => {
        graphData = modelClasses.Graph.fromJSON(lyphOnBorder, modelClasses);
        let serializedGraphData = graphData.toJSON(3, {"border": 3, "borders": 3});
        let lyph = serializedGraphData.lyphs.find(lyph => lyph.id === "3");
        expect(lyph).to.be.an('object');
        expect(lyph).to.have.property("border");
        expect(lyph.border).to.have.property("borders");
        expect(lyph.border.borders).to.have.property("length");
        expect(lyph.border.borders.length).to.be.equal(4);
        expect(lyph.border.borders[0]).to.have.property("class");
        expect(lyph.border.borders[0].class).to.be.equal("Link");
    });
});

describe("Serialize data to JSON-LD", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(keast, modelClasses);
    });

    it("JSON-LD context generated for Keast model", () => {
        let res = graphData.entitiesToJSONLD();
        expect(res).to.be.an('object');
        expect(res).to.have.property('@context');
        expect(res).to.have.property('@graph');
        let context = res['@context'];
        let graph = res['@graph'];
        expect(context).to.be.an('object');
        expect(graph).to.be.an('array');
        expect(context).to.have.property('@base');
        expect(context).to.have.property('local');
        expect(context).to.have.property('class');
        expect(context).to.have.property('namespace');
        expect(context).to.have.property('description');
    });

    it("JSON-LD flat context generated for Keast model", () => {
        const callback = res => {
            expect(res).to.be.an('object');
            expect(res).to.have.property('@context');
            expect(res).to.have.property('@graph');
        };
        graphData.entitiesToJSONLDFlat(callback);
    });

});