/* eslint-disable no-useless-escape */

const jp = require('jsonpath');
const F = require('functional-pipelines');
const sx = require('./strings');
const operators = require('./operators');

const placeholder = {
    full: /{([^{]*?)?{(.*?)}([^}]*)?}/g,
    // allowing for all valid jsonpath characters in #<tag>, making the path valid is currently the user responsibility, e.g. #x.y["z w"]["v.q"], standalone # uses path from context
    // ... | .2 inception (lens composition) - length 2, >>> | >2 for each application - length 2, %%% | %2 positional transform (zip transform) - length 2
    operators: /\s*(\.\*|\.{2,}|\.\d{1,2}|>\*|>{2,}|>\d{1,2}|%\*|%{2,}|%\d{1,2})?\s*\|?\s*(\*{1,2})?\s*\|?\s*(:[a-zA-Z0-9_\-\$\.\[\]"\s]*|#[a-zA-Z0-9_\-\$\.\[\]"\s]*)?\s*\|?\s*([!|\?](?:[=|~]\w+(?:\s*\:\s*["]?[a-zA-Z0-9_\s\-\$]*["]?)*)?)?\s*\|?\s*((?:\+|\-)\d*)?\s*/g, // https://regex101.com/r/dMUYpQ/25
    operatorNames: ['inception', 'enumerate', 'symbol', 'constraints', 'query'],
    pipes: /(?:\s*\|\s*)((?:[a-zA-Z0-9_\-\$]+|\*{1,2})(?:\s*\:\s*[a-zA-Z0-9_\s-\$]*)*)/g // https://regex101.com/r/n2qnj7/5
};

const rejectPlaceHolder = {open: '{!!{', close: '}!!}'};

/**
 * regex place holder, a.k.a reph parser
 *
 * NOTE: the source placeholder can be repeated within the template-string, e.g. "{{x.y}} = {{x.y}}"
 * reph() would consume one only, effectively optimizing by removing the need to deref twice within the same scope
 * later when the dereffed value is replaced in the string, a //g regex is used and would cover all identical occurrences
 *
 * @param source
 * @param operators
 * @param path
 * @param pipes
 * @param meta
 * @returns {*}
 */
const reph = ([source, [[operators] = [], [path] = [], [pipes] = []] = []] = [], meta = 0) => {
    const ast = {source, value: null, '@meta': meta};

    if (F.isEmptyValue(path)) {
        ast.value = source;
        return F.reduced(ast);
    }

    ast['@meta']++;

    if (operators) {
        operators = sx.tokenize(placeholder.operators, operators, {tokenNames: placeholder.operatorNames});
        operators['@meta'] = ++ast['@meta'];
        ast.operators = operators;
    }

    if (pipes) {
        pipes = sx.tokenize(placeholder.pipes, pipes, {sequence: true});
        pipes['@meta'] = ++ast['@meta'];
        ast.pipes = pipes;
    }
    return {...ast, path};
};

function rephs(text, meta = 0) {
    const ast = {source: text, value: null, '@meta': meta};
    const regex = new RegExp(placeholder.full.source, 'g');
    const matches = sx.tokenize(regex, text, {$n: false, sequence: true, cgindex: true, cgi0: true});

    if (F.isEmptyValue(matches)) {
        ast.value = text;
        return F.reduced(ast);
    }

    return F.map(reph, F.iterator(matches, {indexed: true, kv: true}));
}

function renderString(node, derefedList) {
    let rendered;
    if (derefedList.length === 1 && derefedList[0].source === node) {
        rendered = derefedList[0].value; // stand alone '{{path}}' expands to value, without toString conversion
    } else {
        const replace = (acc, {source, value}) => acc.replace(new RegExp(sx.escapeStringForRegex(source), 'g'), value !== undefined ? value : '');
        rendered = F.reduce(replace, () => node, derefedList);
    }
    return rendered;
}

function renderStringNode(contextRef, {meta = 0, sources = {'default': {}}, tags = {}, functions = {}, args = {}, config} = {}) {
    const refList = rephs(contextRef.node);
    if (F.isReduced(refList)) {
        return {rendered: F.unreduced(refList).value};
    }

    const derefedList = F.map(operators.applyAll({
        meta,
        sources,
        tags,
        functions,
        context: contextRef,
        config
    }), refList);
    const rendered = renderString(contextRef.node, derefedList);
    return {rendered, asts: derefedList};
}

const normalizeArgs = ({functions, args}) => ([fnPath, fnKey, fnName], data) => {
    const fnArgs = args[fnPath] || args[fnKey] || args[fnName];
    if (fnArgs === undefined) return [];

    const fnArgList = F.isArray(fnArgs) ? fnArgs : [fnArgs];

    const argList = F.map(arg => {
        return arg.path ? jp.value(data, arg.path) : arg.value !== undefined ? arg.value : arg;
    }, fnArgList);

    return argList;
};

function renderFunctionExpressionNode(contextRef, {meta = 0, sources = {'default': {}}, tags = {}, functions = {}, args = {}, config} = {}, document) {
    // eslint-disable-next-line no-template-curly-in-string
    const missingFunctionError = sx.lazyTemplate('Error: No such builtin function: [${node}]');
    const evaluateArgs = normalizeArgs({functions, args});
    const node = contextRef.node;
    const [fnName, ...fnExprs] = node.slice(1).split(operators.regex.PIPE);
    const fn = functions[fnName] || (config.throws ? () => {
        throw new Error(missingFunctionError({node}));
    } : F.lazy(missingFunctionError({node})));

    // const pipeline = fnNames.length === 0 ? fn : F.pipe(...[fn, ...F.map(fnName => {
    //     return functions[fnName] || (config.throws ? () => {
    //         throw new Error(missingFunctionError({node}));
    //     } : F.lazy(missingFunctionError({node})));
    // }, fnNames)]);

    const fnPipeline = F.pipes(...[fn,
        ...F.map(fnExpr => {
            const [fnName, ...args] = fnExpr.split(operators.regex.fnArgsSeparator);

            if (!(fnName in functions)) {
                throw new Error(`could not resolve function name [${fnName}]`); // @TODO: Alternatives to throwing inside a mapping!!!!
            }

            const phIndex = args.indexOf('__');
            let fn = {...functions, '*': operators.flatten, '**': operators.doubleFlatten}[fnName];

            if (phIndex > 0) {
                args[phIndex] = F.__;
                fn = F.oneslot(functions[fnName]);
            }

            return args.length ? fn(...args) : fn;
        }, fnExprs)
    ]);

    const fnArgKeys = [`$.${contextRef.path.join('.')}`, contextRef.path.pop(), fnName];
    const argList = evaluateArgs(fnArgKeys, document);

    return {rendered: F.reduced(fnPipeline(...argList))};
}

function transduception(enumerable, options) {
    const ast = enumerable.metadata();
    return operators.inception(options)(ast, enumerable);
}

function renderArrayNode(contextRef, options) {
    const NONE = {};
    const isString = x => F.isString(x) ? x : F.reduced(NONE);
    const hasReph0 = x => {
        const refList = rephs(x);
        return F.isReduced(refList) ? F.reduced(NONE) : refList[0];
    };

    const hasInception = ast => jp.value(ast, '$.operators.inception') ? ast : F.reduced(NONE);

    const partitionFn = F.composes(ast => {
        ast.medium = contextRef;
        return ast;
    }, operators.inceptionPreprocessor, hasInception, hasReph0, isString);
    const stickyWhen = (x, _, ctx) => {
        ctx.n = x.$depth ? x.$depth : ctx.n;
        return x.$depth !== undefined;
    };

    const partitionedGen = F.partitionBy(F.sticky(1, {
        when: stickyWhen,
        recharge: false
    })(partitionFn), contextRef.node);

    // console.log([...partitionedGen].map(it => ({metadata: it.metadata(), data: JSON.stringify([...it])})));

    const {transform} = require('../transform'); // lazy require to break cyclic dependency
    const lols = F.map(
        iter => iter.metadata().$depth ? transduception(iter, options) : F.map(item => transform(item, options)(options.sources.origin), iter),
        partitionedGen
    );
    return {rendered: F.flatten(lols), asts: {}};
}

module.exports = {
    reph,
    rephs,
    renderString,
    renderStringNode,
    renderFunctionExpressionNode,
    renderArrayNode,
    data: {
        placeholder,
        rejectPlaceHolder
    }
};
