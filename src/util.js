import { NumberValueParser } from "@nodable/base-output-builder";

// dxv's own numeric type-checking (Traverser.js, validations.js, and
// parseRange below) used plain Number()/parseFloat()/isNaN(), none of which
// understand full-width (unicode) numerals such as "１０００". Centralizing
// coercion here, backed by BOB's own number value parser configured with
// unicode:true, gives every numeric check in dxv that support in one place.
// FXP's tag/attribute value-parser pipeline stays disabled for dxv data
// (see RAW_VALUE_PARSERS in validator.js) — this is a separate, dxv-local
// use of the same parser class, not a re-enabling of that pipeline.
const numberParser = new NumberValueParser({ hex: true, leadingZeros: true, eNotation: true, unicode: true });

/**
 * Coerce a raw XML string value to a number, accepting unicode (full-width)
 * numerals in addition to plain ASCII digits/hex/e-notation.
 * @param {string} val
 * @returns {number} the parsed number, or NaN if val isn't numeric
 */
export function toNumber(val) {
    const parsed = numberParser.parse(val);
    return typeof parsed === "number" ? parsed : NaN;
}

/**
 * @param {string[]} data
 * @param {string[]} rules
 * @returns {{ data: string[], rules: string[], common: string[] }}
 */
export function breakInSets(data, rules) {
    const extra = {
        data: [],
        rules: [],
        common: [],
    };

    for (let i = 0; i < data.length; i++) {
        if (rules.indexOf(data[i]) === -1) extra.data.push(data[i]);
        else extra.common.push(data[i]);
    }

    for (let i = 0; i < rules.length; i++) {
        if (data.indexOf(rules[i]) === -1 && rules[i] !== "@") extra.rules.push(rules[i]);
    }
    return extra;
}

/**
 * Parse a range shorthand "min..max" string into { min, max } numbers.
 * Returns null if the string is not a valid range.
 * @param {string} range
 * @returns {{ min: number, max: number } | null}
 */
export function parseRange(range) {
    if (typeof range !== "string") return null;
    const parts = range.split("..");
    if (parts.length !== 2) return null;
    const min = toNumber(parts[0]);
    const max = toNumber(parts[1]);
    if (isNaN(min) || isNaN(max)) return null;
    return { min, max };
}

/**
 * Parse a date range shorthand "minDate..maxDate" string into { min, max } date strings.
 * Returns null if either part is not a parseable date.
 * @param {string} range
 * @returns {{ min: string, max: string } | null}
 */
export function parseDateRange(range) {
    if (typeof range !== "string") return null;
    const parts = range.split("..");
    if (parts.length !== 2) return null;
    const [min, max] = parts;
    if (isNaN(Date.parse(min)) || isNaN(Date.parse(max))) return null;
    return { min, max };
}
