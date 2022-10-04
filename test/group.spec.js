import {
    describe,
    it,
    before,
    after,
    expect,
} from './test.helper';

import {modelClasses, generateFromJSON} from '../src/model/index';
import bolserLewis from './data/bolserLewis';

describe("Nested groups (BolserLewis)", () => {
    let graphData;
    before(() => {
        graphData = generateFromJSON(bolserLewis, modelClasses);
    });

    it("Groups defined as union of chains include all necessary resources", () => {
        expect(graphData).to.have.property("chains");
        expect(graphData.chains).to.be.an('array');
        expect(graphData).to.have.property("groups");
        expect(graphData.groups).to.be.an('array');

        const uG = graphData.groups.find(g => g.id === "chainUnion");
        expect(uG).to.have.property("chains");
        expect(uG).to.have.property("groups");
        expect(uG.groups.length).to.be.equal(uG.chains.length);

        expect(uG).to.have.property("lyphs");
        expect(uG).to.have.property("nodes");
        expect(uG).to.have.property("links");

        let numLyphs = 0;
        uG.groups.forEach(g => numLyphs += g.lyphs.length);
        expect(uG.lyphs.length).to.equal(numLyphs);

        let numLinks = 0;
        uG.groups.forEach(g => numLinks += g.links.length);
        expect(uG.links.length).to.equal(numLinks);

        //The number of nodes may differ because root/end nodes of joint chains may be replicated,
        //The generated join nodes are added to the original chain groups but not to groups that include generated chain groups
        //Perhaps, this should be fixed?
    });

    it("Toggle on of a group shows resources from its nested groups", () => {
        const uG = graphData.groups.find(g => g.id === "chainUnion");
        uG.links.forEach(lnk =>
            expect(lnk).to.have.property("hidden")
        );
        graphData.showGroups([uG.id]);
        uG.links.forEach(lnk =>
            expect(lnk).to.not.have.property("hidden")
        );
    });

    after(() => {
        graphData.logger.clear();
    });
});
