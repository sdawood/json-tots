/* eslint-disable eqeqeq */
/* eslint-disable no-eq-null */

const jp = require('jsonpath');
const F = require('functional-pipelines');

module.exports = {
    isString: F.isString,
    escapeStringForRegex,
    tokenGenerator,
    tokenize,
    lazyTemplateTag,
    templatePlaceholders,
    lazyTemplate
};

function escapeStringForRegex(str) {
    const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
    if (typeof str !== 'string') {
        throw new TypeError(`Expected a string, received ${typeof str}`);
    }

    return str.replace(matchOperatorsRe, '\\$&');
}

function _tokenize(regex, str, tokenNames = [], $n = true) {
    regex = regex instanceof RegExp ? regex : new RegExp(regex);
    const result = {};
    let matches;
    while ((matches = regex.exec(str)) !== null) {
        const match = matches.shift();
        matches.reduce((acc, captureGroup, index) => {
            acc[tokenNames[index] || ($n ? `$${index + 1}` : match)] = captureGroup;
            return acc;
        }, result);
    }
    return result;
}

/**
 * When tokenizing there are two levels of capture groups matching
 * /g matches on the outside and list of capture groups on the inside
 * example: /{{(.*?)}} \/ {{(.*?)}}/g.exec('{{x.y}} / {{y.z}} - {{x.y}} / {{y.z}}')
 * @param strings
 * @param keys
 * @returns {function(...[*])}
 */
function * tokenGenerator(regex, str, {sequence = false} = {}) {
    regex = new RegExp(regex); // normalize string and regex args, also refresh exhausted regex
    const multi = regex.flags.includes('g');
    let matches = regex.exec(str);
    if (matches === null) return;
    let lastIndex;
    do {
        lastIndex = matches.index;
        const match = matches.shift();
        // yield* matches/*.filter(token => !!token)*/.map(token => ({match, token})); // if we filter out undefined capture groups when the regex matches empty string we shift capture group identifiers!
        if (sequence) { // WARNING: only use to get sequences of matches for interpolation purposes, don't use for strict capture group parser, capture group names/indexes might shift up
            // TODO: this iterator can use nested aggregation groupBy :: (match, cgindex) -> {x: [[cgi00, cgi01], [cgi10, cgi11]]}
            yield* matches.map((token, index) => ({match, token, cgi: index + 1}));
        } else {
            yield matches;
        }
        // eslint-disable-next-line no-unmodified-loop-condition
    } while (multi && (matches = regex.exec(str)) !== null && (matches.index !== lastIndex)); // avoid infinite loop if the regex (by design) matches empty string, exec would keep on returning the same match over and over
}

/**
 *
 * @param regex
 * @param str
 * @param tokenNames
 * @param $n
 * @param cgindex: capture group index
 * @param sequence
 * @returns {*}
 */
function tokenize(regex, str, {tokenNames = [], $n = true, cgindex = false, cgi0 = false, sequence = false} = {}) {
    if (sequence) {
        // interpolation, find all placeholders with the intention of later replacement, a placeholder might repeat, and there is no notion of $1 $2 as specific capture groups
        const tokenIter = F.iterator(tokenGenerator(regex, str, {sequence}), {indexed: true});
        return F.reduce((acc, [{match, token, cgi}, index]) => {
            if (!cgindex && token == null) return acc;
            cgi = cgi0 ? cgi - 1 : cgi;
            // since index shift, lookup of aliases is not straight forward unless matched pattern is known upfront

            const key = tokenNames[cgindex ? cgi : index] || ($n ? `$${(cgindex ? cgi : index + 1)}` : match);

            const incremental = $n && !cgindex;
            const groupByMatch = !$n;
            const groupByCgi = groupByMatch && cgindex;

            // effectively performing a double group by (match) (cgindex)
            if (acc[key]) {
                if (groupByCgi) {
                    if (acc[key][cgi]) {
                        acc[key][cgi] = [...acc[key][cgi], token];
                    } else {
                        acc[key][cgi] = [token];
                    }
                } else if (groupByMatch) {
                    acc[key] = [...acc[key], token];
                } else if ($n) {
                    acc[key] = token;
                } else {
                    throw new Error('WARNING: overwriting previous match');
                }
            } else if (groupByCgi) {
                acc[key] = [];
                acc[key][cgi] = [token];
            } else if (groupByMatch) {
                acc[key] = [token];
            } else /*if ($n)*/ {
                acc[key] = token;
            }
            return acc;
        }, () => ({}), tokenIter);
    } else {
        /**
         * currently this mode doesn't have the source (full-match)
         * capture groups oriented parser, with repeated multi-capture-group regex
         * with n slots (capture groups)
         * 1st match would be [cg1, undefined, undefined, ...]
         * 3nd match would be [undefined, undefined, cg3, ...]
         * ...
         * nth match would be [undefined, undefined, undefined, ..., cgn]
         **/

        const tokenIter = F.iterator(tokenGenerator(regex, str));
        return F.reduce((acc, matches) => {
            for (const [index, token] of matches.entries()) {
                if (token == null) continue;
                const key = tokenNames[index] || `$${index + 1}`;
                // acc[key] = token;
                acc[key] = acc[key] ? $n ? token : [...acc[key], token] : $n ? token : [token];
            }
            return acc;
        }, () => ({}), tokenIter);
    }
}


function lazyTemplateTag(strings, ...keys) {
    return (...values) => {
        const dict = values[values.length - 1] || {};
        const result = [strings[0]];
        keys.forEach((key, i) => {
            const value = Number.isInteger(key) ? values[key] : dict[key];
            result.push(value, strings[i + 1]);
        });
        return result.join('');
    };
}

function templatePlaceholders(template, {placeholder: {open = '${', close = '}'} = {}} = {}) {
    // const regex = /\${['"]?(.*?)['"]?}/g;
    const open_ = escapeStringForRegex(open);
    const _close = escapeStringForRegex(close);

    const regex = new RegExp(`${open_}['"]?(.*?)['"]?${_close}`, 'g');
    let matches;
    const mapping = {};
    // exec returns a single match, to get all matches you have to loop
    while ((matches = regex.exec(template)) !== null) {
        mapping[matches[1]] = matches[0];
    }
    if (!Object.keys(mapping).length) throw new Error(`Template has no parameters matching ${regex.source}`);
    return mapping;
}

function lazyTemplate(template, options) {
    const mapping = templatePlaceholders(template, options);
    return (parameters) => {
        for (const key in parameters) {
            if (mapping[key]) {
                const keyRegex = new RegExp(escapeStringForRegex(mapping[key]), 'g');
                template = template.replace(keyRegex, parameters[key]);
            }
        }
        return template;
    };
}
