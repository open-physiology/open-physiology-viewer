import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect, after,
} from './test.helper';
import villus from './data/basicVillus';

import {modelClasses} from '../src/model/index';

describe("Generate groups from villus templates", () => {
    let graphData;
    beforeEach(() => {
        graphData = modelClasses.Graph.fromJSON(villus, modelClasses);
    });

    it("Villus template expanded", () => {
    });

    after(() => {
        graphData.logger.clear();
    });
});


