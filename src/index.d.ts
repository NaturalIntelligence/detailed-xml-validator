/**
 * detailed-xml-validator — TypeScript type definitions
 */

// ─── Failure objects ──────────────────────────────────────────────────────────

export interface MissingFailure {
    code: "missing";
    path: string;
}

export interface UnknownFailure {
    code: "unknown";
    path: string;
}

export interface UnexpectedSequenceFailure {
    code: "unexpected sequence";
    path: string;
}

export interface UnexpectedValueInMapFailure {
    code: "unexpected value in a map";
    path: string;
    value: string;
}

export interface TypeFailure {
    code:
        | "not a date"
        | "not a boolean"
        | "not a integer"
        | "not a positiveInteger"
        | "not a decimal"
        | "not a positiveDecimal"
        | "not a number";
    path: string;
    value: string;
}

export interface RangeFailure {
    code: "min" | "max";
    path: string;
    actual: number;
    expected: number;
}

/** Produced when a `min`, `max`, or `range` bound is violated on a `type="date"` field. */
export interface DateBoundsFailure {
    code: "min" | "max";
    path: string;
    actual: string;
    expected: string;
}

export interface OccurrenceFailure {
    code: "minOccurs" | "maxOccurs";
    path: string;
    actual: number;
    expected: number;
}

export interface StringFailure {
    code: "minLength" | "maxLength" | "length";
    path: string;
    actual: string;
    expected: number;
}

export interface PatternFailure {
    code: "pattern";
    path: string;
    actual: string;
    expected: string;
}

export interface FixedFailure {
    code: "fixed";
    path: string;
    actual: string;
    expected: string;
}

export interface InFailure {
    code: "in";
    path: string;
    actual: string;
    expected: string;
}

/** Produced when a `before` or `after` ordering constraint is violated. */
export interface OrderingFailure {
    /** `"after"` when the field does not appear after the referenced sibling in the XML.
     *  `"before"` when the field does not appear before the referenced sibling in the XML. */
    code: "after" | "before";
    path: string;
    /** The tag name of the field that violated the constraint. */
    actual: string;
    /** The tag name of the reference sibling (e.g. `"startDate"`). */
    expected: string;
}

/**
 * Produced when a cross-field relational constraint is violated.
 * Constraint attributes: `sameAs`, `notSameAs`, `lessThan`, `moreThan`.
 * Comparison is type-aware: dates use Date.parse(), numeric types use Number(), others are lexicographic.
 */
export interface RelationalFailure {
    code: "sameAs" | "notSameAs" | "lessThan" | "moreThan";
    path: string;
    /** The actual string value of this field. */
    actual: string;
    /** The name of the reference sibling field (e.g. `"originalPrice"`). */
    expected: string;
}

/** Produced when a `unique="true"` or `unique="global"` constraint is violated. */
export interface UniqueFailure {
    code: "unique";
    path: string;
    value: string;
}

export type ValidationFailure =
    | MissingFailure
    | UnknownFailure
    | UnexpectedSequenceFailure
    | UnexpectedValueInMapFailure
    | TypeFailure
    | RangeFailure
    | DateBoundsFailure
    | OccurrenceFailure
    | StringFailure
    | PatternFailure
    | FixedFailure
    | InFailure
    | OrderingFailure
    | RelationalFailure
    | UniqueFailure
    | Record<string, unknown>; // custom validator results

// ─── Options ──────────────────────────────────────────────────────────────────

export interface ValidatorOptions {
    /**
     * When `true` (default), unknown tags in the XML data that have no
     * corresponding rule are silently ignored.
     * When `false`, each unknown tag produces an `"unknown"` failure.
     */
    unknownAllow?: boolean;

    /**
     * List of string values considered valid for `type="boolean"` fields.
     * Defaults to `["true", "false"]`.
     */
    boolean?: string[];
}

// ─── Custom validator callback ────────────────────────────────────────────────

/**
 * A custom validator function registered via `Validator.register()`.
 *
 * @param value - The string value of the XML element being validated.
 * @param path  - Dot-separated path to the element (e.g. `"students.student[0].email"`).
 * @returns A failure object to push, or `undefined` / any falsy value to signal success.
 */
export type CustomValidatorFn = (
    value: string,
    path: string
) => ValidationFailure | Record<string, unknown> | undefined | null | void;

// ─── Validator class ──────────────────────────────────────────────────────────

export declare class Validator {
    /**
     * The parsed XML data from the most recent `validate()` call.
     * `null` before the first call.
     */
    data: Record<string, unknown> | null;

    /**
     * Create a new Validator with a rules XML string.
     *
     * @param rules   - XML string whose attributes define validation constraints.
     * @param options - Optional configuration.
     *
     * @throws {Error} If `rules` is empty, not a string, or contains XML syntax errors.
     *
     * @example
     * ```ts
     * const validator = new Validator(`
     *   <students>
     *     <student repeatable minOccurs="1">
     *       <email unique="true" nillable="false"></email>
     *       <age type="integer" range="18..65"></age>
     *     </student>
     *   </students>
     * `);
     * ```
     */
    constructor(rules: string, options?: ValidatorOptions);

    /**
     * Register a custom validation function under a name.
     * Reference it in rules XML with `checkBy="<name>"`.
     *
     * @example
     * ```ts
     * validator.register("isEmail", (value, path) => {
     *   if (!value.includes("@")) {
     *     return { code: "invalid-email", path, value };
     *   }
     * });
     * ```
     */
    register(name: string, fn: CustomValidatorFn): void;

    /**
     * Validate an XML string against the rules.
     *
     * @param xmldata - XML string to validate.
     * @returns Array of failure objects. Empty array means the document is valid.
     *
     * @throws {Error} If `xmldata` is empty, not a string, or contains XML syntax errors.
     */
    validate(xmldata: string): ValidationFailure[];
}

export default Validator;
