const {docopt} = require('docopt');

const doc = `
Usage:
    index.js <templateJSON> <documentJSON> [--args=<argsJSON>] [--userFn=<functionsJS>] [--opts=<optsJSON>]
    
Options:
  -h --help     Show this screen.
  --version     Show version.
  --args=<argsJSON>  path to a json file containing function expression args.
  --userFn=<functionsJS> path to a js file exporting user-defined functions
  --opts=<optsJSON> path to a json file containing configuration [default: ./config.json]
`;

console.log(docopt(doc));
