const parser = require('./parser');

describe.skip('scenario: Builds compound regex correctly for operators', () => {
    it('works', () => {
        const result = parser.operators;
        const expectedResultRegex = /\s*(\.\*|\.{2,}|\.\d{1,2}|>\*|>{2,}|>\d{1,2}|%\*|%{2,}|%\d{1,2})?\s*\|?\s*(\*{1,2})?\s*\|?\s*(:[a-zA-Z0-9_\-\$\.\[\]"\s]*|[#|@][a-zA-Z0-9_\-\$\.\[\]"\s]*)?\s*\|?\s*([!|\?](?:[=|~]\w+(?:\s*\:\s*["]?[a-zA-Z0-9_\s\-\$]*["]?)*)?)?\s*\|?\s*((?:\+|\-)\d*)?\s*/g; // https://regex101.com/r/dMUYpQ/32
        const expectedResult = expectedResultRegex.source;
        expect(result).toEqual(expectedResult);
    });
});

describe('scenario: Builds compound regex correctly for pipes', () => {
    it('works', () => {
        const result = parser.pipes;
        const expectedResultRegex = /(?:\s*\|\s*)((?:[a-zA-Z0-9_\-\$\.]+|\*{1,2})(?:\s*\:\s*[a-zA-Z0-9_\s-\$\.]*)*)/g; // https://regex101.com/r/n2qnj7/6
        const expectedResult = expectedResultRegex.source;
        expect(result).toEqual(expectedResult);
    });
});