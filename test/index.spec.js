import {
	chai,
	sinon,
	describe,
	it,
	beforeEach,
	afterEach,
	expect,
} from './test.helper';

import { values } from 'lodash-bound';
import { DataService }  from '../src/services/dataService';
import initModel        from '../src/data/graph.json';
import { modelClasses } from '../src/models/modelClasses';

/** @test */
describe("Instantiates model", () => {
	let dataService = new DataService();
    dataService.init(initModel);
    let graphData = dataService.graphData;

    beforeEach(() => {
    });
	
	it("All input objects are mapped to model entities", () => {
		expect(graphData).has.property("entities");
		expect(graphData.entities).to.have.length.above(0);
        graphData.entities.forEach(entity => {
			expect(entity).to.be.defined;
            expect(entity).has.property('id');
            expect(entity).has.property('class');
            expect(entity).to.be.instanceOf(modelClasses[entity.class]);
		})
	});

	afterEach(() => {
		// teardown
	});
	
});
