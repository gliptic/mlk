declare var CodeMirror;

import parser = require("parser");
import compiler = require("compiler");

export function runCode(code: string): any {
    console.log('Loaded app');

    var p = new parser.AstParser(code);
    var m = p.ruleModule();

    var c = new compiler.Compiler();

    c.resolve(m);
    return m;
}

function ready(f) {
    if (/complete|loaded|interactive/.test(document.readyState)) {
        f();
    } else {
        document.addEventListener('DOMContentLoaded', f);
    }
}

ready(() => {
    var codeMirror = CodeMirror(document.getElementById("content"), {
        lineNumbers: true,
        value:
            "Foo = :{ a => b }\n" +
            "Bar = :[ a: Int ]"
    });
    document.getElementById("compile").addEventListener('click', function () {
        var code = codeMirror.getValue();

        var tree = runCode(code);
        document.getElementById("result").innerHTML = JSON.stringify(tree);
    });
});