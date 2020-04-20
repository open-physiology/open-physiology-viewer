import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect,
} from './test.helper';
import uot from './data/uot';

import {modelClasses} from '../src/model/index';

describe("Generate groups from tree templates", () => {
    let graphData;
    beforeEach(() => {
        graphData = modelClasses.Graph.fromJSON(uot, modelClasses);
    });

    it("Tree template expanded", () => {
    });

    afterEach(() => {});
});


