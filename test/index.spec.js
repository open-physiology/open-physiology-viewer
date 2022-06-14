import {
    describe,
    it,
    before,
    expect, after
} from './test.helper';
import chainFromLevels from './data/basicChainWithNestedLevels.json';
import basalGanglia from './data/basalGanglia.json';
import respiratory from './data/respiratory.json';
import tooMap from './scaffolds/tooMap.json';
import villus from './data/basicVillus';
import lyphOnBorder from './data/basicLyphOnBorder';
import keast from './data/keastSpinalFull.json';
import {keys, entries, pick} from 'lodash-bound';
import {$Field, $SchemaClass, modelClasses, schemaClassModels} from '../src/model/index';
import schema from '../src/model/graphScheme.json';
import {Validator} from "jsonschema";
import {getGenID, getGenName} from "../src/model/utils";


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
        expect(modelClasses.Link.EDGE_STROKE).to.have.property("DASHED");
        expect(modelClasses.Link.EDGE_STROKE).to.have.property("THICK");
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


describe("JSON Schema matches patterns", () => {
    let v;
    before(() => {
        v = new Validator();
    });

    it("IdentifierSchema does not accept weird expressions as identifiers", () => {
        const ids = ["a+b=c",
            "2*2=4",
            "Just some text with spaces"];
        ids.forEach(id => {
            let resVal = v.validate(id, schema.definitions.IdentifierScheme);
            expect(resVal.errors).to.have.length.above(0);
        });
    })

    it("IdentifierSchema accepts URIs", () => {
        const ids = ["http://www.amazon.com/?isbn=0321154991",
            "doi:10.1016/B978-0-444-53491-0.09985-5",
            "doi:10.1016/j.mpaic.2008.08.005",
            "UBERON:0001288"];
        ids.forEach(id => {
            let resVal = v.validate(id, schema.definitions.IdentifierScheme);
            expect(resVal.errors).to.have.length(0);
        });
    })

    it("Link schema accepts link resource", () => {
         const lnk = {
            "id": "RL",
            "source": "R",
            "target": "L",
            "name": "Pulmonary",
            "geometry": "rectangle",
            "length": 25,
            "stroke": "thick",
            "color": "#ee1d23",
            "conveyingLyph": "br"
        }
        schema.$ref = "#/definitions/Link";
        let resVal = v.validate(lnk, schema);
        expect(resVal.errors).to.have.length(0);
    })
})

// describe("Nested resource definitions are processed", () => {
//     it("Nested chain levels are converted to links", () => {})
//         let graphData = modelClasses.Graph.fromJSON(chainFromLevels, modelClasses);
//         expect(graphData.chains).to.be.an("array").that.has.length(1);
//         //FIXME why is this not holding anymore?
//         expect(graphData.nodes).to.be.an("array").that.has.length(6);
//         expect(graphData.links).to.be.an("array").that.has.length(5);
//
//         expect(graphData.chains[0]).to.have.property("id").that.equals("t1");
//         expect(graphData.chains[0].levels).to.have.length(5);
//         expect(graphData.chains[0].numLevels).to.be.equal(5);
//         expect(graphData.chains[0]).to.have.property("root").that.is.an("object");
//         expect(graphData.chains[0]).to.have.property("leaf").that.is.an("object");
//         expect(graphData.chains[0].root).to.have.property("id").that.equals("n1");
//         expect(graphData.chains[0].leaf).to.have.property("id").that.equals("n2");
//
//         let n1 = graphData.nodes.find(e => e.id === "n1");
//         let n2 = graphData.nodes.find(e => e.id === "n2");
//         expect(n1).to.have.property("layout").that.has.property("x");
//         expect(n2).to.have.property("layout").that.has.property("x");
//         expect(n1).to.have.property("sourceOf").that.is.an("array");
//         expect(n1.sourceOf[0]).has.property("id").that.equals("t1_lnk_1");
//         expect(n2).to.have.property("targetOf").that.is.an("array");
//         expect(n2.targetOf[0]).has.property("id").that.equals("t1_lnk_5");
//
//         expect(graphData.groups).to.be.an("array").that.has.length(1);
//         let group = graphData.groups.find(g => g.id === "group_t1");
//         expect(group).to.have.property("nodes").that.has.length(6);
//         expect(group).to.have.property("links").that.has.length(5);
//         expect(group).to.have.property("lyphs").that.has.length(6);
// })

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
        expect(graphData.references[0]).to.be.instanceOf(modelClasses.Reference);

        expect(graphData).to.have.property("coalescences");
        expect(graphData).to.have.property("channels");

        //"generatedFrom" should not be populated from subgroups
        expect(graphData.generatedFrom).to.be.a('undefined');
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
        const excluded = ["infoFields", "entitiesByID", "scaffoldResources", "logger", "modelClasses", "scaffoldComponents"];
        let expectedToBeSerialized = graphData::entries().filter(([key, value]) => !!value && !excluded.includes(key)
            && (key.indexOf("ByID") < 0)).map(e => e[0]);
        expect(serializedGraphData::keys().length).to.be.equal(expectedToBeSerialized.length);
        let diff = expectedToBeSerialized.filter(x => !serializedGraphData::keys().find(e => e === x));
        expect(diff).to.have.length(0);
        let serializedLogs = graphData.logger.print();
        expect(serializedLogs.length).to.be.equal(graphData.logger.entries.length);
        //JSON-LD
        let serializedGraphDataLD = graphData.entitiesToJSONLD();
        expect(serializedGraphDataLD).to.have.property("@context").that.is.an("object");
        expect(serializedGraphDataLD["@context"]).to.have.property("@base");
        expect(serializedGraphDataLD["@context"]).to.have.property("@version");
        $Field::keys().forEach(key => {
            expect(serializedGraphDataLD["@context"]).to.have.property(key);
        })
        schemaClassModels[$SchemaClass.Graph].relationshipNames.forEach(key => {
            //TODO: scaffolds are not exported to JSON-LD, fix this as part of more general issue #65
            if (key === "scaffolds"){
                return;
            }
            expect(serializedGraphDataLD["@context"][key]).to.be.an("object").that.has.property("@type");
        })
        expect(serializedGraphDataLD).to.have.property("@graph").that.is.an("array");
        //All resources are exported, +1 for the generated graph annotation in JSON-LD
        expect(serializedGraphDataLD["@graph"].length).to.be.equal(graphData.entitiesByID::keys().length + 1);
        graphData.logger.clear();
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
        graphData.logger.clear();
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
        expect(lyph.border.borders[3]).to.have.property("conveyingLyph");
        graphData.logger.clear();
    });

    it("Housing chain layers serialized", () => {
        graphData = modelClasses.Graph.fromJSON(keast, modelClasses);
        let serializedGraphData = graphData.toJSON(3);
        let chain = serializedGraphData.chains.find(e => e.id === "acn1");
        expect(chain).to.be.an('object');
        expect(chain).to.have.property("housingLyphs");
        expect(chain).to.have.property("housingLayers");
        expect(chain.housingLyphs).to.be.an('array').that.has.length(4);
        expect(chain.housingLayers).to.be.an('array').that.has.length(4);
        expect(chain.housingLayers[0]).to.be.equal(0);
        expect(chain.housingLayers[1]).to.be.equal(2);
        graphData.logger.clear();
    });
});

describe("Serialize scaffold", () => {
    let scaffold;

    it("All necessary fields serialized (Too-map)", () => {
        scaffold = modelClasses.Scaffold.fromJSON(tooMap, modelClasses);
        let serializedScaffold = scaffold.toJSON();
        const excluded = ["infoFields", "entitiesByID", "logger", "modelClasses"];
        let expectedToBeSerialized = scaffold::entries().filter(([key, value]) =>
            !!value && !excluded.includes(key) && (key.indexOf("ByID") < 0)).map(e => e[0]);
        expect(serializedScaffold::keys().length).to.be.equal(expectedToBeSerialized.length);
        let diff = expectedToBeSerialized.filter(x => !serializedScaffold::keys().find(e => e === x));
        expect(diff).to.have.length(0);
        let serializedLogs = scaffold.logger.print();
        expect(serializedLogs.length).to.be.equal(scaffold.logger.entries.length);
    });
});

describe("Create, save and load snapshots", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(respiratory, modelClasses);
    });

    it("Serialized snapshot contains necessary fields", () => {
        const snapshot = modelClasses.Snapshot.fromJSON({
            [$Field.id]: getGenID("snapshot", graphData.id),
            [$Field.name]: getGenName("Snapshot for", graphData.name),
            [$Field.model]: graphData.id
        }, modelClasses, graphData.entitiesByID);
        const annotationProperties = schema.definitions.AnnotationSchema.properties::keys();
        snapshot.annotation = graphData::pick(annotationProperties);

        for (let i = 0; i < 5; i++) {
            const state = modelClasses.State.fromJSON({
                [$Field.id]: getGenID(snapshot.id, "state", (snapshot.states || []).length),
                [$Field.visibleGroups]: graphData.visibleGroups.map(g => g.id),
                [$Field.scaffolds]: (graphData.scaffolds || []).map(s => ({
                    [$Field.id]: s.id,
                    [$Field.hidden]: s.hidden,
                    [$Field.anchors]: (s.anchors || []).map(a => ({
                        [$Field.id]: a.id,
                        [$Field.layout]: {"x": 10*i, "y": 10*i}
                    })),
                    [$Field.visibleComponents]: s.visibleComponents.map(c => c.id)
                })),
                [$Field.camera]: {
                    position: {"x": 100*i, "y": 200*i, "z": 300*i},
                    up: {"x": 50*i, "y": 60*i, "z": 70*i}
                },
            }, modelClasses, graphData.entitiesByID);
            snapshot.addState(state);
        }
        expect(snapshot.length).to.be.equal(5);
        expect(snapshot.activeIndex).to.be.equal(4);
        const state4 = snapshot.switchToPrev();
        expect(snapshot.activeIndex).to.be.equal(3);
        snapshot.switchToNext();
        expect(snapshot.activeIndex).to.be.equal(4);
        snapshot.switchToPrev();
        expect(snapshot.activeIndex).to.be.equal(3);
        expect(state4).to.have.property("id").that.equals("snapshot_respiratory_state_3");
        expect(state4).to.have.property("scaffolds");
        expect(state4.scaffolds).to.be.an("array").that.has.length(1);
        expect(state4.scaffolds[0]).to.have.property("anchors");
        expect(state4.scaffolds[0].anchors).to.be.an("array").that.has.length.greaterThan(1);
        expect(state4.scaffolds[0].anchors[0]).to.have.property("layout");
        expect(state4.scaffolds[0].anchors[0].layout).to.have.property("x").that.equals(30)
        snapshot.removeState(state4);
        expect(snapshot.length).to.be.equal(4);

        let result = snapshot.toJSON(2, {
                [$Field.states]: 4
        });
        let restoredSnapshot = modelClasses.Snapshot.fromJSON(result, modelClasses);
        expect(restoredSnapshot).to.be.an("object").that.has.property("states");
        expect(restoredSnapshot.validate(graphData)).to.equal(1);
        expect(restoredSnapshot).to.be.have.property("annotation");
        graphData.version = "2";
        expect(restoredSnapshot.validate(graphData)).to.equal(0);
        expect(restoredSnapshot.length).to.be.equal(4);
        expect(restoredSnapshot.activeIndex).to.be.equal(-1);
        restoredSnapshot.switchToNext();
        expect(restoredSnapshot.activeIndex).to.be.equal(0);
        restoredSnapshot.switchToNext();
        expect(restoredSnapshot.active).to.be.have.property("camera");
        expect(restoredSnapshot.active.camera).to.have.property("position");
        expect(restoredSnapshot.active.camera.position).to.have.property("y").that.equals(200);
    });

    after(() => {
        graphData.logger.clear();
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
        let input = modelClasses.Graph.fromJSON(keast, modelClasses);
        graphData.entitiesToJSONLDFlat(input.entitiesToJSONLD(), callback);
    });

    after(() => {
        graphData.logger.clear();
    });
});