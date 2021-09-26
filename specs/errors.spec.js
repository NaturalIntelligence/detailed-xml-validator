const { assert } = require('chai');
const Validator = require("../validator");
const fs = require("fs");
const path = require("path");

describe("XML validator should throw error when ", function() {
    const xmlData = fs.readFileSync( path.join( __dirname, "./files/student.xml") );
    const xmlDataStr = xmlData.toString();
    const errData = fs.readFileSync( path.join( __dirname,"./files/syntaxerror.xml")).toString();
    const studentRules = fs.readFileSync( path.join( __dirname,"./files/student_rules.xml"));
    const studentRulesStr = studentRules.toString();

    

    it("No XML data", async function(){
        assert.throws(() => {
            const validator = new Validator(studentRulesStr);
            validator.validate();
        }, "Empty data");
    });
    it("non-string XML data", async function(){
        assert.throws(() => {
            const validator = new Validator(studentRulesStr);
            validator.validate(xmlData);
        }, "Not a valid string");
    });
    it("Syntax error in XML data", async function(){
        assert.throws(() => {
            const validator = new Validator(studentRulesStr);
            validator.validate(errData);
        }, "boolean attribute '<name' is not allowed.:9");
    });
    it("No rules", async function(){
        assert.throws(() => {
            new Validator();
        }, "Empty data");
    });
    it("non-string rules", async function(){
        assert.throws(() => {
            new Validator(studentRules);
        }, "Not a valid string");
    });
    it("Syntax error in rules XML data", async function(){
        assert.throws(() => {
            new Validator(errData);
        }, "boolean attribute '<name' is not allowed.:9");
    });
});