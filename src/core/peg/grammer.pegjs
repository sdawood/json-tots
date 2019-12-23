// JSON TOTS TEMPLATE GRAMMER
// ==========================

{
  function makeInteger(o) {
    return parseInt(o.join(""), 10);
  }
}

tots = tot+

tot =  (!"{" .)* template:TEMPLATE (!"{" .)* { return template }

TEMPLATE
  = "{" _ ops:OPERATORS? _ "{" _ jp:JP? _ "}" _ pipes:PIPES? _ "}" {
      return {operators: ops, path: jp, pipes: pipes, source: text(), value: null}
    }

OPERATORS
  = inc:INCEPTION_OP? PIPE_SEPARATOR? enu:ENUMERATION_OP? PIPE_SEPARATOR? sym:SYMBOL_OP? PIPE_SEPARATOR? con:CONSTRAINT_OP? PIPE_SEPARATOR? qry:QUERY_OP? { return { inception: inc, enumeration: enu, symbol: sym, constraint: con, query: qry} }

INCEPTION_OP =
	inc:"." rep:INTEGER { return { operator: inc, repeat: rep}}
    / inc:"." rep:"*" { return { operator: inc, repeat: rep}}
    / inc:"." rep:"."* { return { operator: inc, repeat: rep.length}}
    / inc:">" rep:INTEGER { return { operator: inc, repeat: rep}}
    / inc:">" rep:"*" { return { operator: inc, repeat: rep}}
    / inc:">" rep:">"* { return { operator: inc, repeat: rep.length}}
    / inc:"%" rep:INTEGER { return { operator: inc, repeat: rep}}
    / inc:"%" rep:"*" { return { operator: inc, repeat: rep}}
    / inc:"%" rep:"%"* { return { operator: inc, repeat: rep.length}}


ENUMERATION_OP = enu:"*" rep:"*"? { return { operator: enu, repeat: rep ? 1 : 0}}

SYMBOL_OP
	= op:":" sym:SYMBOL {return  { operator: op, tag: sym}}
	/ op:[#|@] sym:SYMBOL {return  { operator: op, tag: sym}}

DEFAULT_VALUE = _ ":" _ dVal:VALUE { return dVal }

CONSTRAINT_OP = op:[!?] eq:[=~]? _ src:SOURCE_NAME? dVal:DEFAULT_VALUE? { return { operator: op, equal: eq, source: src, defaultValue: dVal ? dVal.trim() : dVal}}

QUERY_OP  = op:[+-] count:INTEGER? { return { operator: op, count: count}}

JP
  = (!"}" .)* { return text().trim()}

PIPES
  = pipes:Pipe*
  / SPREAD_OPERATOR

Pipe
	= PIPE_SEPARATOR fn:FUNCTION_NAME args:(ARG)* { return {function: fn, type: 'inline', args: args}}
    / PIPE_SEPARATOR '@' fn:FUNCTION_NAME { return {function: fn, type: 'extended', args: []}}
    / PIPE_SEPARATOR spread:SPREAD_OPERATOR { return {function: spread } }

SPREAD_OPERATOR
	= "**"
    / "*"

INTEGER "integer"
  = _ [0-9]+ { return parseInt(text(), 10); }

_ "whitespace"
  = [ \t]*

PIPE_SEPARATOR = _ "|" _
ARG_SEPARATOR = _ ":" _;
ARG_NAME = [a-zA-Z0-9_-\s\$\.]* { return text().trim() }
ARG = ARG_SEPARATOR arg:ARG_NAME { return arg.trim() }
FUNCTION_NAME = [a-zA-Z0-9_-\s\$\.]+ { return text().trim() }
SYMBOL = _ sym:[a-zA-Z0-9_-\s\$\.\[\]"\s]* _ { return sym.join("").trim() }
SOURCE_NAME = q1:'"'? name:[a-zA-Z0-9_-\s\\$]* q2:'"'? { return (q1 || "") + name.join("").trim() + (q2 || "") }
// (!"{" .)* produces: [[undefined, char], [undefined, char], ...]
VALUE = value:(!"{" .)* { return value.length === 0 ? null : value.map(function(arr){return arr[1]}).join("") }

