# detailed-xml-validator
[![detailed-xml-validator downloads](https://img.shields.io/npm/dw/detailed-xml-validator.svg)](https://npm-compare.com/detailed-xml-validator) 
[![detailed-xml-validator version](https://img.shields.io/npm/v/detailed-xml-validator.svg)](https://www.npmjs.com/package/detailed-xml-validator)
[![detailed-xml-validator license](https://img.shields.io/npm/l/detailed-xml-validator.svg)](https://github.com/NaturalIntelligence/detailed-xml-validator)

A comprehensive XML validator that validates against custom rule schemas and reports **all** failures at once, not just the first error encountered.

Unlike XSD validators, this module uses an intuitive XML-based rule format that mirrors your data structure. It performs syntax checking via [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser), then validates frequency, type, range, length, pattern matching, ordering, uniqueness, and null constraints.

## Features

- ✅ **Complete error reporting** — Reports all validation failures in one pass
- ✅ **Intuitive rule syntax** — XML-based rules that mirror your data structure
- ✅ **Rich validation types** — String patterns, numeric ranges, custom validators
- ✅ **Flexible constraints** — Required fields, repeatable elements, occurrence limits
- ✅ **Custom validators** — Register your own validation functions
- ✅ **Type safety** — Built-in types: integers, decimals, dates, booleans, maps
- ✅ **Ordering constraints** — Enforce `before`/`after` positional ordering between sibling tags
- ✅ **Date bounds** — `min`, `max`, and `range` on `type="date"` fields
- ✅ **Relational constraints** — `sameAs`, `notSameAs`, `lessThan`, `moreThan` across sibling fields
- ✅ **Uniqueness constraints** — `unique="true"` (sibling scope) and `unique="global"` (document scope)
- ✅ **Range shorthand** — `range="min..max"` as readable sugar for `min` + `max`
- ✅ **TypeScript types** — Bundled `.d.ts` declarations
- ✅ **ES Modules** — Full `import`/`export` syntax; bundle with your own webpack/rollup config

## Installation

```bash
npm install detailed-xml-validator
```

## Quick Start

```js
import Validator from "detailed-xml-validator";

const rules = `<?xml version="1.0"?>
<students nillable="false">
    <student repeatable minOccurs="1">
        <firstname minLength="3" maxLength="10" nillable="false"></firstname>
        <age type="positiveInteger" range="9..19"></age>
    </student>
</students>`;

const xmlData = `<?xml version="1.0"?>
<students>
    <student>
        <firstname>Jo</firstname>
        <age>25</age>
    </student>
</students>`;

const validator = new Validator(rules);
const failures = validator.validate(xmlData);

if (failures.length > 0) {
    console.log(`Found ${failures.length} validation issues:`);
    failures.forEach(f => console.log(f));
} else {
    console.log("Validation passed!");
    const data = validator.data; // Access parsed XML as JS object
}
```

## Rule Syntax

### Basic Structure

Rules are written in XML format that mirrors your expected data structure:

```xml
<?xml version="1.0"?>
<root>
    <element attribute="constraint" anotherAttribute="value">
        <nestedElement></nestedElement>
    </element>
</root>
```

### Attribute Rules

Use the special `<:a>` tag to define validation rules for XML attributes:

```xml
<student repeatable>
    <:a>
        <id length="6"></id>
        <status pattern="active|inactive"></status>
    </:a>
    <n></n>
</student>
```

### Required vs Optional Elements

**By default, all elements are optional (nillable).**

```xml
<!-- Optional -->
<nickname></nickname>

<!-- Required -->
<email nillable="false"></email>
```

### Repeatable Elements (Lists)

```xml
<students>
    <student repeatable minOccurs="1" maxOccurs="100">
        <n></n>
    </student>
</students>
```

- `repeatable` — Marks this as a list element
- `minOccurs` — Minimum occurrences (default: 0)
- `maxOccurs` — Maximum occurrences (default: unlimited)

## Validation Types

### Type Constraints

```xml
<age type="positiveInteger"></age>
<price type="positiveDecimal"></price>
<temperature type="integer"></temperature>
<rating type="decimal"></rating>
<count type="number"></count>
<birthdate type="date"></birthdate>
<name type="string"></name>
<metadata type="map"></metadata>
```

Supported types: `positiveInteger`, `positiveDecimal`, `integer`, `decimal`, `number`, `date`, `string` (default), `map`.

### Numeric Constraints

```xml
<!-- Explicit min/max -->
<age type="integer" min="18" max="65"></age>

<!-- Range shorthand — equivalent to the above -->
<age type="integer" range="18..65"></age>

<!-- Works with decimals too -->
<price type="number" range="0.01..999.99"></price>
```

`range="min..max"` is syntactic sugar for `min` + `max`. If you specify all three, the explicit `min`/`max` attributes win.

### String Constraints

```xml
<username minLength="3" maxLength="20"></username>
<zipcode length="5"></zipcode>
<email pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}"></email>
<phone pattern_i="^\d{3}-\d{3}-\d{4}$"></phone>
<status in="active,inactive,pending"></status>
<country fixed="USA"></country>
```

Pattern modifiers: `pattern` (default), `pattern_i` (case-insensitive), `pattern_m` (multiline), `pattern_im` / `pattern_mi`.

## Ordering Constraints (`before` / `after`)

Enforce **positional ordering** between sibling tags in the XML document. Both attributes reference the **name** of a sibling element. This is a structural check — it validates tag order, not field values. Works on any tag type, not just dates.

```xml
<event>
    <title></title>
    <!-- startDate must appear after title in the XML -->
    <startDate after="title"></startDate>
    <!-- endDate must appear after startDate -->
    <endDate after="startDate"></endDate>
</event>

<order>
    <orderDate></orderDate>
    <!-- shipDate must come after orderDate AND before deliveryDate -->
    <shipDate after="orderDate" before="deliveryDate"></shipDate>
    <deliveryDate></deliveryDate>
</order>
```

**Failure shape:**

```js
{ code: "after",  path: "order.shipDate", actual: "shipDate", expected: "orderDate" }
{ code: "before", path: "order.shipDate", actual: "shipDate", expected: "deliveryDate" }
```

- The check is skipped silently when the referenced sibling is absent from the data.
- To enforce that a reference field must be present, mark it `nillable="false"`.

## Date Bounds (`min` / `max` / `range` on dates)

Constrain `type="date"` fields to a specific date range. Accepts ISO 8601 date strings.

```xml
<!-- Explicit min/max -->
<birthDate type="date" min="1900-01-01" max="2010-12-31"></birthDate>

<!-- Range shorthand — equivalent to the above -->
<eventDate type="date" range="2024-01-01..2024-12-31"></eventDate>

<!-- Only a lower bound -->
<startDate type="date" min="2020-01-01"></startDate>
```

`range="min..max"` works the same as for numeric fields. Explicit `min`/`max` take precedence over `range` when all three are set. Bounds are **inclusive**.

**Failure shape:**

```js
{ code: "min", path: "event.startDate", actual: "2019-06-01", expected: "2020-01-01" }
{ code: "max", path: "event.birthDate", actual: "2025-01-01", expected: "2010-12-31" }
```

The bounds check is skipped when the date value is itself invalid (a type error is reported instead).

## Relational Constraints (`sameAs` / `notSameAs` / `lessThan` / `moreThan`)

Compare a field's **value** against another sibling field's value. All four attributes take the **name** of a sibling element as their value.

```xml
<order>
    <originalPrice type="number"></originalPrice>
    <!-- discountedPrice must be strictly less than originalPrice -->
    <discountedPrice type="number" lessThan="originalPrice"></discountedPrice>
    <!-- tax must be strictly less than discountedPrice -->
    <tax type="number" lessThan="discountedPrice"></tax>
</order>

<event>
    <!-- startDate value must be before endDate value -->
    <startDate type="date" lessThan="endDate"></startDate>
    <endDate type="date"></endDate>
</event>

<form>
    <password></password>
    <!-- confirmPassword must equal password -->
    <confirmPassword sameAs="password"></confirmPassword>
</form>

<user>
    <username></username>
    <!-- password must not equal username -->
    <password notSameAs="username"></password>
</user>
```

| Attribute | Passes when |
|---|---|
| `lessThan="ref"` | this value < ref value (strictly) |
| `moreThan="ref"` | this value > ref value (strictly) |
| `sameAs="ref"` | this value == ref value |
| `notSameAs="ref"` | this value != ref value |

**Comparison is type-aware** based on the field's declared `type`:
- `type="date"` → `Date.parse()` comparison
- numeric types (`integer`, `number`, etc.) → `Number()` comparison
- `string` / no type → lexicographic comparison

**Failure shape:**

```js
{ code: "lessThan", path: "order.discountedPrice", actual: "120", expected: "originalPrice" }
{ code: "sameAs",   path: "form.confirmPassword",  actual: "wrong", expected: "password" }
```

**Skipped silently when:**
- The referenced sibling is absent from the data (use `nillable="false"` on the ref field if you want that enforced separately)
- Either value is a map/object rather than a primitive
- The ref value cannot be coerced to the expected type

## Uniqueness Constraints (`unique`)

### `unique="true"` — Sibling-scoped uniqueness

Values must be unique **within** the repeatable collection they belong to.

```xml
<students>
    <student repeatable>
        <email unique="true"></email>
        <studentId unique="true"></studentId>
    </student>
</students>
```

The same value is allowed in a *different* collection (a separate `<students>` block elsewhere in the document).

### `unique="global"` — Document-scoped uniqueness

Values must be unique **across the entire document**, regardless of where the field appears.

```xml
<root>
    <groupA>
        <transactionId unique="global"></transactionId>
    </groupA>
    <groupB>
        <transactionId unique="global"></transactionId>
    </groupB>
</root>
```

**Failure shape:**

```js
{ code: "unique", path: "students.student[2].email", value: "dup@example.com" }
```

Only the *second and subsequent* occurrences of a duplicate produce a failure. The first occurrence is always accepted.

## Options

```js
const validator = new Validator(rules, {
    unknownAllow: true,                          // default: true
    boolean: ["true", "false", "yes", "no"],     // default: ["true", "false"]
});
```

- `unknownAllow` — When `false`, reports an `"unknown"` failure for any element not defined in rules.
- `boolean` — Array of strings considered valid for `type="boolean"` fields.

## Custom Validators

```js
validator.register("isEmail", (value, path) => {
    if (!value.includes("@")) {
        return { code: "invalid-email", path, value };
    }
});
```

Reference by name in rules:

```xml
<email checkBy="isEmail" nillable="false"></email>
```

Return any object to push a failure, or nothing (/ `undefined` / `null`) to pass.

## Complete Example

### Rules

```xml
<?xml version="1.0"?>
<students nillable="false">
    <student repeatable minOccurs="1">
        <:a>
            <id length="6"></id>
        </:a>
        <firstname minLength="3" maxLength="10" nillable="false"></firstname>
        <email pattern="[a-z0-9]+@school\.org" nillable="false" unique="true"></email>
        <age type="positiveInteger" range="9..19"></age>
        <enrolledOn type="date" min="2000-01-01"></enrolledOn>
        <!-- graduatesOn must appear after enrolledOn in XML, and its value must be later -->
        <graduatesOn type="date" after="enrolledOn" moreThan="enrolledOn"></graduatesOn>
        <marks>
            <subject repeatable minOccurs="5" maxOccurs="6">
                <name pattern="math|hindi|english|science|history"></name>
                <score type="positiveDecimal" range="0..100"></score>
            </subject>
        </marks>
    </student>
</students>
```

### Code

```js
import Validator from "detailed-xml-validator";
import { readFileSync } from "fs";

const rules = readFileSync("rules.xml", "utf8");
const xmlData = readFileSync("data.xml", "utf8");

const validator = new Validator(rules, { unknownAllow: false });
const failures = validator.validate(xmlData);

if (failures.length > 0) {
    failures.forEach(f => console.error(`[${f.code}] ${f.path}`));
    process.exit(1);
}

// validator.data contains the parsed XML as a plain JS object
```

## Error Response Reference

| `code` | Meaning | Extra fields |
|---|---|---|
| `missing` | Required element absent | — |
| `unknown` | Element not in rules (when `unknownAllow: false`) | — |
| `unexpected sequence` | Array where scalar expected | — |
| `unexpected value in a map` | Scalar where map expected | `value` |
| `not a <type>` | Value fails type check | `value` |
| `min` / `max` | Numeric or date out of range | `actual`, `expected` |
| `minOccurs` / `maxOccurs` | Occurrence count out of range | `actual`, `expected` |
| `minLength` / `maxLength` / `length` | String length violation | `actual`, `expected` |
| `pattern` | Regex mismatch | `actual`, `expected` |
| `fixed` / `in` | Value not in allowed set | `actual`, `expected` |
| `after` | Tag does not appear after referenced sibling in XML | `actual` (tag name), `expected` (ref tag name) |
| `before` | Tag does not appear before referenced sibling in XML | `actual` (tag name), `expected` (ref tag name) |
| `lessThan` | Field value is not strictly less than sibling value | `actual`, `expected` (ref field name) |
| `moreThan` | Field value is not strictly greater than sibling value | `actual`, `expected` (ref field name) |
| `sameAs` | Field value does not equal sibling value | `actual`, `expected` (ref field name) |
| `notSameAs` | Field value equals sibling value (should differ) | `actual`, `expected` (ref field name) |
| `unique` | Duplicate value violates uniqueness constraint | `value` |

## TypeScript

Type declarations are bundled at `src/index.d.ts`. Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/detailed-xml-validator/src"]
  }
}
```

Or import the types directly:

```ts
import Validator, { ValidationFailure, OrderingFailure, RelationalFailure, DateBoundsFailure, UniqueFailure } from "detailed-xml-validator";
```

## API Reference

### `new Validator(rules, options?)`

- `rules` — XML string containing validation rules. Throws if empty, non-string, or malformed.
- `options` — Optional `ValidatorOptions` object.

### `validator.validate(xmlData)`

Returns `ValidationFailure[]`. Empty array means the document is valid. Throws if `xmlData` is empty, non-string, or malformed.

### `validator.register(name, fn)`

Registers a custom validator. `fn(value, path)` should return a failure object or falsy.

### `validator.data`

The parsed XML as a plain JS object after the last `validate()` call. `null` before first call.

## Why Not XSD?

1. **Simpler syntax** — Rules look like your data, not a separate schema language
2. **All errors at once** — No stopping at the first failure
3. **Business-logic validators** — `checkBy` for custom JS validation
4. **Ordering & uniqueness** — Constraints XSD cannot express cleanly
5. **JavaScript-native** — No external tools, works in Node.js directly

## License

MIT — see [LICENSE](./LICENSE)
