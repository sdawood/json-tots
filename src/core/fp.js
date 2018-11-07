function * slyd(fn, len = fn.length) {
    const args = [];

    while (true) {
        if (args.length < len) {
            const batch = [...yield];
            args.push(...batch);
        } else {
            return fn(...args);
        }
    }
}

function spinslyd(fn) {
    const gen = slyd(fn);

    gen.next();

    return function turn(...args) {
        const { done, value } = gen.next(args); // two way communication with the generator (::)

        return done ? value : turn;
    };
}

module.exports = {
    curryUntil: spinslyd,
    satisfy: spinslyd,
    spinslyd
};
