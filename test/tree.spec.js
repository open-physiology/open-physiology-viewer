import {
    describe,
    it,
    before,
    after,
    expect,
} from './test.helper';
import uot from './data/uot';

import {modelClasses} from '../src/model/index';

describe("Generate groups from tree templates", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(uot, modelClasses);
    });

    it("Tree template expanded", () => {
    });

    after(() => {
        graphData.logger.clear();
    });
});


