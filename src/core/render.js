/* eslint-disable no-useless-escape */

const jp = require('jsonpath');
const F = require('functional-pipelines');
const sx = require('./strings');
const operators = require('./operators');

const Fb = require('./times');
const parser = require('./regex/parser');

const rejectPlaceHolder = {open: '{!!{', close: '}!!}'};

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
    const refList = parser.parse(contextRef.node);
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
        const refList = parser.parse(x);
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
    
    const {transform} = require('../transform'); // lazy require to break cyclic dependency
    const lols = F.map(
        iter => iter.metadata().$depth ? transduception(iter, options) : F.map(item => transform(item, options)(options.sources.origin), iter),
        partitionedGen
    );
    return {rendered: F.flatten(lols), asts: {}};
}

module.exports = {
    renderString,
    renderStringNode,
    renderFunctionExpressionNode,
    renderArrayNode,
    data: {
        placeholder: parser.fullPlaceholderRegex,
        rejectPlaceHolder
    }
};
