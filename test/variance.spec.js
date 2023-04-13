import {
    describe,
    it,
    beforeEach,
    expect, after,
} from './test.helper';
import spinalVariance from './data/spinalVariance.json';

import {modelClasses, generateFromJSON} from '../src/model/index';

describe("Model generation accounts for selected variance specification", () => {
    let graphData;
    beforeEach(() => {
        graphData = generateFromJSON(spinalVariance, modelClasses);
    });

    it("Lyphs are removed when variance spec is applied", () => {
       let noRodentLyphs = graphData.lyphs.filter(l => (l.varianceSpecs||[]).find(vs => vs.id === "vs-no-rodent"));
       expect(noRodentLyphs).to.have.length(8);
       let str1 = JSON.stringify(graphData.toJSON(3));
       expect(str1.includes("lyph-T13")).to.be.true;

       noRodentLyphs.forEach(lyph => graphData.removeLyph(lyph));
       let str2 = JSON.stringify(graphData.toJSON(3));
       expect(str2.includes("lyph-T13")).to.be.false;
    });

    after(() => {
        graphData.logger.clear();
    });
});
