import {
    describe,
    it,
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

import fullBody from './data/fullBody';
import keastSpinal from './data/keastSpinal';
import neuron from './data/neuron';
import neuronTemplate from './data/neuronTemplate';
import neuronTemplateRegion from './data/neuronTemplateRegion';
import neuronTree from './data/neuronTree';
import neuronTreeWithLevels from './data/neuronTreeWithLevels';

import respiratory from './data/respiratory';
import respiratoryInternalLyphsInLayers from './data/respiratoryInternalLyphsInLayers';

import uot from './data/uot';
import {expectNoWarnings, expectAutoGenResources} from "./test.helper";
import uotWithChannels from './data/uotWithChannels';

import {modelClasses, fromJSON} from '../src/model/index';

describe("BasalGanglia", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGanglia, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasalGangliaInternal", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basalGangliaInternal, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
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
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicChainsInGroup", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicChainsInGroup, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});


describe("BasicEllipseArc", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicEllipseArc, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicHostedNode", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicHostedNode, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicLyphOnBorder", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphOnBorder, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicLyphTypes", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphTypes, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicHousedTree", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicHousedTree, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicJointTrees", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicJointTrees, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicLyphsWithNoAxis", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicLyphWithNoAxis, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicSharedNodes", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicSharedNodes, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("BasicVillus", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(basicVillus, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("FullBody", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(fullBody, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
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
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("Neuron", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuron, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("NeuronTemplate", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTemplate, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("NeuronTemplateRegion", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTemplateRegion, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("NeuronTree", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTree, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("NeuronTreeWithLevels", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(neuronTreeWithLevels, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("Respiratory", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(respiratory, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("RespiratoryInternalLyphsInLayers", () => {
    let graphData;
    before(() => graphData = modelClasses.Graph.fromJSON(respiratoryInternalLyphsInLayers, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {});
});

describe("Uot", () => {
    let graphData;
    before(() => graphData = fromJSON(uot, modelClasses));
    it("Model generated without warnings, auto-detected connectivity model", () => expectNoWarnings(graphData));
    after(() => {});
});

//TODO fix warning about no axis for coalescing lyphs
// describe("UotWithChannels", () => {
//     let graphData;
//     before(() => graphData = modelClasses.Graph.fromJSON(uotWithChannels, modelClasses));
//     it("Model generated without errors", () => expectNoWarnings(graphData));
//     after(() => {});
// });
