const { assert, expect } = require('chai');
const Validator = require("../src/validator");
const fs = require("fs");
const path = require("path");

describe("XML validator with Number", function() {
    //type:string
    it("when string length cross the boundary", function(){
        const xmlData = `
        <root>
            <a>amit</a>
            <b>kumar</b>
            <c>gupta</c>
        </root>`;
        const rules = `
        <root>
            <a type="string" minLength="3"></a>
            <b length="4"></b>
            <c minLength="2" maxLength="5" ></c>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'length', path: 'root.b', actual: 'kumar', expected: 4 }
        ]);
    });
    it("when pattern doesn't match", function(){
        const xmlData = `
        <root>
            <a>0</a>
            <a>amitguptagmail.com</a>
            <a>amit@gmail.com</a>
            <a>amitgupta@gmail.com</a>
        </root>`;
        const rules = `
        <root>
            <a repeatable pattern="[a-z]+@gmail.com" minLength="15"></a>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'minLength', path: 'root.a[0]', actual: '0', expected: 15 },
            {
                code: 'pattern',
                path: 'root.a[0]',
                actual: '0',
                expected: '[a-z]+@gmail.com'
            },
            {
                code: 'pattern',
                path: 'root.a[1]',
                actual: 'amitguptagmail.com',
                expected: '[a-z]+@gmail.com'
            },
            {
                code: 'minLength',
                path: 'root.a[2]',
                actual: 'amit@gmail.com',
                expected: 15
            }
        ]);
    });
    it("when pattern doesn't match with modifier", function(){
        const xmlData = `
        <root>
            <a>0</a>
            <a>amitguptagmail.com</a>
            <a>amit@gmail.com</a>
            <a>amitgupta@gmail.com</a>
            <a>AmitGupta@Gmail.com</a>
        </root>`;
        const rules = `
        <root>
            <a repeatable pattern_i="[a-z]+@gmail.com" minLength="15"></a>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'minLength', path: 'root.a[0]', actual: '0', expected: 15 },
            {
                code: 'pattern',
                path: 'root.a[0]',
                actual: '0',
                expected: '[a-z]+@gmail.com'
            },
            {
                code: 'pattern',
                path: 'root.a[1]',
                actual: 'amitguptagmail.com',
                expected: '[a-z]+@gmail.com'
            },
            {
                code: 'minLength',
                path: 'root.a[2]',
                actual: 'amit@gmail.com',
                expected: 15
            }
        ]);
    });

    it("when a fixed string is given", function(){
        const xmlData = `
        <root>
            <a>amit</a>
            <b>kumar</b>
            <c>gupta</c>
        </root>`;
        const rules = `
        <root>
            <a type="string" minLength="3" fixed="amit"></a>
            <b length="4" fixed="-"></b>
            <c minLength="2" maxLength="5" ></c>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'length', path: 'root.b', actual: 'kumar', expected: 4 },
            { code: 'fixed', path: 'root.b', actual: 'kumar', expected: '-' }
        ]);
    });
    it("when a list of strings are given for repeatable tags", function(){
        const xmlData = `
        <root>
            <a>amit</a>
            <b>kumar</b>
            <b>-</b>
            <b>middle</b>
            <c>gupta</c>
        </root>`;
        const rules = `
        <root>
            <a type="string" minLength="3" fixed="amit"></a>
            <b repeatable in="-,kumar"></b>
            <c minLength="2" maxLength="5" ></c>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            {  code: 'in', path: 'root.b[2]',  actual: 'middle', expected: '-,kumar' }
        ]);
    });
    it("when a list of strings are given for leaf tag", function(){
        const xmlData = `
        <root>
            <a>amit</a>
            <b>middle</b>
            <c>gupta</c>
        </root>`;
        const rules = `
        <root>
            <a type="string" minLength="3" fixed="amit"></a>
            <b in="-,kumar"></b>
            <c minLength="2" maxLength="5" ></c>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'in', path: 'root.b', actual: 'middle', expected: '-,kumar' }
        ]);
    });

});