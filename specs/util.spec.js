import { expect } from 'chai';
import { breakInSets } from '../src/util.js';

describe("util", function(){
    it("breakInSets", function(){
        const data = ["a", "b", "c"];
        const rules = ["b", "c", "d"];
        const result = breakInSets(data, rules);
        expect(result).to.deep.equal({
            data: ["a"],
            rules: ["d"],
            common: ["b","c"]
        });
    });
});
