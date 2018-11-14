const jp = require('jsonpath');
const _ = require('lodash');

const {jpify} = require('../../core/operators');

module.exports = (template, {path, tag, source, templatePath, tagPath}) => (document) => {
    const parentNodePath = jp.paths(template, path).pop();
    const [parent, child] = parentNodePath.slice(-2);
    const tagPathLeaf = jp.paths(document, jpify(tagPath)).pop().pop();
    const newPath = _.snakeCase([parent, child, tagPathLeaf]);
    // transplant under new path
    templatePath = jp.stringify(parentNodePath.slice(0, -2).concat([newPath]));
    jp.value(template, templatePath, jp.value(template, path));
    // unset original path
    jp.value(template, path, undefined);
    return {template, templatePath};
};
