import {
    describe,
    it,
    before,
    after,
    expect,
} from './test.helper';
import uotWithChannels from './data/uotWithChannels.json';
import {modelClasses} from '../src/model/index';

describe("Generate groups from channel templates (UOT)", () => {
    let graphData;
    before(() => {
        graphData = modelClasses.Graph.fromJSON(uotWithChannels, modelClasses);
    });

    it("Channel templates expanded", () => {
        expect(graphData).to.have.property("channels");
        expect(graphData.channels).to.be.an('array').that.has.length(2);

        const ch1 = graphData.channels[0];
        expect(ch1).to.be.an('object');
        expect(ch1).to.have.property("id").that.equal("mc1");

        expect(ch1).to.have.property("group");
        expect(ch1.group).to.have.property("nodes");
        expect(ch1.group).to.have.property("links");
        expect(ch1.group).to.have.property("lyphs");
        expect(ch1.group.nodes).to.be.an('array').that.has.length(4);
        expect(ch1.group.links).to.be.an('array').that.has.length(3);
        expect(ch1.group.lyphs).to.be.an('array').that.has.length(3);
        ch1.group.lyphs.forEach(channelLyph => {
            expect(channelLyph).to.have.property("layers");
            expect(channelLyph.layers).to.be.an('array').that.has.length(3);
        });

        //housing lyph 60 is a template not integrated to the main graph, hence, there are no channel instances
        //expect(ch1).to.have.property("instances").that.is.an('array');

        //housing lyph layers contain border
        expect(ch1).to.have.property("housingLyphs");
        expect(ch1.housingLyphs).to.be.an('array').that.has.length(1);
        const sr = ch1.housingLyphs[0];
        expect(sr).to.have.property("id").that.equal("60");
        expect(sr).to.have.property("class").that.equal("Lyph");
        expect(sr).to.have.property("name").that.equal("Sarcoplasmic reticulum");
        expect(sr).to.have.property("layers");
        expect(sr.layers).to.be.an('array').that.has.length(3);
        sr.layers.forEach(layer => {
            expect(layer).to.have.property("border");
            expect(layer.border).to.have.property("class").that.equal("Border");
            expect(layer).to.have.property("inCoalescences");
            expect(layer.inCoalescences).to.be.an('array').that.has.length(1);
        })

        //For instances:
        //check material payload conveyed by the diffusive edge;
        //check that channel nodes are hosted by the borders of the layers of the housing lyph.

        //The third layer of each MC segment undergoes an `embedding coalescence` with the layer of the housing lyph that contains it.
        //Each of the three MC segments conveys a `diffusive edge` such that both nodes of the edge conveyed by the MC segment in the second (membranous) layer
        // are shared by the other two diffusive edges.
        //Diffusive edges are associated with the links that convey the membrane channels (i.e., the link's `conveyingType` is set to `DIFFUSIVE`) and
        // the material in the channel object is copied to the `conveyingMaterials` property of the link.
    });

    after(() => {
        graphData.logger.clear();
    });
});

