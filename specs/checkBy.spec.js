const { assert, expect } = require('chai');
const Validator = require("../src/validator");

describe("XML validator with checkBy", function() {
    it("custom validator should be called", function(){
        const xmlData = `
        <root>
            <a>0</a>
            <c>3.2</c>
            <d>3.2</d>
            <f>
                <a>1</a>
                <b>1</b>
            </f>
            <f>
                <a>2</a>
                <b>3</b>
            </f>
            <f>
                <a>6</a>
            </f>
            <f>
                <a>4</a>
                <b>5</b>
                <c>6</c>
            </f>


        </root>`;
        const rules = `
        <root>
            <a type="positiveInteger" min="3"></a>
            <c type="decimal" min="1.2"></c>
            <d type="number" min="1.2" max="1.5"></d>
            <f repeatable checkBy="fValidator"></f>
        </root>`;

        let calls = [];
        const validator = new Validator(rules);
        validator.register("fValidator", (f,path) => {
            calls.push("fValidator");
            if(f.a==1 && f.b== 1) return;
            else if(f.a==2 && f.b== 3) return;
            else if(f.a==4 && f.b== 5 && f.c != undefined) return;
            return {
                code: "I dont know",
                path: path,
            }
        })
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'min', path: 'root.a', actual: 0, expected: 3 },
            { code: 'max', path: 'root.d', actual: 3.2, expected: 1.5 },
            { code: 'I dont know', path: 'root.f[2]' }
        ]);
        expect(calls.length).to.eq(4);
    });

    it("custom validator should not stop validations on nested element", function(){
        const xmlData = `
        <root>
            <f>
                <a>1</a>
                <b>1</b>
            </f>
            <f>
                <a>2</a>
                <b>3</b>
            </f>
            <f>
                <a>6</a>
            </f>
            <f>
                <a>4</a>
                <b>5</b>
                <c>6</c>
            </f>


        </root>`;
        const rules = `
        <root>
            <f repeatable checkBy="fValidator">
                <a pattern="1|2|4"/>
            </f>
        </root>`;

        const validator = new Validator(rules);
        validator.register("fValidator", (f,path) => {
            if(f.a==1 && f.b== 1) return;
            else if(f.a==2 && f.b== 3) return;
            else if(f.a==4 && f.b== 5 && f.c != undefined) return;
            return {
                code: "I dont know",
                path: path,
            }
        })
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'I dont know', path: 'root.f[2]' },
            {
                code: 'pattern',
                path: 'root.f[2].a',
                actual: '6',
                expected: '1|2|4'
              }
        ]);
    });

    it("custom validator should be called for leaf tag", function(){
        const xmlData = `
        <root>
            <f>value</f>
        </root>`;
        const rules = `
        <root>
            <f checkBy="fValidator"></f>
        </root>`;

        const validator = new Validator(rules);
        validator.register("fValidator", (f,path) => {
            return {
                code: "I dont know",
                path: path,
            }
        })
        const actual = validator.validate(xmlData);
        // console.log(actual);
        expect(actual).to.deep.equal([
            { code: 'I dont know', path: 'root.f' }
        ]);
    });
});