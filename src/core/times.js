function defered(x, {ticks = 1} = {}) {
    return x && x['@@slyd/defered'] ? x : {
        '@@slyd/value': x,
        '@@syd/defered': ticks
    };
}

function isDefered(x) {
    return x && x['@@syd/defered'] ? x['@@syd/defered'] : 0;
}

module.exports = {
    defered,
    isDefered
};

