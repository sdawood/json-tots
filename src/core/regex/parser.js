const F = require('functional-pipelines');

const sx = require('../../../src/core/strings');

const fullPlaceholderRegex = /{([^{]*?)?{(.*?)}([^}]*)?}/gm;

const placeholder = {full: fullPlaceholderRegex};

const WS = '\\s*'; //'[\s\t\r\n]*';
const OWS = '\\s*\\|?\\s*'; //'[\s\t\r\n\|,;]*';
const SYMBOL = '[a-zA-Z0-9_\\-\\$\\.\\[\\]"\\s]*';
const SOURCE_NAME = '["]?[a-zA-Z0-9_\\s\\-\\$]*["]?';

const inception = `(\\.\\*|\\.{2,}|\\.\\d{1,2}|>\\*|>{2,}|>\\d{1,2}|%\\*|%{2,}|%\\d{1,2})?`;
const enumeration = `(\\*{1,2})?`;
const symbol = `(:${SYMBOL}|[#|@]${SYMBOL})?`;
const constraint = `([!|\\?](?:[=|~]${SYMBOL}(?:${WS}\\:${WS}${SOURCE_NAME})*)?)?`;
const query = '((?:\\+|\\-)\\d*)?';

const operators = `${WS}${inception}${OWS}${enumeration}${OWS}${symbol}${OWS}${constraint}${OWS}${query}${OWS}`;
const operatorsRegex = new RegExp(operators, 'g'); // consider multi line flag `m`, unicode `u` and sticky `y`
placeholder.operators = operatorsRegex;

placeholder.operatorNames = ['inception', 'enumerate', 'symbol', 'constraints', 'query'];

const PIPE_SEPARATOR = '\\s*\\|\\s*';
const FUNCTION_NAME = '[a-zA-Z0-9_\\-\\$\\.]+';
const SPREAD_OPERATOR = '\\*{1,2}';
const ARG_SEPARATOR = '\\s*\\:\\s*';
const ARG_NAME = '[a-zA-Z0-9_\\s-\\$\\.]*';

// `(?:\s*\|\s*)((?:[a-zA-Z0-9_\-\$\.]+|\*{1,2})(?:\s*\:\s*[a-zA-Z0-9_\s-\$\.]*)*)`
// /(?:\s*\|\s*)((?:[a-zA-Z0-9_\-\$\.]+|§*{1,2})(?:\s*\:\s*[a-zA-Z0-9_\s-\$\.]*)*)/
const pipes = `(?:${PIPE_SEPARATOR})((?:${FUNCTION_NAME}|${SPREAD_OPERATOR})(?:${ARG_SEPARATOR}${ARG_NAME})*)`; // https://regex101.com/r/n2qnj7/6
const pipesRegex = new RegExp(pipes, 'g'); // consider multi line flag `m`, unicode `u` and sticky `y`
placeholder.pipes = pipesRegex;
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

module.exports = {
    operatorsRegex,
    operators: operatorsRegex.source,
    pipesRegex,
    pipes: pipesRegex.source,
    fullPlaceholderRegex,
    fullPlaceholder: fullPlaceholderRegex.source,
    parse: rephs
};
