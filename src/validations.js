import { toNumber } from "./util.js";

export const string = {
    minLength(expected, actual) {
        return actual.length >= expected;
    },
    maxLength(expected, actual) {
        return actual.length <= expected;
    },
    length(expected, actual) {
        return actual.length === expected;
    },
    pattern(expected, actual, modifier = "") {
        const regxp = new RegExp(expected, modifier);
        return regxp.test(actual);
    },
    fixed(expected, actual) {
        return expected === actual;
    },
    in(expected, actual) {
        return expected.split(",").indexOf(actual) > -1;
    },
};

export const num = {
    min(expected, actual) {
        return toNumber(actual) >= expected;
    },
    max(expected, actual) {
        return toNumber(actual) <= expected;
    },
};

export const list = {
    minOccurs(expected, actual) {
        return actual >= expected;
    },
    maxOccurs(expected, actual) {
        return actual <= expected;
    },
};

export const date = {
    /**
     * Compare two date strings.
     * @param {string} a
     * @param {string} b
     * @returns {number}
     */
    compare(a, b) {
        return Date.parse(a) - Date.parse(b);
    },

    isBefore(actual, reference) {
        return Date.parse(actual) < Date.parse(reference);
    },

    isAfter(actual, reference) {
        return Date.parse(actual) > Date.parse(reference);
    },

    min(expected, actual) {
        return Date.parse(actual) >= Date.parse(expected);
    },

    max(expected, actual) {
        return Date.parse(actual) <= Date.parse(expected);
    },
};
