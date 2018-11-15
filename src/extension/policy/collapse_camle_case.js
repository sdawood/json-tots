/* eslint-disable camelcase */
const jp = require('jsonpath');
const _ = require('lodash');

const {jpify} = require('../../core/operators');

module.exports = (parent, child, tagPath, document) => {
    const tagPathLeaf = jp.paths(document, jpify(tagPath)).pop().pop();
    return _.snakeCase([parent, child, tagPathLeaf]);
};
