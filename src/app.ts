declare var CodeMirror;

import parser = require("parser");
import compiler = require("compiler");

export function runCode(code: string, output: (x: string) => void): any {
    console.log('Loaded app');

    try {
        var p = new parser.AstParser(code);
        var m = p.ruleModule();

        var c = new compiler.Compiler();
        output(JSON.stringify(m));
        c.resolve(m, null);
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

var app = {
    controller: function () {
        return {
            result: m.prop(''),
            exampleList: new List.controller(["A", "B"]),
            compile: (ctrl) => {
                var code = codeMirror.getValue();
                var tree = runCode(code, (s) => ctrl.result(s));
            }
        }
    },
    view: function (ctrl) {
        return [
            m('.header-panel.shadow-z2', [
                List.view(ctrl.exampleList)
            ]),
            m('.section.group', { style: { padding: '0rem 5rem' } }, [
                m('div', { class: 'col span_1_of_2' }, [
                    m('div', { 'class': 'half-pane', config: initCodeMirror })
                ]),
                m('div', { class: 'col span_1_of_2' }, [
                    m('div', { 'class': 'half-pane', style: 'position: relative; padding: 0.5rem' }, [
                        ctrl.result(),
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