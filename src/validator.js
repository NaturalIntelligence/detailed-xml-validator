/// @ts-check

const parser = require("fast-xml-parser");
const Traverser = require("./Traverser");

const defaultOptions = {
    unknownAllow: true,
    boolean: ["true", "false"],
};
class Validator{
    constructor(rules, options){
        validateXMlData(rules);
        this.rules = parser.parse(rules, {
            ignoreAttributes: false,
            attrNodeName: "@rules",
            attributeNamePrefix: "",
            allowBooleanAttributes: true
        });
        this.options = Object.assign({}, defaultOptions, options); 
    }

    validate(xmldata){
        validateXMlData(xmldata);
        const xmlObj = parser.parse(xmldata, {
            ignoreAttributes: false,
            attrNodeName: ":a",
            attributeNamePrefix: "",
            parseNodeValue: false
        });
        this.data = xmlObj;
        const traverser = new Traverser(this.options);
        traverser.traverse (xmlObj, "", this.rules, "");
        return traverser.failures;
    }

}



function validateXMlData(xmldata){
    if(!xmldata) throw new Error("Empty data")
    else if(typeof xmldata !== "string") throw new Error("Not a valid string")
    let xmlObj;
    let result = parser.validate(xmldata, {
        allowBooleanAttributes: true
    });
    if(result !== true){
        throw new Error( result.err.msg + ":" + result.err.line);
    }
}
module.exports = Validator;

