/* eslint-disable no-template-curly-in-string */
const strings = require('./strings');

const templateWithStringKeys = 'Welcome user: ${lastName} ... ${firstName} ... ${lastName}';
const templateWithStringKeysDoubleQuoted = 'Welcome user: "${lastName}" ... "${firstName}" ... "${lastName}"';
const templateWithStringKeysSingleQuoted = "Welcome user: '${lastName}' ... '${firstName}' ... '${lastName}'";
const templateWithDoubleQuotedStringKeys = 'Welcome user: ${"lastName"} ... ${"firstName"} ... ${"lastName"}';
const templateWithSingleQuotedStringKeys = "Welcome user: ${'lastName'} ... ${'firstName'} ... ${'lastName'}";

const renderValuesMap = {
    firstName: 'James',
    lastName: 'Bond'
};
const renderValuesList = ['Bond', 'James'];

describe('lazyTemplateTag', () => {
    describe('lazyTemplateTag with string keys', () => {
        it('create a template function that accepts a Map arguments', () => {
            // const template = strings.lazyTag`${templateWithStringKeys}`; // this doesn't work // http://exploringjs.com/es6/ch_template-literals.html#sec_implementing-tag-functions, 8.5.3 Can I load a template literal from an external source?
            const template = strings.lazyTemplateTag`Welcome user: ${'lastName'} ... ${'firstName'} ... ${'lastName'}`;
            expect(template(renderValuesMap)).toEqual("Welcome user: Bond ... James ... Bond");
        });
    });

    describe('lazyTemplateTag with integer keys', () => {
        it('create a template function that accepts a List arguments', () => {
            const template = strings.lazyTemplateTag`Welcome user: ${0} ... ${1} ${0}`;
            expect(template(...renderValuesList)).toEqual("Welcome user: Bond ... James Bond");
        });
    });
});

describe('lazyTemplate creates a template function that accepts a Map arguments', () => {
    describe('with default placeholder == ${.*}', () => {
        it('when called with a string', () => {
            const template = strings.lazyTemplate(templateWithStringKeys);
            expect(template(renderValuesMap)).toEqual("Welcome user: Bond ... James ... Bond");
        });

        it('when called with a string', () => {
            const template = strings.lazyTemplate(templateWithStringKeysDoubleQuoted);
            expect(template(renderValuesMap)).toEqual("Welcome user: \"Bond\" ... \"James\" ... \"Bond\"");
        });

        it('when called with a string', () => {
            const template = strings.lazyTemplate(templateWithStringKeysSingleQuoted);
            expect(template(renderValuesMap)).toEqual("Welcome user: 'Bond' ... 'James' ... 'Bond'");
        });

        it('when called with a string with "key"s', () => {
            const template = strings.lazyTemplate(templateWithDoubleQuotedStringKeys);
            expect(template(renderValuesMap)).toEqual("Welcome user: Bond ... James ... Bond");
        });

        it("when called with a string with 'key's", () => {
            const template = strings.lazyTemplate(templateWithSingleQuotedStringKeys);
            expect(template(renderValuesMap)).toEqual("Welcome user: Bond ... James ... Bond");
        });

        it('when called a template with no parameters', () => {
            // NOTE: template string renders with 'string literal'
            expect(() => strings.lazyTemplate(`Welcome user: ${'lastName'} ... ${'firstName'} ... ${'lastName'}`)).toThrow();
        });
    });
    describe('with custom placeholder == {{.*}}', () => {
        const templateWithStringKeys = 'Welcome user: {{lastName}} ... {{firstName}} ... {{lastName}}';
        const templateWithStringKeysDoubleQuoted = 'Welcome user: "{{lastName}}" ... "{{firstName}}" ... "{{lastName}}"';
        const templateWithStringKeysSingleQuoted = "Welcome user: '{{lastName}}' ... '{{firstName}}' ... '{{lastName}}'";
        const templateWithDoubleQuotedStringKeys = 'Welcome user: {{"lastName"}} ... {{"firstName"}} ... {{"lastName"}}';
        const templateWithSingleQuotedStringKeys = "Welcome user: {{'lastName'}} ... {{'firstName'}} ... {{'lastName'}}";
        const options = {placeholder: {open: '{{', close: '}}'}};

        it('when called with a string', () => {
            const template = strings.lazyTemplate(templateWithStringKeys, options);
            expect(template(renderValuesMap)).toEqual("Welcome user: Bond ... James ... Bond");
        });

        it('when called with a string', () => {
            const template = strings.lazyTemplate(templateWithStringKeysDoubleQuoted, options);
            expect(template(renderValuesMap)).toEqual("Welcome user: \"Bond\" ... \"James\" ... \"Bond\"");
        });

        it('when called with a string', () => {
            const template = strings.lazyTemplate(templateWithStringKeysSingleQuoted, options);
            expect(template(renderValuesMap)).toEqual("Welcome user: 'Bond' ... 'James' ... 'Bond'");
        });

        it('when called with a string with "key"s', () => {
            const template = strings.lazyTemplate(templateWithDoubleQuotedStringKeys, options);
            expect(template(renderValuesMap)).toEqual("Welcome user: Bond ... James ... Bond");
        });

        it("when called with a string with 'key's", () => {
            const template = strings.lazyTemplate(templateWithSingleQuotedStringKeys, options);
            expect(template(renderValuesMap)).toEqual("Welcome user: Bond ... James ... Bond");
        });

        it('when called a template with no parameters', () => {
            // NOTE: template string renders with 'string literal'
            expect(() => strings.lazyTemplate(`Welcome user: ${'lastName'} ... ${'firstName'} ... ${'lastName'}`)).toThrow();
        });
    });
});

describe('tokenize', () => {
    describe('non repeating capture groups', () => {
        const text = 'fhname/2020/07/17/01/type-1-2020-07-17-01-03-06-6f6765f9-0e4f-4949-bd9a-ce72be9dfe30';
        const regex = /^(.*?)\/(\d{4}\/\d{2}\/\d{2}\/\d{2})\/(.*)(?=-\d+-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})-(\d+)-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})-(.*)$/; //https://regex101.com/r/yQ6Dyn/1
        const regexStr = '^(.*?)\\/(\\d{4}\\/\\d{2}\\/\\d{2}\\/\\d{2})\\/(.*)(?=-\\d+-\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2})-(\\d+)-(\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2})-(.*)$';
        const attributeName = ['fhname', 'rangeStart', 'deliveryStreamName', 'deliveryStreamVersion', 'timestamp', 'uuid'];
        describe('when called with regex string', () => {
            // NOTE: to get properly escaped regex string, create a regex using /your-regex-here/ then use .source()

            it('defaults to $index of capture group when attributeNames are not provided', () => {
                expect(strings.tokenize(regexStr, text, {sequence: true})).toEqual({
                    $1: 'fhname',
                    $2: '2020/07/17/01',
                    $3: 'type',
                    $4: '1',
                    $5: '2020-07-17-01-03-06',
                    $6: '6f6765f9-0e4f-4949-bd9a-ce72be9dfe30'
                });
            });

            it('uses attribute names as keys when attributeNames are provided', () => {
                expect(strings.tokenize(regexStr, text, {tokenNames: attributeName, sequence: true})).toEqual({
                    deliveryStreamName: 'type',
                    rangeStart: '2020/07/17/01',
                    fhname: 'fhname',
                    timestamp: '2020-07-17-01-03-06',
                    uuid: '6f6765f9-0e4f-4949-bd9a-ce72be9dfe30',
                    deliveryStreamVersion: '1'
                });
            });

            it('uses partial attribute names as keys when partial attributeNames are provided', () => {
                expect(strings.tokenize(regexStr, text, {
                    tokenNames: [attributeName[0], undefined, attributeName[2]],
                    sequence: true
                })).toEqual(expect.objectContaining({
                    fhname: 'fhname',
                    deliveryStreamName: 'type'
                }));
            });
        });

        describe('when called with RegExp instance', () => {
            it('defaults to $index of capture group when attributeNames are not provided', () => {
                expect(strings.tokenize(regex, text, {sequence: true})).toEqual({
                    $1: 'fhname',
                    $2: '2020/07/17/01',
                    $3: 'type',
                    $4: '1',
                    $5: '2020-07-17-01-03-06',
                    $6: '6f6765f9-0e4f-4949-bd9a-ce72be9dfe30'
                });
            });

            it('uses attribute names as keys when attributeNames are provided', () => {
                expect(strings.tokenize(regex, text, {tokenNames: attributeName, sequence: true})).toEqual({
                    deliveryStreamName: 'type',
                    rangeStart: '2020/07/17/01',
                    fhname: 'fhname',
                    timestamp: '2020-07-17-01-03-06',
                    uuid: '6f6765f9-0e4f-4949-bd9a-ce72be9dfe30',
                    deliveryStreamVersion: '1'
                });
            });

            it('uses partial attribute names as keys when partial attributeNames are provided', () => {
                expect(strings.tokenize(regex, text, {
                    tokenNames: [attributeName[0], undefined, attributeName[2]],
                    sequence: true
                })).toEqual(expect.objectContaining({
                    fhname: 'fhname',
                    deliveryStreamName: 'type'
                }));
            });
        });
    });
    describe('template {ops{path expressions}pipes}', () => {
        const ops = [
            // NO OP
            '',
            // INCEPTION
            '..',
            '.1',
            '...',
            '.2',
            '....',
            '.....',
            '.10',
            '.100',
            '.1000',
            // ENUMERATE
            '*',
            // FLATTEN
            '**'
        ];
        const pipes = [
            // NO OP
            '',
            // INCEPTION
            'foo',
            'bar',
            // ENUMERATE
            '*',
            // FLATTEN
            '**'
        ];

        const opCombinations = [
            ['', {}],

            // INCEPTION
            ['..', {$1: '..'}],
            ['...', {$1: '...'}],
            ['....', {$1: '....'}],
            ['.5', {$1: '.5'}],
            ['.10', {$1: '.10'}],
            ['.100', {$1: '.10'}],
            // INVALID INCEPTION
            ['.1000', {$1: '.10'}], // TODO: do we want to be more strict?
            // ENUMERATION
            ['*', {$2: '*'}],
            // FLATENNING
            ['**', {$2: '**'}],
            // BINDING/SYMBOL
            [' : ', {$3: ':'}],
            [' #123_foo_bar ', {$3: '#123_foo_bar '}], // TODO: to get rid of the space, we'd need to stop allowing space inside the tag name, currently "foo bar" is supported, the trailing space is a side effect.
            // QUERY MODIFIERS
            [' + ', {$5: '+'}],
            [' +5 ', {$5: '+5'}],
            [' +100 ', {$5: '+100'}],
            [' ? ', {"$4": "?"}],
            [' ?=default', {"$4": "?=default"}],
            [' ?=default:10 | +', {"$4": "?=default:10 ", "$5": "+"}],
            [' ?=default:_xyz:1xyz | +10 ', {"$4": "?=default:_xyz:1xyz ", "$5": "+10"}],
            [' ?=default:a-b-c:a b c | +10 ', {"$4": "?=default:a-b-c:a b c ", "$5": "+10"}], // TODO: spaces in arguments should be discouraged outside "", Regex limitation of not being a true lexer
            [' ?=default:"hello":"world of pain" | +10 ', {"$4": "?=default:\"hello\":\"world of pain\"", "$5": "+10"}],
            [' ?=default:"hello":"world - of - pain" | +10 ', {"$4": "?=default:\"hello\":\"world - of - pain\"", "$5": "+10"}],
            [' !', {"$4": "!"}],
            [' !=altSource', {"$4": "!=altSource"}],
            [' !=altSource:10 | +', {"$4": "!=altSource:10 ", "$5": "+"}],
            [' !=altSource:_xyz:1xyz | +10 ', {"$4": "!=altSource:_xyz:1xyz ", "$5": "+10"}],
            [' !=altSource:a-b-c:a b c | +10 ', {"$4": "!=altSource:a-b-c:a b c ", "$5": "+10"}], // TODO: spaces in arguments should be discouraged outside "", Regex limitation of not being a true lexer
            [' !=altSource:"hello":"world of pain" | +10 ', {"$4": "!=altSource:\"hello\":\"world of pain\"", "$5": "+10"}],
            [' !=altSource:"hello":"world - of - pain" | +10 ', {"$4": "!=altSource:\"hello\":\"world - of - pain\"", "$5": "+10"}],

                                // COMBINATIONS
            ['.. | *', {$1: '..', $2: '*'}],
            ['.1 | *', {$1: '.1', $2: '*'}],
            ['.10 | *', {$1: '.10', $2: '*'}],
            ['.. | **', {$1: '..', $2: '**'}],
            ['.1 | **', {$1: '.1', $2: '**'}],
            ['.10 | **', {$1: '.10', $2: '**'}],

            ['.. | * | : ', {$1: '..', $2: '*', $3: ':'}],
            ['.1 | * | : ', {$1: '.1', $2: '*', $3: ':'}],
            ['.10 | * | : ', {$1: '.10', $2: '*', $3: ':'}],
            ['.. | ** | : ', {$1: '..', $2: '**', $3: ':'}],
            ['.1 | ** | : ', {$1: '.1', $2: '**', $3: ':'}],
            ['.10 | ** | : ', {$1: '.10', $2: '**', $3: ':'}],

            ['.. | * | : ', {$1: '..', $2: '*', $3: ':'}],
            ['.1 | * | : ', {$1: '.1', $2: '*', $3: ':'}],
            ['.10 | * | : ', {$1: '.10', $2: '*', $3: ':'}],
            ['.. | ** | : ', {$1: '..', $2: '**', $3: ':'}],
            ['.1 | ** | : ', {$1: '.1', $2: '**', $3: ':'}],
            ['.10 | ** | : ', {$1: '.10', $2: '**', $3: ':'}],

            ['.. | * | : | + ', {"$1": "..", "$2": "*", "$3": ":", "$5": "+"}],
            ['.1 | * | : | ! ', {$1: '.1', $2: '*', $3: ':', $4: '!'}],
            ['.1 | * | : | !=source2 ', {"$1": ".1", "$2": "*", "$3": ":", "$4": "!=source2"}],
            ['.10 | * | : | ? ', {$1: '.10', $2: '*', $3: ':', $4: '?'}],
            ['.10 | * | : | ?=default ', {"$1": ".10", "$2": "*", "$3": ":", "$4": "?=default"}],
            ['.. | ** | : | + ', {"$1": "..", "$2": "**", "$3": ":", "$5": "+"}],
            ['.1 | ** | : | ! ', {$1: '.1', $2: '**', $3: ':', $4: '!'}],
            ['.1 | ** | : | !=source2:username:password ', {"$1": ".1", "$2": "**", "$3": ":", "$4": "!=source2:username:password "}],
            ['.10 | ** | : | ? ', {$1: '.10', $2: '**', $3: ':', $4: '?'}],
            ['.10 | ** | : | ?=default:10 ', {"$1": ".10", "$2": "**", "$3": ":", "$4": "?=default:10 "}],

            ['.. | * |#123_foo_bar | + ', {$1: '..', $2: '*', $3: '#123_foo_bar ', $5: '+'}],
            ['.1 | * |#123_foo_bar | + ', {$1: '.1', $2: '*', $3: '#123_foo_bar ', $5: '+'}],
            ['.10 | * |#123_foo_bar | + ', {$1: '.10', $2: '*', $3: '#123_foo_bar ', $5: '+'}],
            ['.. | ** |#123_foo_bar | + ', {$1: '..', $2: '**', $3: '#123_foo_bar ', $5: '+'}],
            ['.1 | ** |#123_foo_bar | + ', {$1: '.1', $2: '**', $3: '#123_foo_bar ', $5: '+'}],
            ['.10 | ** |#123_foo_bar | + ', {$1: '.10', $2: '**', $3: '#123_foo_bar ', $5: '+'}],

            // double my fun?
            ['.. | .1 | * |#123_foo_bar | + ', {"$1": ".1", "$2": "*", "$3": "#123_foo_bar ", "$5": "+"}], // last one in a group wins
            ['.1 | * | ** |#123_foo_bar | + ', {$1: '.1', $2: '**', $3: '#123_foo_bar ', $5: '+'}], // last one in a group wins
            ['.10 | * |#123_foo_bar | #somethingelse | + ', {$1: '.10', $2: '*', $3: '#somethingelse ', $5: '+'}], // last one in a group wins
            ['.. | ** |#123_foo_bar | + | ?', {$1: '..', $2: '**', $3: '#123_foo_bar ', $4: '?', $5: '+'}], // last one in a group wins
            ['.. | ** |#123_foo_bar | + | ?=default:"" | !=altsource:5', {"$1": "..", "$2": "**", "$3": "#123_foo_bar ", "$4": "!=altsource:5", "$5": "+"}], // last one in a group wins
            ['.1 | ** |#123_foo_bar | + | ?=default:"hello":"world - of - pain" + 10', {"$1": ".1", "$2": "**", "$3": "#123_foo_bar ", "$4": "?=default:\"hello\":\"world - of - pain\"", "$5": "+"}], // last one in a group wins
            ['.1 | ** |#123_foo_bar | + | ?=default:"hello":"world - of - pain" + 10 | !=altSource:"hello":"world - of - pain" | + 5', {"$1": ".1", "$2": "**", "$3": "#123_foo_bar ", "$4": "?=default:\"hello\":\"world - of - pain\"", "$5": "+"}], // last one in a group wins

        ];
        const opOOOCombinations = [
            // OUT OF ORDER COMBINATIONS
            [' * | .. ', {$1: '..', $2: '*'}],
            [' * | .1 ', {$1: '.1', $2: '*'}],
            [' ** | .. ', {$1: '..', $2: '**'}],
            [' ** | .1 ', {$1: '.1', $2: '**'}],

            [' : | .. ', {$1: '..', $3: ':'}],
            [' : | * ', {$2: '*', $3: ':'}],
            [' : | ** ', {$2: '**', $3: ':'}],
            [' : | .1 ', {$1: '.1', $3: ':'}],

            [' + | .1 ', {$1: '.1', $5: '+'}],
            [' + | * ', {$2: '*', $5: '+'}],

            [' #123_foo_bar | .. ', {$1: '..', $3: '#123_foo_bar '}],
            [' #123_foo_bar | * ', {$2: '*', $3: '#123_foo_bar '}],
            [' #123_foo_bar | ** ', {$2: '**', $3: '#123_foo_bar '}],
            [' #123_foo_bar | .1 ', {$1: '.1', $3: '#123_foo_bar '}],

            [' #123_foo_bar | + | ** ', {$2: '**', $3: '#123_foo_bar ', $5: '+'}],
            [' #123_foo_bar | + | .1 ', {$1: '.1', $3: '#123_foo_bar ', $5: '+'}],

            // double my fun?
            [' #123_foo_bar | + | **  | *', {$2: '*', $3: '#123_foo_bar ', $5: '+'}], // currently last operator in group wins
            [' #123_foo_bar | + | .1  | ! | ? ', {$1: '.1', $3: '#123_foo_bar ', $4: '?', $5: '+'}], // currently last operator in group wins
        ];

        const pipeCombinations = [
            // ['', {$1: ''}], // TODO: the regex is forgiving capturing ''!
            ['', {}], // TODO: the regex is forgiving capturing ''!
            // FLATTEN/EXPAND
            [' | *', {$1: '*'}],
            [' | **', {$1: '**'}],
            // FUNCTIONS
            [' | async ', {$1: 'async'}],
            [' | foo | async ', {$1: 'foo', $2: 'async'}],
            [' | foo | bar | async ', {$1: 'foo', $2: 'bar', $3: 'async'}],
            // VALID COMBINATION
            [' | * | async ', {$1: '*', $2: 'async'}],
            [' | * | foo | async ', {$1: '*', $2: 'foo', $3: 'async'}],
            [' | * | foo | bar | async ', {$1: '*', $2: 'foo', $3: 'bar', $4: 'async'}],
            // WITH ARGS
            [' | * | async : 1 : 2', {$1: '*', $2: 'async : 1 : 2'}],
            [' | * | async | foo : hello : world | bar', {$1: '*', $2: 'async', $3: 'foo : hello : world', $4: 'bar'}],
            [' | async | slice::5:-1 | foo | bar | **:-1', {
                $1: 'async',
                $2: 'slice::5:-1',
                $3: 'foo',
                $4: 'bar',
                $5: '**:-1'
            }],
            ['| async | slice::5:-1 | foo | bar | **:4:__:options', {
                $1: 'async',
                $2: 'slice::5:-1',
                $3: 'foo',
                $4: 'bar',
                $5: '**:4:__:options'
            }]
        ];
        const pipeOOOCombinations = [
            // only lexical order matter
            [' | async | * ', {$1: 'async', $2: '*'}],
            [' | foo | async | * ', {$1: 'foo', $2: 'async', $3: '*'}],
            [' | foo | bar | async | * ', {$1: 'foo', $2: 'bar', $3: 'async', $4: '*'}],

            // drops invalids
            [' * | async ', {$1: 'async'}], // * not prefixed by a pipe is ignored
            [' | * | foo async:100 ', {$1: '*', $2: 'foo'}], // async not prefixed by a pipe is ignored
            [' * | foo:1 | bar:1  async ', {$1: 'foo:1', $2: 'bar:1'}],
            [' async | * ', {$1: '*'}],
            [' foo | async:100 | * ', {$1: 'async:100', $2: '*'}],
            [' foo | bar | async | * ', {$1: 'bar', $2: 'async', $3: '*'}],


        ];


        it('captures ops, path and pipes into $n capture groups', () => {
            const regex = /{(.*?){(.*?)}(.*?)}/g;
            const text = '{op{x.y.z}pipes}';
            expect(strings.tokenize(regex, text, {$n: false, sequence: true})).toEqual({
                [text]: [
                    'op',
                    'x.y.z',
                    'pipes'
                ]
            });
        });

        describe('captures all operations respecting allowed order', () => {
            const opregex = /\s*(\.{2,}|\.\d{1,2}|>{2,}|>\d{1,2}|%{2,}|%\d{1,2})?\s*\|?\s*(\*{1,2})?\s*\|?\s*(:|#[a-zA-Z0-9_\-\$\.\[\]"\s]+)?\s*\|?\s*([!|\?](?:[=|~]\w+(?:\s*\:\s*["]?[a-zA-Z0-9_\s\-\$]*["]?)*)?)?\s*\|?\s*(\+\d*)?\s*/g; // https://regex101.com/r/dMUYpQ/20

            // const opregex = <snippet> \s*\|?\s*(:|#[a-zA-Z_]\w*) <snippet> // with valid identifier names for tags
            const tokenNames = ['inception', 'enumerate', 'symbol', 'constraints', 'query'];
            const lookup = {
                $1: tokenNames[0],
                $2: tokenNames[1],
                $3: tokenNames[2],
                $4: tokenNames[3],
                $5: tokenNames[4]
            };
            const alias = ({$1, $2, $3, $4, $5}) => {
                const expected = {};
                if ($1) expected[lookup['$1']] = $1;
                if ($2) expected[lookup['$2']] = $2;
                if ($3) expected[lookup['$3']] = $3;
                if ($4) expected[lookup['$4']] = $4;
                if ($5) expected[lookup['$5']] = $5;
                return expected;
            };

            it('#1 captures ops', () => {
                for (const [ops, expected] of opCombinations) {
                    expect(strings.tokenize(opregex, ops)).toEqual(expected);
                }
            });
            it('#2 handles out of order combinations', () => {
                for (const [ops, expected] of opOOOCombinations) {
                    expect(strings.tokenize(opregex, ops)).toEqual(expected);
                }
            });
            it('#3 aliases capture groups with supplied names', () => {
                for (const [ops, expected] of opCombinations) {
                    expect(strings.tokenize(opregex, ops, {tokenNames})).toEqual(alias(expected));
                }
                for (const [ops, expected] of opOOOCombinations) {
                    expect(strings.tokenize(opregex, ops, {tokenNames})).toEqual(alias(expected));
                }
            });
        });

        describe('captures all pipes along with optional arguments', () => {
            /** since RegExp capture groups won't help tokenizing repeated cgs, since it throws away everything but the last one
             * a viable alternative is to use the sequencing logic of tokenize(<global-regex>), where every match iteration extracts one pipe[:arg]*
             * https://regex101.com/r/n2qnj7/4/
             **/

                // https://regex101.com/r/n2qnj7/4/
            const onepiperegex = /(?:\s*\|\s*)((?:\w+|\*{1,2})(?:\s*\:\s*[a-zA-Z0-9_-]*)*)/g; // every sequenced match is a single pipe[:param]*
            // https://regex101.com/r/ZpJLOR/1/
            // const pipesregex = /((?:\s*\|?\s*(?:\w+|\*{1,2})(?:\s*\:\s*[a-zA-Z0-9_-]*)*)*)/g; // unified * with fn-names
            const tokenNames = ['pipe'];
            const lookup = {$1: tokenNames[0]};
            const alias = ({$1}) => {
                const expected = {};
                if ($1) expected[lookup['$1']] = $1;
                return expected;
            };

            it('#1 captures pipes', () => {
                for (const [pipes, expected] of pipeCombinations) {
                    expect(strings.tokenize(onepiperegex, pipes, {$n: true, sequence: true})).toEqual(expected);
                }
            });
            it('#2 handles out of order combinations', () => {
                for (const [pipes, expected] of pipeOOOCombinations) {
                    expect(strings.tokenize(onepiperegex, pipes, {$n: true, sequence: true})).toEqual(expected);
                }
            });
            it('#3 aliases capture groups with supplied names, positions assumed to be known upfront and aliasing is non-deterministic', () => {
                const knownNames = ['@', '[::]', '(foo)', '(bar)', '**'];
                const knownPositions = [
                    // $n is ignored if tokenNames[index] exists
                    [' | async | slice::5:-1 | foo | bar | **:-1', {
                        "(bar)": "bar",
                        "(foo)": "foo",
                        "**": "**:-1",
                        "@": "async",
                        "[::]": "slice::5:-1"
                    }],
                    // indexes shift, tokenNames are consumed by an unintended match, also $n kicks in if no alias exists
                    [' | async | slice::5:-1 | foo | async | bar | **:-1', {
                        "$6": "**:-1",
                        "(bar)": "async",
                        "(foo)": "foo",
                        "**": "bar",
                        "@": "async",
                        "[::]": "slice::5:-1"
                    }]
                ];
                for (const [pipes, expected] of knownPositions) {
                    expect(strings.tokenize(onepiperegex, pipes, {
                        $n: true,
                        sequence: true,
                        tokenNames: knownNames
                    })).toEqual(expected);
                }
            });
            describe('#showcase handles pattern-match (or destructuring) / interpolation (sequence) / repeating capture-groups (sequence) modes', () => {
                describe('muti-capture group, non-repeating', () => {
                    // expect(strings.tokenize(onepiperegex, example, {$n: false, sequence: false, cgindex: false})).toEqual(
                    //     {}
                    // );
                    it('destructure matches into partitions by capture-group number', () => {
                        expect(strings.tokenize(
                            /((?:\d+)|(?:[a-z]+))-?((?:\d+)|(?:[a-z]+))/g
                            , 'a-10-100-b'
                            , {$n: false, sequence: false, cgindex: true})).toEqual(
                            {"$1": ["a", "100"], "$2": ["10", "b"]}
                        );
                    });
                    it('destructure matches and only remember the last match', () => {
                        expect(strings.tokenize(
                            /((?:\d+)|(?:[a-z]+))-?((?:\d+)|(?:[a-z]+))/g
                            , 'a-10-100-b'
                            , {$n: true, sequence: false, cgindex: true})).toEqual(
                            {"$1": "100", "$2": "b"}
                        );
                    });
                    it('sequences matches into partitions indexed by the full-match', () => {
                        expect(strings.tokenize(
                            /((?:\d+)|(?:[a-z]+))-?((?:\d+)|(?:[a-z]+))/g
                            , 'a-10-100-b'
                            , {$n: false, sequence: true, cgindex: false})).toEqual(
                            {"100-b": ["100", "b"], "a-10": ["a", "10"]}
                        );
                    });
                    it('sequences matches indexed by sequential counter', () => {
                        expect(strings.tokenize(
                            /((?:\d+)|(?:[a-z]+))-?((?:\d+)|(?:[a-z]+))/g
                            , 'a-10-100-b'
                            , {$n: true, sequence: true, cgindex: false})).toEqual(
                            {"$1": "a", "$2": "10", "$3": "100", "$4": "b"}
                        );
                    });
                });
                describe('repeating capture group', () => {
                    const example = ' | async | slice::5:-1 | foo | async | bar | **:-1';
                    // interpolation
                    it('sequences matches into partitions indexed by the full-match', () => {
                        expect(strings.tokenize(onepiperegex, example, {
                            $n: false,
                            sequence: true,
                            cgindex: false
                        })).toEqual(
                            {
                                " | **:-1": ["**:-1"],
                                " | async": ["async", "async"],
                                " | bar": ["bar"],
                                " | foo": ["foo"],
                                " | slice::5:-1": ["slice::5:-1"]
                            }
                        );
                    });
                    it('sequences matches indexed by sequential counter', () => {
                        // sequence (repeated capture groups)
                        expect(strings.tokenize(onepiperegex, example, {
                            $n: true,
                            sequence: true,
                            cgindex: false
                        })).toEqual(
                            {"$1": "async", "$2": "slice::5:-1", "$3": "foo", "$4": "async", "$5": "bar", "$6": "**:-1"}
                        );
                    });
                    it('destructure matches into partitions by capture-group number', () => {
                        expect(strings.tokenize(onepiperegex, example, {
                            $n: false,
                            sequence: false,
                            cgindex: true
                        })).toEqual(
                            {"$1": ["async", "slice::5:-1", "foo", "async", "bar", "**:-1"]}
                        );
                    });
                    it('destructure matches and only remember the last match', () => {
                        expect(strings.tokenize(onepiperegex, example, {
                            $n: true,
                            sequence: false,
                            cgindex: true
                        })).toEqual(
                            {"$1": "**:-1"}
                        );
                    });
                });
            });
        });
    });
});
