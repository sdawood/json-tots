const jp = require('jsonpath');
const F = require('functional-pipelines');
const uuid = require('uuid');

const sx = require('./strings');

const castingFunctionError = sx.lazyTemplate('Error: value: [${value}] is not a valid ${type}');

const asDate = (value) => new Date(value);
const asInt = (value, base) => parseInt(value, base || 10);
const asFloat = (value, base) => parseFloat(value, base || 10);
const asBool = (value) => value === 'true' ? true : value === 'false' ? false : null;
const asArray = (value, delimiter = '') => value.split(delimiter);

module.exports = {
    /* array */
    take: take => values => [...F.take(parseInt(take), values)],
    /* array/string/iterable */
    slice: F.slice,
    /* string */
    split: delimiter => str => str.split(delimiter),
    /* type casting */
    asDate,
    asInt,
    asFloat,
    asBool,
    asArray,

    /* mapping with reduced() support */
    of: key => o => o[key] !== undefined ? o[key] : F.reduced(o),
    has: path => o => (jp.value(o, path) !== undefined) ? o : F.reduced(o),
    flatten: F.flatten,
    isNaN: isNaN,
    // now: () => datetimeProvider.getTimestamp(),
    // nowAsISOString: () => datetimeProvider.getDateAsISOString(),
    uuid: () => uuid.v4(),
    hash: payload => new MD5().update(JSON.stringify(payload, null, 0)).digest('hex'),
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
    ellipsis: maxLen => str => `${str.slice(0, maxLen - 3)}...`,
    toNull: value => ['null'].includes(value ? value.toLowerCase() : value) ? null : value,
    trim: str => str.trim(),
    toLowerCase: value => value ? value.toLowerCase() : value,
    toUpperCase: value => value ? value.toUpperCase() : value,
    not: value => !value,
    equals: (source, target) => target === source,
    gte: (source, target) => target >= source,
    lte: (source, target) => target <= source,
    inList: (lst, source) => lst.includes(source),
    isEven: source => source % 2 === 0,
    matches: (source, target) => (new RegExp(target)).test(source)
};
