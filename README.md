master|develop|npm
---|---|---
[![Build Status](https://travis-ci.org/sdawood/json-tots.svg?branch=master)](https://travis-ci.org/sdawood/json-tots)|[![Build Status](https://travis-ci.org/sdawood/json-tots.svg?branch=develop)](https://travis-ci.org/sdawood/json-tots)|[![npm version](https://badge.fury.io/js/json-tots.svg)](https://badge.fury.io/js/json-tots)

# json-tots

`json-tots` offers is a JSON Template Of Templates Declarative Transformation and Rendering engine.
Everything is JSON, the template, the document, and extended arguments for template functions.

json-tots supports:
- JSON shape transformation
- The full power of jsonpath
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

    const result = transform(template)(document); // transform is a higher order function

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
Things get interesting when you use the string-template syntax `{{}}` in standalone or within a string literal.
The opening curly braces can include one or more `modifier`, while the closing curly braces can include `pipes`, which is a pipeline of functions to apply to the rendered partial-result.
For example:

  ```js
    const {transform} = require('./transform');

    const document = {log: {user: [{firstName: 'John', lastName: 'Smith'}, {firstName: 'Sally', lastName: 'Doe'}]}};
    const template = {message: 'Hello {{..user.*.firstName}}, welcome to json-tots'};

    const result = transform(template)(document);
    console.log(result);

    // { message: 'Hello Sally, welcome to json-tots' }

  ```

Note, we used the power of jsonpath recursive query `..user` to find deeply nested user tags in the document, then we enumerate all users using `.*` and selct the `firstName` for each.
Although there are more than one user, following XPath convention, we have asked for value-of, which would only return one result.
To retrieve all results of our jsonpath query, we can tell json-tots that we expect `one or more` values using a `modifier` namely `+`

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

Now that we have covered the template structure (everything is JSON) and learned the power of jsonpath, let's look at the template-string modifiers and pipes syntax.

json-tots Template String                      | Description
------------------------------|------------
`"Arbitrary text { [<modifiers>*] {<jsonpath>} [<pipes>*] }" and then some more`       | A JSON string literal that includes a place holder containing a jsonpath to be derefed from the document (or scoped-document), `modifiers` and `pipes` are optional. multiple modifiers can be separated with a `|`, similarly for pipes.
Modifier|Description
`+`|Return all jsonpath query results as an Array, without `+` we get only one result.
`+n`|Take exactly <n> items, where n is a numerical value.
Pipe|Description
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


## On source
## On paths
## On inception
## On transformations
## On pattern matching

## API

## Bonus:

## Possible use cases

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
