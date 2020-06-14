import {
    describe,
    it,
    beforeEach,
    afterEach,
    before,
    after,
    expect,
} from './test.helper';

import basalGanglia from './data/basalGanglia';
import basalGangliaAuto from './data/basalGangliaAuto';
import basalGangliaInternal from './data/basalGangliaInternal';

import basic from './data/basic';
import basicChainsInGroup from './data/basicChainsInGroup';
import basicEllipseArc from './data/basicEllipseArc';
import basicHostedNode from './data/basicHostedNode';
import basicLyphOnBorder from './data/basicLyphOnBorder';
import basicLyphTypes from './data/basicLyphTypes';
import basicHousedTree from './data/basicHousedTree';
import basicJointTrees from './data/basicJointTrees';
import basicLyphWithNoAxis from './data/basicLyphWithNoAxis';
import basicSharedNodes from './data/basicSharedNodes';
import basicVillus from './data/basicVillus';

import bolserLewis from './data/bolserLewis';

import fullBody from './data/fullBody';
import fullBodyRegions from './data/fullBodyRegions';

import keastSpinal from './data/keastSpinal';

import neuron from './data/neuron';
import neuronTemplate from './data/neuronTemplate';
import neuronTemplateRegion from './data/neuronTemplateRegion';
import neuronTree from './data/neuronTree';
import neuronTreeWithLevels from './data/neuronTreeWithLevels';

import respiratory from './data/respiratory';
import respiratoryInternalLyphsInLayers from './data/respiratoryInternalLyphsInLayers';

import uot from './data/uot';
import uotWithChannels from './data/uotWithChannels';

import {modelClasses} from '../src/model/index';
import {Logger} from "../src/model/logger";
import {$GenEventMsg} from "../src/model/genEvent";

function expectNoErrors(graphData){
    expect(graphData).to.have.property("logger");
    expect(graphData.logger).to.have.property("entries");
    expect(graphData.logger.entries).to.be.an('array').that.has.length.above(0);
    expect(graphData.logger).to.have.property("status");
    let logEvents = graphData.logger.entries;
    let info      = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.INFO);
    let errors    = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.ERROR);
    expect(info).to.have.length.above(0);
    expect(errors).to.have.length(0);
}

function expectNoWarnings(graphData){
    expectNoErrors(graphData);
    expect (graphData.logger.status).to.be.equal(Logger.STATUS.OK);
    let logEvents = graphData.logger.entries;
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(warnings).to.have.length(0);
}

function expectAutoGenResources(graphData){
    expectNoErrors(graphData);
    expect (graphData.logger.status).to.be.equal(Logger.STATUS.WARNING);
    let logEvents = graphData.logger.entries;
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(warnings).to.have.length(1);
    expect(warnings[0]).to.have.property("msg").that.equals($GenEventMsg.AUTO_GEN()[0]);
}

function expectAutoGenExternals(graphData){
    expectNoErrors(graphData);
    expect (graphData.logger.status).to.be.equal(Logger.STATUS.WARNING);
    let logEvents = graphData.logger.entries;
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(warnings).to.have.length(1);
    expect(warnings[0]).to.have.property("msg").that.equals($GenEventMsg.AUTO_GEN_EXTERNAL()[0]);
}

function expectAutoGenResourcesAndExternals(graphData){
    expectNoErrors(graphData);
    expect (graphData.logger.status).to.be.equal(Logger.STATUS.WARNING);
    let logEvents = graphData.logger.entries;
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(warnings).to.have.length(2);
    expect(warnings[0]).to.have.property("msg").that.equals($GenEventMsg.AUTO_GEN()[0]);
    expect(warnings[1]).to.have.property("msg").that.equals($GenEventMsg.AUTO_GEN_EXTERNAL()[0]);
}


describe("BasalGanglia", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasalGangliaInternal", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGangliaInternal, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasalGangliaAuto", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGangliaAuto, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("Basic", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basic, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicChainsInGroup", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicChainsInGroup, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});


describe("BasicEllipseArc", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicEllipseArc, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicHostedNode", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicHostedNode, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicLyphOnBorder", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphOnBorder, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicLyphTypes", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphTypes, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicHousedTree", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicHousedTree, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicJointTrees", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicJointTrees, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicLyphsWithNoAxis", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphWithNoAxis, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicSharedNodes", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicSharedNodes, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicVillus", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicVillus, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("FullBody", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(fullBody, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("FullBodyRegions", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(fullBodyRegions, modelClasses));
    it("Model generated without errors", () => expectAutoGenResources(graphData));
    after(() => {});
});

// describe("BolserLevis", () => {
//     let graphData;
//     before(() => graphData = modelClasses.Graph.fromJSON(bolserLewis, modelClasses));
//     it("Model generated without errors", () => expectNoWarnings(graphData));
//     after(() => {});
// });


describe("KeastSpinal", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(keastSpinal, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

// keastSpinalTest.json
// keastModelMonique.json

describe("Neuron", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuron, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("NeuronTemplate", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTemplate, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("NeuronTemplateRegion", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTemplateRegion, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("NeuronTree", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTree, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("NeuronTreeWithLevels", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTreeWithLevels, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("Respiratory", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(respiratory, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("RespiratoryInternalLyphsInLayers", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(respiratoryInternalLyphsInLayers, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("Uot", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(uot, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

//TODO fix warning about no axis for coalescing lyphs
// describe("UotWithChannels", () => {
//     let graphData;
//     before(() => graphData = modelClasses.Graph.fromJSON(uotWithChannels, modelClasses));
//     it("Model generated without errors", () => expectNoWarnings(graphData));
//     after(() => {});
// });
