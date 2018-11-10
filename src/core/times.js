function defered(x, {ticks = 1} = {}) {
    return x && x['@@tots/defered'] ? x : {
        '@@tots/value': x,
        '@@tots/defered': ticks
    };
}

function isDefered(x) {
    return x && x['@@tots/defered'] ? x['@@tots/defered'] : 0;
}

module.exports = {
    defered,
    isDefered
};

