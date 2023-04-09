/// @ts-check

const {XMLParser, XMLValidator} = require("fast-xml-parser");
const Traverser = require("./Traverser");

const defaultOptions = {
    unknownAllow: true,
    boolean: ["true", "false"],
};
class Validator{
    constructor(rules, options){
        validateXMlData(rules);
        const ruleParser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: "@rules",
            attributeNamePrefix: "",
            allowBooleanAttributes: true
        });
        this.rules = ruleParser.parse(rules);
        this.options = Object.assign({}, defaultOptions, options); 
        this.validators={};
    }

    register(validator, fn){
        this.validators[validator] = fn;
    }
    validate(xmldata){
        validateXMlData(xmldata);
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: ":a",
            attributeNamePrefix: "",
            parseTagValue: false
        });
        const xmlObj = parser.parse(xmldata);
        this.data = xmlObj;
        const traverser = new Traverser(this.options,this.validators);
        traverser.traverse (xmlObj, "", this.rules, "");
        return traverser.failures;
    }

}



function validateXMlData(xmldata){
    if(!xmldata) throw new Error("Empty data")
    else if(typeof xmldata !== "string") throw new Error("Not a valid string")
    let xmlObj;
    let result = XMLValidator.validate(xmldata, {
        allowBooleanAttributes: true
    });
    if(result !== true){
        throw new Error( result.err.msg + ":" + result.err.line);
    }
}
module.exports = Validator;

