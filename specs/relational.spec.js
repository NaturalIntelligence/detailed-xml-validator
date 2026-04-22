import { expect } from 'chai';
import Validator from '../src/validator.js';

// ─── A. Ordering Constraints (before / after) ─────────────────────────────────
// before/after validate XML document position (tag order), not field values.
// They work on any tag type — not just dates.

describe("Ordering constraints (before / after)", function () {

    it("passes when tags appear in correct order (after)", function () {
        const rules = `<event>
            <startDate after="title"></startDate>
            <title></title>
        </event>`;
        // In XML: title comes first, startDate comes after — satisfies after="title"
        const xml = `<event>
            <title>Conference</title>
            <startDate>2024-01-01</startDate>
        </event>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when tag appears before its after-reference in XML", function () {
        const rules = `<event>
            <startDate after="title"></startDate>
            <title></title>
        </event>`;
        // In XML: startDate comes before title — violates after="title"
        const xml = `<event>
            <startDate>2024-01-01</startDate>
            <title>Conference</title>
        </event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.deep.equal([{
            code: "after",
            path: "event.startDate",
            actual: "startDate",
            expected: "title",
        }]);
    });

    it("passes when tags appear in correct order (before)", function () {
        const rules = `<event>
            <startDate before="endDate"></startDate>
            <endDate></endDate>
        </event>`;
        const xml = `<event>
            <startDate>2024-01-01</startDate>
            <endDate>2024-06-01</endDate>
        </event>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when tag appears after its before-reference in XML", function () {
        const rules = `<event>
            <startDate before="endDate"></startDate>
            <endDate></endDate>
        </event>`;
        // In XML: endDate comes before startDate — violates before="endDate"
        const xml = `<event>
            <endDate>2024-06-01</endDate>
            <startDate>2024-01-01</startDate>
        </event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.deep.equal([{
            code: "before",
            path: "event.startDate",
            actual: "startDate",
            expected: "endDate",
        }]);
    });

    it("passes with both before and after satisfied", function () {
        const rules = `<order>
            <orderDate></orderDate>
            <shipDate after="orderDate" before="deliveryDate"></shipDate>
            <deliveryDate></deliveryDate>
        </order>`;
        const xml = `<order>
            <orderDate>2024-01-01</orderDate>
            <shipDate>2024-01-05</shipDate>
            <deliveryDate>2024-01-10</deliveryDate>
        </order>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("reports both after and before violations independently", function () {
        const rules = `<order>
            <orderDate></orderDate>
            <shipDate after="orderDate"></shipDate>
            <deliveryDate before="orderDate"></deliveryDate>
        </order>`;
        // shipDate appears before orderDate in XML → violates after="orderDate"
        // deliveryDate appears after orderDate in XML → violates before="orderDate"
        const xml = `<order>
            <shipDate>2024-01-05</shipDate>
            <orderDate>2024-01-01</orderDate>
            <deliveryDate>2024-01-10</deliveryDate>
        </order>`;
        const failures = new Validator(rules).validate(xml);
        const codes = failures.map(f => f.code);
        expect(codes).to.include("after");
        expect(codes).to.include("before");
    });

    it("works on non-date tag types", function () {
        const rules = `<form>
            <lastName after="firstName"></lastName>
            <firstName></firstName>
        </form>`;
        // firstName appears first in XML — satisfies after="firstName"
        const xml = `<form>
            <firstName>John</firstName>
            <lastName>Doe</lastName>
        </form>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("skips ordering check when referenced sibling is absent from data", function () {
        const rules = `<event>
            <startDate></startDate>
            <endDate after="startDate"></endDate>
        </event>`;
        // startDate is absent — no after check should fire
        const xml = `<event>
            <endDate>2024-01-01</endDate>
        </event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures.every(f => f.code !== "after")).to.be.true;
    });
});

// ─── B. Uniqueness Constraints ────────────────────────────────────────────────

describe("Uniqueness constraints (unique)", function () {

    it("passes when all emails are unique within sibling collection", function () {
        const rules = `<students>
            <student repeatable>
                <email unique="true"></email>
                <studentId unique="true"></studentId>
            </student>
        </students>`;
        const xml = `<students>
            <student><email>a@x.com</email><studentId>S001</studentId></student>
            <student><email>b@x.com</email><studentId>S002</studentId></student>
            <student><email>c@x.com</email><studentId>S003</studentId></student>
        </students>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when duplicate email found in sibling collection", function () {
        const rules = `<students>
            <student repeatable>
                <email unique="true"></email>
                <studentId unique="true"></studentId>
            </student>
        </students>`;
        const xml = `<students>
            <student><email>dup@x.com</email><studentId>S001</studentId></student>
            <student><email>dup@x.com</email><studentId>S002</studentId></student>
        </students>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0]).to.deep.equal({
            code: "unique",
            path: "students.student[1].email",
            value: "dup@x.com",
        });
    });

    it("reports multiple uniqueness violations across different fields", function () {
        const rules = `<students>
            <student repeatable>
                <email unique="true"></email>
                <studentId unique="true"></studentId>
            </student>
        </students>`;
        const xml = `<students>
            <student><email>dup@x.com</email><studentId>S001</studentId></student>
            <student><email>dup@x.com</email><studentId>S001</studentId></student>
        </students>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(2);
        const codes = failures.map(f => f.code);
        expect(codes).to.deep.equal(["unique", "unique"]);
    });

    it("reports all duplicate occurrences beyond the first", function () {
        const rules = `<items>
            <item repeatable>
                <code unique="true"></code>
            </item>
        </items>`;
        const xml = `<items>
            <item><code>X</code></item>
            <item><code>X</code></item>
            <item><code>X</code></item>
        </items>`;
        const failures = new Validator(rules).validate(xml);
        // items[1] and items[2] are both duplicates
        expect(failures).to.have.lengthOf(2);
        expect(failures[0].path).to.equal("items.item[1].code");
        expect(failures[1].path).to.equal("items.item[2].code");
    });

    it("passes when unique=global and values are unique across document", function () {
        const rules = `<root>
            <groupA>
                <id unique="global"></id>
            </groupA>
            <groupB>
                <id unique="global"></id>
            </groupB>
        </root>`;
        const xml = `<root>
            <groupA><id>1</id></groupA>
            <groupB><id>2</id></groupB>
        </root>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when unique=global and same value appears in two different parts of document", function () {
        const rules = `<root>
            <groupA>
                <id unique="global"></id>
            </groupA>
            <groupB>
                <id unique="global"></id>
            </groupB>
        </root>`;
        const xml = `<root>
            <groupA><id>SAME</id></groupA>
            <groupB><id>SAME</id></groupB>
        </root>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("unique");
        expect(failures[0].value).to.equal("SAME");
        expect(failures[0].path).to.equal("root.groupB.id");
    });

    it("unique=true is scoped per collection (same value allowed in different collections)", function () {
        const rules = `<root>
            <listA>
                <item repeatable>
                    <code unique="true"></code>
                </item>
            </listA>
            <listB>
                <item repeatable>
                    <code unique="true"></code>
                </item>
            </listB>
        </root>`;
        const xml = `<root>
            <listA>
                <item><code>X</code></item>
            </listA>
            <listB>
                <item><code>X</code></item>
            </listB>
        </root>`;
        // Same value "X" in different collections is fine for unique="true"
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });
});

// ─── C. Range Shorthand ───────────────────────────────────────────────────────

describe("Range shorthand (range=\"min..max\")", function () {

    it("passes when integer value is within range", function () {
        const rules = `<form>
            <age type="integer" range="18..65"></age>
        </form>`;
        const xml = `<form><age>30</age></form>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("passes for boundary values (inclusive)", function () {
        const rules = `<form><age type="integer" range="18..65"></age></form>`;
        expect(new Validator(rules).validate(`<form><age>18</age></form>`)).to.deep.equal([]);
        expect(new Validator(rules).validate(`<form><age>65</age></form>`)).to.deep.equal([]);
    });

    it("fails when integer is below range min", function () {
        const rules = `<form><age type="integer" range="18..65"></age></form>`;
        const xml = `<form><age>10</age></form>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("min");
        expect(failures[0].actual).to.equal(10);
        expect(failures[0].expected).to.equal(18);
    });

    it("fails when integer is above range max", function () {
        const rules = `<form><age type="integer" range="18..65"></age></form>`;
        const xml = `<form><age>100</age></form>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("max");
        expect(failures[0].actual).to.equal(100);
        expect(failures[0].expected).to.equal(65);
    });

    it("passes when decimal price is within range", function () {
        const rules = `<product><price type="number" range="0.01..999.99"></price></product>`;
        const xml = `<product><price>49.99</price></product>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when price is below 0.01", function () {
        const rules = `<product><price type="number" range="0.01..999.99"></price></product>`;
        const xml = `<product><price>0.00</price></product>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("min");
    });

    it("explicit min/max takes precedence over range shorthand", function () {
        // If both range and min are specified, explicit min wins (range only fills missing)
        const rules = `<form><age type="integer" range="18..65" min="21"></age></form>`;
        const xml = `<form><age>19</age></form>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("min");
        expect(failures[0].expected).to.equal(21); // explicit min wins
    });

    it("range works on repeatable elements", function () {
        const rules = `<root><score repeatable type="integer" range="0..100"></score></root>`;
        const xml = `<root>
            <score>50</score>
            <score>101</score>
            <score>-1</score>
        </root>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures.filter(f => f.code === "max")).to.have.lengthOf(1);
        expect(failures.filter(f => f.code === "min")).to.have.lengthOf(1);
    });
});

// ─── D. Date min / max / range ────────────────────────────────────────────────

describe("Date bounds (min / max / range)", function () {

    it("passes when date is within min/max bounds", function () {
        const rules = `<event><startDate type="date" min="2024-01-01" max="2024-12-31"></startDate></event>`;
        const xml = `<event><startDate>2024-06-15</startDate></event>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("passes when date equals min bound (inclusive)", function () {
        const rules = `<event><startDate type="date" min="2024-01-01"></startDate></event>`;
        const xml = `<event><startDate>2024-01-01</startDate></event>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("passes when date equals max bound (inclusive)", function () {
        const rules = `<event><startDate type="date" max="2024-12-31"></startDate></event>`;
        const xml = `<event><startDate>2024-12-31</startDate></event>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when date is before min", function () {
        const rules = `<event><startDate type="date" min="2024-01-01"></startDate></event>`;
        const xml = `<event><startDate>2023-12-31</startDate></event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("min");
        expect(failures[0].actual).to.equal("2023-12-31");
        expect(failures[0].expected).to.equal("2024-01-01");
    });

    it("fails when date is after max", function () {
        const rules = `<event><startDate type="date" max="2024-12-31"></startDate></event>`;
        const xml = `<event><startDate>2025-01-01</startDate></event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("max");
        expect(failures[0].actual).to.equal("2025-01-01");
        expect(failures[0].expected).to.equal("2024-12-31");
    });

    it("passes when date is within range shorthand", function () {
        const rules = `<event><startDate type="date" range="2024-01-01..2024-12-31"></startDate></event>`;
        const xml = `<event><startDate>2024-06-15</startDate></event>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when date is outside range shorthand", function () {
        const rules = `<event><startDate type="date" range="2024-01-01..2024-12-31"></startDate></event>`;
        const xml = `<event><startDate>2025-03-01</startDate></event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("max");
    });

    it("explicit min takes precedence over range shorthand", function () {
        const rules = `<event><startDate type="date" range="2024-01-01..2024-12-31" min="2024-06-01"></startDate></event>`;
        const xml = `<event><startDate>2024-03-01</startDate></event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("min");
        expect(failures[0].expected).to.equal("2024-06-01");
    });

    it("does not report bounds error when date is invalid (type error takes precedence)", function () {
        const rules = `<event><startDate type="date" min="2024-01-01"></startDate></event>`;
        const xml = `<event><startDate>not-a-date</startDate></event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures.some(f => f.code === "not a date")).to.be.true;
        expect(failures.every(f => f.code !== "min")).to.be.true;
    });
});

// ─── E. Relational Constraints (sameAs / notSameAs / lessThan / moreThan) ─────

describe("Relational constraints (sameAs / notSameAs / lessThan / moreThan)", function () {

    // ── lessThan ──────────────────────────────────────────────────────────────

    it("passes when numeric field is less than sibling", function () {
        const rules = `<order>
            <discountedPrice type="number" lessThan="originalPrice"></discountedPrice>
            <originalPrice type="number"></originalPrice>
        </order>`;
        const xml = `<order><discountedPrice>80</discountedPrice><originalPrice>100</originalPrice></order>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when numeric field is equal (lessThan requires strictly less)", function () {
        const rules = `<order>
            <discountedPrice type="number" lessThan="originalPrice"></discountedPrice>
            <originalPrice type="number"></originalPrice>
        </order>`;
        const xml = `<order><discountedPrice>100</discountedPrice><originalPrice>100</originalPrice></order>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0]).to.deep.equal({
            code: "lessThan",
            path: "order.discountedPrice",
            actual: "100",
            expected: "originalPrice",
        });
    });

    it("fails when numeric field is greater than sibling", function () {
        const rules = `<order>
            <discountedPrice type="number" lessThan="originalPrice"></discountedPrice>
            <originalPrice type="number"></originalPrice>
        </order>`;
        const xml = `<order><discountedPrice>120</discountedPrice><originalPrice>100</originalPrice></order>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("lessThan");
    });

    // ── moreThan ──────────────────────────────────────────────────────────────

    it("passes when numeric field is greater than sibling", function () {
        const rules = `<order>
            <originalPrice type="number"></originalPrice>
            <discountedPrice type="number" moreThan="tax"></discountedPrice>
            <tax type="number"></tax>
        </order>`;
        const xml = `<order><originalPrice>100</originalPrice><discountedPrice>80</discountedPrice><tax>10</tax></order>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when numeric field is less than sibling (moreThan violated)", function () {
        const rules = `<order>
            <total type="number" moreThan="tax"></total>
            <tax type="number"></tax>
        </order>`;
        const xml = `<order><total>5</total><tax>10</tax></order>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("moreThan");
    });

    // ── sameAs ────────────────────────────────────────────────────────────────

    it("passes when fields are equal (sameAs)", function () {
        const rules = `<form>
            <password></password>
            <confirmPassword sameAs="password"></confirmPassword>
        </form>`;
        const xml = `<form><password>secret</password><confirmPassword>secret</confirmPassword></form>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when fields differ (sameAs violated)", function () {
        const rules = `<form>
            <password></password>
            <confirmPassword sameAs="password"></confirmPassword>
        </form>`;
        const xml = `<form><password>secret</password><confirmPassword>different</confirmPassword></form>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0]).to.deep.equal({
            code: "sameAs",
            path: "form.confirmPassword",
            actual: "different",
            expected: "password",
        });
    });

    // ── notSameAs ─────────────────────────────────────────────────────────────

    it("passes when fields differ (notSameAs)", function () {
        const rules = `<user>
            <username></username>
            <password notSameAs="username"></password>
        </user>`;
        const xml = `<user><username>john</username><password>secret</password></user>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when fields are equal (notSameAs violated)", function () {
        const rules = `<user>
            <username></username>
            <password notSameAs="username"></password>
        </user>`;
        const xml = `<user><username>john</username><password>john</password></user>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("notSameAs");
    });

    // ── date type ─────────────────────────────────────────────────────────────

    it("passes when date field is less than sibling date (lessThan on dates)", function () {
        const rules = `<event>
            <startDate type="date" lessThan="endDate"></startDate>
            <endDate type="date"></endDate>
        </event>`;
        const xml = `<event><startDate>2024-01-01</startDate><endDate>2024-12-31</endDate></event>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when date field is after sibling date (lessThan on dates violated)", function () {
        const rules = `<event>
            <startDate type="date" lessThan="endDate"></startDate>
            <endDate type="date"></endDate>
        </event>`;
        const xml = `<event><startDate>2024-12-31</startDate><endDate>2024-01-01</endDate></event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("lessThan");
    });

    // ── edge cases ────────────────────────────────────────────────────────────

    it("skips silently when referenced sibling is absent", function () {
        const rules = `<order>
            <discountedPrice type="number" lessThan="originalPrice"></discountedPrice>
            <originalPrice type="number"></originalPrice>
        </order>`;
        // originalPrice is absent from data
        const xml = `<order><discountedPrice>80</discountedPrice></order>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures.every(f => f.code !== "lessThan")).to.be.true;
    });

    it("skips silently when either value is a map", function () {
        const rules = `<root>
            <meta lessThan="count">
                <info></info>
            </meta>
            <count type="number"></count>
        </root>`;
        const xml = `<root><meta><info>x</info></meta><count>5</count></root>`;
        // meta is an object — relational check should not crash or report
        const failures = new Validator(rules).validate(xml);
        expect(failures.every(f => f.code !== "lessThan")).to.be.true;
    });
});


