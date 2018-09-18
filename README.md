master|develop|npm
---|---|---
[![Build Status](https://travis-ci.org/sdawood/json-tots.svg?branch=master)](https://travis-ci.org/sdawood/json-tots)|[![Build Status](https://travis-ci.org/sdawood/json-tots.svg?branch=develop)](https://travis-ci.org/sdawood/json-tots)|[![npm version](https://badge.fury.io/js/json-tots.svg)](https://badge.fury.io/js/json-tots)

# json-tots

`json-tots` offers a JSON Template Of Templates Declarative Transformation and Rendering engine.
Everything is JSON, the template, the document, and extended arguments for template functions.

json-tots supports:
- JSON shape transformation
- The full power of jsonpath to query document
- Arbitrary nesting
- Template aggregation
- Advanced string interpolation
- Piping rendered values through one or more functions (builtin or user-defined)
- Extended arguments for user-defined functions that can be deref'd from document
- for-each-sub-template iteration
- for-each-sub-document iteration
- zip-align sub-templates with sub-documents

**Try it out `online`** [here](https://npm.runkit.com/json-tots)


Usage:

```js
    const tots = require('json-tots');

    const document = {
        a: 1,
        b: [10, 20, 30],
        c: {
            d: 100
        }
    };

    const template = {
        x: '{{a}}',
        y: {
            yy: '{{..d} | add:50 | gt:128}',
        },
        z: '{{b[1]}}',
        w: '{{c.d}}'
    };

    const result = tots.transform(template)(document); // transform is a higher order function

    // result
    // { x: 1, y: { yy: true }, z: 20, w: 100 }
```

For advanced use-cases see below

## Installation

  ```sh
  npm install json-tots --save
  ```

## Introduction
json-tots renders your template to the same JSON shape, without mutating neither the template nor the document.
Things get interesting when:
- You use the string-template syntax `{{}}` in standalone or within a string literal.
- Also within any array in the template, any item that is a string-template can utilize the inception operators to consume subsequent items following some interesting application of document and template items. See Inception Operators below for more information.
- While all features are **Text** based by design to achieve declarative, versionable transformations; for practicality, if you inject a function (a runtime function reference) any where in your template object tree, it would be invoked and the whole `document` is passed as an argument, the returned value is rendered as-is to the result, i.e. returned result is NOT `JSON.stringify'd`.

This allows for experimentation and extensibility, for example returning an object that has a new function reference in its attributes, then re-run `transform`. `Inception` ideas of partial-templates and multi-staged rendering are endless.


The opening curly braces can include one or more `operator`, while the closing curly braces can include `pipes`, which is a pipeline of functions to apply to the rendered partial-result.
For example:

  ```js
    const {transform} = require('./transform');

    const document = {log: {user: [{firstName: 'John', lastName: 'Smith'}, {firstName: 'Sally', lastName: 'Doe'}]}};
    const template = {message: 'Hello {{..user.*.firstName}}, welcome to json-tots'};

    const result = transform(template)(document);
    console.log(result);

    // { message: 'Hello Sally, welcome to json-tots' }

  ```

Note, we used the power of jsonpath recursive query `..user` to find deeply nested user tags in the document, then we enumerate all users using `.*` and select the `firstName` for each.
Although there are more than one user, following XPath convention, we have asked for value-of, which would only return one result.
To retrieve all results of our jsonpath query, we can tell json-tots that we expect `one or more` values using a `operator` namely `+`

  ```js
    const {transform} = require('./transform');

    const document = {log: {user: [{firstName: 'John', lastName: 'Smith'}, {firstName: 'Sally', lastName: 'Doe'}]}};
    const template = {message: 'Hello {+{..user.*.firstName}}, welcome to json-tots'};

    const result = transform(template)(document);
    console.log(result);

    // { message: 'Hello John,Sally, welcome to json-tots' }

  ```

For a refresher of what jsonpath is capable of, please check the [jsonpath](https://www.npmjs.com/package/jsonpath) npm package documentation.
This particular packages is powerful since it covers all of the [proposed jsonpath syntax](http://goessner.net/articles/JsonPath/), and also it uses an optimized/cached parser to parse the path string. I've personally been using it for years and contributed a couple of features to it.

Note: for readbility and practicality, the jsonpath part of the template-string is `WITHOUT` the `$.` prefix.

## Interface
```js
/**
 * Transforms JSON document using a JSON template
 * @param template Template JSON
 * @param sources A map of alternative document-sources, including `default` source
 * @param tags Reference to a map that gets populated with Tags
 * @param functions A map of user-defined function, if name-collision occurs with builtin functions, user-defined functions take precedence
 * @param args A map of extended arguments to @function expressions, args keys are either functionName (if used only once), functionKey (if globally unique) or functionPath which is unique but ugliest option to write
 * @param config Allows to override defaultConfig
 * @param builtins A map of builtin functions, defaults to ./core/builtins.js functions
 * @returns {function(*=): *}
 */
const transform = (template, {meta = 0, sources = {'default': {}}, tags = {}, functions = {}, args = {}, config = defaultConfig} = {}, {builtins = bins} = {}) => document => {...}
```

## JSONPath Syntax

Here are syntax and examples adapted from [Stefan Goessner's original post](http://goessner.net/articles/JsonPath/) introducing JSONPath in 2007.

JSONPath         | Description
-----------------|------------
`$`               | The root object/element
`@`                | The current object/element
`.`                | Child member operator
`..`	         | Recursive descendant operator; JSONPath borrows this syntax from E4X
`*`	         | Wildcard matching all objects/elements regardless their names
`[]`	         | Subscript operator
`[,]`	         | Union operator for alternate names or array indices as a set
`[start:end:step]` | Array slice operator borrowed from ES4 / Python
`?()`              | Applies a filter (script) expression via static evaluation
`()`	         | Script expression via static evaluation

And some examples:

JSONPath                      | Description
------------------------------|------------
`$.store.book[*].author`       | The authors of all books in the store
`$..author`                     | All authors
`$.store.*`                    | All things in store, which are some books and a red bicycle
`$.store..price`                | The price of everything in the store
`$..book[2]`                    | The third book
`$..book[(@.length-1)]`         | The last book via script subscript
`$..book[-1:]`                  | The last book via slice
`$..book[0,1]`                  | The first two books via subscript union
`$..book[:2]`                  | The first two books via subscript array slice
`$..book[?(@.isbn)]`            | Filter all books with isbn number
`$..book[?(@.price<10)]`        | Filter all books cheaper than 10
`$..book[?(@.price==8.95)]`        | Filter all books that cost 8.95
`$..book[?(@.price<30 && @.category=="fiction")]`        | Filter all fiction books cheaper than 30
`$..*`                         | All members of JSON structure

Now that we have covered the template structure (everything is JSON) and learned the power of jsonpath, let's look at the template-string operators and pipes syntax.

## Template String Syntax Reference

json-tots Template String                      | Description
------------------------------|------------
`"Arbitrary text { [<operators>*] {<jsonpath>} [<pipes>*] } and then some more text"`       | A JSON string literal that includes a place holder containing a jsonpath to be derefed from the document (or scoped-document), `operators` and `pipes` are optional. multiple operators can be separated with a <code>&#124;</code>, similarly for pipes.
**Operators**|**Description**
**Query Operators**| Examples: `'{+{a.b.c}}', '{+10{a.b.c}}', '{-10{a.b.c}}'`
`+`|Return all jsonpath query results as an Array, without `+` we get only one result.
`+n`|Take exactly <n> items, where n is a numerical value.
`-n`|Skip exactly <n> items, where n is a numerical value.
**Constraint Operators**| Examples: `'{?=default{a.b.c}}'`, `'{?=default:"Not available"{a.b.c}}'`, `'{?=myOtherSource{a.b.c}}'`, `'{?=myOtherSource:"Not available"{a.b.c}}'`, `'{!{a.b.c}}'`, `'{!=myOtherSource{a.b.c}}', '{!=default{a.b.c}}'`, ...
`?`| Explicitly forces `optional` value, if value is missing, key would vanish from rendered result. Default behavior if `?` is not used.
`?=default`| If value is missing, look it up in default source (`sources['default']`) if provided, if missing from default source, key would vanish from rendered result
`?=default:<DEFAULT_VALUE>`| If value is missing, look it up in default source (`sources['default']`) if provided; if missing from default source, use the `<DEFAULT_VALUE>` provided `inline`
`?=<sourceName>`| If value is missing, look it up in alternate source (`sources[<sourceName>]`) if provided, if missing from default source, key would vanish from rendered result
`?=<sourceName>:<DEFAULT_VALUE>`| If value is missing, look it up in alternate source (`sources[<sourceName>]`) if provided; if missing from alternate source, use the `<DEFAULT_VALUE>` provided `inline`
`!`| Explicitly forces `required` value, if value is missing, value would be set to `null` in rendered result
`!=default`| If value is missing, look it up in default source (`sources['default']`) if provided, if missing from default source, value would be set to `null` in rendered result
`!=default:<DEFAULT_VALUE>`| If value is missing, look it up in default source (`sources['default']`) if provided; if missing from default source, use the `<DEFAULT_VALUE>` provided `inline`
`!=<sourceName>`| If value is missing, look it up in alternate source (`sources[<sourceName>]`) if provided, if missing from default source, value would be set to `null` in rendered result
`!=<sourceName>:<DEFAULT_VALUE>`| If value is missing, look it up in alternate source (`sources[<sourceName>]`) if provided; if missing from alternate source, use the `<DEFAULT_VALUE>` provided `inline`
**Symbol Operator**| Examples: `'{#myTagName{a.b.c}}'`
`#`| Adds the value to the `tags` mapping if provided, the current JSON node's path is used as `key`
`#<LABEL>`| Adds the value to the `tags` mapping if provided, the tag string is used as `key`. Enables `self-referencing` templates in coming version.
`:`| `RESERVED`
`:<LABEL>`| `RESERVED`
**Enumeration Operators**| Examples: `'{*{a.b.c}}', '{**{a.b.c}}'`
`*`| Enumerate values of an object
`**`| Enumerate an object as an array of `[key, value]` pairs
**Inception Operators**| Looping over templates, document-items or descending into nested scope. Triggered by some array item that is a template with '{<inception-opreator>{}}' and consumes from susequent items
**for-each-template**| Examples: `['{>>>{a.b.c}}', '{{name}}', '{{age}}']`. Number of repetition after the first instance of the operator is sugar for `<operator>n`, where `n` is numerical value
`>>`| Template array item would first be rendered using the main `document`, rendered result would be used as a scoped documents for the `NEXT-ONE` template item in the array, i.e. when rendering this array `['{>>{a.b.c}}', '{{name}}'']`, `$a.b.c` value is selected from the main document producing a `scoped-document`, next `ONE` template-item in the array, namely `$.name` is selected from that scoped-document.
`>>>`| Template array item would first be rendered using the main `document`, rendered result would be used as a scoped documents for the `NEXT-TWO` template item in the array, i.e. when rendering this array `['{>>>{a.b.c}}', '{{name}}', '{{age}}']`, `$a.b.c` value is selected from the main document producing a `scoped-document`, next `TWO` template-items in the array, namely `$.name` and `$.age` are selected from that scoped-document. In general, depth is determined using the number of `>` used.
`>n`| Template array item would first be rendered using the main `document`, rendered result would be used as a scoped documents for the `NEXT-n` template item(s) in the array
`>*`| Template array item would first be rendered using the main `document`, rendered result would be used as a scoped documents for `ALL` subsequent template item(s) in the template array
**for-each-document-item**| Examples: `['{%%{a.b.someArray}}', '{{["name", "age"]}}']`, Note: `$a.b.someArray` has to be an Array.
`%%`| Opposite of `>>`. Template array item would first be rendered using the main `document` where rendered result is an `Array`, for-each document-item in that Array the `NEXT-ONE` template item in the array is used to render, effectively `ALL` document-elements using that same template, i.e. when rendering this array `['{>>>{a.b.someArray}}', '{{name}}'']`, `$a.b.someArray` value is selected from the main document producing a `scoped-document` that is an Array, next `ONE` template-item in the array, namely `$.name` is used to render all a.b.someArray items.
`%%%`| Template array item would first be rendered using the main `document` where rendered result is an `Array`, for-each document-item in that Array the `NEXT-TWO` template items in the array are used to render the first `TWO` document-items in order, In other words, `document-items` Array and next `TWO` `template-items` are `zipped` into `[[doc1, template1], [doc2, template2]]` where every pair is used in a call to transform(template1)(document1), transform(template2)(document2). In general, depth is determined using the number of `%` used.
`%n`| Same as above, document-items Array is `zipped` with next `n` template-items.
`%*`| Same as above, document-items Array is `zipped` with `ALL` subsequent template-items in the template array.
**descending-scope**| Examples: `['{...{a}}', '{{some-a-attribute-b}}', '{{some-b-attribute-c}}']` (assuming document has a valid path `a.b.c`) allowing you to write scoped and shorter `jsonpath` for deeply nested JSON documents
`..`| Template is rendered against the main `document` and then used as a `scoped-document` for the next `ONE` template item.
`...`| Same as above but recursively descend into nested scope for the next `TWO` template items. In general, depth is determined using the number of `.` used.
`.*`| Same as above but recursively descend into nested scope for `ALL` subsequent template items in the template array, i.e. template-0 is rendered from main document, template-n+1 is rendered using scoped-document produced by rendering template-n. This is a convience feature that allows shorter and more focused jsonpath expressions for heavily nested JSON and simplifies using `partial-templates` for inner scopes.
**Pipes**|**Description**
`*`| Flattens a nested array of arrays into a flat array, e.g. `[[1], [2], [3]]` flattens to `[1, 2, 3]`. Very common use cases specially with jsonpath recursive queries and `inception`. Example: <code>'{{a.b.c} &#124; * }'</code>
`**`| Flattens a nested array of [array of arrays] into a flat array, e.g. `[[[1], [2], [3]]]` flattens to `[1, 2, 3]`. Only appreciated when the need arises. Use carefully in order not to enumerate literals accidentally. Example: <code>'{{a.b.c} &#124; ** }'</code>
`<built-in-function-name> OR <user-defined-function-name>`| Creates a pipelines of all piped `arity 1` functions, e.g. <code>{{a.b.c} &#124; foo &#124; bar}</code>, the pipeline is called with the `renderedValue` as expected from a functional programming pipe operations. Example: <code>'{{a.b.c} &#124; asInt &#124; isEven }'</code>
`<built-in-function-name> OR <user-defined-function-name>:arg1:arg2:arg3`| Same as above, but calling the higher-order-function with `foo(arg1, arg2)(renderedValue)` e.g. <code>{{a.b.c} &#124; add:10 &#124; pow:2}</code>, where `builtins['add']` is a higher-order function that returns an `arity 1` function, i.e. `source => target => parseFloat(source, 10) + target;`. Literal values text is parsed for you, i.e. `true`, `false`, `null`, `undefined` and also float numeric text and int text, i.e. 1, 100, 0.5, 100.99. NOTE: Pipe functions with arguments don't need to be higher order, ordinary functions will be called with the arguments and they never get a chance to receive the `renderedValue`. The choice is yours.
`<built-in-function-name> OR <user-defined-function-name>:arg1:__:arg3`| For functions utilizing the `placeholder` syntax `__`, they MUST NOT be higher order, since the `renderedValue` is passed normally as an argument in the position designated by the `placeholder`.


## Examples
Starting with this generous JSON document

```js
const document = {
    id: 123,
    title: 'Bicycle 123',
    description: 'Bicycle 123 is a fabulous item that you have to spend all your money on',
    updatedAt: '2017-10-13T10:37:47',
    bicycleType: 'Hybrid',
    brand: 'Brand-Company C',
    price: 500,
    color: ['Red', 'Black', 'White'],
    productCategory: 'Bicycle',
    inStock: true,
    inStockCount: '100',
    quantityOnHand: null,
    relatedItems: [341, 472, 649],
    tags: {
        hot: {author: 'anonymousUser1', timestamp: '2016MMDDHHmmssSSS'},
        seasonal: {author: 'anonymousUser2', timestamp: '2017MMDDHHmmssSSS'},
        personalTransportation: {author: 'memberUser3', timestamp: '2015MMDDHHmmssSSS'},
        'tag-name-with-dash': {author: 'memberUser4', timestamp: '2015MMDDHHmmssSSS'},
        'tag name with spaces': {author: 'memberUser5', timestamp: '2015MMDDHHmmssSSS'},
        'tag.name.with.dots': {author: 'memberUser6', timestamp: '2015MMDDHHmmssSSS'}
    },
    pictures: [
        {
            view: 'front',
            images: [{big: 'http://example.com/products/123_front.jpg'}, {thumbnail: 'http://example.com/products/123_front_small.jpg'}]
        },
        {
            view: 'rear',
            images: [{big: 'http://example.com/products/123_rear.jpg'}, {thumbnail: 'http://example.com/products/123_rear_small.jpg'}]
        },
        {
            view: 'side',
            images: [{big: 'http://example.com/products/123_left_side.jpg'}, {thumbnail: 'http://example.com/products/123_left_side_small.jpg'}]
        }
    ],
    productReview: {
        fiveStar: [
            {
                author: 'user1@domain1.com',
                'first.name': 'user1',
                comment: "Excellent! Can't recommend it highly enough! Buy it!",
                score: 5,
                viewAs: '*****'
            },
            {
                author: 'user2@domain2.com',
                'first.name': 'user2',
                comment: 'Do yourself a favor and buy this.',
                score: 5,
                viewAs: '*****'
            }
        ],
        oneStar: [
            {
                author: 'user3@domain3.com',
                'first.name': 'user3',
                comment: 'Terrible product! Do no buy this.',
                score: 1,
                viewAs: '*----'
            }
        ]
    },
    comment: '/HOME/This product sells out quickly during the summer',
    'Safety.Warning.On.Root': 'Always wear a helmet' // attribute name with `.`
};
```

### Query/Constraints Operators Example
```js
const template = {
    name: '{{title}} [{{description}}] http://items/{{title}}',
    reviews: {
        eula: 'read and agree and let us get on with it',
        high: '{{productReview.fiveStar[0].comment}}',
        low: '{{productReview.oneStar[0].comment}}',
        disclaimer: 'Ad: {{comment}}'
    },
    safety: '{{["Safety.Warning.On.Root"]}}',
    topRaters: '{{productReview.fiveStar[0]["first.name"]}} - {{productReview.fiveStar[1]["first.name"]}} - {{productReview.oneStar[0]["first.name"]}}',
    topTaggers: '{{tags["tag-name-with-dash"].author}} - {{tags["tag name with spaces"].author}} - {{tags["tag.name.with.dots"].author}}',
    scores: '{+{productReview..score}}', // <- * means get one or more search results. The value is substituted as is unless the place holder is a part of a bigger string, in that case it is replaced into the string template
    oneScore: '{{productReview..score}}', // <- * means get exactly one search results. The value is substituted as is unless the place holder is a part of a bigger string, in that case it is replaced into the string template
    users: '{+{..author}}', // take all matches
    optional: '{?{["not.there"]}}', // key would vanish if value doesn't exist
    optionalInContext: 'Value for not.there = {?{["not.there"]}}', // would evaluate to '' if value doesn't exist
    required: '{!{["not.there"]}}' // should be set to null if value doesn't exist
};

const result = transform(template)(document);

/** result
{
  "name": "Bicycle 123 [Bicycle 123 is a fabulous item that you have to spend all your money on] http://items/Bicycle 123",
  "reviews": {
    "eula": "read and agree and let us get on with it",
    "high": "Excellent! Can't recommend it highly enough! Buy it!",
    "low": "Terrible product! Do no buy this.",
    "disclaimer": "Ad: /HOME/This product sells out quickly during the summer"
  },
  "safety": "Always wear a helmet",
  "topRaters": "user1 - user2 - user3",
  "topTaggers": "memberUser4 - memberUser5 - memberUser6",
  "scores": [
    5,
    5,
    1
  ],
  "oneScore": 1,
  "users": [
    "anonymousUser1",
    "anonymousUser2",
    "memberUser3",
    "memberUser4",
    "memberUser5",
    "memberUser6",
    "user1@domain1.com",
    "user2@domain2.com",
    "user3@domain3.com"
  ],
  "optionalInContext": "Value for not.there = ",
  "required": null
}
**/
```

### Inception Operators Example

```js
const template = {
    name: '{{title}}',
    reviews: {
        high: [1, 2, 'prelude', {keyBefore: 'literal value before'}, ['a', 'b', 'c'], '{{productReview.fiveStar.length}}', '{>> {productReview.fiveStar[0]}}', {
            praise: '{+{["author","comment"]}}',
            stars: '{{viewAs}}'
        }, {keyAfter: 'literal value after'}
        ],
        low: ['{>* {productReview.oneStar}}',
            {
                criticism: '{{[(@.length - 1)].comment}}'
            },
            {count: '{{length}}'}
        ],
        disclaimer: 'Ad: {{comment}}'
    },
    reviewsSummary: [
        '{>>>{productReview}}', //use this after rendering as a scoped-document, render next n templates with it
        '{+{$..score}}',
        {summary: {fiveStar: '{{fiveStar.length}}', oneStar: '{{oneStar.length}}'}}
    ], // render next n nodes with leading rendered item as scoped-document
    views: ['{%% {pictures}}', '[{{view}}]({{images.length}})'], // for-each item in enumerable scoped-document, render with next node
    twoimages: ['{+ %2 {pictures..images}}', 'front -> {{[1].thumbnail}}', 'rear -> {{[1].thumbnail}}', 'side -> {?=default:Not Available{[1].thumbnail}}'], // zip-align
    images: ['{+ %* {pictures..images}}', 'front -> {{[1].thumbnail}}', 'rear -> {{[1].thumbnail}}', 'side -> {{[1].thumbnail}}'], // zip-align
    recursive3: ['{.3{productReview}}', '{{fiveStar}}', '{{[(@.length - 1)]}}', '{{comment}}', '{{description}}'],
    recursive2: ['{.2{productReview}}', '{{fiveStar}}', '{{[(@.length - 1)]}}', '{{comment}}', '{{description}}']
};

const result = transform(template)(document);

/** result
{
    "name": "Bicycle 123",
    "reviews": {
        "high": [1, 2, "prelude", {"keyBefore": "literal value before"}, ["a", "b", "c"], 2, {
            "praise": ["user1@domain1.com", "Excellent! Can't recommend it highly enough! Buy it!"],
            "stars": "*****"
        }, {"keyAfter": "literal value after"}],
        "low": [{"criticism": "Terrible product! Do no buy this."}, {"count": 1}],
        "disclaimer": "Ad: /HOME/This product sells out quickly during the summer"
    },
    "reviewsSummary": [[5, 5, 1], {"summary": {"fiveStar": 2, "oneStar": 1}}],
    "views": ["[front](2)", "[rear](2)", "[side](2)"],
    "twoimages": ["front -> http://example.com/products/123_front_small.jpg", "rear -> http://example.com/products/123_rear_small.jpg", "side -> Not Available"],
    "images": ["front -> http://example.com/products/123_front_small.jpg", "rear -> http://example.com/products/123_rear_small.jpg", "side -> http://example.com/products/123_left_side_small.jpg"],
    "recursive3": [original.productReview.fiveStar[1].comment, original.description],
    "recursive2": [original.productReview.fiveStar[1], original.comment, original.description]
}
**/

```

### Function Expression and Argument Parsing Example
```js
const helloWorld = () => 'hello world';

const template = {
    updateAt: '@now',
    age: '@since',
    stockSummary: '@stock',
    id: '@uuid | ellipsis:10',
    expensive: '{{price} | gte:500:__}',
    LDPictures: '{{pictures} | stringify:__:null:0}',
    injectedFunction: helloWorld,
    echo: '{{id} | echoArgs:1:1000:0.5:100.99:true:false:null:undefined:__}', // literal args are parsed for you
    echoJSON: '{{id} | echoArgs:1:1000:0.5:100.99:true:false:null:undefined:__ | stringify }',
    echoArgsReduced: '{{id} | echoArgs:1:1000:0.5:100.99:true:false:null:undefined:__ | done}'
};

// args keys are either functionName (if used only once), functionKey (if globally unique) or functionPath which is unique but ugliest option to write
const args = {
    since: [{path: '$.updatedAt'}], // FUNCTION NAME in @functionName
    stockSummary: [                 // FUNCTION KEY in args
        {path: '$.inStock'},
        {path: '$.inStockCount'},
        {path: '$.quantityOnHand'},
        {value: 100},
        1000
    ]
};

const gte = (source, target) => target >= source; // builtin gte is higher-order function, overriding with arity-2 function to illustrate __ placeholder
const now = () => '2018-09-11T00:20:08.411Z';
const since = previous => `Now: [2018-09-11T00:20:08.411Z], last update: ${previous}`;
const stock = (...args) => args.join('--');
const uuid = () => '4213ad4f-a2b3-4c02-8133-f89019eb6093'; // override for mocking/testing
const echoArgs = (...args) => args;

const result = transform(template, {functions: {now, since, stock, uuid, gte, echoArgs}, args})(document);

console.log(result);

/** result
{ updateAt: '2018-09-11T00:20:08.411Z',
  age: 'Now: [2018-09-11T00:20:08.411Z], last update: 2017-10-13T10:37:47',
  stockSummary: 'true--100----100--1000',
  id: '4213ad4...',
  expensive: true,
  LDPictures: '[{"view":"front","images":[{"big":"http://example.com/products/123_front.jpg"},{"thumbnail":"http://example.com/products/123_front_small.jpg"}]},{"view":"rear","images":[{"big":"http://example.com/products/123_rear.jpg"},{"thumbnail":"http://example.com/products/123_rear_small.jpg"}]},{"view":"side","images":[{"big":"http://example.com/products/123_left_side.jpg"},{"thumbnail":"http://example.com/products/123_left_side_small.jpg"}]}]',
  injectedFunction: 'hello world',
  echo: [ 1, 1000, 0.5, 100.99, true, false, null, undefined ], // !!! WHAAAAT !!!
  echoJSON: '[\n  1,\n  1000,\n  0.5,\n  100.99,\n  true,\n  false,\n  null,\n  null,\n  123\n]',
  echoArgsReduced: [ 1, 1000, 0.5, 100.99, true, false, null, undefined, 123 ] }
**/
```

#### Example Discussion

From the previous example we notice the following:
- function expression `@func` receives its arguments from the `args` mapping, passed to `transform` function in the options.
- function expression arguments are `keyed` in `args` using any of the following options, they are attempted to be deref`d in the following order:
    - arg key is either `functionName` (in `@functionName`) if the name is used only once in the template. Example: `since` key in args above
    - functionKey (if globally unique). Example: `stockSummary` above
    - functionPath which is always unique but ugliest option to write. Recommended for machine-created templates.

Now: what is happening in this result:

`echo: [ 1, 1000, 0.5, 100.99, true, false, null, undefined ], // !!! WHAAAAT !!!`

We notice that although the echoArgs function works as expected and returns an array of its (already parsed) arguments, the `renderedValue` 123 is missing from the output.
What happens is, your function returned a container (Array in this case), the `json-tots` would descend into that Array or Map looking for more `{{}}` to consume. This is key to partial-templates and staged-rendering.
The `undefined` value is not supported by JSON, and setting that node's (Array[7]) value to `undefined` removes the corresponding key `7` from the Array, effectively shifting the rest of the elements left and signaling a pre-mature completion of any Array Loop logic.

_**`traverse` is partially to blame, the rest of the blame is on us for sprouting an array for it to traverse, and started updating values to `undefined`**__

For now, there are a couple of elegant options (until the root cause is eliminated and immutability during iteration is enforced):
- You are happy with the result and you are not going to be producing `undefined` in your `generated` arrays
- You tell `json-tots` that the value you are returning is not to be traversed looking for more templates. You signal that by `piping` to `done`, i.e. `...}fnThatSproutsArrayOrObject | done}` ). `done` is a builtin that wraps your returned value in a `closure` so that it is not further traversed.
- You pipe that newly generated container value (Array or Object) into `stringify`
- The `!` operator comes to mind, it forces missing values into `null`. Currently it is executed against the deref`d value (whatever jsonpath.query returned from the document) and not as a last step of your function-pipeline. Maybe a similar operator can be introduced if the problem persists.

Note: this is an edge case that you should rarely run into, documented to spare you hours of debugging. The right solution is to safely traverse and guard against Array splicing while iterating over its children. Remember that `undefined` wouldn't have survived JSON serialization anyhow.

Makes you wish that `Immutable` data structures are used everywhere, which is at top of the roadmap priorities.

For more examples please check `transform.spec.js` in the code repository.

## Possible use cases
- API Mesh applications
- Big Data Transformations
- JSON Documents aggregation using transform() with multiple sources

## Run the tests

  ```
  npm test
  ```

## FAQs

## Build Targets
Currently the following target build environments are configured for babel-preset-env plugin
```
 "targets": {
   "node": 4.3,
   "browsers": ["last 10 versions", "ie >= 7"]
 }
```
In case this turns out to be not generous enough, more backward compatible babel transpilation targets would be added.

## Roadmap

- bigger and better
- rule'em all

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
