import XMLParser, { ParseError } from "@nodable/flexible-xml-parser";
import { CompactBuilderFactory } from "@nodable/compact-builder";
import { OrderTrackingBuilderFactory } from "./OrderTrackingBuilder.js";
import { Traverser } from "./Traverser.js";

const defaultOptions = {
    unknownAllow: true,
    boolean: ["true", "false"],
};

// Keep every tag/attribute value as a raw, untouched string — Traverser and
// validations.js do their own number/date/boolean coercion, so no parser
// pipeline should get there first.
const RAW_VALUE_PARSERS = { tags: { valueParsers: [] }, attributes: { valueParsers: [] } };

// Parsers are stateless w.r.t. any single Validator instance and safe to
// reuse across parses (each .parse() call gets a fresh internal tokenizer
// and a fresh builder instance from the factory) — building them once here
// avoids rebuilding the value-parser pipelines on every Validator/validate() call.
const ruleParser = new XMLParser({
    skip: { attributes: false },
    attributes: { prefix: "", groupBy: "@rules", booleanType: true },
    OutputBuilder: new CompactBuilderFactory(RAW_VALUE_PARSERS),
});

const dataParser = new XMLParser({
    skip: { attributes: false },
    attributes: { prefix: "", groupBy: ":a" },
    OutputBuilder: new OrderTrackingBuilderFactory(RAW_VALUE_PARSERS),
});

export class Validator {
    /**
     * @param {string} rules  - XML string containing rule definitions
     * @param {object} [options]
     */
    constructor(rules, options) {
        assertXmlString(rules);
        this.rules = restoreAttrsBucketKeys(parseOrThrow(ruleParser, sanitizeAttrsBucketTag(rules)));
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
        assertXmlString(xmldata);

        const { data, siblingOrder } = parseOrThrow(dataParser, xmldata);
        this.data = data;

        const traverser = new Traverser(this.options, this.validators, siblingOrder);
        traverser.traverse(data, "", this.rules, "");
        return traverser.failures;
    }
}

// Rules files may define a tag literally named ":a" — a stand-in element
// holding validation rules for a tag's attributes, mirroring the ":a" key
// data gets grouped under. A leading colon is not a legal tag name under
// namespace-aware naming rules, which the new parser enforces and the old
// one didn't. Rather than force every existing rules file to change, swap
// it for a legal placeholder before parsing and rename the resulting object
// key straight back — invisible to anyone authoring or consuming rules.
const ATTRS_BUCKET_TAG = ":a";
const ATTRS_BUCKET_PLACEHOLDER = "__nodableAttrsBucket__";
const ATTRS_BUCKET_TAG_RE = /<(\/?):a(\s|>|\/)/g;

function sanitizeAttrsBucketTag(rules) {
    return rules.replace(ATTRS_BUCKET_TAG_RE, `<$1${ATTRS_BUCKET_PLACEHOLDER}$2`);
}

function restoreAttrsBucketKeys(value) {
    if (Array.isArray(value)) {
        for (const item of value) restoreAttrsBucketKeys(item);
    } else if (value !== null && typeof value === "object") {
        if (Object.prototype.hasOwnProperty.call(value, ATTRS_BUCKET_PLACEHOLDER)) {
            value[ATTRS_BUCKET_TAG] = value[ATTRS_BUCKET_PLACEHOLDER];
            delete value[ATTRS_BUCKET_PLACEHOLDER];
        }
        for (const key of Object.keys(value)) restoreAttrsBucketKeys(value[key]);
    }
    return value;
}

function assertXmlString(xmldata) {
    if (!xmldata) throw new Error("Empty data");
    if (typeof xmldata !== "string") throw new Error("Not a valid string");
}

/**
 * Runs a shared parser instance and turns a syntax-level ParseError into the
 * same plain "message:line" Error shape dxv has always thrown. Line is not
 * provided by the parser (position is index-only) so it's derived by
 * counting newlines up to the error's character offset.
 *
 * One error code gets its wording translated back to dxv's pre-migration
 * text, so existing callers matching on that exact message keep working
 * without forcing that wording onto every other FXP consumer.
 */
function parseOrThrow(parser, xmldata) {
    try {
        return parser.parse(xmldata);
    } catch (err) {
        if (err instanceof ParseError) {
            let message = err.message;
            if (err.code === "INVALID_ATTRIBUTE_NAME") {
                const name = message.slice(message.indexOf(": ") + 2);
                message = `Attribute '${name}' is an invalid name.`;
            }
            // Not every ParseError carries a position (position is index-only,
            // and not every code attaches one) — don't fabricate a line number
            // when it's missing.
            if (err.index === undefined) throw new Error(message);
            const line = xmldata.substring(0, err.index).split("\n").length;
            throw new Error(message + ":" + line);
        }
        throw err;
    }
}

export default Validator;
