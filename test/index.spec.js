import {
	describe,
	it,
	beforeEach,
	afterEach,
	expect,
} from './test.helper';

import initModel        from '../src/data/graph.json';
import { modelClasses } from '../src/model/index';

describe("Edit via resource editor", () => {
    let graphData = modelClasses.Graph.fromJSON(initModel, modelClasses);

    //console.log(modelClasses);

    beforeEach(() => {
    });

    afterEach(() => {
    });
});