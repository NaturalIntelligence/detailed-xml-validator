/// @ts-check

const validations = require("./validations");
const { breakInSets} = require("./util");

const numericTypes = ["positiveInteger", "integer", "positiveDecimal", "decimal", "number"];

class Traverser{
    constructor(options){
        this.options = options;
        this.failures = [];
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
            if(rules !== undefined && rules['@rules'] !== undefined ){
                if(rules['@rules'].repeatable !== undefined ){
                    this.checkOccurences(rules['@rules'], ele.length, path);
                    ele.forEach( (val,index) => {
                        const arrayPath = path + "[" + index + "]";
                        if(Object.keys(rules).length > 1){
                            this.callForCommonProperties(ele[index], rules, arrayPath);
                        }else{
                            this.traverse(ele[index], key, rules, arrayPath);
                        }
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
            if (typeof rules === 'object' && rules['@rules']) {
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
        if(rules['@rules'].repeatable === true){ //leaf node 
            this.checkOccurences(rules['@rules'], 1, path);
        }
        const eleType = rules['@rules'].type;
        //leaf node can be map if all child elements are optional
        if (eleType === "map" ||
            (!eleType && this.isMapType(rules))) {
            //leaf node can be a map only if it's all child tags are optional
            if(typeof val === 'string' && val.length > 0) {
                this.failures.push({
                    code: "unexpected value in a map",
                    path: path.substr(1),
                    value: val
                })
            }
            this.validateMandatoryFields(rules, path);

        } else if (eleType === "date") {
            this.validateDate(val, eleType, path);
        } else if (eleType === "boolean") {
            this.validateBoolean(val, eleType, path);
        } else if (numericTypes.indexOf(eleType) !== -1) {
            if (!this.isValidNum(eleType, val)) {
                this.setInvalidDataType(eleType, path, val);
            } else {
                this.assertValue(rules['@rules'], "num", Number(val), path);
            }
        } else if (eleType === "string" || !eleType) {
            this.assertValue(rules['@rules'], "string", val, path);
        } else {
            throw new Error("Unsupported data type in Rules:" + eleType);
        }
    }

    /**
     * Check if an object should have mandatory child tag
     * @param {object} rules 
     * @param {string} newpath 
     */
    validateMandatoryFields(rules, newpath){
        const keys = Object.keys(rules);
        //Check for mandatory child tags
        
        for (let i = 0; i < keys.length; i++) {
            if(keys[i] === "@rules") continue;
            const child = rules[keys[i]];
            const rulesForChild = child['@rules'];
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
        if(tag['@rules']){
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
                const expected = Number(rules[rule]);
                if( !validations.num[rule](expected, actual) ){
                    this.setInvalidValueError(rule, newpath, actual, expected);
                };
            };
        })
    }

    checkString(rules, actual, newpath){
        ["minLength", "maxLength", "length"].forEach( rule => {
            if(rules[rule] !== undefined){
                const expected = Number(rules[rule]);
                if( !validations.string[rule](expected, actual) ){
                    this.setInvalidValueError(rule, newpath, actual, expected);
                };
            }
        });
        // if(rules.pattern){
        //     const expected = rules[rule];
        //         if( !validations.string[rule](expected, actual) ){
        //             this.setInvalidValueError(rule, newpath, actual, expected);
        //         };
        // }
        ["pattern", "pattern_i", "pattern_im", "pattern_mi"].forEach( rule => {
            if(rules[rule] !== undefined){
                let modifier = "";
                if(rule.length > 8) modifier = rule.substring(8);
                const expected = rules[rule];
                if( !validations.string["pattern"](expected, actual, modifier) ){
                    this.setInvalidValueError("pattern", newpath, actual, expected);
                };
            }
        })
    }

    assertValue(rules,eleType,actual, newpath){

        if(eleType == "string") this.checkString(rules, actual, newpath);
        else if(eleType == "num") this.checkNumeric(rules, actual, newpath);
    }

    validateBoolean(actual, eleType,newpath){
        if(this.options.boolean.indexOf(actual) === -1){
            this.setInvalidDataType(eleType, newpath, actual);
        }
    }

    isValidNum(eleType, val){
        if(!isNaN(val)) {
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
        const date = Date.parse(val);
            if(isNaN(date)) this.setInvalidDataType(eleType, newpath, val);
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
                const rulesNode = rules[tagRule]["@rules"];
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

module.exports = Traverser;