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
                <d repeatable nillable="false"></d>
                <e repeatable nillable="false"></e>
                <f type="map" nillable="false"></f>
                <g type="map" nillable="false"></g>
                <x repeatable minOccurs="0"></x>
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
                <d repeatable nillable="false"></d>
                <f type="map" nillable="false"></f>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
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
        // console.log(actual);
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
        // console.log(actual);
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
                <d repeatable nillable="false"></d>
                <f type="map" nillable="false"></f>
                <g repeatable minOccurs="1"></g>
            </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        // console.log(actual);
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

    it("No XML data", async function(){
        const xmlData = fs.readFileSync( path.join( __dirname, "./files/student_obj.xml") ).toString();
        const rules = fs.readFileSync( path.join( __dirname, "./files/student_rules.xml")).toString();
        const validator = new Validator(rules);
        //console.log(validator.validate(xmlData));
    });
});