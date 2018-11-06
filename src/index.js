const xf = require('./transform');
const fp = require('./core/fp');

function transform(options, template, document) {
    console.log(JSON.stringify(options, null, 2));
    console.log(JSON.stringify(template, null, 2));
    console.log(JSON.stringify(document, null, 2));
}

const stagedTransform = fp.curryUntil(transform);

module.exports = stagedTransform;
