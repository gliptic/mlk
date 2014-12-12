import P = require("parser");
import td = require("transducers");

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
        if (this.scope.symbols[name]) {
            throw "Identifier already used " + name;
        }
        this.scope.symbols[name] = sym;
    }



    findSymbol(name: string): P.Ast {
        function find(name: string, sc: Scope) {
            if (!sc) return null;
            var val = this.scope.symbols[name];
            if (val) return val;
            return find(name, sc.parent);
        }
        
        return find(name, this.scope);
    }

    resolveMatch(name: P.Ast, value: P.Ast) {
        this.resolve(value);
        // value.type
    }

    resolve(m: P.Ast) {
        switch (m.kind) {
            case P.AstKind.AstTypeVal: {
                var typeVal = <P.AstTypeVal>m;
                typeVal.type = { kind: P.AstTypeKind.TypeVal };
                typeVal.typeVal = this.resolveType(typeVal.typeVal);
                break;
            }

            case P.AstKind.Lambda: {
                var lambda = <P.AstLambda>m;
                this.scope = { parent: this.scope, symbols: {} };

                lambda.f.forEach(f => {
                    this.resolveMatch(f.name, f.value);
                });
                
                break;
            }

            case P.AstKind.Name: {
                var name = <P.AstName>m;
                var sym = this.findSymbol(name.name);

            }
        }

        P.traverseValues(m, a => {
            this.resolve(a);
        });

        P.traversePatterns(m, a => {
            // Nothing
            console.log("Pattern:", a);
        });

        switch (m.kind) {
            case P.AstKind.Lambda: {

                this.scope = this.scope.parent;
                break;
            }
        }
    }
}