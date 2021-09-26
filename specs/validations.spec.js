const { assert, expect } = require('chai');
const Validator = require("../validator");
const fs = require("fs");
const path = require("path");

describe("XML validator with custom message", function() {

    it("when missing all optional children", function(){
        const xmlData = `
            <root>
            </root>`;
        const rules = `
            <root>
                <a></a> <!-- nillable="true" -->
                <b></b> <!-- nillable="true" -->
                <c nillable="true"></c>
                <d minOccurs="0"></d>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([ ]);
    });

    it("when missing some optional & mandatory siblings", function(){
        const xmlData = `
            <root>
                <a></a>
                <d></d>
                <f></f>
            </root>`;
        const rules = `
            <root>
                <a></a> <!-- nillable="true" -->
                <b></b> <!-- nillable="true" -->
                <c nillable="true"></c>
                <d type="list" nillable="false"></d>
                <e type="list" nillable="false"></e>
                <f type="map" nillable="false"></f>
                <g type="map" nillable="false"></g>
                <x type="list" minOccurs="0"></x>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([ 
            { code: 'missing', path: 'root.e'} ,
            { code: 'missing', path: 'root.g'} 
        ]);
    });
    
    it("when missing all optional & mandatory children defined using nillable", function(){
        const xmlData = `
            <root>
            </root>`;
        const rules = `
            <root>
                <a></a> <!-- nillable="true" -->
                <b></b> <!-- nillable="true" -->
                <c nillable="true"></c>
                <d type="list" nillable="false"></d>
                <f type="map" nillable="false"></f>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        console.log(actual);
        expect(actual).to.deep.equal([ 
            { code: 'missing', path: 'root.d'} ,
            { code: 'missing', path: 'root.f'} ,
        ]);
    });

    it("when missing all optional & mandatory children defined using minOccurs > 0", function(){
        const xmlData = `
            <root>
            </root>`;
        const rules = `
            <root>
                <a></a> <!-- nillable="true" -->
                <b></b> <!-- nillable="true" -->
                <c nillable="true"></c>
                <d minOccurs="0"></d>
                <e minOccurs="1"></e>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        console.log(actual);
        expect(actual).to.deep.equal([ 
            { code: 'missing', path: 'root.e'} ,
        ]);
    });

    it("when missing some optional & mandatory siblings defined using minOccurs > 0", function(){
        const xmlData = `
            <root>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a></a> <!-- nillable="true" -->
                <b></b> <!-- nillable="true" -->
                <c nillable="true"></c>
                <d minOccurs="0"></d>
                <e minOccurs="1"></e>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        console.log(actual);
        expect(actual).to.deep.equal([ 
            { code: 'missing', path: 'root.e'} ,
        ]);
    });

    it("when missing all optional & mandatory children but type is given", function(){
        const xmlData = `
            <root>
            </root>`;
        const rules = `
            <root type="map">
                <a></a> <!-- nillable="true" -->
                <b></b> <!-- nillable="true" -->
                <c nillable="true"></c>
                <d type="list" nillable="false"></d>
                <f type="map" nillable="false"></f>
                <g type="list" minOccurs="1"></g>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        console.log(actual);
        expect(actual).to.deep.equal([ 
            { code: 'missing', path: 'root.d'} ,
            { code: 'missing', path: 'root.f'} ,
            { code: 'missing', path: 'root.g'} ,
        ]);
    });

    it("when unknown children", function(){
        const xmlData = `
            <root>
                <a></a>
                <f></f>
            </root>`;
        const rules = `
            <root>
                <a></a>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        //console.log(actual);
        expect(actual).to.deep.equal([]); 
    });

    it("when unknown children presents but set to ignore", function(){
        const xmlData = `
            <root>
                <a></a>
                <f></f>
            </root>`;
        const rules = `
            <root>
                <a></a>
            </root>`;
        const validator = new Validator(rules, { unknownAllow: false});
        const actual = validator.validate(xmlData);
        //console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'unknown', path: 'root.f'} 
        ]);
    });
});

describe("XML validator with array", function() {
    //type:array
    it("when list with single/multiple occurences", function(){
        const xmlData = `
            <root>
                <a></a>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b type="list"></b>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([ ]);
    });

    it("when missing mandatory list", function(){
        const xmlData = `
            <root>
                <a></a>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b type="list" nillable="false"></b>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'missing', path: 'root.b'} ,
         ]);
    });

    it("when list with minOccurs and maxOccurs", function(){
        const xmlData = `
            <root>
                <a></a>
                <a></a>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b type="list" nillable="false"></b>
                <b type="list" minOccurs="0"></b>
                <c type="list" minOccurs="0" maxOccurs="0"></c>
                <d type="list" minOccurs="2" maxOccurs="1"></d>
                <e type="list" minOccurs="1" maxOccurs="1"></e>
                <f type="list" minOccurs="1" maxOccurs="2"></f>
                <g type="list" maxOccurs="0"></g>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        //console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'missing', path: 'root.d'} ,
            { code: 'missing', path: 'root.e'} ,
            { code: 'missing', path: 'root.f'} ,
        ]);
    });

    it("when list with minOccurs and maxOccurs", function(){
        const xmlData = `
            <root>
                <a></a>
                <a></a>
                <b></b>
                <c></c>
                <d></d>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b type="list" minOccurs="0"></b>
                <c type="list" minOccurs="0" maxOccurs="0"></c>
                <d type="list" minOccurs="2" maxOccurs="1"></d>
                <e type="list" minOccurs="1" maxOccurs="1"></e>
                <f type="list" minOccurs="1" maxOccurs="2"></f>
                <g type="list" maxOccurs="0"></g>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'missing', path: 'root.e' },
            { code: 'missing', path: 'root.f' },
            { code: 'minOccurs', path: 'root.b', actual: 1, expected: "0" },
            { code: 'minOccurs', path: 'root.c', actual: 1, expected: "0" },
            { code: 'maxOccurs', path: 'root.c', actual: 1, expected: "0" },
            { code: 'minOccurs', path: 'root.d', actual: 1, expected: "2" },
            { code: 'maxOccurs', path: 'root.d', actual: 1, expected: "1" }
        ]);
    });

    it.skip("when list with minOccurs and maxOccurs", function(){
        const xmlData = `
            <root>
                <a></a>
                <a></a>
                <b>
                </b>
                <b>
                    <nested></nested>
                </b>
                <d></d>
            </root>`;
        const rules = `
            <root>
                <a></a>
                <b type="list" minOccurs="1">
                    <nested nill="false"></nested>
                </b>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'minOccurs', path: 'root.b', actual: 1, expected: "0" },
            { code: 'minOccurs', path: 'root.b', actual: 1, expected: "0" },
        ]);
    });
    it.only("when list is mentioned as map", function(){
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
        console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'not a map' },
        ]);
    });

    it.only("when list of particular type", function(){
        const xmlData = `
            <root>
                <a>amit</a>
                <a>gupta</a>
            </root>`;
        const rules = `
            <root>
                <a type="string"></a>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'not a map' },
        ]);
    });

});

describe("XML validator with Number", function() {
    //type:number
    it.skip("when invalid positiveNumber, positiveDecimal, integer, number", function(){});
    it.skip("when min, max cross the boundary", function(){});
    
    //type:string
    it.skip("when pattern doesn't match", function(){});
    it.skip("when length, minLength, maxLength cross the boundary", function(){});
    
    //type:boolean
    it.skip("when invalid boolean value", function(){});
    it.skip("when boolean value with customized range", function(){});

    it("No XML data", async function(){
        const xmlData = fs.readFileSync( path.join( __dirname, "./files/student_obj.xml") ).toString();
        const rules = fs.readFileSync( path.join( __dirname, "./files/student_rules.xml")).toString();
        const validator = new Validator(rules);
        console.log(validator.validate(xmlData));
    });
    
});