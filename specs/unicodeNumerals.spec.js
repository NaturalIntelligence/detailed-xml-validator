import { expect } from 'chai';
import Validator from '../src/validator.js';

// Confirms the fix lives where dxv actually does its own numeric coercion
// (Traverser.js / validations.js via util.js's toNumber, backed by BOB's
// NumberValueParser configured with unicode:true) — not in FXP's own
// tag/attribute value-parser pipeline, which stays disabled for dxv data.
describe("XML validator with unicode (Japanese full-width) numerals", function () {
    const rules = `
    <root>
        <price type="number" min="100" max="2000"></price>
        <qty type="integer"></qty>
        <name type="string"></name>
    </root>`;

    it("accepts a full-width numeral within range", function () {
        const xmlData = `
        <root>
            <price>１０００</price>
            <qty>５</qty>
            <name>東京都</name>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        expect(actual).to.deep.equal([]);
    });

    it("still rejects a full-width numeral outside the declared range", function () {
        const xmlData = `
        <root>
            <price>９０</price>
            <qty>５</qty>
            <name>東京都</name>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        expect(actual).to.deep.equal([
            { code: 'min', path: 'root.price', actual: 90, expected: 100 }
        ]);
    });

    it("still reports non-numeric text as an invalid number (mixed Japanese + digits)", function () {
        const xmlData = `
        <root>
            <price>価格１０００円</price>
            <qty>５</qty>
            <name>東京都</name>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        expect(actual).to.deep.equal([
            { code: 'not a number', path: 'root.price', value: '価格１０００円' }
        ]);
    });

    it("plain non-numeric Japanese text in a string field is untouched", function () {
        const xmlData = `
        <root>
            <price>１２３４</price>
            <qty>５</qty>
            <name>東京都渋谷区</name>
        </root>`;
        const validator = new Validator(rules);
        const actual = validator.validate(xmlData);
        expect(actual).to.deep.equal([]);
    });
});
