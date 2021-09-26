/// @ts-check

const parser = require("fast-xml-parser");
const validations = require("./validations");
const { breakInSets} = require("./util");

const numericTypes = ["positiveInteger", "integer", "positiveDecimal", "decimal", "number"];
const defaultOptions = {
    unknownAllow: true,
    boolean: ["true", "false"],
};
class Validator{
    constructor(rules, options){
        this.failures = [];
        validateXMlData(rules);
        this.rules = parser.parse(rules, {
            ignoreAttributes: false,
            attrNodeName: "@",
            attributeNamePrefix: ""
        });
        this.options = Object.assign({}, defaultOptions, options); 
    }

    validate(xmldata){
        validateXMlData(xmldata);
        const xmlObj = parser.parse(xmldata, {
            ignoreAttributes: false
        });
        this.traverse (xmlObj, this.rules, "");
        return this.failures;
    }

    traverse (xmlObj, rules, path) {
        const tags = Object.keys(xmlObj);
        const rulesTags = Object.keys(rules);

        const sets = breakInSets(tags,rulesTags);
        this.checkUnknownSiblings(sets, path);
        this.checkMissingSiblings(sets, rules, path);

        sets.common.forEach( key => {
            const newpath = path + "." + key;
            const rulesNode = rules[key]["@"];
            
            if (typeof xmlObj[key] === 'object') {
                //TODO single node
                if((Array.isArray(xmlObj[key]) || rulesNode.type==='list') && rulesNode){
                    this.assertValue(rulesNode,"list",xmlObj[key].length, newpath);
                }
                return this.traverse(xmlObj[key], rules[key], newpath);
            }

            //apply validations on leaf node
            const val = xmlObj[key];
            
            if(rulesNode){
                const eleType = rulesNode.type;
                //leaf node can be map if all child elements are optional
                if(eleType === "map" || 
                (!eleType && this.isMapType(rules[key])) ){
                    //leaf node can be a map only if it's all child tags are optional
                    this.validateMandatoryFields(rules, key, newpath);
                    return;
                }else if(eleType === "list"){//leaf node with length 1
                    this.assertValue(rulesNode,"list",1, newpath);
                }else if( eleType === "date" ){
                    this.validateDate(val, eleType, newpath);
                    return;
                }else if( eleType === "boolean" ){
                    this.validateBoolean(eleType, newpath, val);
                    return;
                }else if( numericTypes.indexOf(eleType) !== -1){
                    if( !this.isValidNum(eleType, val)){
                        this.setInvalidDataType(eleType, newpath, val);
                        return;
                    }else{
                        this.assertValue(rulesNode,"num", val, newpath);
                    }
                }else if( eleType === "string" || !eleType){
                    this.assertValue(rulesNode,"string", val, newpath);
                }else{
                    throw new Error("Unsupported data type in Rules:" + eleType);
                }
            }else if(this.isMapType(rules[key])){
                this.validateMandatoryFields(rules, key, newpath, val);
        }else{
                //no rule defined for this tag
            }
        });
    }

    /**
     * Check if an object should have mandatory child tag
     * @param {object} rules 
     * @param {string} key 
     * @param {string} newpath 
     */
    validateMandatoryFields(rules, key, newpath){
        const keys = Object.keys(rules[key]);
        //Check for mandatory child tags
        
        for (let i = 0; i < keys.length; i++) {
            if(keys[i] === "@") continue;
            const child = rules[key][keys[i]];
            const rulesForChild = child['@'];
            if(rulesForChild){
                //1. at least one child tag with minOccurs > 0
                if(rulesForChild.minOccurs && rulesForChild.minOccurs > 0) {
                    this.failures.push({
                        code: "missing",
                        path: (newpath + "." + keys[i]).substr(1)
                    });
                } 
                //2. at least one child tag with nillable = false
                else if(rulesForChild.nillable !== undefined && rulesForChild.nillable  === 'false') {
                    this.failures.push({
                        code: "missing",
                        path: (newpath + "." + keys[i]).substr(1)
                    });
                }
            }
        }
    }
    /**
     * For empty data tag, check if it map type from rules XML
     * @param {any} tag 
     * @returns 
     */
    isMapType(tag){
        if(typeof tag === "string") return false;//leaf node without validations
        const keys = Object.keys(tag);
        if(keys['@']){
            if(keys.length === 1) return false; //no child tag but validations only
        }else if(keys.length === 0){//no child tag and validations
            return false;
        }else{
            return true;
        }
    }

    assertValue(rules,eleType,actual, newpath){
        Object.keys(rules).forEach(rule => {
            if(rule === "type" || rule === "nillable") return;
            else{
                if(!validations[eleType][rule]){
                    throw new Error("Unsupported validation in Rules:" + rule);
                }else{
                    const expected = rules[rule];
                    if( !validations[eleType][rule](expected, actual) ){
                        this.failures.push({
                            code: rule,
                            path: newpath.substr(1),
                            actual: actual,
                            expected: expected
                        });
                    };
                }
            }
        });
    }

    validateBoolean(eleType,actual, newpath){
        if(this.options.boolean.indexOf(actual) === -1){
            this.setInvalidDataType(eleType, newpath, actual);
        }
    }

    isValidNum(eleType, val){
        if(isNaN(val)) {
            const num = Number(val);
            if( 
            (eleType === "positiveInteger" && num < 0) ||
            (eleType === "positiveDecimal" && num < 0) ||
            (eleType === "integer" && !isInt(val)) ){
                return false;
            }
        }else{
            return false;
        }
        return true;
    }

    validateDate(val, eleType, newpath) {
        try {
            new Date(val);
        } catch (err) {
            this.setInvalidDataType(eleType, newpath, val);
        }
    }

    setInvalidDataType(eleType, newpath, val) {
        this.failures.push({
            code: "not a " + eleType,
            path: newpath.substr(1),
            value: val
        });
    }

    /**
     * Check if any missing siblings is mandatory
     * @param {object} sets 
     * @param {object} rules 
     * @param {string} path 
     */
    checkMissingSiblings(sets, rules, path) {
        if (sets.rules) { //rules has tags which are not in XML data
            sets.rules.forEach(tagRule => {
                const rulesNode = rules[tagRule]["@"];
                //if(!rulesNode || rulesNode.nillable === undefined) rulesNode.nillable = false;
                if (rulesNode && (rulesNode.nillable === 'false' || rulesNode.minOccurs > 0 )) {
                    this.failures.push({
                        code: "missing",
                        path: (path + "." + tagRule).substr(1)
                    });
                }
            });
        }
    }

    /**
     * Check if any extra unknown tag is present
     * @param {object} sets 
     * @param {string} path 
     */
    checkUnknownSiblings(sets, path) {
        if (sets.data && !this.options.unknownAllow) { //XML data has extra tags which are not set in rules
            sets.data.forEach(tag => {
                this.failures.push({
                    code: "unknown",
                    path: (path + "." + tag).substr(1)
                });
            });
        }
    }
}

function isInt(value) {
    var x = parseFloat(value);
    return (x | 0) === x;
}

function validateXMlData(xmldata){
    if(!xmldata) throw new Error("Empty data")
    else if(typeof xmldata !== "string") throw new Error("Not a valid string")
    let xmlObj;
    let result = parser.validate(xmldata);
    if(result !== true){
        throw new Error( result.err.msg + ":" + result.err.line);
    }
}
module.exports = Validator;

