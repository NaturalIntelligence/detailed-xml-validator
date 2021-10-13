const { assert, expect } = require('chai');
const Validator = require("../src/validator");
const fs = require("fs");
const path = require("path");

describe("XML validator with Number", function() {
    //type:number
    it("when invalid positiveNumber, positiveDecimal, integer, number", function(){
        const xmlData = `
            <root>
                <a>0</a>
                <b></b>
                <b>
                    <b>1</b>
                </b>
                <c>3.2</c>
                <f>4</f>
                <f>-4</f>
                <f>acbc</f>
                <f>004</f>

            </root>`;
        const rules = `
            <root>
                <a type="positiveInteger"></a>
                <b repeatable minOccurs="1" maxOccurs="2">
                    <b nillable="false" type="positiveDecimal"></b>
                </b>
                <c type="integer"></c>
                <d type="integer"></d>
                <e repeatable type="integer"></e>
                <f repeatable minOccurs="1" type="integer"></f>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'missing', path: 'root.b[0].b' },
            { code: 'not a integer', path: 'root.c', value: "3.2" },
            { code: 'not a integer', path: 'root.f[2]', value: 'acbc' }
        ]);
    });
    it("when min, max cross the boundary", function(){
        const xmlData = `
        <root>
            <a>0</a>
            <c>3.2</c>
            <d>3.2</d>
            <f>4</f>
            <f>-4</f>
            <f>acbc</f>
            <f>004</f>
        </root>`;
        const rules = `
        <root>
            <a type="positiveInteger" min="3"></a>
            <c type="decimal" min="1.2"></c>
            <d type="number" min="1.2" max="1.5"></d>
            <f repeatable minOccurs="1" type="integer" min="1" max="4"></f>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'min', path: 'root.a', actual: 0, expected: 3 },
            { code: 'max', path: 'root.d', actual: 3.2, expected: 1.5 },
            { code: 'min', path: 'root.f[1]', actual: -4, expected: 1 },
            { code: 'not a integer', path: 'root.f[2]', value: 'acbc' }
        ]);
    });
    
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

    //type:boolean
    it("when invalid boolean value", function(){
        const xmlData = `
        <root>
            <a>yes</a>
            <a>true</a>
            <a>no</a>
            <a>1</a>
            <a>amit</a>
        </root>`;
        const rules = `
        <root>
            <a repeatable type="boolean"></a>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'not a boolean', path: 'root.a[0]', value: 'yes' },
            { code: 'not a boolean', path: 'root.a[2]', value: 'no' },
            { code: 'not a boolean', path: 'root.a[3]', value: '1' },
            { code: 'not a boolean', path: 'root.a[4]', value: 'amit' }
        ]);
    });
    it("when boolean value with customized range", function(){
        const xmlData = `
        <root>
            <a>yes</a>
            <a>true</a>
            <a>no</a>
            <a>1</a>
            <a>amit</a>
        </root>`;
        const rules = `
        <root>
            <a repeatable type="boolean"></a>
        </root>`;
        const validator = new Validator(rules, {
            boolean: ["true", "false", "yes", "no"],
        });
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'not a boolean', path: 'root.a[3]', value: '1' },
            { code: 'not a boolean', path: 'root.a[4]', value: 'amit' }
        ]);
    });

    //type:date
    it("when invalid date", function(){
        const xmlData = `
        <root>
            <a>yes</a>
            <a>true</a>
            <a>21 sep 21</a>
            <a>33:45:12</a>
            <a>03:45:12</a>
        </root>`;
        const rules = `
        <root>
            <a repeatable type="date"></a>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'not a date', path: 'root.a[0]', value: 'yes' },
            { code: 'not a date', path: 'root.a[1]', value: 'true' },
            { code: 'not a date', path: 'root.a[3]', value: '33:45:12' },
            { code: 'not a date', path: 'root.a[4]', value: '03:45:12' }
        ]);
    });


    
});