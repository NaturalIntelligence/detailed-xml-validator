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
            attributeNamePrefix: "",
            allowBooleanAttributes: true
        });
        this.options = Object.assign({}, defaultOptions, options); 
    }

    validate(xmldata){
        validateXMlData(xmldata);
        const xmlObj = parser.parse(xmldata, {
            ignoreAttributes: false
            
        });
        this.traverse (xmlObj, "", this.rules, "");
        return this.failures;
    }

    /**
     * 
     * @param {object|string} ele 
     * @param {string} key 
     * @param {object|string} rules 
     * @param {string} path 
     */
    traverse(ele, key, rules, path){

        if (Array.isArray(ele)) {
            if(rules !== undefined && rules['@'] !== undefined ){
                if(rules['@'].repeatable !== undefined ){
                    this.checkOccurences(rules['@'], ele.length, path);
                    ele.forEach( (val,index) => {
                        const arrayPath = path + "[" + index + "]";
                        this.callForCommonProperties(ele[index], rules, arrayPath);
                    });
                    return;
                }
            }
            this.failures.push({
                code: "unexpected sequence",
                path: path.substr(1),
            })
        }else if (typeof ele === 'object') {
            this.callForCommonProperties(ele, rules, path);
        } else {
            if (typeof rules === 'object' && rules['@']) {
                this.checkDataAndType(ele, key, rules, path);
            } else if (this.isMapType(rules)) {
                this.validateMandatoryFields(rules, path);
            }
        }
    }

    callForCommonProperties(ele, rules, path){
        const tags = Object.keys(ele);
            const rulesTags = Object.keys(rules);

            const sets = breakInSets(tags, rulesTags);
            this.checkUnknownSiblings(sets, path);
            this.checkMissingSiblings(sets, rules, path);

            sets.common.forEach(key => {
                const newpath = path + "." + key;
                this.traverse(ele[key], key, rules[key], newpath);
            });
    }

    /**
     * Check if the leaf node 
     * 1. should have mandatory child nodes
     * 2. has correct type as per its value
     * 3. pass the validations
     * @param {string} val 
     * @param {string} key 
     * @param {object} rules 
     * @param {string} path 
     * @returns 
     */
    checkDataAndType(val, key, rules, path){
        if(rules['@'].repeatable === true){ //leaf node 
            this.checkOccurences(rules['@'], 1, path);
        }else {
            const eleType = rules['@'].type;
            //leaf node can be map if all child elements are optional
            if (eleType === "map" ||
                (!eleType && this.isMapType(rules))) {
                //leaf node can be a map only if it's all child tags are optional
                this.validateMandatoryFields(rules, path);
            } else if (eleType === "date") {
                this.validateDate(val, eleType, path);
            } else if (eleType === "boolean") {
                this.validateBoolean(eleType, path, val);
            } else if (numericTypes.indexOf(eleType) !== -1) {
                if (!this.isValidNum(eleType, val)) {
                    this.setInvalidDataType(eleType, path, val);
                } else {
                    this.assertValue(rules, "num", val, path);
                }
            } else if (eleType === "string" || !eleType) {
                this.assertValue(rules, "string", val, path);
            } else {
                throw new Error("Unsupported data type in Rules:" + eleType);
            }
        }
    }

    /**
     * Check if an object should have mandatory child tag
     * @param {object} rules 
     * @param {string} key 
     * @param {string} newpath 
     */
    validateMandatoryFields(rules, newpath){
        const keys = Object.keys(rules);
        //Check for mandatory child tags
        
        for (let i = 0; i < keys.length; i++) {
            if(keys[i] === "@") continue;
            const child = rules[keys[i]];
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
        if(tag['@']){
            if(keys.length === 1) return false; //no child tag but validations only
        }else if(keys.length === 0){//no child tag and validations
            return false;
        }else{
            return true;
        }
    }

    setInvalidValueError(rule, newpath, actual, expected) {
        this.failures.push({
            code: rule,
            path: newpath.substr(1),
            actual: actual,
            expected: expected
        });
    }

    checkOccurences(rules, actual, newpath){
        ["minOccurs", "maxOccurs"].forEach( rule => {
            if(rules[rule] !== undefined){
                const expected = Number(rules[rule]);
                if( !validations.list[rule](expected, actual) ){
                    this.setInvalidValueError(rule, newpath, actual, expected);
                };
            };
        })
    }

    checkNumeric(rules, actual, newpath){
        ["min", "max"].forEach( rule => {
            if(rules[rule] !== undefined){
                const expected = rules[rule];
                if( !validations.num[rule](expected, actual) ){
                    this.setInvalidValueError(rule, newpath, actual, expected);
                };
            };
        })
    }

    checkString(rules, actual, newpath){
        ["minLength", "maxLength", "length", "pattern"].forEach( rule => {
            if(rules[rule] !== undefined){
                const expected = rules[rule];
                if( !validations.string[rule](expected, actual) ){
                    this.setInvalidValueError(rule, newpath, actual, expected);
                };
            }
        })
    }

    assertValue(rules,eleType,actual, newpath){
        //if(rules.repeatable) this.checkOccurences(rules, actual, newpath);

        if(eleType == "string") this.checkString(rules, actual, newpath);
        else if(eleType == "num") this.checkNumeric(rules, actual, newpath);
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
    let result = parser.validate(xmldata, {
        allowBooleanAttributes: true
    });
    if(result !== true){
        throw new Error( result.err.msg + ":" + result.err.line);
    }
}
module.exports = Validator;

