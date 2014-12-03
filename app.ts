declare var CodeMirror;

import parser = require("parser");

export function runCode(code: string): any {
    console.log('Loaded app');

    var p = new parser.AstParser(code);

    return p.ruleModule();
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