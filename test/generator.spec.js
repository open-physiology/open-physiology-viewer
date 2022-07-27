import {
    describe,
    it,
    before,
    after,
    expect
} from './test.helper';

import basalGanglia from './data/basalGanglia';
import basalGangliaAuto from './data/basalGangliaAuto';
import basic from './data/basic';
import basicChainsInGroup from './data/basicChainsInGroup';
import basicChainsInternalInLayer from './data/basicChainsInternalInLayer';
import basicHostedNode from './data/basicHostedNode';
import basicLyphOnBorder from './data/basicLyphOnBorder';
import basicLinkWithChainsAsEnds from './data/basicLinkWithChainsAsEnds';
import basicLyphTypes from './data/basicLyphTypes';
import basicHousedTree from './data/basicHousedTree';
import basicJointTrees from './data/basicJointTrees';
import basicLyphWithNoAxis from './data/basicLyphWithNoAxis';
import basicSharedNodes from './data/basicSharedNodes';
import basicVillus from './data/basicVillus';
import keastSpinal from './data/keastSpinal';
import neuron from './data/neuron';
import neuronTemplate from './data/neuronTemplate';
import neuronTemplateRegion from './data/neuronTemplateRegion';
import neuronTree from './data/neuronTree';
import neuronTreeWithLevels from './data/neuronTreeWithLevels';
import respiratory from './data/respiratory';
import respiratoryInternalLyphsInLayers from './data/respiratoryInternalLyphsInLayers';
import uot from './data/uot';
import wbkg from './data/wbkg.json';

import {expectNoWarnings} from "./test.helper";
import {modelClasses, fromJSON, joinModels} from '../src/model/index';
import {$LogMsg, Logger} from "../src/model/logger";

describe("BasalGanglia", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasalGangliaAuto", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGangliaAuto, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("Basic", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basic, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicChainsInGroup", () => {
    let graphData, graphData2;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(basicChainsInGroup, modelClasses);
        graphData2 = modelClasses.Graph.fromJSON(basicChainsInternalInLayer, modelClasses)
    });
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    it("Model2 generated without warnings", () => expectNoWarnings(graphData2));

    it("Model reassigned internal lyphs to layers", () => {
        expect(graphData).to.have.property("lyphs");
        expect(graphData.lyphs).to.be.an('array');
        const snl28 = graphData.lyphs.find(e => e.id === "snl28");
        expect(snl28).to.be.an('object');
        expect(snl28).to.have.property("internalIn");
        expect(snl28.internalIn).to.have.property("id").that.equal("ref_mat_K_83_K_129_6_K23_7");
        const host = graphData.lyphs.find(e => e.id === "ref_mat_K_83_K_129_6_K23_7");
        expect(host).to.be.an('object');
        expect(host).to.have.property("internalLyphs").that.has.length(3);
    });
    it("Model2 reassigned internal lyphs to layers", () => {
        expect(graphData2).to.have.property("lyphs");
        expect(graphData2.lyphs).to.be.an('array');
        const snl28 = graphData2.lyphs.find(e => e.id === "snl28");
        expect(snl28).to.be.an('object');
        expect(snl28).to.have.property("internalIn");
        expect(snl28.internalIn).to.have.property("id").that.equal("ref_mat_K_83_K_129_6_K23_7");
        const host = graphData2.lyphs.find(e => e.id === "ref_mat_K_83_K_129_6_K23_7");
        expect(host).to.be.an('object');
        expect(host).to.have.property("internalLyphs").that.has.length(3);
    });

    after(() => {
        graphData.logger.clear();
        graphData2.logger.clear();
    });
});

describe("BasicHostedNode", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicHostedNode, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicLyphOnBorder", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphOnBorder, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicLyphTypes", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphTypes, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicLinkWithChainsAsEnds", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLinkWithChainsAsEnds, modelClasses));
    it("Validator detects type mismatch error", () => {
        expect(graphData).to.have.property("logger");
        expect(graphData.logger).to.have.property("entries");
        expect(graphData.logger.entries).to.be.an('array').that.has.length.above(0);
        expect(graphData.logger).to.have.property("status");
        let logEvents = graphData.logger.entries;
        let errors    = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.ERROR);
        expect(errors).to.have.length(2);
        expect(errors[0].msg === $LogMsg.RESOURCE_TYPE_MISMATCH);
    });
     after(() => {
        graphData.logger.clear();
    });
});

describe("BasicHousedTree", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicHousedTree, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicJointTrees", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicJointTrees, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicLyphsWithNoAxis", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphWithNoAxis, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicSharedNodes", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicSharedNodes, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicVillus", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicVillus, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("KeastSpinal", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(keastSpinal, modelClasses));
    it("Model detects absent IDs", () => {
        expect (graphData.logger.status).to.be.equal(Logger.STATUS.WARNING);
        let logEvents = graphData.logger.entries;
        let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
        expect(warnings).to.have.length(2);
        expect(warnings[0].msg).to.be.equal($LogMsg.RESOURCE_NO_ID);
    });
    after(() => {
        graphData.logger.clear();
    });
});

describe("Neuron", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuron, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("NeuronTemplate", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTemplate, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("NeuronTemplateRegion", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTemplateRegion, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("NeuronTree", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTree, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("NeuronTreeWithLevels", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTreeWithLevels, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("Respiratory", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(respiratory, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("RespiratoryInternalLyphsInLayers", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(respiratoryInternalLyphsInLayers, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("Uot", () => {
    let graphData;
    before(() => graphData = fromJSON(uot, modelClasses));
    it("Model detects absence of local convention mapping, auto-detected connectivity model", () => {
        expect (graphData.logger.status).to.be.equal(Logger.STATUS.ERROR);
        let logEvents = graphData.logger.entries;
        let errors = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.ERROR);
        expect(errors).to.have.length(1);
        expect(errors[0].msg).to.be.equal($LogMsg.EXTERNAL_NO_MAPPING);
    });
    after(() => {
        graphData.logger.clear();
    });
});

describe("Basic+wbkg", () => {
    let jointModel, graphData;
    before(() => {
       jointModel = joinModels(basic, wbkg, false);
       graphData = fromJSON(jointModel, modelClasses)
    });

    it("Joint model accumulates imports from both models", () => {
        expect(graphData).to.have.property("imports");
        //3 + 1 - 1 as the TOO-map is in both models
        expect(graphData.imports).to.be.an('array').that.has.length(3);
    });

    it("Chains join via a node in levelTargets", () => {
        expect(graphData).to.have.property("chains");
        let ch1 = graphData.chains.find(e => e.id === "chain-hepatobiliary");
        let ch2 = graphData.chains.find(e => e.id === "chain-gallbladder");
        expect(ch1).not.to.be.an("undefined");
        expect(ch2).not.to.be.an("undefined");
        expect(ch1).to.have.property("levels").that.has.length(9);
        expect(ch2).to.have.property("levels").that.has.length(2);
        expect(ch1.levels[0]).to.have.property("target");
        expect(ch1.levels[0].target).to.have.property("id").that.equals("wbkg:gb-entry");
        expect(ch2).to.have.property("root");
        expect(ch2.root).to.have.property("id").that.equals("wbkg:gb-entry");
        expect(ch2.levels[0]).to.have.property("source");
        expect(ch2.levels[0].source).to.have.property("id").that.equals("wbkg:gb-entry");
    });

    after(() => {
        graphData.logger.clear();
    });
})
