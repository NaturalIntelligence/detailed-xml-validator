const { expect } = require('chai');
const {breakInSets} = require("../util");

describe("Utility method", function() {
    it("breakInSets should return extra items and common items", async function(){
        const data = ["a", "b", "c", "e", "f"];
        const rules = ["a", "b", "g", "c", "h"];
        const result = breakInSets(data, rules);
        expect(result.data).to.be.deep.equal(["e", "f"]);
        expect(result.rules).to.be.deep.equal(["g", "h"]);
        expect(result.common).to.be.deep.equal(["a", "b", "c"]);
    });
    it("breakInSets should return not extra itemsif all are common", async function(){
        const data = ["a", "b", "c", "f"];
        const rules = ["a", "b", "f", "c"];
        const result = breakInSets(data, rules);
        expect(result.data.length).to.equal(0);
        expect(result.rules.length).to.equal(0);
        expect(result.common).to.be.deep.equal(["a", "b", "c", "f"]);
    });

});