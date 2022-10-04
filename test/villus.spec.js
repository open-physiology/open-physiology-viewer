import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect, after,
} from './test.helper';
import villus from './data/basicVillus';

import {modelClasses, generateFromJSON} from '../src/model/index';

describe("Generate groups from villus templates", () => {
    let graphData;
    beforeEach(() => {
        graphData = generateFromJSON(villus, modelClasses);
    });

    it("Villus template expanded", () => {
    });

    after(() => {
        graphData.logger.clear();
    });
});


