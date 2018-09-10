jest.disableAutomock();
jest.mock('uuid');
jest.mock('./datetime-provider');

const _ = require('lodash');

const uuid = require('uuid');
const datetimeProvider = require('./datetime-provider');
const colls = require('./collections');

const mockTimestamp = '2017-11-29T05:53:07.337Z';
const mockUUIDs = [
    'a6e47cfa-5a8d-4da4-8c8d-4609454460ac',
    '654aaf4c-2ec0-479d-9a00-1cf7dd64c8c7',
    '706d3b8e-05a8-4acf-a63b-b9643b4701f6'
];

const transformer = require('./json-transformer');

const templateNoOp = {
    int: 1,
    float: 1.5,
    string: 'hello',
    array: [{a: {b: {c: 1}}}],
    nil: null,
    truthy: true,
    falsey: false
};

const templateNebula = {
    id: '@uuid',
    type: '$.recordType',
    attributes: {
        triggeredBy: '$.triggeredBy',
        version: 1,
        source: {
            system: '$.bucket',
            filename: '$.key',
            rownumber: '@counter',
            sourceEnvironment: '$.sourceEnvironment'
        },
        payload: '$.payload',
        sentAt: '@nowAsISOString'
    }
};

const dataNebula = {
    recordType: 'MOCK_RECORDTYPE',
    triggeredBy: 'MOCK_TRIGGEREDBY',
    bucket: 'MOCK_BUCKET',
    key: 'MOCK_KEY',
    sourceEnvironment: 'MOCK_SOURCEENVIRONMENT',
    payload: {name: 'MOCK_PAYLOAD', details: {a: 1, b: 2}}
};

const expectedRecordsNebula = [
    {
        id: mockUUIDs[0],
        type: dataNebula.recordType,
        attributes: {
            triggeredBy: dataNebula.triggeredBy,
            version: 1,
            source: {
                system: dataNebula.bucket,
                filename: dataNebula.key,
                rownumber: 1,
                sourceEnvironment: dataNebula.sourceEnvironment
            },
            payload: dataNebula.payload,
            sentAt: mockTimestamp
        }
    },
    {
        id: mockUUIDs[1],
        type: dataNebula.recordType,
        attributes: {
            triggeredBy: dataNebula.triggeredBy,
            version: 1,
            source: {
                system: dataNebula.bucket,
                filename: dataNebula.key,
                rownumber: 2,
                sourceEnvironment: dataNebula.sourceEnvironment
            },
            payload: dataNebula.payload,
            sentAt: mockTimestamp
        }
    },
    {
        id: mockUUIDs[2],
        type: dataNebula.recordType,
        attributes: {
            triggeredBy: dataNebula.triggeredBy,
            version: 1,
            source: {
                system: dataNebula.bucket,
                filename: dataNebula.key,
                rownumber: 3,
                sourceEnvironment: dataNebula.sourceEnvironment
            },
            payload: dataNebula.payload,
            sentAt: mockTimestamp
        }
    }
];


describe('json-transformer', () => {
    const clearMocks = () => {
        uuid.v4.mockReset();
        datetimeProvider.getDateAsISOString.mockClear();
    };

    beforeEach(() => {
        clearMocks();
        uuid.v4
            .mockReturnValueOnce(mockUUIDs[0])
            .mockReturnValueOnce(mockUUIDs[1])
            .mockReturnValueOnce(mockUUIDs[2]);
        datetimeProvider.getDateAsISOString.mockReturnValue(mockTimestamp);
    });

    describe('transform', () => {

        it('no-op transformation if leafs are not $path', () => {
            expect(transformer.transform(templateNoOp)({})).toEqual(templateNoOp);
        });

        it('successfully deref jsonpath leafs and evaluate builtins and user defined function by @name', () => {
            let counter = 1;
            const counterFn = () => counter++;
            expect(transformer.transform(templateNebula, {functions: {'counter': counterFn}})(dataNebula)).toEqual(expectedRecordsNebula[0]);
            expect(transformer.transform(templateNebula, {functions: {'counter': counterFn}})(dataNebula)).toEqual(expectedRecordsNebula[1]);
            expect(transformer.transform(templateNebula, {functions: {'counter': counterFn}})(dataNebula)).toEqual(expectedRecordsNebula[2]);
        });

        it('when a path does not exist, if nullifyMissing = true, value = null', () => {
            let counter = 1;
            const counterFn = () => counter++;

            const templateNebulaClone = _.cloneDeep(templateNebula);
            templateNebulaClone.missingPathKey = '$.path.does.not.exist';
            const expectedRecordWithNull = _.cloneDeep(expectedRecordsNebula[0]);
            expectedRecordWithNull.missingPathKey = null;
            expect(transformer.transform(templateNebulaClone, {
                functions: {'counter': counterFn},
                nullifyMissing: true
            })(dataNebula)).toEqual(expectedRecordWithNull);
        });

        it('when a path does not exist, if nullifyMissing = false, key is removed', () => {
            let counter = 1;
            const counterFn = () => counter++;

            const templateNebulaClone = _.cloneDeep(templateNebula);
            templateNebulaClone.missingPathKey = '$.path.does.not.exist';
            expect(transformer.transform(templateNebulaClone, {
                functions: {'counter': counterFn},
                nullifyMissing: false
            })(dataNebula)).toEqual(expectedRecordsNebula[0]);
        });

        it('when a function name can not be resolved, does not throw if throws = false', () => {
            const expectedErrorRecordNebula = _.cloneDeep(expectedRecordsNebula[0]);
            expectedErrorRecordNebula.attributes.source.rownumber = 'Error: No such builtin function: [@counter]';
            expect(transformer.transform(templateNebula, {functions: {throws: false}})(dataNebula)).toEqual(expectedErrorRecordNebula);
        });

        it('when a function name can not be resolved, throws if throws = true', () => {
            const expectedErrorRecordNebula = _.cloneDeep(expectedRecordsNebula[0]);
            expectedErrorRecordNebula.attributes.source.rownumber = 'Error: No such builtin function: [@counter]';

            function transformThrows() {
                transformer.transform(templateNebula, {throws: true})(dataNebula); // Note: You must wrap the code in a function, otherwise the error will not be caught and the assertion will fail. https://facebook.github.io/jest/docs/en/expect.html#tothrowerror
            }

            expect(transformThrows).toThrowError('Error: No such builtin function: [@counter]');
        });

        it('applies a function pipeline using | syntax', () => {
            const template = {hello: '$.a.b.c | toLowerCase | take2'};
            const data = {a: {b: {c: 'world'}}};
            expect(transformer.transform(template, {
                functions: {
                    toLowerCase: str => str ? str.toLowerCase() : str,
                    take2: str => str ? str.slice(0, 2) : str
                }, throws: true
            })(data)).toEqual({hello: 'wo'});
        });

        it('when value being passed to a function pipeline using | syntax is null, toLowerCase does not throw an error', () => {
            const template = {hello: '$.a.b.c | toLowerCase'};
            const data = {a: {b: {c: undefined}}};
            expect(transformer.transform(template)(data)).toEqual({hello: null});
        });

        it('when value being passed to a function pipeline using | syntax is not a number, toInteger returns an invalid integer error', () => {
            const template = {hello: '$.a.b.c | toInteger'};
            const data = {a: {b: {c: undefined}}};
            expect(transformer.transform(template)(data)).toEqual({hello: "Error: value: [null] is not a valid integer"});
        });
    });

    describe('trasduce', () => {
        const allDataTrue = [{a: true}, {b: true}, {c: true}];
        const allDataFalse = [{a: true}, {b: true}, {c: false}];

        const anyDataTrue = [{a: false}, {b: false}, {c: true}];
        const anyDataFalse = [{a: false}, {b: false}, {c: false}];

        const transducer = colls.mapTransformer(item => _.values(item).pop());

        const reducingFnAll = transducer((acc, item) => acc && item);
        const reducingFnAny = transducer((acc, item) => acc || item);

        expect(colls.reduce(reducingFnAll, () => true, allDataTrue)).toEqual(true);
        expect(colls.reduce(reducingFnAll, () => true, allDataFalse)).toEqual(false);

        expect(colls.reduce(reducingFnAny, () => false, anyDataTrue)).toEqual(true);
        expect(colls.reduce(reducingFnAny, () => false, anyDataFalse)).toEqual(false);
    });

    describe('filter', () => {
        const filteringDataALLTrue = { data: {a: true, b: true, c: true, d: false}};
        const filteringDataALLFalse = { data: {a: false, b: true, c: true, d: false}};
        const filteringDataANYTrue = { data: {a: true, b: true, c: true, d: false}};
        const filteringDataANYFalse = { data: {a: false, b: true, c: false, d: false}};

        const filteringTemplateALL = {
            ALL: [
                {
                    ALL: [{ a: '$.data.a' }, {b: '$.data.b'}]
                },
                {
                    ANY: [{ c: '$.data.c' }, {d: '$.data.d'}]
                }
            ]
        };

        const filteringTemplateALLWithFns = {
            ALL: [
                {
                    ALL: [{ a: '@truthy' }, {b: '$.data.b'}]
                },
                {
                    ANY: [{ c: '@truthy' }, {d: '$.data.d'}]
                }
            ]
        };

        const filteringTemplateANY = {
            ANY: [
                {
                    ALL: [{ a: '$.data.a' }, {b: '$.data.b'}]
                },
                {
                    ANY: [{ c: '$.data.c' }, {d: '$.data.d'}]
                }
            ]
        };

        const filteringTemplateANYWithFns = {
            ANY: [
                {
                    ALL: [{ a: '$.data.a' }, {b: '@truthy'}]
                },
                {
                    ANY: [{ c: '$.data.c' }, {d: '@falsy'}]
                }
            ]
        };

        const filteringTemplateFns = {
            truthy: () => true,
            falsy: () => false
        };

        it('evalutes an arbitrary ALL@root template with truthy data => true', () => {
            expect(transformer.filter(filteringTemplateALL, {functions: filteringTemplateFns})(filteringDataALLTrue)).toEqual(true);
        });

        it('evalutes an arbitrary ALL@root template with falsy data => false', () => {
            expect(transformer.filter(filteringTemplateALL, {functions: filteringTemplateFns})(filteringDataALLFalse)).toEqual(false);
        });

        it('evalutes an arbitrary ANY@root template with truthy data => true', () => {
            expect(transformer.filter(filteringTemplateANY, {functions: filteringTemplateFns})(filteringDataANYTrue)).toEqual(true);
        });

        it('evalutes an arbitrary ANY@root template with falsy data => false', () => {
            expect(transformer.filter(filteringTemplateANY, {functions: filteringTemplateFns})(filteringDataANYFalse)).toEqual(false);
        });

    });
});
