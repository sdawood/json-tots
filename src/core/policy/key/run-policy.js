/* eslint-disable camelcase */
const jp = require('jsonpath');

const runPolicy = (keyPolicy, template, document, upwards = 2) => ({path, tag, source, templatePath, tagPath}) => {
    const parentNodePath = jp.paths(template, path).pop();
    const [parent, child] = parentNodePath.slice(-upwards);
    const newPath = keyPolicy(parent, child, tagPath, document);
    // transplant under new path
    templatePath = jp.stringify(parentNodePath.slice(0, -upwards).concat([newPath]));
    jp.value(template, templatePath, jp.value(template, path));
    // unset original path
    jp.value(template, path, undefined);
    return {template, templatePath};
};

module.exports = {
    runPolicy
};
