/* eslint-disable array-callback-return */

const traverse = require('traverse');
const jp = require('jsonpath');
const F = require('functional-pipelines');
const defaultConfig = {
    throws: false,
    nullifyMissing: true,
    operators: {
        constraints: {
            '?': {
                drop: true
            },
            '!': {
                nullable: true
            }
        }
    }
};
const bins = require('./core/builtins');
const {renderStringNode, renderFunctionExpressionNode, renderArrayNode, data: renderData} = require('./core/render');

/**
 * Transforms JSON document using a JSON template
 * @param template Template JSON
 * @param sources A map of alternative document-sources, including `default` source
 * @param tags Reference to a map that gets populated with Tags
 * @param functions A map of user-defined function, if name-collision occurs with builtin functions, user-defined functions take precedence
 * @param args A map of extended arguments to @function expressions, args keys are either functionName (if used only once), functionKey (if globally unique) or functionPath which is unique but ugliest option to write
 * @param config Allows to override defaultConfig
 * @param builtins A map of builtin functions, defaults to ./core/builtins.js functions
 * @returns {function(*=): *}
 */
const transform = (template, {meta = 0, sources = {'default': {}}, tags = {}, functions = {}, args = {}, config = defaultConfig, stages = []} = {}, {builtins = bins} = {}) => document => {
    let result;

    functions = {...bins, ...functions};

    const options = {
        meta,
        sources: {...sources, origin: document},
        tags,
        functions,
        args,
        config,
        stages
    };

    if (F.isString(template)) {
        ({rendered: result} = renderStringNode({node: template, path: ['$']}, options));
    } else {
        result = traverse(template).map(function (node) {
            const self = this;
            const contextRef = self;
            let rendered;
            let asts;

            if (F.isFunction(node)) {
                rendered = node(document);
            } else if (F.isString(node)) {
                if (node.startsWith('@')) {
                    ({rendered} = renderFunctionExpressionNode(contextRef, options, document));
                } else {
                    ({rendered, asts} = renderStringNode(contextRef, options));
                }
            } else if (F.isArray(node)) {
                ({rendered, asts} = renderArrayNode(contextRef, options));
            } else {
                rendered = node;
            }

            if (self.isRoot) return;

            if (rendered === undefined) {
                if (jp.value(config, '$.operators.constraints["?"].drop')) {
                    self.remove(true);
                } else {
                    self.update(null);
                }
            } else if (rendered === null) {
                if (jp.value(config, '$.operators.constraints["!"].nullable')) {
                    self.update(null);
                } else {
                    throw new Error(`Missing required attribute: [${jp.stringify(self.path)}: ${asts ? asts[0].source : ''}]`);
                }
            } else if (F.isReduced(rendered)) {
                self.update(F.unreduced(rendered), true); // stopHere, don't traverse children
            } else {
                self.update(rendered);
            }
        });
    }

    return result;
};


module.exports = {
    transform,
    data: {
        ...renderData,
        defaultConfig
    }
};
