const { assert, expect } = require('chai');
const Validator = require("../validator");
const fs = require("fs");
const path = require("path");

describe("XML validator with array", function() {
    //type:array
    it("when list with single/multiple occurences", function(){
        const xmlData = `
            <root>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b repeatable></b>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
         ]);
    });

    it("when missing mandatory list", function(){
        const xmlData = `
            <root>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b repeatable nillable="false"></b>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'missing', path: 'root.b'} ,
         ]);
    });

    it("when missing mandatory list based on minOccurs", function(){
        const xmlData = `
            <root>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b repeatable minOccurs="1"></b>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'missing', path: 'root.b'} ,
         ]);
    });

    it("when all list missing with minOccurs and maxOccurs", function(){
        const xmlData = `
            <root>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b repeatable nillable="false"></b>
                <b repeatable minOccurs="0"></b>
                <c repeatable minOccurs="0" maxOccurs="0"></c>
                <d repeatable minOccurs="2" maxOccurs="1"></d>
                <e repeatable minOccurs="1" maxOccurs="1"></e>
                <f repeatable minOccurs="1" maxOccurs="2"></f>
                <g repeatable maxOccurs="0"></g>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'missing', path: 'root.d'} ,
            { code: 'missing', path: 'root.e'} ,
            { code: 'missing', path: 'root.f'} ,
        ]);
    });

    it("when non repeatable items are repeated", function(){
        const xmlData = `
            <root>
                <a></a>
                <a></a>
                <d></d>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <d></d>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'unexpected sequence', path: 'root.a' }
        ]);
    });

    it("when list with minOccurs and maxOccurs", function(){
        const xmlData = `
            <root>
                <b></b>
                <c></c>
                <d></d>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b repeatable minOccurs="0"></b>
                <c repeatable minOccurs="0" maxOccurs="0"></c>
                <d repeatable minOccurs="2" maxOccurs="1"></d>
                <e repeatable minOccurs="1" maxOccurs="1"></e>
                <f repeatable minOccurs="1" maxOccurs="2"></f>
                <g repeatable maxOccurs="0"></g>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'missing', path: 'root.e' },
            { code: 'missing', path: 'root.f' },
            { code: 'maxOccurs', path: 'root.c', actual: 1, expected: 0 },
            { code: 'minOccurs', path: 'root.d', actual: 1, expected: 2 },
        ]);
    });

    it("when list with minOccurs and maxOccurs and nested object", function(){
        const xmlData = `
            <root>
                <a></a>
                <b></b>
                <b>
                    <e></e>
                </b>
                <b>
                    <nested></nested>
                </b>
                <d></d>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b repeatable minOccurs="1" maxOccurs="2">
                    <nested nillable="false"></nested>
                </b>
            </root>`;
        const validator = new Validator(rules, {
            unknownAllow: false
        });
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'unknown', path: 'root.d' },
            { code: 'maxOccurs', path: 'root.b', actual: 3, expected: 2 },
            { code: 'missing', path: 'root.b[0].nested' },
            { code: 'unknown', path: 'root.b[1].e' },
            { code: 'missing', path: 'root.b[1].nested' }
        ]);
    });

    it("when list is mentioned as map", function(){
        const xmlData = `
            <root>
                <a></a>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a type="map"></a>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'unexpected sequence', path: 'root.a' }
            //{ code: 'not a map' },
        ]);
    });

    it("when list of particular type", function(){
        const xmlData = `
            <root>
                <a>amit</a>
                <a>gupta</a>
            </root>`;
        const rules = `
            <root>
                <a repeatable type="string"></a>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
        ]);
    });

    it("when empty list of map type or invalid value in map", function(){
        const xmlData = `
            <root>
                <a>amit</a>
                <a>gupta</a>
                <a>
                    <b></b>
                </a>
            </root>`;
        const rules = `
            <root>
                <a repeatable>
                    <b>
                        <c nillable="false"></c>
                    </b>
                </a>
            </root>`;
        const validator = new Validator(rules, {
            unknownAllow: false
        });
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'unknown', path: 'root.a[0].0' },
            { code: 'unknown', path: 'root.a[0].1' },
            { code: 'unknown', path: 'root.a[0].2' },
            { code: 'unknown', path: 'root.a[0].3' },
            { code: 'unknown', path: 'root.a[1].0' },
            { code: 'unknown', path: 'root.a[1].1' },
            { code: 'unknown', path: 'root.a[1].2' },
            { code: 'unknown', path: 'root.a[1].3' },
            { code: 'unknown', path: 'root.a[1].4' },
            { code: 'missing', path: 'root.a[2].b.c' }
        ]);
    });
    it("when invalid value in map", function(){
        const xmlData = `
            <root>
                <b></b>
                <b>amit</b>
                <b>
                    amit
                    <c></c>
                </b>
            </root>`;
        const rules = `
            <root>
                <b repeatable type="map">
                    <c></c>
                </b>
            </root>`;
        const validator = new Validator(rules, {
            unknownAllow: false
        });
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'unknown', path: 'root.b[1].0' },
            { code: 'unknown', path: 'root.b[1].1' },
            { code: 'unknown', path: 'root.b[1].2' },
            { code: 'unknown', path: 'root.b[1].3' },
            { code: 'unknown', path: 'root.b[2].#text' }
        ]);
    });
    it("when invalid value in map", function(){
        const xmlData = `
            <root>
                <b></b>
                <b>amit</b>
                <b>
                    amit
                    <c></c>
                </b>
            </root>`;
        const rules = `
            <root>
                <b repeatable type="map"></b>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        console.log(actual);
        expect(actual).to.deep.equal([
            {
                code: 'unexpected value in a map',
                path: 'root.b[1]',
                value: 'amit'
              }
        ]);
    });

});