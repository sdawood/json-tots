/* eslint-disable no-magic-numbers */
const jp = require('jsonpath');
const F = require('functional-pipelines');
const uuid = require('uuid');
const md5 = require('md5');

const sx = require('./strings');

// eslint-disable-next-line no-template-curly-in-string
const castingFunctionError = sx.lazyTemplate('Error: value: [${value}] is not a valid ${type}');

module.exports = {
    take: take => values => [...F.take(parseInt(take, 10) || Number.POSITIVE_INFINITY, values)],
    skip: skip => values => [...F.skip(parseInt(skip, 10) || 0, values)],
    slice: F.slice,
    split: delimiter => str => str.split(delimiter),
    asDate: (value) => new Date(value),
    asInt: (value, base = 10) => parseInt(value, base),
    asFloat: (value, base = 10) => parseFloat(value, base),
    asBool: value => value === 'true' ? true : value === 'false' ? false : null,
    asArray: (value, delimiter = '') => value.split(delimiter),
    orNull: value => value || null,
    of: key => o => o[key] !== undefined ? o[key] : F.reduced(o),
    has: path => o => (jp.value(o, path) !== undefined) ? o : F.reduced(o),
    flatten: F.flatten,
    doubleFlatten: enumerable => F.flatten(F.map(F.flatten, enumerable)),
    isNaN,
    now: () => new Date(),
    nowAsISO6601: () => new Date().toISOString(),
    nowAsDateString: () => new Date().toDateString(),
    // nowAsFormat:
    uuid: () => uuid.v4(),
    hash: payload => md5(JSON.stringify(payload, null, 0)),
    toBool: value => ['true', 'yes', 'y'].includes(value ? value.toLowerCase() : value),
    toInteger: value => {
        const result = parseInt(value, 10);
        return isNaN(result) ? castingFunctionError({value, type: 'integer'}) : result;
    },
    toFloat: value => {
        const result = parseFloat(value, 10);
        return isNaN(result) ? castingFunctionError({value, type: 'float'}) : result;
    },
    toString: value => value.toString(),
    stringify: (value, keys = null, indent = 2) => JSON.stringify(value, keys, indent),
    ellipsis: maxLen => str => `${str.slice(0, maxLen - 3)}...`,
    toNull: value => ['null', 'nil'].includes(value ? value.toLowerCase() : value) ? null : value,
    trim: str => str.trim(),
    toLowerCase: value => value ? value.toLowerCase() : value,
    toUpperCase: value => value ? value.toUpperCase() : value,
    not: value => !value,
    equals: source => target => target === source,
    gt: source => target => target > source,
    gte: source => target => target >= source,
    lt: source => target => target < source,
    lte: source => target => target <= source,
    inList: lst => target => JSON.parse(lst).includes(target),
    isEven: source => source % 2 === 0,
    isOdd: source => source % 2 !== 0,
    add: source => target => parseFloat(source, 10) + target,
    sub: source => target => target - parseFloat(source, 10),
    div: source => target => target / parseFloat(source, 10),
    remainder: source => target => target / parseFloat(source, 10),
    pow: source => target => target ** parseFloat(source, 10),
    mul: source => target => parseFloat(source, 10) * target,
    matches: source => target => (new RegExp(target)).test(source),
    reducer: F.reduced,
    unreduced: F.unreduced,
    done: F.reduced,
    undone: F.unreduced
};
