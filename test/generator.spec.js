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
import bolserLewis from './data/bolserLewis';
import villus from './data/villus';

import {modelClasses} from '../src/model/index';
import {Logger} from "../src/model/logger";

function testModel(graphData){
    expect(graphData).to.have.property("logger");
    expect(graphData.logger).to.have.property("entries");
    expect(graphData.logger.entries).to.be.an('array').that.has.length.above(0);
    expect(graphData.logger).to.have.property("status");

    expect (graphData.logger.status).to.be.equal(Logger.STATUS.OK);
    let logEvents = graphData.logger.entries;
    let info     = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.INFO);
    let errors   = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.ERROR);
    let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
    expect(info).to.have.length.above(0);
    expect(errors).to.have.length(0);
    expect(warnings).to.have.length(0);
}

describe("BasalGanglia", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses));
    it("Model generated without errors", () => testModel(graphData));
    after(() => {});
});

describe("BasalGangliaInternal", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGangliaInternal, modelClasses));
    it("Model generated without errors", () => testModel(graphData));
    after(() => {});
});

describe("BasalGangliaAuto", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGangliaAuto, modelClasses));
    it("Model generated without errors", () => testModel(graphData));
    after(() => {});
});

describe("Basic", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basic, modelClasses));
    it("Model generated without errors", () => testModel(graphData));
    after(() => {});
});

describe("BasicHostedNode", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicHostedNode, modelClasses));
    it("Model generated without errors", () => testModel(graphData));
    after(() => {});
});

describe("BasicLyphOnBorder", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphOnBorder, modelClasses));
    it("Model generated without errors", () => testModel(graphData));
    after(() => {});
});


// describe("BolserLevis", () => {
//     let graphData;
//     before(() => graphData = modelClasses.Graph.fromJSON(bolserLewis, modelClasses));
//     it("Model generated without errors", () => testModel(graphData));
//     after(() => {});
// });


describe("villus", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(villus, modelClasses));
    it("Model generated without errors", () => testModel(graphData));
    after(() => {});
});