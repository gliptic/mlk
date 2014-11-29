import parser = require("parser");

console.log('Loaded app');

var p = new parser.AstParser("a = 1, b = 2");

p.ruleModule();