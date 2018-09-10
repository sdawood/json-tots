'use strict';

const _ = require('lodash');

// JSON.stringify return empty object for Error otherwise
if (!('toJSON' in Error.prototype)) {
    Object.defineProperty(Error.prototype, 'toJSON', {
        value: function () {
            const alt = {};

            Object.getOwnPropertyNames(this).forEach(function (key) {
                alt[key] = this[key];
            }, this);

            return alt;
        },
        configurable: true,
        writable: true
    });
}

function log(...params) {
    console.log(...serialize(4, ...params));
}

function peek(...params) {
    log(...params);
    return params.length === 1 ? params[0] : params
}

function logLine(...params) {
    console.log(...serialize(0, ...params));
}


function error(...params) {
    console.error('Error:', ...serialize(4, ...params));
}

function serialize(indent, ...params) {
    return params.map(stringify(indent));
}

const stringify = indent => value => _.isString(value) ? value : JSON.stringify(value, null, indent);

const repeat = str => count => {
    function* generate() {
        while (count) {
            yield str;
            count--;
        }
    }
    return [...generate()].join('');
};

const line = (count, sym = '-') => console.log(repeat(sym)(count));

module.exports = {
    log,
    peek,
    error,
    repeat,
    logLine,
    line,
    time: label => console.time(label),
    timeEnd: label => console.timeEnd(label)
};
