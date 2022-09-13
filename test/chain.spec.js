import {
    describe,
    it,
    before,
    after,
    expect,
} from './test.helper';
import {modelClasses} from '../src/model/index';
import {Logger} from "../src/model/logger";
import {values} from 'lodash-bound';
import {getRefID} from "../src/model/utils";
import keastSpinalTest from './data/keastSpinalTest';
import keastSpinal from './data/keastSpinal';
import wbkgSpleen from './data/wbkgSpleen.json';
import wbkgStomach from './data/wbkgStomach.json';
import wbkgPancreas from './data/wbkgPancreas.json';
import wbkgSynapseTest from './data/wbkgSynapseTest.json';
import wiredChain from './data/basicChainWireConflict.json';
import uotBag from './data/neurulatorTestShortUotBag.json';

describe("Generate groups from chain templates (Keast Spinal Test)", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(keastSpinalTest, modelClasses);
    });

    it("Housing chain template expanded", () => {
        expect(graphData).to.have.property("chains");
        expect(graphData.chains).to.be.an('array').that.has.length(3);

        const ch1 = graphData.chains[0];
        expect(ch1).to.be.an('object');
        expect(ch1).to.have.property("id").that.equal("ch1");
        expect(ch1).to.have.property("numLevels").that.equal(16);
        expect(ch1).to.have.property("levels").that.is.an('array');
        expect(ch1.levels.length).to.be.equal(16);
        for (let i = 0; i < 16; i++){
            expect(ch1.levels[i]).to.have.property("levelIn");
            expect(ch1.levels[i].levelIn).to.be.an('array').that.has.length(1);
            expect(ch1.levels[i].levelIn[0]).to.have.property("id").that.equals(ch1.id);
        }

        expect(graphData).to.have.property("nodes");
        expect(graphData.nodes).to.be.an('array');

        const n1 = graphData.nodes.find(x => x.id === "n1");
        expect(n1).to.be.an('object');
        expect(n1).to.have.property("rootOf");
        expect(n1.rootOf).to.be.an('array').that.has.length(1);
        expect(n1.rootOf[0]).to.have.property("id").that.equal("ch1");

        const n2 = graphData.nodes.find(x => x.id === "n2");
        expect(n2).to.be.an('object');
        expect(n2).to.have.property("leafOf");
        expect(n2.leafOf).to.be.an('array').that.has.length(1);
        expect(n2.leafOf[0]).to.have.property("id").that.equal("ch1");

        expect(graphData).to.have.property("groups");
        //Empty "Ungrouped" is not added after issue #149 fix
        //Do not count auto-created force group when it is disabled, +1 otherwise
        expect(graphData.groups).to.be.an('array').that.has.length(3);

        const gr1 = graphData.groups.find(g => g.id === "group_ch1");
        expect(gr1).to.be.an('object');
        expect(gr1).to.have.property("generated").that.equal(true);

        expect(gr1).to.have.property("nodes").that.is.an('array');
        expect(gr1.nodes.length).to.be.equal(21);
        expect(gr1.nodes[0]).to.be.an('object');
        expect(gr1.nodes[0]).to.have.property('id').that.equal("n1");
        expect(gr1.nodes[16]).to.be.an('object');
        expect(gr1.nodes[16]).to.have.property('id').that.equal("n2");

        expect(gr1).to.have.property("links").that.is.an('array');
        expect(gr1.links.length).to.be.equal(17);
        expect(gr1.links[0]).to.have.property("next");
        expect(gr1.links[0].next).to.be.an('array').that.has.length(1);
        expect(gr1.links[0].next[0]).to.have.property("id").that.equals(gr1.links[1].id);
        expect(gr1.links[1]).to.have.property("prev");
        expect(gr1.links[1].prev).to.be.an('array').that.has.length(1);
        expect(gr1.links[1].prev[0]).to.have.property("id").that.equals(gr1.links[0].id);
    });

    it("Tree chains are generated", () => {
        const t1 = graphData.chains[1];
        expect(t1).to.be.an('object');
        expect(t1).to.have.property("id").that.equal("nn1");
        expect(t1).to.have.property("numLevels").that.equal(7);
        expect(t1).to.have.property("levels").that.is.an('array');
        for (let i = 0; i < 7; i++){
            expect(t1.levels[i]).to.have.property("levelIn");
            expect(t1.levels[i].levelIn).to.be.an('array').that.has.length(1);
            expect(t1.levels[i].levelIn[0]).to.have.property("id").that.equals(t1.id);
        }
        expect(t1.levels.length).to.be.equal(7);
        expect(graphData).to.have.property("lyphs");
        expect(graphData.lyphs).to.be.an('array');
        const genLyphs = graphData.lyphs.filter(e => e.id && e.id.startsWith("nn1_"));
        expect(genLyphs).to.be.an('array');
        expect(genLyphs.length).to.equal(7);
        expect(genLyphs[0]).has.property("supertype");
        expect(genLyphs[0].supertype).to.be.an('object');
        expect(genLyphs[0].supertype).to.have.property("id").that.equal("229");
    });

    it("Lyphs inherit properties from supertype", () => {
        const lyphs = graphData.lyphs.filter(e => e.supertype && e.supertype.external && e.supertype.external.length > 0);
        expect(lyphs).to.have.length.above(1);
        expect(lyphs[0]).to.have.property("inheritedExternal");
        expect(lyphs[0].inheritedExternal).to.be.an('array');
        expect(lyphs[0].inheritedExternal).to.have.length(1);
        expect(lyphs[0].inheritedExternal[0]).to.be.instanceOf(modelClasses.External);
        expect(lyphs[0].inheritedExternal[0]).to.have.property("fullID").that.equal("UBERON:0005844");
    });

    it("Lyphs retain own annotations", () => {
        const c1 = graphData.lyphs.find(x => x.id === "c1");
        expect(c1).to.have.property("external");
        expect(c1.external).to.be.an('array').that.has.length(1);
        expect(c1.external[0]).to.be.instanceOf(modelClasses.External);
        expect(c1.external[0]).to.have.property("fullID").that.equal("UBERON:0006469");
    });

    it("Internal lyphs are rebased into generated layers", () => {
        const c3 = graphData.lyphs.find(x => x.id === "c3");
        expect(c3).to.have.property("internalLyphs");
        //the input model contains "soma" as internal lyph of c3 which is removed from the generated model and placed to c3's layer
        expect(c3.internalLyphs).to.be.an('array').that.has.length(0);
        expect(c3).to.have.property("internalLyphsInLayers");
        expect(c3.internalLyphsInLayers).to.be.an('array').that.has.length(1);
        expect(c3.internalLyphsInLayers[0]).to.be.equal(3);

        expect(c3).to.have.property("layers");
        expect(c3.layers).to.be.an('array').that.has.length(14);
        //assuming counting of layers from 0
        expect(c3.layers[3]).to.have.property("id").that.equal("ref_mat_KM_27_K_129_3_c3_4");
        expect(c3.layers[3]).to.have.property("internalLyphs");
        expect(c3.layers[3].internalLyphs).to.be.an('array').that.has.length(1);
        expect(c3.layers[3].internalLyphs[0]).to.be.an('object');
        expect(c3.layers[3].internalLyphs[0]).to.have.property("class").that.equal("Lyph");
        expect(c3.layers[3].internalLyphs[0]).to.have.property("id").that.equal("soma");
    });

    it("Neuron chains are embedded to the correct housing lyph layers", () => {
        const ch1 = graphData.chains.find(chain => chain.id === "ch1");
        expect(ch1).to.be.an('object');
        expect(ch1).to.have.property("lyphs");
        expect(ch1.lyphs).to.be.an('array').that.has.length(16);

        const nn1 = graphData.chains.find(chain => chain.id === "nn1");
        expect(nn1).to.be.an('object');
        expect(nn1).to.have.property("housingChain");
        expect(nn1).to.have.property("housingRange");
        expect(nn1).to.have.property("housingLayers");
        expect(nn1.housingRange).to.have.property("min").that.equals(2);
        expect(nn1.housingRange).to.have.property("max").that.equals(9);
        expect(nn1.housingLayers).to.be.an('array').that.has.length(7);
        expect(nn1.housingLayers[5]).to.be.equal(-1);

        expect(nn1.levels).to.be.an("array").that.has.length(7);
        expect(nn1.levels[5]).to.have.property("fasciculatesIn");
        let outerLayer = nn1.levels[5].fasciculatesIn;
        expect(outerLayer).to.have.property("layerIn");
        expect(outerLayer.layerIn).to.have.property("layers");
        let numLayers = outerLayer.layerIn.layers.length;
        expect(outerLayer.layerIn.layers[numLayers-1]).to.have.property("id").that.equals(outerLayer.id);

        for (let i = nn1.housingRange.min; i < nn1.housingRange.max; i++){
            expect(ch1.lyphs[i]).to.be.an('object');
            expect(ch1.lyphs[i]).to.have.property('layers');
            let j = nn1.housingLayers[i - nn1.housingRange.min];
            if (j < 0){
                j = ch1.lyphs[i].layers.length - 1;
            }
            expect(ch1.lyphs[i].layers).to.be.an('array').that.has.length.above(j);
            expect(ch1.lyphs[i].layers[j]).to.be.an('object');
        }
        for (let i = nn1.housingRange.min + 1; i < nn1.housingRange.max - 1; i++) {
            let j = nn1.housingLayers[i - nn1.housingRange.min];
            if (j < 0){
                j = ch1.lyphs[i].layers.length - 1;
            }
            expect(ch1.lyphs[i].layers[j]).to.have.property('bundles');
            expect(ch1.lyphs[i].layers[j].endBundles).to.be.a("undefined");
            const lnk = ch1.lyphs[i].layers[j].bundles;
            expect(lnk).to.be.an('array').that.has.length.above(0);
            expect(lnk[0]).to.be.an('object');
            expect(lnk[0]).to.have.property('class').that.equal('Link');
            expect(lnk[0]).to.have.property('fasciculatesIn')
            let housingLyph = ch1.lyphs[i].layers[j];
            expect(lnk[0].fasciculatesIn).to.have.property("id").that.equals(housingLyph.id);
            let housedLyph = lnk[0].conveyingLyph;
            expect(housedLyph).not.to.be.a('undefined');
            expect(housedLyph).to.have.property('housingLyph')
            expect(housedLyph.housingLyph).to.have.property('id').that.equals(housingLyph.id)
        }

        [nn1.housingRange.min, nn1.housingRange.max-1].forEach(i => {
            let j = nn1.housingLayers[i - nn1.housingRange.min];
             if (j < 0){
                j = ch1.lyphs[i].layers.length - 1;
            }
            expect(ch1.lyphs[i].layers[j]).to.have.property('endBundles');
            const lnk = ch1.lyphs[i].layers[j].endBundles;
            expect(lnk).to.be.an('array').that.has.length(1);
            expect(lnk[0]).to.be.an('object');
            expect(lnk[0]).to.have.property('class').that.equal('Link');
            expect(lnk[0]).to.have.property('endsIn');
            let housingLyph = ch1.lyphs[i].layers[j];
            expect(lnk[0].endsIn).to.have.property("id").that.equals(housingLyph.id);
            let housedLyph = lnk[0].conveyingLyph;
            expect(housedLyph).not.to.be.a('undefined');
            expect(housedLyph).to.have.property('housingLyph')
            expect(housedLyph.housingLyph).to.have.property('id').that.equals(housingLyph.id)
        })
    });

    it("Neuron chains are correctly embedded when housingLayers are negative or outside the range", () => {
        const ch1 = graphData.chains.find(chain => chain.id === "ch1");
        expect(ch1).to.be.an('object');
        expect(ch1).to.have.property("lyphs");
        expect(ch1.lyphs).to.be.an('array').that.has.length(16);

        const nn2 = graphData.chains.find(chain => chain.id === "nn2");
        expect(nn2).to.be.an('object');
        expect(nn2).to.have.property("housingChain");
        expect(nn2).to.have.property("housingRange");
        expect(nn2).to.have.property("housingLayers");
        expect(nn2.housingRange).to.have.property("min").that.equals(2);
        expect(nn2.housingRange).to.have.property("max").that.equals(11);
        expect(nn2.housingLayers).to.be.an('array').that.has.length(9);
        expect(nn2.levels).to.be.an("array").that.has.length(9);

        expect(nn2.housingLayers[6]).to.be.equal(-2);
        expect(nn2.housingLayers[7]).to.be.equal(100);
        expect(nn2.housingLayers[8]).to.be.equal(-100);

        //Index -2 means the chain level is embedded to second to last outermost layer
        expect(nn2.levels[6]).to.have.property("fasciculatesIn");
        let hostLayer = nn2.levels[6].fasciculatesIn;
        expect(hostLayer).to.have.property("layerIn");
        let hostLyph = hostLayer.layerIn;
        expect(hostLyph).to.have.property("layers");
        let numLayers = hostLyph.layers.length;
        expect(hostLyph.layers[numLayers-2]).to.have.property("id").that.equals(hostLayer.id);

        //Positive out-of-range index defaults to host lyph
        expect(nn2.levels[7]).to.have.property("fasciculatesIn");
        let hostLyph1 = nn2.levels[7].fasciculatesIn;
        expect(hostLyph1).to.have.property("id").that.equals("l2");

        //Negative out-of-range index defaults to host lyph
        expect(nn2.levels[8]).to.have.property("endsIn");
        let hostLyph2 = nn2.levels[8].endsIn;
        expect(hostLyph2).to.have.property("id").that.equals("l3");
    });

    after(() => {});
});

describe("Link joint chains (Keast Spinal)", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(keastSpinal, modelClasses);
    });

    it("Collapsible links created for join nodes", () => {
        const collapsibleLinks = graphData.links.filter(lnk => lnk.collapsible);
        const chain1 = graphData.chains.find(ch => ch.id === "t1");
        const chain2 = graphData.chains.find(ch => ch.id === "t2");
        expect(chain1).has.property('levels').that.has.length(7);
        expect(chain2).has.property('levels').that.has.length(10);
        for (let i = 0; i < 7; i++){
            expect(chain1.levels[i]).to.have.property("levelIn");
            expect(chain1.levels[i].levelIn).to.be.an('array').that.has.length(1);
            expect(chain1.levels[i].levelIn[0]).to.have.property("id").that.equals(chain1.id);
        }
        for (let i = 0; i < 10; i++){
            expect(chain2.levels[i]).to.have.property("levelIn");
            expect(chain2.levels[i].levelIn).to.be.an('array').that.has.length(1);
            expect(chain2.levels[i].levelIn[0]).to.have.property("id").that.equals(chain2.id);
        }
        expect(collapsibleLinks).has.length(17);
    });

    it("Chain joining node was cloned", () => {
        const joinNode = graphData.nodes.find(node => node.id === "n2");
        expect(joinNode).to.be.an('object');
        expect(joinNode).to.have.property('clones').that.has.length(2);
    });

    it("Joint chains are linked together", () => {
        const chain1 = graphData.chains.find(ch => ch.id === "t1");
        const chain2 = graphData.chains.find(ch => ch.id === "t2");
        const lastInChain1 = chain1.levels[chain1.levels.length-1];
        const firstInChain2 = chain2.levels[0];
        expect(lastInChain1).to.be.an('object');
        expect(firstInChain2).to.be.an('object');
        expect(lastInChain1).to.have.property('nextChainStartLevels');
        expect(firstInChain2).to.have.property('prevChainEndLevels');
        expect(lastInChain1.nextChainStartLevels).to.be.an('array').that.has.length(1);
        expect(firstInChain2.prevChainEndLevels).to.be.an('array').that.has.length(1);
        expect(lastInChain1.nextChainStartLevels[0]).to.be.an('object');
        expect(firstInChain2.prevChainEndLevels[0]).to.be.an('object');
        expect(lastInChain1.nextChainStartLevels[0]).to.have.property('id').that.equals(firstInChain2.id);
        expect(firstInChain2.prevChainEndLevels[0]).to.have.property('id').that.equals(lastInChain1.id);
    });

    after(() => {
        graphData.logger.clear();
    });
});

describe("Validate chain wiring", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(wiredChain, modelClasses);
    });

    it("Chain t1 is correctly wired", () => {
        expect(graphData).to.have.property("chains");
        expect(graphData.chains).to.be.an('array').that.has.length(7);
        const t1 = graphData.chains[0];
        expect(t1).to.be.an('object');
        expect(t1).to.have.property("id").that.equal("t1");
        expect(t1).to.have.property("root").that.is.an("object");
        expect(t1).to.have.property("leaf").that.is.an("object");
        expect(t1.root).to.have.property("id").that.equals("n1");
        expect(t1.leaf).to.have.property("id").that.equals("n2");
        expect(t1).to.have.property("wiredTo").that.is.an("object");
        expect(t1.wiredTo).to.have.property("id").that.equals("w1");
        let {start, end} = t1.getScaffoldChainEnds();
        expect(start).to.have.property("id").that.equals("a1");
        expect(end).to.have.property("id").that.equals("a2");
        expect(start).to.have.property("layout").that.is.an("object");
        expect(end).to.have.property("layout").that.is.an("object");
        expect(start.layout).to.have.property("x").that.equals(-50);
        expect(end.layout).to.have.property("x").that.equals(50);
        expect(start.layout).to.have.property("y").that.equals(50);
        expect(end.layout).to.have.property("y").that.equals(50);

        //Group inclusion rules - lnk1 and its ends are in the "ungrouped"
        expect(graphData).to.have.property("groups").that.has.length(8);
        const ungrouped = graphData.groups.find(g => g.name === "Ungrouped");
        expect(ungrouped).not.to.be.an("undefined");
        expect(ungrouped).to.have.property("links").that.has.length(1);
        expect(ungrouped).to.have.property("nodes").that.has.length(2);
    });

    it("Conflicts in chains t2 and t3 are detected", () => {
        expect(graphData).to.have.property("logger");
        expect(graphData.logger).to.have.property("entries");
        expect(graphData.logger.entries).to.be.an('array').that.has.length.above(0);
        let errors = graphData.logger.entries.filter(logEvent => logEvent.level === Logger.LEVEL.ERROR);
        expect(errors).to.have.length(2);
        //t2 has conflict caused by startFromLeaf property
        const t2 = graphData.chains[1];
        expect(t2).to.be.an('object');
        expect(t2).to.have.property("id").that.equal("t2");
        let {start, end} = t2.getScaffoldChainEnds();
        expect(start).to.have.property("id").that.equals("a2");
        expect(end).to.have.property("id").that.equals("a1");
    });

    it("Chain t4 respects anchoring constraints", () => {
        const t4 = graphData.chains[3];
        expect(t4).to.be.an('object');
        expect(t4).to.have.property("id").that.equal("t4");
        expect(t4.root).to.have.property("id").that.equals("n1");
        expect(t4.leaf).to.have.property("id").that.equals("n2");
        expect(t4.wiredTo).to.be.a("undefined");
        let {start, end} = t4.getScaffoldChainEnds();
        expect(start).to.be.an("object").that.has.property("id").that.equals("a1");
        expect(end).to.be.an("object").that.has.property("id").that.equals("a2");
    });

    it("Chain t6 has a hidden group with all hidden resources", () => {
        const t6 = graphData.chains[5];
        expect(t6).to.be.an('object');
        expect(t6).to.have.property("id").that.equal("t6");
        expect(t6.root).to.have.property("id").that.equals("n5");
        expect(t6.leaf).to.have.property("id").that.equals("n6");
        expect(t6.group).to.have.property("nodes").that.has.length(8);
        let root = t6.group.nodes[0];
        expect(root).to.be.an("object").that.has.property("id").that.equals("n5");
        expect(root).to.have.property("hidden").that.equals(true);
        let leaf = t6.group.nodes[7];
        expect(leaf).to.be.an("object").that.has.property("id").that.equals("n6");
        expect(leaf).to.have.property("hidden").that.equals(true);
    });

    after(() => {
        graphData.logger.clear();
    });
});

describe("Process model with multiple namespaces (Spleen)", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(wbkgSpleen, modelClasses);
    });

    it("Resources generated without duplicates (Spleen)", () => {
        let duplicates = [];
        let noFullID = [];
        graphData.entitiesByID::values().forEach(r => {
            if (r.generated) {
                let fullID1 = "wbkg:" + getRefID(r.id);
                let fullID2 = "spleen:" + getRefID(r.id);
                if (graphData.entitiesByID[fullID1] && graphData.entitiesByID[fullID2]) {
                    duplicates.push(getRefID(r.id));
                }
                if (!r.fullID){
                    noFullID.push(r.id);
                }
            }
        })
        duplicates = [... new Set(duplicates)];
        //Note: duplicates are layers and their borders for 2 copies of lyph-medulla
        if (duplicates.length !== 13) {
            console.log(duplicates);
        }
        expect(duplicates).to.have.length(13);
        expect(noFullID).to.have.length(0);
    });

    it("Exported generated model contains definitions of ontologyTerms (Spleen)", () => {
        let serializedGraphData = graphData.toJSON(3);
        expect(serializedGraphData).to.have.property("ontologyTerms");
        expect(serializedGraphData.ontologyTerms).to.be.an("array").that.has.length.greaterThan(0);
        expect(serializedGraphData.ontologyTerms[0]).to.have.property("fullID");
        expect(serializedGraphData.ontologyTerms[0]).to.have.property("annotates");
    });

    after(() => {
        graphData.logger.clear();
    });
});

describe("Process model with multiple namespaces (Stomach)", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(wbkgStomach, modelClasses);
    });

    it("Resources generated without duplicates (Stomach)", () => {
        let duplicates = [];
        let noFullID = [];
        graphData.entitiesByID::values().forEach(r => {
            if (r.generated) {
                let fullID1 = "wbkg:" + getRefID(r.id);
                let fullID2 = "stomach:" + getRefID(r.id);
                if (graphData.entitiesByID[fullID1] && graphData.entitiesByID[fullID2]) {
                    duplicates.push(getRefID(r.id));
                }
                if (!r.fullID){
                    noFullID.push(r.id);
                }
            }
        })
        duplicates = [... new Set(duplicates)];
        //Note: duplicates are layers and their borders for 2 copies of lyph-medulla
        if (duplicates.length !== 0) {
            console.log(duplicates);
        }
        expect(duplicates).to.have.length(0);
        expect(noFullID).to.have.length(0);
    });

    it("Generated lyph layers inherit composition materials (Stomach)", () => {
        let lt_dend_bag = graphData.entitiesByID["wbkg:lt-dend-bag"];
        expect(lt_dend_bag).not.to.be.an("undefined");
        expect(lt_dend_bag).to.have.property("topology").that.equals("BAG-");
        expect(lt_dend_bag).to.have.property("layers");
        let layer = lt_dend_bag.layers[0];
        expect(layer).to.have.property("materials");
        expect(layer.materials).to.be.an("array").that.has.length(1);
        expect(layer.materials[0]).to.have.property("fullID").that.equals("wbkg:mat-cytoplasm");
    });

    after(() => {
        graphData.logger.clear();
    });
});

describe("Process a model with lyph, chain and channel templates from a different namespace", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(wbkgSynapseTest, modelClasses);
    });

    it("Resources generated without duplicates", () => {
        let duplicates = [];
        let noFullID = [];
        graphData.entitiesByID::values().forEach(r => {
            if (r.generated) {
                let fullID1 = "wbkg:" + getRefID(r.id);
                let fullID2 = "syntest:" + getRefID(r.id);
                if (graphData.entitiesByID[fullID1] && graphData.entitiesByID[fullID2]) {
                    duplicates.push(getRefID(r.id));
                }
                if (!r.fullID){
                    noFullID.push(r.id);
                }
            }
        })
        duplicates = [... new Set(duplicates)];
        //Note: duplicates are layers and their borders for 2 copies of lyph-medulla
        if (duplicates.length !== 0) {
            console.log(duplicates);
        }
        expect(duplicates).to.have.length(0);
        expect(noFullID).to.have.length(0);
    });

    after(() => {
        graphData.logger.clear();
    });
});

describe("Neurulator discovers neurons (Pancreas)", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(wbkgPancreas, modelClasses);
    });

   it("Dynamic groups created for model neurons (Pancreas)", () => {
        expect(graphData).to.have.property("class");
        expect(graphData).to.be.instanceOf(modelClasses.Graph);
        graphData.neurulator();
        expect(graphData).to.have.property("groups");
        expect(graphData.groups[0]).to.be.instanceOf(modelClasses.Group);
        let dynamic = graphData.groups.filter(g => g.description === "dynamic");
        expect(dynamic.length).to.be.equal(4);
        let neurons = dynamic.filter(g => g.name.startsWith("Neuron"));
        expect(neurons.length).to.be.equal(4);
    });

    after(() => {
        graphData.logger.clear();
    });
});

describe("Neurulator discovers closed groups (UOT)", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(uotBag, modelClasses);
    });

   it("Dynamic group representing tree (UOT)", () => {
        expect(graphData).to.be.instanceOf(modelClasses.Graph);
        graphData.neurulator();
        expect(graphData).to.have.property("groups");
        expect(graphData.groups[0]).to.be.instanceOf(modelClasses.Group);
        let dynamic = graphData.groups.filter(g => g.description === "dynamic");
        expect(dynamic.length).to.be.equal(1);
    });

    after(() => {
        graphData.logger.clear();
    });
})