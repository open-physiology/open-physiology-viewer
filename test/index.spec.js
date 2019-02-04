import {
	describe,
	it,
	beforeEach,
	afterEach,
	expect,
} from './test.helper';

import initModel        from '../src/data/graph.json';
import { modelClasses } from '../src/models/modelClasses';

/** @test */
describe("Instantiates model", () => {
	initModel.nodes.push({"id": 1});
    initModel.nodes.push({"id": 2});
    initModel.links.push({"id": 3, "source": 1, "target": 2});
    let graphData = modelClasses["Graph"].fromJSON(initModel, modelClasses);

    beforeEach(() => {
    });
	
	it("All input objects are mapped to model entities", () => {
		expect(graphData).has.property("entities");
		expect(graphData.entities).to.have.length.above(0);
        graphData.entities.forEach(e => {
			expect(e).to.be.defined;
            expect(e).has.property('id');
            expect(e).has.property('class');
            expect(e).to.be.instanceOf(modelClasses[e.class]);
		})
	});

    it("Numeric IDs converted to string IDs and are correctly referenced", () => {
        graphData.nodes.forEach(e => {
            expect(e.id).to.be.a('string');
        });
        graphData.links.forEach(e => {
            expect(e.id).to.be.a('string');
            expect(e.source).to.be.instanceOf(modelClasses["Node"]);
            expect(e.target).to.be.instanceOf(modelClasses["Node"]);
        });
    });

    afterEach(() => {
		// teardown
	});
});

describe("Edit via resource editor", () => {
    let graphData = modelClasses["Graph"].fromJSON(initModel, modelClasses);

    beforeEach(() => {
    });

    afterEach(() => {
        // teardown
    });
});