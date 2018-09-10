const traverse = require('traverse');
const jp = require('jsonpath');
const F = require('functional-pipelines');
const sx = require('./core/strings');
const operators = require('./core/operators');
const defaultConfig = () => require('../config.json');
const bins = require('./core/builtins');
const logger = require('./util/logger');
const {renderString, renderStringNode, renderFunctionExpressionNode, renderArrayNode, data: renderData} = require('./core/render');

const debug = (...args) => logger.log(...args);

const transform = (template, {
                       meta = 0, sources = {'default': {}}, tags = {}, tagHandlers = {}, functions = {}, args = {}, config = defaultConfig()
                   } = {},
                   {builtins = bins} = {}) => document => {
    let counter = 1;
    let result;

    tagHandlers = {...bins.tagHandlers, ...tagHandlers};
    functions = {...bins, ...functions};

    const options = {
        meta,
        sources: {...sources, origin: document},
        tags,
        tagHandlers,
        functions,
        args,
        config
    };

    if (F.isString(template)) {
        ({rendered: result} = renderStringNode({node: template, path: ['$']}, options));
    } else {
        result = traverse(template).map(function (node) {
            debug('traverse :: ', counter++, this.path);
            const self = this;
            const contextRef = self;
            let rendered;
            let asts;

            if (F.isFunction(node)) {
                rendered = node(document);
            } else if (F.isString(node)) {
                if (node.startsWith('@')) {
                    ({rendered} = renderFunctionExpressionNode(contextRef, options));
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
        ...renderData
    }
};
