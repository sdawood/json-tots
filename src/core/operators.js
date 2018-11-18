/* eslint-disable no-param-reassign */
/* eslint-disable curly */
/* eslint-disable no-magic-numbers */
/* eslint-disable no-implicit-coercion */
/* eslint-disable no-useless-escape */
const jp = require('jsonpath');
const F = require('functional-pipelines');
const Fb = require('./times');
const bins = require('./builtins');
const sx = require('./strings');

const sortBy = (keyName, {mapping = v => v, asc = true} = {}) => (a, b) => {
    if (!asc) [a, b] = [b, a];
    return +(mapping(a[keyName]) > mapping(b[keyName])) || +(mapping(a[keyName]) === mapping(b[keyName])) - 1;
};

const regex = {
    safeDot: /\.(?![\w\.]+")/,
    memberOrDescendant: /^[\[\.]/,
    fnArgsSeparator: /\s*:\s*/,
    PIPE: /\s*\|\s*/
};

// eslint-disable-next-line no-confusing-arrow
const jpify = path => path.startsWith('$') ? path : regex.memberOrDescendant.test(path) ? `$${path}` : `$.${path}`;

const deref = sources => (ast, {meta = 1, source = 'origin'} = {}) => {
    const document = sources[source];
    let values;
    if (F.isNil(document)) {
        values = [];
    } else if (!F.isContainer(document)) {
        meta = 0;
        values = [document]; // literal value
    } else {
        values = jp.query(document, jpify(ast.path));
    }
    return {...ast, '@meta': meta, value: values};
};

const query = (ast, {meta = 2} = {}) => {
    let queryOp = values => values.pop();

    if (jp.value(ast, '$.operators.query')) {

        const ops = {
            '+': ast => count => values => bins.take(count)(values),
            '-': ast => count => values => count ? bins.skip(count)(values) : values.pop() // semantics of standalone - are not yet defined
        };
        const {operator, count} = ast.operators.query;
        queryOp = ops[operator](ast)(count);
    }
    return {...ast, '@meta': meta, value: queryOp(ast.value)};
};

/**
 * NOTE: regex for constraint would allow for !abc or ?abc reserved for future use
 * @param sources
 * @param config
 * @returns {function(*=, {meta?: *}=): {"@meta": Number.meta}}
 */
const constraint = ({sources, config}) => (ast, {meta = 2} = {}) => {
    const ops = {
        '?': ast => (isAltLookup, defaultSource = 'default', defaultValue) => ast.value !== undefined ? ast : (!F.isNil(defaultValue) ? {
            ...ast,
            value: defaultValue
        } : F.compose(query, deref(sources))(ast, {meta, source: defaultSource})),
        '!': ast => (isAltLookup, altSource, defaultValue) => {
            let result = ast;
            result = !F.isEmptyValue(altSource) ? F.compose(query, deref(sources))(ast, {
                meta,
                source: altSource
            }) : {...result, value: F.isNil(ast.value) ? null : ast.value};
            result = result.value !== undefined ? result : (
                !F.isNil(defaultValue) ? {
                    ...result,
                    value: defaultValue // @TODO: check why it converts to string even if it's standalone
                } : {
                    ...result, value: null
                }
            );
            return result;
        }
    };
    // eslint-disable-next-line prefer-const
    const {
        operator,
        equal,
        source,
        defaultValue
    } = ast.operators.constraint;
    const result = ops[operator](ast)(equal === '=', source, defaultValue);
    return {...result, '@meta': meta};
};

const constraintOperator = ({sources}) => F.composes(constraint({
    sources
}), bins.has('$.operators.constraint'));

const symbol = ({tags, context, sources}) => (ast, {meta = 2} = {}) => {
    const ops = {
        ':': ast => (sources, tag) => {
            sources['@@next'] = sources['@@next'] || [];
            const job = {
                type: '@@policy',
                path: jp.stringify(context.path),
                tag: tag,
                source: ast.source,
                templatePath: '',
                tagPath: ast.path
            };
            sources['@@next'].push(job);
            return {...ast, policy: tag};
        },
        '#': ast => (sources, tag) => {
            tag = tag.trim();
            const tagHandler = {
                undefined: ast.path,
                null: ast.path,
                '': ast.path,
                $: jp.stringify(context.path)
            };
            let path = tagHandler[tag];
            if (path === undefined) {
                path = tag;
            }
            tags[path] = ast.value;
            // sources.tags = tags;
            return {...ast, tag: path};
        },
        '@': ast => (sources, tag) => {
            const ctx = tags[tag];
            // Path rewrite
            const relativeTagPath = ast.path[0] === '$' ? ast.path.slice(1) : ast.path;
            const tagPath = `${tag}${relativeTagPath[0] === '[' ? '' : relativeTagPath[0] ? '.' : ''}${relativeTagPath === '$' ? '' : relativeTagPath}`;
            // Path rewrite
            let value;
            if (F.isEmptyValue(ctx)) {
                value = ast.source;
                sources['@@next'] = sources['@@next'] || [];
                const job = {
                    type: '@@tag',
                    path: jp.stringify(context.path),
                    tag,
                    source: ast.source,
                    templatePath: ast.path,
                    tagPath
                };
                sources['@@next'].unshift(job);
            } else {
                // value = JSON.stringify({ ctx, path: ast.path, value: jp.value(tags, jpify(ast.path))}, null, 0);
                value = jp.value(tags, jpify(tagPath)) || ctx;
            }

            ast.value = value;
            return F.reduced({...ast, from: sources['tags']});
        }
    };

    const {
        operator,
        tag
    } = ast.operators.symbol;
    const result = ops[operator](ast)(sources, tag);
    return {...result, '@meta': meta};
};

const symbolOperator = ({tags, context, sources, stages}) => F.composes(symbol({
    tags,
    context,
    sources,
    stages
}), bins.has('$.operators.symbol'));

const enumerate = (ast, {meta = 4} = {}) => {
    const ops = {
        '*': ast => ({...ast, value: [...F.iterator(ast.value)]}), // no-op on arrays, enumerates object values in Object.keys order
        '**': ast => ({...ast, value: [...F.iterator(ast.value, {indexed: true, kv: true})]}) // TODO: do scenarios of ** python style k/v pairs expansion fit with jsonpath?
    };

    const {operator, repeat} = ast.operators.enumerate;
    const result = ops[repeat === 1 ? operator : operator + operator](ast);
    return {...result, '@meta': meta};
};

const enumerateOperator = F.composes(enumerate, bins.has('$.operators.enumerate'));

const parseTextArgs = (...args) => {
    const parseNumeric = text => {
        const isIntText = /^\d+$/;
        const isFloatText = /^\d+\.\d+$/;

        if (isFloatText.test(text)) {
            return parseFloat(text, 10);
        } else if (isIntText.test(text)) {
            return parseInt(text, 10);
        } else {
            return text;
        }
    };

    const literals = {
        'true': true,
        'false': false,
        'null': null,
        'undefined': undefined,
        __: F.__
    };

    const parseText = text => text in literals ? literals[text] : parseNumeric(text); // When regex or parser allows for foo:[1, 2, 3], add: || JSON.parse(text);

    return F.map(parseText, args);
};

const pipe = ({functions}) => (ast, {meta = 5} = {}) => {
    const pipes = ast.pipes;

    if (pipes.length === 0) return ast;

    // ordered [['$1', 'toInt:arg1:arg2'], ['$2', 'isEven:arg1:arg2']]
    const fnPipeline = F.map(({function: functionName, args = []}) => {
// eslint-disable-next-line prefer-const
        const enrichedFunctions = {...functions, '*': bins.flatten, '**': bins.doubleFlatten};
        if (!(functionName in enrichedFunctions)) {
            throw new Error(`could not resolve function name [${functionName}]`); // @TODO: Alternatives to throwing inside a mapping!!!!
        }

        /*
        * A function accepting an argument should return a function of arity one that receives the value rendered
        * example: take(n)(data), parseInt(base)(data), etc ...
        */

        /**
         * For functions of arity > 1, the engine supports one slot (only) syntax @TODO: support multiple slots
         * example: equals:100:__
         *
         */
        const phIndex = args.indexOf('__');
        let fn = enrichedFunctions[functionName];
        if (phIndex >= 0) {
            // args[phIndex] = F.__;
            fn = F.oneslot(fn)(...parseTextArgs(...args)); // placeholder functions are normal functions, since renderedValue is passed into placeholder position with F.oneslot, which already creates a higher order function
            return fn;
        } else if (args.length === 0) {
            return fn;  // no args functions are normal functions that receive the renderedValue
        } else {
            const fn2 = fn(...parseTextArgs(...args));
            return F.isFunction(fn2) ? fn2 : F.lazy(fn2);
        }
    }, pipes);

    return {...ast, '@meta': meta, value: F.pipe(...fnPipeline)(ast.value)}; // we would love to unleash pipes (short circuit pipe), but current implementation would unreduce value reduced by functions. @TODO revisit later
};

const pipeOperator = ({functions}) => F.composes(pipe({functions}), bins.has('$.pipes'));

/**
 * op = [ .+ | .N | >+ | >N | %+ | %N ]
 * .. : lens composition inception
 * >> : for each child, apply transform with leader node
 * %% : zip transform, positional template from leader node renders child template at the same position
 * @param ast
 * @returns {{operator, repeat: *}}
 */
const inception = options => (ast, enumerable, {meta = 5} = {}) => {
    const ops = {
        /**
         * Renders node n in current scope, render n+1 using n as scoped-document, effectively recurring into smaller scopes
         * @param ast
         * @param enumerable
         * @param options
         */
        '.': (ast, enumerable, options) => {
            const [inceptionNode] = enumerable;
            const {transform} = require('../transform'); // lazy require to break cyclic dependency
            const scopedDocument = transform(inceptionNode, options)(options.sources.origin);
            return [F.reduce((rendered, nestedTemplate) => {
                return transform(nestedTemplate, options)(rendered);
            }, () => scopedDocument, enumerable)];
        },

        /**
         * Renders the leader node, use the rendered value as a scoped-document to render the rest of the enumerable as templates
         * @param ast
         * @param enumerable
         * @param options
         */
        '>': (ast, enumerable, options) => {
            const [inceptionNode] = enumerable;
            const {transform} = require('../transform'); // lazy require to break cyclic dependency
            const scopedDocument = transform(inceptionNode, options)(options.sources.origin);
            return F.map(item => transform(item, options)(scopedDocument), enumerable);
        },

        /**
         * Renders the leader node, which yields an array of documents, zip/render the array of templates aligning document(n) with template(n)
         * @param ast
         * @param enumerable
         * @param options
         */
        '%': (ast, enumerable, options) => {
            const [inceptionNode] = enumerable;
            const {transform} = require('../transform'); // lazy require to break cyclic dependency
            const scopedDocument = transform(inceptionNode, options)(options.sources.origin);
            if (!F.isArray(scopedDocument)) throw new Error('Inception Operator [%] should be used for template nodes yielding an array');
            const rest = [...enumerable];
            if (rest.length === 1) {
                // no zip align, apply the rest-template for-each value in document
                return F.map(documentItem => transform(rest[0], options)(documentItem), scopedDocument);
            } else {
                // zip-align
                const pairsIter = F.zip(rest, scopedDocument);
                return F.map(([template, document]) => transform(template, options)(document), pairsIter);
            }
        }
    };

    const {operator, repeat} = ast;
    const opFn = ops[operator];

    const result = opFn(ast, enumerable, options);
    return result; //enumerable
};

const inceptionPreprocessor = ast => {
// eslint-disable-next-line prefer-const
    let {operator, repeat} = ast.operators.inception;
    repeat = repeat === '*' ? Number.POSITIVE_INFINITY : repeat;
    return {...ast, operator: operator, $depth: repeat};
};

const applyAll = ({meta, sources, tags, functions, context, config, stages}) => F.composes(
    pipeOperator({functions}),
    enumerateOperator,
    symbolOperator({tags, context, sources, stages}),
    constraintOperator({sources, config}),
    query,
    deref(sources)
);

module.exports = {
    regex,
    jpify,
    deref,
    query,
    constraint: constraintOperator,
    symbol: symbolOperator,
    enumerate: enumerateOperator,
    inceptionPreprocessor,
    inception,
    pipe: pipeOperator,
    applyAll,
    sortBy
};
