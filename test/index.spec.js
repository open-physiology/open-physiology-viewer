import {
	chai,
	sinon,
	describe,
	it,
	beforeEach,
	afterEach,
	expect,
} from './test.helper';

import {plus} from '../src/index.js';

/** @test */
describe("the open-physiology-viewer", () => {
	
	beforeEach(() => {
		// setup
	});
	
	it("can test things", () => {
		
		expect(true).to.be.truthy;
		
	});
	
	/** @test {plus} */
	it("can add two numbers", () => {
		
		expect(plus(1, 2)).to.equal(3);
		
	});
	
	afterEach(() => {
		// teardown
	});
	
});
