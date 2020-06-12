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
import basicHostedNode from './data/basicHostedNode';
import basicLyphOnBorder from './data/basicLyphOnBorder';
import basicLyphTypes from './data/basicLyphTypes';
import basicHousedTree from './data/basicHousedTree';
import basicJointTrees from './data/basicJointTrees';
import basicLyphWithNoAxis from './data/basicLyphWithNoAxis';
import basicSharedNodes from './data/basicSharedNodes';

import fullBody from './data/fullBody';
import fullBodyRegions from './data/fullBodyRegions';

import keastSpinal from './data/keastSpinal';

import bolserLewis from './data/bolserLewis';
import villus from './data/villus';

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

describe("FullBody", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(fullBody, modelClasses));
    it("Model generated without errors", () => expectAutoGenResourcesAndExternals(graphData));
    after(() => {});
});

describe("FullBodyRegions", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(fullBodyRegions, modelClasses));
    it("Model generated without errors", () => expectAutoGenResourcesAndExternals(graphData));
    after(() => {});
});

// describe("EllipseArc", () => {
//     let graphData;
//     before(() => graphData = modelClasses.Graph.fromJSON(ellipseArc, modelClasses));
//     it("Model generated without errors", () => testModel(graphData));
//     after(() => {});
// });

// describe("BolserLevis", () => {
//     let graphData;
//     before(() => graphData = modelClasses.Graph.fromJSON(bolserLewis, modelClasses));
//     it("Model generated without errors", () => testModel(graphData));
//     after(() => {});
// });

// keastModelMonique.json

describe("KeastSpinal", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(keastSpinal, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});

// keastSpinalTest.json

// neuron.json
// neuronTemplate.json
// neuronTemplateRegion.json
// neuronTree.json
// neuronTreeWithLevels.json

// respiratory.json
// respiratoryInternalLyphsInLayers.json

// uot.json
// uotMyocyteManual.json
// uotWithChannels.json

describe("villus", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(villus, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {});
});