const jp = require('jsonpath');
const F = require('functional-pipelines');
const sx = require('./strings');
const operators = require('./operators');

const placeholder = {
    full: /{([^{]*?)?{(.*?)}([^}]*)?}/g,
    // allowing for all valid jsonpath characters in #<tag>, making the path valid is currently the user responsibility, e.g. #x.y["z w"]["v.q"], standalone # uses path from context
    // ... | .2 inception (lens composition) - length 2, >>> | >2 for each application - length 2, %%% | %2 positional transform (zip transform) - length 2
    operators: /\s*(\.{1,}|\.\d{1,2}|>{1,}|>\d{1,2}|%{1,}|%\d{1,2})?\s*\|?\s*(\*{1,2})?\s*\|?\s*(:|#[a-zA-Z0-9_\-\$\.\[\]"\s]+)?\s*\|?\s*([!|\?](?:[=|~]\w+(?:\s*\:\s*["]?[a-zA-Z0-9_\s\-\$]*["]?)*)?)?\s*\|?\s*(\+\d*)?\s*/g, // https://regex101.com/r/dMUYpQ/20
    operatorNames: ['inception', 'enumerate', 'symbol', 'constraints', 'query'],
    pipes: /(?:\s*\|\s*)((?:[a-zA-Z0-9_\-\$]+|\*{1,2})(?:\s*\:\s*[a-zA-Z0-9_\s-\$]*)*)/g // https://regex101.com/r/n2qnj7/5
};

const rejectPlaceHolder = {open: '{>>{', close: '}<<}'};

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
    let ast = {source, value: null, '@meta': meta};

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
    let ast = {source: text, value: null, '@meta': meta};
    const regex = new RegExp(placeholder.full.source, 'g');
    const matches = sx.tokenize(regex, text, {$n: false, sequence: true, cgindex: true, cgi0: true});

    if (F.isEmptyValue(matches)) {
        ast.value = text;
        return F.reduced(ast);
    }

    return F.map(F.which(reph), F.iterator(matches, {indexed: true, kv: true}));
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

function renderStringNode(contextRef, {meta = 0, sources = {'default': {}}, tags = {}, tagHandlers = {}, functions = {}, args = {}, config} = {}) {
    const refList = rephs(contextRef.node);
    if (F.isReduced(refList)) {
        return {rendered: F.unreduced(refList).value};
    }

    const derefedList = F.map(operators.applyAll({meta, sources, tags, tagHandlers, functions, context: contextRef, config}), refList);
    const rendered = renderString(contextRef.node, derefedList);
    return {rendered, asts: derefedList};
}

const normalizeArgs = ({functions, args}) => ([fnPath, fnKey, fnName], data) => {
    const fnArgs = args[fnPath] || args[fnKey] || args[fnName];
    if (fnArgs === undefined) return [];

    const fnArgList = colls.isArray(fnArgs) ? fnArgs : [fnArgs];

    const argList = colls.map(arg => {
        return arg.path ? jp.value(data, arg.path) : arg.value !== undefined ? arg.value : arg;
    }, fnArgList);

    return argList;
};

function renderFunctionExpressionNode(contextRef, {meta = 0, sources = {'default': {}}, tags = {}, tagHandlers = {}, functions = {}, args = {}, config} = {}) {
    const missingFunctionError = sx.lazyTemplate('Error: No such builtin function: [${node}]');
    const evaluateArgs = normalizeArgs({functions, args});
    const node = contextRef.node;
    const [fnName, ...fnNames] = node.slice(1).split(regex.PIPE);
    const fn = functions[fnName] || (config.throws ? () => {
        throw new Error(missingFunctionError({node}));
    } : colls.lazy(missingFunctionError({node})));

    const pipeline = fnNames.length === 0 ? fn : colls.pipe(...[fn, ...colls.map(fnName => {
        return functions[fnName] || (config.throws ? () => {
            throw new Error(missingFunctionError({node}));
        } : colls.lazy(missingFunctionError({node})));
    }, fnNames)]);

    const fnArgKeys = [`$.${that.path.join('.')}`, that.path.pop(), fnName];
    const argList = evaluateArgs(fnArgKeys, data);

    return {rendered: F.reduced(pipeline(...argList))};
}

function transduception_(enumerable, {meta, sources, tags, tagHandlers, config} = {}) {
    // literal value, can't be used as origin document! inception ref should deref to a container ([] | {})
    meta = 4;
    const [inceptionNode] = enumerable;
    const ast = enumerable.metadata();


    /*
    Currently enumerable.metadata() returns result from rephs(inceptionNode)[0]
    //TODO: is it a desirable scenario to have the inception node containing multiple regex placeholders (rephs) ?
    const refList = rephs(inceptionNode);
    if (F.isReduced(refList)) {
        return [F.unreduced(refList).value];
    }
    const derefedList = F.map(operators.applyAll({meta, sources, tags, tagHandlers, context: {mediumContext: context, node: inceptionNode}, config}), refList);
    const derefed = derefedList.pop();
    */

    const derefed = operators.applyAll({meta, sources, tags, tagHandlers, context: {medium: ast.medium, node: inceptionNode}, config})(ast);
    // const isForEach = derefed.operators.enumerate !== undefined;
    // const flatten = derefed.operators.enumerate === '**' ? F.flatten : F.identity; // TODO: this is rudimentary flatten, *N should be covered, also flatten in Non-Inception context should work as expected

    let reduced;
    const op = derefed.operators.$inception;
    // if (isForEach) {
    //     const viewFrom = document => template => transform(template, {meta: meta, sources, tags, tagHandlers, config})(document);
    //     const viewFromFns = F.map(viewFrom, derefed.value);
    //
    //     reduced = F.map(template => F.map(fn => fn(template), viewFromFns), enumerable);
    // } else {
    //     const lens = template => document => transform(template, {meta: ++meta, sources, tags, tagHandlers, config})(document);
    //     const lenses = F.map(lens, enumerable);
    //     reduced = F.pipes(...lenses)(derefed.value);
    // }

    return [op(ast, enumerable)];
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
        return F.isReduced(refList) ? F.reduced(NONE) : refList[0]
    };

    const hasInception = ast => jp.value(ast, '$.operators.inception') ? ast : F.reduced(NONE);

    const partitionFn = F.composes(ast => {ast.medium = contextRef; return ast}, operators.inceptionPreprocessor, hasInception, hasReph0, isString);
    const stickyWhen = (x, _, ctx) => { ctx.n = x.$depth ? x.$depth : ctx.n; return x.$depth !== undefined};

    const partitionedGen = F.partitionBy(F.sticky(1, {when: stickyWhen, recharge: false})(partitionFn), contextRef.node);

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
