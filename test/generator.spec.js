import {
    describe,
    it,
    before,
    after,
    expect, expectNoErrors
} from './test.helper';
import {cloneDeep} from 'lodash-bound';

import basalGanglia from './data/basalGanglia';
import basalGangliaAuto from './data/basalGangliaAuto';
import basic from './data/basic';
import basicChainsInGroup from './data/basicChainsInGroup';
import basicChainsInternalInLayer from './data/basicChainsInternalInLayer';
import basicHousedChain from './data/basicChainWrongHousing.json';
import basicHostedNode from './data/basicHostedNode';
import basicLyphOnBorder from './data/basicLyphOnBorder';
import basicLinkWithChainsAsEnds from './data/basicLinkWithChainsAsEnds';
import basicLyphTypes from './data/basicLyphTypes';
import basicHousedTree from './data/basicHousedTree';
import basicJointTrees from './data/basicJointTrees';
import basicLyphWithNoAxis from './data/basicLyphWithNoAxis';
import basicSharedNodes from './data/basicSharedNodes';
import basicTemplateAsInternalLyphInLayer from './data/basicTemplateAsInternalLyphInLayer';
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
import {
    modelClasses,
    generateFromJSON,
    joinModels,
    processImports,
    schemaClassModels,
    $SchemaClass
} from '../src/model/index';
import {$LogMsg, Logger} from "../src/model/logger";
import {mergeWithImports} from "../src/model/modelClasses";

describe("BasalGanglia", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basalGanglia, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasalGangliaAuto", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basalGangliaAuto, modelClasses));
    it("Model generated without errors", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("Basic", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basic, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicChainsInGroup", () => {
    let graphData, graphData2;
    before(() => {
        graphData = generateFromJSON(basicChainsInGroup, modelClasses);
        graphData2 = generateFromJSON(basicChainsInternalInLayer, modelClasses)
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


describe("BasicHousedChain", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicHousedChain, modelClasses));
    it("Model validator raises warning about chain housing", () => {
        expectNoErrors(graphData);
        //Correct chain
        expect(graphData.chains[0]).to.have.property("levels");
        expect(graphData.chains[0].levels).to.be.an("array").that.has.length(2);
        //Wrong chain
        expect(graphData.chains[1]).to.have.property("levels");
        expect(graphData.chains[1].levels).to.be.an("array").that.has.length(3);

        let logEvents = graphData.logger.entries;
        let warnings = logEvents.filter(logEvent => logEvent.level === Logger.LEVEL.WARN);
        expect(warnings).to.have.length(1);
        expect(warnings[0]).to.have.property("msg").that.equals($LogMsg.CHAIN_WRONG_HOUSING);

        expect(graphData).to.have.property("chains");
        expect(graphData.chains).to.be.an("array").that.has.length(2);
    });
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicHostedNode", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicHostedNode, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicLyphOnBorder", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicLyphOnBorder, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicLyphTypes", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicLyphTypes, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicLinkWithChainsAsEnds", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicLinkWithChainsAsEnds, modelClasses));
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
    before(() => graphData = generateFromJSON(basicHousedTree, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicJointTrees", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicJointTrees, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicLyphsWithNoAxis", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicLyphWithNoAxis, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicSharedNodes", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicSharedNodes, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicTemplateAsInternalLyphInLayer", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicTemplateAsInternalLyphInLayer, modelClasses));
    it("Model generated without warnings", () => {
        expectNoWarnings(graphData);
        //Chain levels have internalLyphs
        expect(graphData).to.have.property("lyphs");
        let h2 = graphData.entitiesByID["nm_Internal-lyph-template:h2"];
        let h3 = graphData.entitiesByID["nm_Internal-lyph-template:h3"];
        expect(h2).to.have.property("layers").that.has.length(3);
        expect(h3).to.have.property("layers").that.has.length(3);
        expect(h2.layers[1]).to.have.property("internalLyphs").that.has.length(1);
        expect(h3.layers[2]).to.have.property("internalLyphs").that.has.length(1);
        expect(h2.layers[1].internalLyphs[0]).to.have.property("supertype");
        expect(h3.layers[2].internalLyphs[0]).to.have.property("supertype");
    });
    after(() => {
        graphData.logger.clear();
    });
});

describe("BasicVillus", () => {
    let graphData;
    before(() => graphData = generateFromJSON(basicVillus, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("KeastSpinal", () => {
    let graphData;
    before(() => graphData = generateFromJSON(keastSpinal, modelClasses));
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
    before(() => graphData = generateFromJSON(neuron, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("NeuronTemplate", () => {
    let graphData;
    before(() => graphData = generateFromJSON(neuronTemplate, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("NeuronTemplateRegion", () => {
    let graphData;
    before(() => graphData = generateFromJSON(neuronTemplateRegion, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("NeuronTree", () => {
    let graphData;
    before(() => graphData = generateFromJSON(neuronTree, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("NeuronTreeWithLevels", () => {
    let graphData;
    before(() => graphData = generateFromJSON(neuronTreeWithLevels, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("Respiratory", () => {
    let graphData;
    before(() => graphData = generateFromJSON(respiratory, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("RespiratoryInternalLyphsInLayers", () => {
    let graphData;
    before(() => graphData = generateFromJSON(respiratoryInternalLyphsInLayers, modelClasses));
    it("Model generated without warnings", () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("Uot", () => {
    let graphData;
    before(() => graphData = generateFromJSON(uot, modelClasses));
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
       graphData = generateFromJSON(jointModel, modelClasses)
    });

    it("Joint model accumulates imports from both models", () => {
        expect(graphData).to.have.property("imports");
        //4 + 1 - 1 as the TOO-map is in both models
        expect(graphData.imports).to.be.an('array').that.has.length(4);
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
});

describe("Basic+imports", () => {
    let graphData;
    let imported_models = [];
    let model = basic::cloneDeep();
    model.imports.length = 2;

    before(() => {
        return new Promise(async(resolve, reject) => {
            model = await mergeWithImports(model);
            resolve();
        }).then(() => {
            processImports(model, imported_models);
            graphData = generateFromJSON(model, modelClasses);
        })
    });

    it("Imported scaffold resources have property 'imported' set to true", () => {
        let relFieldNames = schemaClassModels[$SchemaClass.Component].filteredRelNames();
        let importedScaffold = graphData.scaffolds[0];
        expect(importedScaffold).to.have.property("imported");
        relFieldNames.forEach(prop => {
            importedScaffold[prop]?.forEach(r => {
                expect(r).to.have.property("imported").that.equals(true);
            });
        });
    });

    it("Imported group resources have property 'imported' set to true", () => {
        let relFieldNames = schemaClassModels[$SchemaClass.Group].filteredRelNames();
        let importedGroup = graphData.groups.find(g => g.id === "WBKG1");
        expect(importedGroup).to.have.property("imported");
        relFieldNames.forEach(prop => {
            importedGroup[prop]?.forEach(r => {
                expect(r).to.have.property("imported").that.equals(true);
            });
        });
    });

    after(() => {
        graphData.logger.clear();
    });
});
