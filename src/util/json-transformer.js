/* eslint-disable array-callback-return,max-statements-per-line,no-unused-expressions,no-template-curly-in-string */
const _ = require('lodash');
const uuid = require('uuid');
const traverse = require('traverse');
const jp = require('jsonpath');
const MD5 = require('md5.js');

const colls = require('./collections');
const datetimeProvider = require('./datetime-provider');
const logger = require('./logger');
const sx = require('../core/strings');

const regex = {
    safeDot: /\.(?![\w\.]+")/,
    memberOrDescendant: /^[\[\.]/,
    PIPE: /\s*\|\s*/
};

const jpify2 = path => path.startsWith('$') ? path : regex.memberOrDescendant.test(path) ? `$${path}` : `$.${path}`;

const castingFunctionError = sx.lazyTemplate('Error: value: [${value}] is not a valid ${type}');

const builtinFns = {
    now: () => datetimeProvider.getTimestamp(),
    nowAsISOString: () => datetimeProvider.getDateAsISOString(),
    uuid: () => uuid.v4(),
    hash: payload => new MD5().update(JSON.stringify(payload, null, 0)).digest('hex'),
    toBool: value => ['true', 'yes', 'y'].includes(value ? value.toLowerCase() : value),
    toInteger: value => {
        const result = parseInt(value, 10);
        return _.isNaN(result) ? castingFunctionError({value, type: 'integer'}) : result;
    },
    toFloat: value => {
        const result = parseFloat(value, 10);
        return _.isNaN(result) ? castingFunctionError({value, type: 'float'}) : result;
    },
    toNull: value => ['null'].includes(value ? value.toLowerCase() : value) ? null : value,
    trim: str => str.trim(),
    toLowerCase: value => value ? value.toLowerCase() : value,
    toUpperCase: value => value ? value.toUpperCase() : value,
    not: value => !value,
    equals: (target, source) => target === source,
    inList: (lst, source) => lst.includes(source),
    isEven: source => source % 2 === 0,
    matches: (target, source) => (new RegExp(target)).test(source)
};

const normalizeArgs = ({functions, args}) => ([fnPath, fnKey, fnName], data) => {
    const fnArgs = args[fnPath] || args[fnKey] || args[fnName];
    if (fnArgs === undefined) return [];

    const fnArgList = colls.isArray(fnArgs) ? fnArgs : [fnArgs];

    const argList = colls.map(arg => {
        return arg.path ? jp.value(data, arg.path) : arg.value !== undefined ? arg.value : arg;
    }, fnArgList);

    return argList;
};

const transform = (template, {functions = {}, args = {}, throws = false, nullifyMissing = true} = {}, {builtins = builtinFns} = {}) => data => {
    if (colls.isEmptyValue(template)) return data;

    const missingFunctionError = sx.lazyTemplate('Error: No such builtin function: [${node}]');
    const evaluateArgs = normalizeArgs({functions, args});

    const fns = {...builtins, ...functions};
// eslint-disable-next-line prefer-arrow-callback
    return traverse(template).map(function (node) {
        const that = this;
        if (that.isRoot || !_.isString(node)) return;

        if (node.startsWith('@')) {
            const [fnName, ...fnNames] = node.slice(1).split(regex.PIPE);
            const fn = fns[fnName] || (throws ? () => {
                throw new Error(missingFunctionError({node}));
            } : colls.lazy(missingFunctionError({node})));

            const pipeline = fnNames.length === 0 ? fn : colls.pipe(...[fn, ...colls.map(fnName => {
                return fns[fnName] || (throws ? () => {
                    throw new Error(missingFunctionError({node}));
                } : colls.lazy(missingFunctionError({node})));
            }, fnNames)]);

            const fnArgKeys = [`$.${that.path.join('.')}`, that.path.pop(), fnName];
            const argList = evaluateArgs(fnArgKeys, data);

            that.update(pipeline(...argList), true);
        } else if (node.startsWith('$')) {
            const [path, ...fnNames] = node.split(regex.PIPE);
            let value = jp.value(data, path);
            value = value === undefined ? (nullifyMissing ? null : value) : value;
            const pipeline = fnNames.length === 0 ? colls.identity : colls.pipe(...colls.map(fnName => {
                return fns[fnName] || (throws ? () => {
                    throw new Error(missingFunctionError({node}));
                } : colls.lazy(missingFunctionError({node})));
            }, fnNames));
            value = pipeline(value);
            that.update(value); // if path is not found in data, the key would disappear upon JSON.stringify the result.
        }
    });
};

function sortBy(sortBy, {mapping = v => v, asc = true} = {}) {
    return (a, b) => {
        if (!asc) [a, b] = [b, a];
        return +(mapping(a[sortBy]) > mapping(b[sortBy])) || +(mapping(a[sortBy]) === mapping(b[sortBy])) - 1;
    };
}

function allNodes(path = '$..*', data) {
    return jp
        .nodes(data, path)
        .map(({path, value}) => ({path: jp.stringify(path), value}));
}

const all = (acc, item) => acc && item;
const any = (acc, item) => acc || item;
const transducer = colls.mapTransformer(item => _.values(item).pop());

const reducers = {
    ALL: lst => colls.reduce(transducer(all), () => true, lst),
    ANY: lst => colls.reduce(transducer(any), () => false, lst)
};


const filter = (template, {functions = {}, args = {}, throws = false, nullifyMissing = true} = {}, {builtins = builtinFns} = {}) => data => {
    //@TODO: OPTIMIZATION: if we use the transform above first, we would not have a chance to short-circuit ALL & ANY expressions.
    //@TODO: A more effecient way is to reduce the children of a rule node while traversing the tree depth first
    // Goal is to have the filtering engine supporting arbitrary nesting of ALL & ANY blocks, serving as a JSON flavored DSL for rules/policies.
    const rules = transform(template, {functions, args, throws, nullifyMissing}, {builtins})(data);

    const ruleNodes = [
        ...allNodes('$..ANY', rules)
            .map(entry => ({...entry, operator: 'ANY'})),
        ...allNodes('$..ALL', rules)
            .map(entry => ({...entry, operator: 'ALL'}))]
        .sort(sortBy('path', {asc: false})); // depth first

    logger.log({ruleNodes});
    for (const {operator, path, value} of ruleNodes) {
        jp.value(rules, path, reducers[operator](value));
        // logger.log({result});
    }

    return _.values(rules).pop();
};

module.exports = {
    transform,
    builtinFns,
    filter
};
