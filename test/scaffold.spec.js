import {
    describe,
    it,
    before,
    after,
    expectNoWarnings,
} from './test.helper';

import {modelClasses, generateFromJSON} from '../src/model/index';
import scaffoldD from './scaffolds/scaffold_D.json';
import scaffoldF from './scaffolds/scaffold_F.json';
import scaffoldN from './scaffolds/scaffold_N.json';

describe("Scaffold D", () => {
    let graphData;
    before(() => {
        graphData = generateFromJSON(scaffoldD, modelClasses);
    });
    it("Model generated without warnings",  () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("Scaffold F", () => {
    let graphData;
    before(() => {
        graphData = generateFromJSON(scaffoldF, modelClasses);
    });
    it("Model generated without warnings",  () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

describe("Scaffold N", () => {
    let graphData;
    before(() => {
        graphData = generateFromJSON(scaffoldN, modelClasses);
    });
    it("Model generated without warnings, auto-detected scaffolding model",  () => expectNoWarnings(graphData));
    after(() => {
        graphData.logger.clear();
    });
});

//TODO add test to check that borderAnchors -> facets and facets -> borderAnchors always auto-complete correctly
