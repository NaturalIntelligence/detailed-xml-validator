import { XMLParser, XMLValidator } from "fast-xml-parser";
import { Traverser } from "./Traverser.js";

const defaultOptions = {
    unknownAllow: true,
    boolean: ["true", "false"],
};

export class Validator {
    /**
     * @param {string} rules  - XML string containing rule definitions
     * @param {object} [options]
     */
    constructor(rules, options) {
        validateXMLData(rules);
        const ruleParser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: "@rules",
            attributeNamePrefix: "",
            allowBooleanAttributes: true,
        });
        this.rules = ruleParser.parse(rules);
        this.options = Object.assign({}, defaultOptions, options);
        this.validators = {};
        /** @type {object|null} Parsed XML data after the last validate() call */
        this.data = null;
    }

    /**
     * Register a custom validator function.
     * @param {string} name
     * @param {(value: string, path: string) => object | undefined} fn
     */
    register(name, fn) {
        this.validators[name] = fn;
    }

    /**
     * Validate XML data against the rules.
     * @param {string} xmldata
     * @returns {Array<object>} Array of failure objects (empty if valid)
     */
    validate(xmldata) {
        validateXMLData(xmldata);
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributesGroupName: ":a",
            attributeNamePrefix: "",
            parseTagValue: false,
        });
        const xmlObj = parser.parse(xmldata);
        this.data = xmlObj;
        const traverser = new Traverser(this.options, this.validators);
        traverser.traverse(xmlObj, "", this.rules, "");
        return traverser.failures;
    }
}

function validateXMLData(xmldata) {
    if (!xmldata) throw new Error("Empty data");
    else if (typeof xmldata !== "string") throw new Error("Not a valid string");
    const result = XMLValidator.validate(xmldata, {
        allowBooleanAttributes: true,
    });
    if (result !== true) {
        throw new Error(result.err.msg + ":" + result.err.line);
    }
}

export default Validator;
