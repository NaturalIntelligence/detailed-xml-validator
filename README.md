# detailed-xml-validator
Validate for XML schema and returns all the possible failures


Sample Rules file
```xml
<?xml version = "1.0"?>

<students nillable="false">
    <student minOccurs="1">
        <firstname minLength="3" maxLength="10" nillable="false"></firstname>
        <lastname minLength="3" maxLength="10" nillable="false"></lastname>
        <nickname minLength="3" maxLength="10"></nickname>
        <email pattern="[a-z0-9]+@schoolname.org" nillable="false"></email>
        <age type="positiveInteger" min="9" max="19"></age>
        <contact>
            <phone length="10"></phone>
        </contact>
        <gender nillable="false" ></gender>
        <marks>
            <subject repeatable minOccurs="5" maxOccurs="6" >
                <name pattern="math|hindi|english|science|history"></name>
                <score type="positiveDecimal"></score>
            </subject>
        </marks>
    </student>
</students>
```

Sample code 
```js
const Validator = require("detailed-xml-validator");

const options = {
    unknownAllow: true,
    boolean: ["true", "false"],
};

const validator = new Validator(rules, options);
const failures = validator.validate(xmlStringData);
console.log(`Found ${failures.length} issues`);
```

Sample Response
```js
[
    { code: 'missing', path: 'root.d'} ,
    { code: 'unknown', path: 'root.f'} 
    { code: 'minLength', path: 'root.a[0]', actual: '0', expected: 15 },
    {
        code: 'pattern',
        path: 'root.a[0]',
        actual: '0',
        expected: '[a-z]+@gmail.com'
    },
    { code: 'not a boolean', path: 'root.a[0]', value: 'yes' },
    { code: 'not a integer', path: 'root.f[2]', value: 'acbc' },
    { code: 'max', path: 'root.d', actual: 3.2, expected: 1.5 },
    { code: 'unexpected value in a map', path: 'root.b[1]', value: 'amit' }
]
```
