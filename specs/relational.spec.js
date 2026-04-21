import { expect } from 'chai';
import Validator from '../src/validator.js';

// ─── A. Ordering Constraints (before / after) ─────────────────────────────────

describe("Ordering constraints (before / after)", function () {

    it("passes when endDate is after startDate", function () {
        const rules = `<event>
            <startDate type="date"></startDate>
            <endDate type="date" after="startDate"></endDate>
        </event>`;
        const xml = `<event>
            <startDate>2024-01-01</startDate>
            <endDate>2024-06-01</endDate>
        </event>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("fails when endDate is before startDate (after violated)", function () {
        const rules = `<event>
            <startDate type="date"></startDate>
            <endDate type="date" after="startDate"></endDate>
        </event>`;
        const xml = `<event>
            <startDate>2024-06-01</startDate>
            <endDate>2024-01-01</endDate>
        </event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.deep.equal([{
            code: "after",
            path: "event.endDate",
            actual: "2024-01-01",
            expected: "startDate",
        }]);
    });

    it("fails when endDate equals startDate (after requires strictly after)", function () {
        const rules = `<event>
            <startDate type="date"></startDate>
            <endDate type="date" after="startDate"></endDate>
        </event>`;
        const xml = `<event>
            <startDate>2024-03-15</startDate>
            <endDate>2024-03-15</endDate>
        </event>`;
        const failures = new Validator(rules).validate(xml);
        expect(failures).to.have.lengthOf(1);
        expect(failures[0].code).to.equal("after");
    });

    it("passes when deliveryDate is after shipDate and before expiryDate", function () {
        const rules = `<order>
            <orderDate type="date"></orderDate>
            <shipDate type="date" after="orderDate"></shipDate>
            <deliveryDate type="date" after="shipDate" before="expiryDate"></deliveryDate>
            <expiryDate type="date"></expiryDate>
        </order>`;
        const xml = `<order>
            <orderDate>2024-01-01</orderDate>
            <shipDate>2024-01-05</shipDate>
            <deliveryDate>2024-01-10</deliveryDate>
            <expiryDate>2024-12-31</expiryDate>
        </order>`;
        expect(new Validator(rules).validate(xml)).to.deep.equal([]);
    });

    it("reports both after and before violations when deliveryDate is out of range", function () {
        const rules = `<order>
            <orderDate type="date"></orderDate>
            <shipDate type="date" after="orderDate"></shipDate>
            <deliveryDate type="date" after="shipDate" before="expiryDate"></deliveryDate>
            <expiryDate type="date"></expiryDate>
        </order>`;
        const xml = `<order>
            <orderDate>2024-01-01</orderDate>
            <shipDate>2024-06-01</shipDate>
            <deliveryDate>2024-01-10</deliveryDate>
            <expiryDate>2023-12-31</expiryDate>
        </order>`;
        const failures = new Validator(rules).validate(xml);
        const codes = failures.map(f => f.code);
        expect(codes).to.include("after");
        expect(codes).to.include("before");
    });

    it("skips ordering check when reference field is absent", function () {
        const rules = `<event>
            <startDate type="date"></startDate>
            <endDate type="date" after="startDate"></endDate>
        </event>`;
        // startDate is missing from data — ordering check should not crash
        const xml = `<event>
            <endDate>2024-01-01</endDate>
        </event>`;
        const failures = new Validator(rules).validate(xml);
        // Only structural failures (missing startDate if mandatory) — no ordering crash
        expect(failures.every(f => f.code !== "after")).to.be.true;
    });

    it("skips ordering check when actual date is invalid", function () {
        const rules = `<event>
            <startDate type="date"></startDate>
            <endDate type="date" after="startDate"></endDate>
        </event>`;
        const xml = `<event>
            <startDate>2024-01-01</startDate>
            <endDate>not-a-date</endDate>
        </event>`;
        const failures = new Validator(rules).validate(xml);
        // Should get "not a date" but not an "after" error
        expect(failures.some(f => f.code === "not a date")).to.be.true;
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
