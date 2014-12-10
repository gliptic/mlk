import P = require("parser")

interface Scope {
    symbols: any;
    parent: Scope;
}

export class Compiler {
    mods: P.Module[];
    scope: Scope;

    constructor() {
        this.mods = [];
    }

    resolveType(t: P.AstType): P.AstType {
        switch (t.kind) {
            case P.AstTypeKind.App: {
                var app = <P.AstTypeApp>t;
                if (app.f.kind === P.AstTypeKind.Name && (<any>app.f).name === "type") {
                    // TODO: Only allow one parameter
                    var tv = app.params[0];
                    return 
                }
            }

            default:
                return t;
        }
    }

    addSymbol(name: string, sym: P.Ast) {
        this.scope.symbols[name] = sym;
    }

    resolve(m: P.Ast) {
        switch (m.kind) {
            case P.AstKind.AstTypeVal: {
                var name = <P.AstTypeVal>m;
                name.type = { kind: P.AstTypeKind.TypeVal };
                name.typeVal = this.resolveType(name.typeVal);
                break;
            }

            case P.AstKind.Lambda: {
                this.scope = { parent: this.scope, symbols: {} };
                break;
            }
        }

        P.traverseValues(m, a => {
            this.resolve(a);
        });

        P.traversePatterns(m, a => {
            // Nothing
            console.log("Pattern:", a);
        });
    }
}