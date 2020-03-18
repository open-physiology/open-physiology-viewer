import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect,
} from './test.helper';
import uotWithChannels from './data/uotWithChannels.json';
import {modelClasses} from '../src/model/index';

describe("Generate groups from templates - UOT with channels", () => {
    let graphData;
    beforeEach(() => {
        graphData = modelClasses.Graph.fromJSON(uotWithChannels, modelClasses);
    });

    afterEach(() => {});
});

