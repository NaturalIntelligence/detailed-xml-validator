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
    const min = Number(parts[0]);
    const max = Number(parts[1]);
    if (isNaN(min) || isNaN(max)) return null;
    return { min, max };
}
