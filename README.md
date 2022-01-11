# detailed-xml-validator
Validate for XML schema and returns all the possible failures

This module uses it's own rule file which is different than XSD and looks more like XML data file. More features would be added in future versions. Currently, it just ensures frequency, type, range, and null validations only on top of syntax check done by FXP.

If there is no syntax error, then this module reports all failures and don't exit on first faliure. So you can report all the issues in one go.

Sample Rules file
```xml
<?xml version = "1.0"?>

<students nillable="false">
    <student repeatable minOccurs="1">
        <:a>
            <id length="6"></id>
        </:a>
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

* **:a**: This is the special tag used to define rules for attributes
* **nillable**: By default all the elements are nillable. Set it to `false` to mark an element mandatory. For lists, if `minOccurs` is set to `1`, it means it can't be nillable.
* **repeatable**: A list must have this attribute
    * **minOccurs**: To validate minimum number of elements in a list
    * **maxOccurs**: To validate maximum number of elements in a list
* **type**: You can define type to put the restriction on their values. Eg `positiveInteger` can't have negative values. Following types are supported
    * **positiveInteger** : 
    * **positiveDecimal** : 
    * **integer** : 
    * **decimal** : 
    * **number** : 
    * **date** : 
    * **string** : default type (optional)
    * **map** : object type (optional)
* **Number type**: Following validations can be applied on number type
    * **min**:
    * **max**:
* **String type**: Following validations can be applied on string type
    * **minLength**:
    * **maxLength**:
    * **length**:
    * **pattern**: regex

Sample code 
```js
const Validator = require("detailed-xml-validator");

const options = {
    unknownAllow: true,
    boolean: ["true", "false"],
};

const validator = new Validator(rules, options);
const failures = validator.validate(xmlStringData);
const originalXmlJsObj = validator.data;
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
