declare var CodeMirror;

import parser = require("parser");
import compiler = require("compiler");
import td = require("transducers");

function doIndent(arr: string[], indent: number) {
    for (var i = 0; i < indent; ++i) {
        arr.push('  ');
    }
}

function treeToString(x: parser.Ast, arr: string[], indent: number) {
    doIndent(arr, indent);
    //arr.push('(');
    if (!x) {
        arr.push('null\r\n');
    } else {
        arr.push(parser.AstKind[x.kind]);
        switch (x.kind) {
            case parser.AstKind.Name:
                arr.push(' ');
                arr.push((<parser.AstName>x).name);
                break;
        }
        arr.push('\r\n');
        ++indent;
    
        parser.traverseValues(x, c => treeToString(c, arr, indent));
    }
}

export function runCode(code: string, output: (x: string) => void): any {
    console.log('Loaded app');

    try {
        var p = new parser.AstParser(code);
        var m = p.ruleModule();

        var c = new compiler.Compiler();
        var arr: string[] = [];
        treeToString(m, arr, 0);
        output(arr.join(''));
        //output(JSON.stringify(m));
        //output(JSON.stringify(m, undefined, 2));
        c.scan(m, null);
    } catch (e) {
        output("Compile error: " + e);
    }

    return m;
}

function ready(f) {
    if (/complete|loaded|interactive/.test(document.readyState)) {
        f();
    } else {
        document.addEventListener('DOMContentLoaded', f);
    }
}

var codeMirror;

function initCodeMirror(element, isInitialized, context) {
    //don't redraw if we did once already
    if (isInitialized) return;

    codeMirror = CodeMirror(element, {
        lineNumbers: true,
        value:
        "Foo = :{ a => b }\n" +
        "Bar = :[ a: Int ]"
    });
    codeMirror.setOption("indentUnit", 4);
    codeMirror.setOption("extraKeys", {
        Tab: cm => cm.replaceSelection(Array(cm.getOption("indentUnit") + 1).join(" "))
    });
}

interface ListCtrl {
    visible: boolean;
    arr: any[];
}

module List {
    export function view(ctrl: ListCtrl) {
        return m('.form-control-wrapper', [
            m('.dropdownjs', [
                m('input', {
                    type: 'text',
                    onclick: () => ctrl.visible = true,
                    readOnly: true,
                    value: 'Examples',
                    'class': 'form-control focus'
                }),
                ctrl.visible ?
                    m('ul', {
                        placement: 'bottom-left',
                        onclick: () => { ctrl.visible = false; console.log(ctrl.visible); },
                        style: { 'max-height': '496px' }
                    }, ctrl.arr.map(x => m('li', {}, x))) : null
            ])
        ]);
    }

    export function controller(arr) {
        this.visible = false;
        this.arr = arr;
    }
}

var visibleDropDown;

function dropDown(key, items: any[], text, select) {
    function click(e) {
        if (e.target.classList.contains('dropdown-toggle')) {
            if (visibleDropDown === key) {
                visibleDropDown = null;
            } else {
                visibleDropDown = key;
            }
        } else {
            visibleDropDown = null;
            var name = e.target.getAttribute('value');
            console.log(e.target);
            console.log(name);
            items.forEach(x => {
                if (x.name === name) { select(x); }
            });
        }
    }
    return m('li.dropdown', { key: key, onclick: click }, [
            m('a.dropdown-toggle', [
                text,
                m('b.caret')
            ]),
            m('ul.dropdown-menu', { style: { display: visibleDropDown === key ? 'block' : 'none' } },
                items.map(x => m('li', m('a', { value: x.name }, x.text))))
        ]);
}

var app = {
    controller: function () {
        return {
            result: m.prop(''),
            examples: [
                { name: 'A', text: 'A', contents: 'a.b = 0' },
                { name: 'B', text: 'B', contents: 'a.b = 0' }
            ],
            compile: (ctrl) => {
                var code = codeMirror.getValue();
                var tree = runCode(code, (s) => ctrl.result(s));
            }
        }
    },
    view: function (ctrl) {
        return [
            m('.navbar', [
                m('.navbar-header', [
                    m('a.navbar-brand', 'Mlk')
                ]),
                m('.navbar-collapse', [
                    m('ul.nav.navbar-nav', [
                        dropDown('examples', ctrl.examples, 'Examples', function (opt) {
                            codeMirror.setValue(opt.contents);
                        })
                    ])
                ])
            ]),
            m('.section.group', { style: { padding: '0rem 5rem' } }, [
                m('div.col.span_1_of_2', [
                    m('div.half-pane', { config: initCodeMirror })
                ]),
                m('div.col.span_1_of_2', [
                    m('div.half-pane', { style: 'position: relative; padding: 0.5rem' }, [
                        m('pre', ctrl.result()),
                        m('input', {
                            type: 'button',
                            onclick: () => ctrl.compile(ctrl),
                            'class': 'btn-round refresh',
                            style: 'z-index: 10; position: absolute; left: 1.5rem; bottom: 1.5rem'
                        })
                    ])
                ])
            ])
        ];
    }
};



ready(() => {
    m.module(document.getElementById('root'), app);
});
