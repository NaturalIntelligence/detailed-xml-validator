const { assert, expect } = require('chai');
const Validator = require("../src/validator");
const fs = require("fs");
const path = require("path");

describe("XML validator with attributes", function() {

    it("when missing all optional children", function(){
        const xmlData = `
            <root id="ABCD" a="w33424">
            </root>`;
        const rules = `
            <root>
                <:a>
                    <id length="6"></id>
                    <a minLength="2"></a>
                </:a>
                <a></a> <!-- nillable="true" -->
                <b></b> <!-- nillable="true" -->
                <c nillable="true"></c>
                <d minOccurs="0"></d>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'length', path: 'root.:a.id', actual: 'ABCD', expected: 6 } 
         ]);
    });
});