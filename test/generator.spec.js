import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect,
} from './test.helper';

import {model} from './testData/KeastModelWithIDConflicts';
import {modelClasses} from '../src/model/index';

describe("Process input models with errors", () => {
    let graphData;
    beforeEach(() => {
        graphData = modelClasses.Graph.fromJSON(model, modelClasses);
    });

    //it("", () => {});

    afterEach(() => {});
});


