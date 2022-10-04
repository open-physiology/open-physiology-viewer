import {
    describe,
    it,
    before,
    after,
    expect,
} from './test.helper';
import uot from './data/uot';

import {modelClasses, generateFromJSON} from '../src/model/index';

describe("Generate groups from tree templates", () => {
    let graphData;
    before(() => {
        graphData = generateFromJSON(uot, modelClasses);
    });

    it("Tree template expanded", () => {
    });

    after(() => {
        graphData.logger.clear();
    });
});


