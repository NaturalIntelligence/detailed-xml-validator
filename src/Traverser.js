import * as validations from "./validations.js";
import { breakInSets, parseRange } from "./util.js";

const numericTypes = ["positiveInteger", "integer", "positiveDecimal", "decimal", "number"];

export class Traverser {
    /**
     * @param {object} options
     * @param {object} validators
     */
    constructor(options, validators) {
        this.options = options;
        this.failures = [];
        this.validators = validators;

        // uniqueness tracking: field path -> array of seen values (sibling-scoped)
        // global uniqueness tracking: field name -> array of seen values (document-scoped)
        this._globalUnique = new Map(); // Map<fieldName, Set<string>>
    }

    /**
     * @param {object|string} ele
     * @param {string} key
     * @param {object|string} rules
     * @param {string} path
     */
    traverse(ele, key, rules, path) {
        if (Array.isArray(ele)) {
            if (rules !== undefined && rules["@rules"] !== undefined) {
                if (rules["@rules"].repeatable !== undefined) {
                    this.checkOccurences(rules["@rules"], ele.length, path);
                    ele.forEach((val, index) => {
                        const arrayPath = path + "[" + index + "]";
                        if (Object.keys(rules).length > 1) {
                            this.callForCommonProperties(ele[index], rules, arrayPath);
                        } else {
                            this.traverse(ele[index], key, rules, arrayPath);
                        }
                    });
                    return;
                }
            }
            this.failures.push({
                code: "unexpected sequence",
                path: path.substr(1),
            });
        } else if (typeof ele === "object") {
            this.callForCommonProperties(ele, rules, path);
        } else {
            if (typeof rules === "object" && rules["@rules"]) {
                this.checkDataAndType(ele, key, rules, path);
            } else if (this.isMapType(rules)) {
                this.validateMandatoryFields(rules, path);
            }
            this.applyCustomValidators(ele, rules, path);
        }
    }

    applyCustomValidators(ele, rules, path) {
        if (
            rules["@rules"] &&
            rules["@rules"].checkBy &&
            typeof this.validators[rules["@rules"].checkBy] === "function"
        ) {
            let res = this.validators[rules["@rules"].checkBy](ele, path.substr(1));
            if (typeof res === "object") {
                this.failures.push(res);
            }
        }
    }

    /**
     * @param {object} ele
     * @param {object} rules
     * @param {string} path
     */
    callForCommonProperties(ele, rules, path) {
        const tags = Object.keys(ele);
        const rulesTags = Object.keys(rules);

        const sets = breakInSets(tags, rulesTags);
        this.checkUnknownSiblings(sets, path);
        this.checkMissingSiblings(sets, rules, path);

        this.applyCustomValidators(ele, rules, path);

        // Collect sibling values for uniqueness checks before traversing
        // Build a map of fieldName -> array of values for this sibling scope
        const siblingValues = this._buildSiblingValues(ele, rules, sets.common);

        sets.common.forEach((key) => {
            const newpath = path + "." + key;
            this.traverse(ele[key], key, rules[key], newpath);
        });

        // After traversing, run ordering & uniqueness checks for this sibling scope
        this._checkOrderingConstraints(ele, rules, sets.common, path);
        this._checkUniquenessConstraints(ele, rules, sets.common, path, siblingValues);
    }

    // ─── Ordering Constraints (before / after) ────────────────────────────────

    /**
     * For every date field that has `before` or `after` in rules, validate ordering.
     * @param {object} ele
     * @param {object} rules
     * @param {string[]} commonKeys
     * @param {string} path
     */
    _checkOrderingConstraints(ele, rules, commonKeys, path) {
        commonKeys.forEach((key) => {
            const fieldRules = rules[key];
            if (!fieldRules || !fieldRules["@rules"]) return;
            const r = fieldRules["@rules"];
            if (r.type !== "date") return;

            const actualVal = ele[key];
            if (!actualVal || typeof actualVal !== "string") return;

            if (r.after) {
                const refKey = r.after;
                const refVal = ele[refKey];
                if (refVal && typeof refVal === "string" && !isNaN(Date.parse(refVal))) {
                    if (!isNaN(Date.parse(actualVal)) && !validations.date.isAfter(actualVal, refVal)) {
                        this.failures.push({
                            code: "after",
                            path: (path + "." + key).substr(1),
                            actual: actualVal,
                            expected: refKey,
                        });
                    }
                }
            }

            if (r.before) {
                const refKey = r.before;
                const refVal = ele[refKey];
                if (refVal && typeof refVal === "string" && !isNaN(Date.parse(refVal))) {
                    if (!isNaN(Date.parse(actualVal)) && !validations.date.isBefore(actualVal, refVal)) {
                        this.failures.push({
                            code: "before",
                            path: (path + "." + key).substr(1),
                            actual: actualVal,
                            expected: refKey,
                        });
                    }
                }
            }
        });
    }

    // ─── Uniqueness Constraints ───────────────────────────────────────────────

    /**
     * Build a map of fieldName -> array of values found in this sibling scope.
     * Works for both scalar values and array (repeatable) values.
     * @param {object} ele
     * @param {object} rules
     * @param {string[]} commonKeys
     * @returns {Map<string, string[]>}
     */
    _buildSiblingValues(ele, rules, commonKeys) {
        const map = new Map();
        commonKeys.forEach((key) => {
            const val = ele[key];
            if (Array.isArray(val)) {
                map.set(key, val.map(String));
            } else if (val !== undefined && val !== null && typeof val !== "object") {
                map.set(key, [String(val)]);
            }
        });
        return map;
    }

    /**
     * Check uniqueness constraints for fields in this sibling scope.
     * @param {object} ele
     * @param {object} rules
     * @param {string[]} commonKeys
     * @param {string} path
     * @param {Map<string, string[]>} siblingValues
     */
    _checkUniquenessConstraints(ele, rules, commonKeys, path, siblingValues) {
        // For repeatable items (array context), ele is a single item; sibling-scope
        // uniqueness is managed by the parent array traversal which collects all items.
        // We handle uniqueness at the collection level in `_checkUniqueInCollection`.
        // This method handles per-field unique="global".
        commonKeys.forEach((key) => {
            const fieldRules = rules[key];
            if (!fieldRules || !fieldRules["@rules"]) return;
            const unique = fieldRules["@rules"].unique;
            if (!unique) return;

            const vals = siblingValues.get(key) || [];
            if (unique === "global") {
                vals.forEach((v, idx) => {
                    const fieldPath = Array.isArray(ele[key])
                        ? (path + "." + key + "[" + idx + "]").substr(1)
                        : (path + "." + key).substr(1);
                    this._assertGlobalUnique(key, v, fieldPath);
                });
            }
            // unique="true" (sibling scope) is handled at the repeatable-collection level
        });
    }

    /**
     * Check uniqueness within a collection of repeatable items.
     * Called from _traverseRepeatableCollection when sibling-scoped uniqueness is needed.
     * @param {Array<object>} items
     * @param {string} fieldKey  - field to check
     * @param {string} basePath  - path prefix for error messages
     */
    _checkUniqueInCollection(items, fieldKey, basePath) {
        const seen = new Map(); // value -> first index
        items.forEach((item, idx) => {
            const val = item[fieldKey];
            if (val === undefined || val === null || typeof val === "object") return;
            const strVal = String(val);
            if (seen.has(strVal)) {
                this.failures.push({
                    code: "unique",
                    path: (basePath + "[" + idx + "]." + fieldKey).substr(1),
                    value: strVal,
                });
            } else {
                seen.set(strVal, idx);
            }
        });
    }

    /**
     * Assert a value is unique globally (across the whole document).
     * @param {string} fieldName
     * @param {string} value
     * @param {string} fieldPath
     */
    _assertGlobalUnique(fieldName, value, fieldPath) {
        if (!this._globalUnique.has(fieldName)) {
            this._globalUnique.set(fieldName, new Set());
        }
        const seen = this._globalUnique.get(fieldName);
        if (seen.has(value)) {
            this.failures.push({
                code: "unique",
                path: fieldPath,
                value,
            });
        } else {
            seen.add(value);
        }
    }

    // ─── Data & Type ──────────────────────────────────────────────────────────

    /**
     * Check if the leaf node has correct type and passes validations.
     * @param {string} val
     * @param {string} key
     * @param {object} rules
     * @param {string} path
     */
    checkDataAndType(val, key, rules, path) {
        if (rules["@rules"].repeatable === true) {
            this.checkOccurences(rules["@rules"], 1, path);
        }
        const eleType = rules["@rules"].type;

        // Expand range shorthand before numeric validation
        const expandedRules = this._expandRange(rules);

        if (eleType === "map" || (!eleType && this.isMapType(rules))) {
            if (typeof val === "string" && val.length > 0) {
                this.failures.push({
                    code: "unexpected value in a map",
                    path: path.substr(1),
                    value: val,
                });
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
                this.assertValue(expandedRules["@rules"], "num", Number(val), path);
            }
        } else if (eleType === "string" || !eleType) {
            this.assertValue(expandedRules["@rules"], "string", val, path);
        } else {
            throw new Error("Unsupported data type in Rules:" + eleType);
        }
    }

    /**
     * Expand `range="min..max"` shorthand into `min` and `max` on a cloned rules object.
     * @param {object} rules
     * @returns {object}
     */
    _expandRange(rules) {
        if (!rules["@rules"] || !rules["@rules"].range) return rules;
        const parsed = parseRange(rules["@rules"].range);
        if (!parsed) return rules;
        // Clone to avoid mutating the shared rules object
        return {
            ...rules,
            "@rules": {
                ...rules["@rules"],
                min: rules["@rules"].min !== undefined ? rules["@rules"].min : String(parsed.min),
                max: rules["@rules"].max !== undefined ? rules["@rules"].max : String(parsed.max),
            },
        };
    }

    /**
     * @param {object} rules
     * @param {string} newpath
     */
    validateMandatoryFields(rules, newpath) {
        const keys = Object.keys(rules);
        for (let i = 0; i < keys.length; i++) {
            if (keys[i] === "@rules") continue;
            const child = rules[keys[i]];
            const rulesForChild = child["@rules"];
            if (rulesForChild) {
                if (rulesForChild.minOccurs && rulesForChild.minOccurs > 0) {
                    this.failures.push({
                        code: "missing",
                        path: (newpath + "." + keys[i]).substr(1),
                    });
                } else if (rulesForChild.nillable !== undefined && rulesForChild.nillable === "false") {
                    this.failures.push({
                        code: "missing",
                        path: (newpath + "." + keys[i]).substr(1),
                    });
                }
            }
        }
    }

    /**
     * @param {any} tag
     * @returns {boolean}
     */
    isMapType(tag) {
        if (typeof tag === "string") return false;
        const keys = Object.keys(tag);
        if (tag["@rules"]) {
            if (keys.length === 1) return false;
        } else if (keys.length === 0) {
            return false;
        } else {
            return true;
        }
    }

    setInvalidValueError(rule, newpath, actual, expected) {
        this.failures.push({
            code: rule,
            path: newpath.substr(1),
            actual,
            expected,
        });
    }

    checkOccurences(rules, actual, newpath) {
        ["minOccurs", "maxOccurs"].forEach((rule) => {
            if (rules[rule] !== undefined) {
                const expected = Number(rules[rule]);
                if (!validations.list[rule](expected, actual)) {
                    this.setInvalidValueError(rule, newpath, actual, expected);
                }
            }
        });
    }

    checkNumeric(rules, actual, newpath) {
        ["min", "max"].forEach((rule) => {
            if (rules[rule] !== undefined) {
                const expected = Number(rules[rule]);
                if (!validations.num[rule](expected, actual)) {
                    this.setInvalidValueError(rule, newpath, actual, expected);
                }
            }
        });
    }

    checkString(rules, actual, newpath) {
        ["minLength", "maxLength", "length"].forEach((rule) => {
            if (rules[rule] !== undefined) {
                const expected = Number(rules[rule]);
                if (!validations.string[rule](expected, actual)) {
                    this.setInvalidValueError(rule, newpath, actual, expected);
                }
            }
        });
        ["fixed", "in"].forEach((rule) => {
            if (rules[rule] !== undefined) {
                const expected = rules[rule];
                if (!validations.string[rule](expected, actual)) {
                    this.setInvalidValueError(rule, newpath, actual, expected);
                }
            }
        });
        ["pattern", "pattern_i", "pattern_im", "pattern_mi"].forEach((rule) => {
            if (rules[rule] !== undefined) {
                let modifier = "";
                if (rule.length > 8) modifier = rule.substring(8);
                const expected = rules[rule];
                if (!validations.string["pattern"](expected, actual, modifier)) {
                    this.setInvalidValueError("pattern", newpath, actual, expected);
                }
            }
        });
    }

    assertValue(rules, eleType, actual, newpath) {
        if (eleType === "string") this.checkString(rules, actual, newpath);
        else if (eleType === "num") this.checkNumeric(rules, actual, newpath);
    }

    validateBoolean(actual, eleType, newpath) {
        if (this.options.boolean.indexOf(actual) === -1) {
            this.setInvalidDataType(eleType, newpath, actual);
        }
    }

    isValidNum(eleType, val) {
        if (!isNaN(val)) {
            const num = Number(val);
            if (
                (eleType === "positiveInteger" && num < 0) ||
                (eleType === "positiveDecimal" && num < 0) ||
                (eleType === "integer" && !isInt(val))
            ) {
                return false;
            }
        } else {
            return false;
        }
        return true;
    }

    validateDate(val, eleType, newpath) {
        const date = Date.parse(val);
        if (isNaN(date)) this.setInvalidDataType(eleType, newpath, val);
    }

    setInvalidDataType(eleType, newpath, val) {
        this.failures.push({
            code: "not a " + eleType,
            path: newpath.substr(1),
            value: val,
        });
    }

    /**
     * @param {object} sets
     * @param {object} rules
     * @param {string} path
     */
    checkMissingSiblings(sets, rules, path) {
        if (sets.rules) {
            sets.rules.forEach((tagRule) => {
                const rulesNode = rules[tagRule]["@rules"];
                if (rulesNode && (rulesNode.nillable === "false" || rulesNode.minOccurs > 0)) {
                    this.failures.push({
                        code: "missing",
                        path: (path + "." + tagRule).substr(1),
                    });
                }
            });
        }
    }

    /**
     * @param {object} sets
     * @param {string} path
     */
    checkUnknownSiblings(sets, path) {
        if (sets.data && !this.options.unknownAllow) {
            sets.data.forEach((tag) => {
                this.failures.push({
                    code: "unknown",
                    path: (path + "." + tag).substr(1),
                });
            });
        }
    }
}

// ─── Traverser subclass that adds repeatable-collection uniqueness ─────────────
// We override the array-handling branch of traverse() to also run sibling uniqueness.

const _originalTraverse = Traverser.prototype.traverse;

Traverser.prototype.traverse = function traverse(ele, key, rules, path) {
    if (
        Array.isArray(ele) &&
        rules !== undefined &&
        rules["@rules"] !== undefined &&
        rules["@rules"].repeatable !== undefined
    ) {
        // Run the original logic (occurrence checks + per-item traversal)
        this.checkOccurences(rules["@rules"], ele.length, path);
        ele.forEach((val, index) => {
            const arrayPath = path + "[" + index + "]";
            if (Object.keys(rules).length > 1) {
                this.callForCommonProperties(ele[index], rules, arrayPath);
            } else {
                // Simple scalar repeatable
                const scalarRules = rules;
                _originalTraverse.call(this, ele[index], key, scalarRules, arrayPath);
            }
        });

        // After all items processed, check sibling-scoped uniqueness
        if (ele.length > 0 && typeof ele[0] === "object") {
            this._runSiblingUniqueness(ele, rules, path);
        }
        return;
    }

    // For everything else, delegate to the original implementation
    _originalTraverse.call(this, ele, key, rules, path);
};

/**
 * Scan child field rules of a repeatable element for `unique="true"` and
 * validate all occurrences within the array scope.
 * @param {Array<object>} items
 * @param {object} rules  - rules for the repeatable element
 * @param {string} path
 */
Traverser.prototype._runSiblingUniqueness = function (items, rules, path) {
    const fieldKeys = Object.keys(rules).filter((k) => k !== "@rules");
    fieldKeys.forEach((fieldKey) => {
        const fieldRules = rules[fieldKey];
        if (!fieldRules || !fieldRules["@rules"]) return;
        if (fieldRules["@rules"].unique !== "true") return;
        this._checkUniqueInCollection(items, fieldKey, path);
    });
};

function isInt(value) {
    const x = parseFloat(value);
    return (x | 0) === x;
}
