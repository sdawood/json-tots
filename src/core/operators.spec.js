const F = require('./functional-pipelines');
const O = require('./operators');

let {slice, split, of, has} = require('./builtins');
slice = F.which(slice);
split = F.which(split);
of = F.which(of);
has = F.which(has);

describe('operators', () => {
    describe('reduced', () => {

    });
    describe('query', () => {
        it('gracefully handles no parameters', () => {
            const operatorStr = '?';
            let result = F.pipes(slice(1), split('='), slice(1), of(0))(operatorStr);
            expect(result).toEqual([]);
            result = F.pipes(slice(1), split('='), slice(1), of(0), split(':'))(operatorStr);
            expect(result).toEqual([]);
        });
        it('extracts the parameters', () => {
            const operatorStr = '?=default:10:20:30';
            const result = F.pipes(slice(1), split('='), slice(1), of(0), split(':'))(operatorStr);
            expect(result).toEqual(["default", "10", "20", "30"]);
        })
    });
    describe('constraints', () => {
        it('gracefully handles no parameters', () => {
            const operatorStr = '!';
            let result = O.constraints(operatorStr);
            expect(result).toEqual([]);
            result = F.pipes(slice(1), split('='), slice(1), of(0), split(':'))(operatorStr);
            expect(result).toEqual([]);
        });
        it('extracts the parameters', () => {
            const operatorStr = '?=default:10:20:30';
            const result = F.pipes(slice(1), split('='), slice(1), of(0), split(':'))(operatorStr);
            expect(result).toEqual(["default", "10", "20", "30"]);
        })
    });
    describe('symbol', () => {

    });
    describe('enumerate', () => {

    });
    describe('inception', () => {

    });
});