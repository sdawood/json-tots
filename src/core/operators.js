// const curry = require('curry');
const jp = require('jsonpath')
const F = require('functional-pipelines')
const bins = require('./builtins');
const sx = require('./strings');

const sortBy = (sortBy, {mapping = v => v, asc = true} = {}) => {
    return (a, b) => {
        if (!asc) [a, b] = [b, a];
        return +(mapping(a[sortBy]) > mapping(b[sortBy])) || +(mapping(a[sortBy]) === mapping(b[sortBy])) - 1;
    };
};

const regex = {
    safeDot: /\.(?![\w\.]+")/,
    memberOrDescendant: /^[\[\.]/,
    fnArgsSeparator: /\s*:\s*/
};

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
        const regex = /\+(\d*)/;
        let {take} = sx.tokenize(regex, ast.operators.query, {tokenNames: ['take']});
        queryOp = bins.take(take);
    }
    // return F.withOneSlot(F.take)(take, F.__);
    return {...ast, '@meta': meta, value: queryOp(ast.value)};
};

const constraints = ({sources, tagHandlers, config}) => (ast, {meta = 2} = {}) => {
    const ops = {
        '?': ast => (_, defaultSource = 'default', defaultValue) => ast.value !== undefined ? ast : (defaultValue !== undefined ? {
            ...ast,
            value: defaultValue
        } : F.compose(query, deref(sources))(ast, {meta, source: defaultSource})),
        '!': ast => (isAltLookup, altSource, ...args) => {
            let result = ast;
            if (isAltLookup) {
                result = !F.isEmptyValue(altSource) ? F.compose(query, deref(sources))(ast, {
                    meta,
                    source: altSource
                }) : {...result, value: null};
                const [defaultValue] = args;
                result = result.value !== undefined ? result : (
                    defaultValue !== undefined ? {
                        ...result,
                        value: defaultValue
                    } : {
                        ...result, value: null
                    }
                )
            } else {
                result = {
                    ...result,
                    value: (altSource && tagHandlers[altSource]) ? tagHandlers[altSource](ast.value, ...args) : null
                };
            }
            return result;
        }
    };

    let [op, eq, ...app] = ast.operators.constraints;
    app = (eq && eq !== '=') ? [eq, ...app] : app; // if first char is not = put it back with the `application` string
    const args = eq ? F.pipes(bins.split(':'), bins.take(2), lst => F.map(bins.trim, lst))(app.join('')) : [];
    const result = ops[op](ast)(eq === '=', ...args);

    return {...result, '@meta': meta};
};

const constraintsOperator = ({sources, tagHandlers}) => F.composes(constraints({
    sources,
    tagHandlers
}), bins.has('$.operators.constraints'));

const symbol = ({tags, context}) => (ast, {meta = 2} = {}) => {
    const ops = {
        ':': ast => {throw new Error('Not Implemented Yet: [symbol(:)]');},
        '#': ast => tag => {
            const path = F.isEmptyValue(tag) ? jp.stringify(context.path) : jpify(tag);
            jp.value(tags, path, ast.value);
            return {...ast, tag: path};
        }
    };

    const [op, ...tag] = ast.operators.symbol;
    const result = ops[op](ast)(tag.join('').trim());
    return {...result, '@meta': meta};
};

const symbolOperator = ({tags, context}) => F.composes(symbol({tags, context}), bins.has('$.operators.symbol'));

const enumerate = (ast, {meta = 4} = {}) => {
    const ops = {
        '*': ast => ({...ast, value: [...F.iterator(ast.value)]}),
        '**': ast => ({...ast, value: [...F.iterator(ast.value, {indexed: true, kv: true})]}) // TODO: do scenarios of ** python style k/v pairs expansion fit with jsonpath?
    };

    const [i, ik = ''] = ast.operators.enumerate;
    const result = ops[i + ik](ast);
    return {...result, '@meta': meta};
};

const enumerateOperator = F.composes(enumerate, bins.has('$.operators.enumerate'));

const pipe = ({functions}) => (ast, {meta = 5} = {}) => {
    // console.log('INSIDE PIPE OPERATOR')
    /*
    * example: pipes: { '$1': 'toInt', '$2': 'isEven', '@meta': 3 }
    */
    const pipes = ast.pipes;
    const fnTuples = [...
        F.filter(
            pair => pair[0].startsWith('$'),
            F.iterator(pipes, {indexed: true, kv: true})
        )
    ]
        .sort(sortBy(0));
    // ordered [['$1', 'toInt:arg1:arg2'], ['$2', 'isEven:arg1:arg2']]
    const fnPipeline = F.map(([_, fnExpr]) => {
        const [fnName, ...args] = fnExpr.split(regex.fnArgsSeparator);

        console.log({functions});

        if (!fnName in functions) {
            throw new Error(`could not resolve function name [${fnName}]`)
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
        let phIndex = args.indexOf('__');
        let fn = functions[fnName];

        if (phIndex > 0) {
            args[phIndex] = F.__;
            fn = F.oneslot(functions[fnName]);
        }

        return args.length ? fn(...args) : fn;
    }, fnTuples);

    return {...ast, '@meta': meta, value: F.pipes(...fnPipeline)(ast.value)};
};

const pipeOperator = ({functions}) => F.composes(pipe({functions}), bins.has('$.pipes'));

const applyAll = ({meta, sources, tags, tagHandlers, functions, context, config}) => F.composes(
    pipeOperator({functions}),
    enumerateOperator,
    symbolOperator({tags, context}),
    constraintsOperator({sources, tagHandlers, config}),
    query,
    deref(sources)
);

/**
 * op = [ .+ | .N | >+ | >N | %+ | %N ]
 * .. : lens composition inception
 * >> : for each child, apply transform with leader node
 * %% : zip transform, positional template from leader node renders child template at the same position
 * @param ast
 * @returns {{$inception, $depth: *}}
 */
const inception = ({meta, sources, tags, tagHandlers, context, config}) => (ast, enumerable, {meta = 5}) => {
    const ops = {
        '.': (ast, enumerable, {meta, sources, tags, tagHandlers, context, config}) => {
            const lens = template => document => transform(template, {meta: ++meta, sources, tags, tagHandlers, config})(document);
            const lenses = F.map(lens, enumerable);
            return {...ast, value: F.pipes(...lenses)(ast.value)};
        },
        '>': (ast, enumerable, {meta, sources, tags, tagHandlers, context, config}) => {
            const viewFrom = document => template => transform(template, {meta, sources, tags, tagHandlers, config})(document);
            const viewFromFns = F.map(viewFrom, ast.value);
            return {...ast, value: F.map(template => F.map(fn => fn(template), viewFromFns), enumerable)};
        },
        '%': (ast, enumerable, {meta, sources, tags, tagHandlers, context, config}) => {throw new Error('Not Implemented Yet: [inception(%)]');}
    };

    let {$inception, $depth} = ast;
    let opFn;
    if ($inception !== undefined) {
        $depth = $depth !== undefined ? $depth : 0;
        opFn = ops[$inception];
    } else {
        const [op, repeat, ...rest] = ast.operators.inception;
        $depth = repeat !== op ? (repeat ? parseInt([repeat, ...rest].join(''), 10) : Number.POSITIVE_INFINITY) : rest.length + 1; // .|>|% consumes the rest of the array, i.e. partitionBy(sticky(POSITIVE_INFINITY))
        opFn = ops[op];
    }

    const result = opFn(ast, enumerable);
    return {...result, $depth};
};

const inceptionPreprocessor = ast => {
    const [op, repeat, ...rest] = ast.operators.inception;
    const $depth = repeat !== op ? (repeat ? parseInt([repeat, ...rest].join(''), 10) : Number.POSITIVE_INFINITY) : rest.length + 1;
    return {...ast, $inception: op, $depth};
};

const inceptionOperator = ({meta, sources, tags, tagHandlers, context, config}) => F.composes(inception({meta, sources, tags, tagHandlers, context, config}), bins.has('$.operators.inception'));

module.exports = {
    deref,
    query,
    constraints: constraintsOperator,
    symbol: symbolOperator,
    enumerate: enumerateOperator,
    inceptionPreprocessor,
    inception: inceptionOperator,
    pipe: pipeOperator,
    applyAll,
    sortBy,
};
