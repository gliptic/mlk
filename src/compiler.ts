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
        this.scope = { parent: null, symbols: {} };
    }

    resolveType(t: P.AstType): P.AstType {
        switch (t.kind) {
            case P.AstTypeKind.App: {
                var app = <P.AstTypeApp>t;
                if (app.f.kind === P.AstTypeKind.Name && (<any>app.f).name === "type") {
                    // TODO: Only allow one parameter
                    var tv = app.params[0];
                    // TODO: tv.name must be null here
                    this.resolveType(tv.type);
                }
                return t;
            }

            case P.AstTypeKind.Record: {
                var record = <P.AstTypeRecord>t;
                record.f.forEach(a => this.resolveType(a.type));
                return t;
            }

            case P.AstTypeKind.Lambda: {
                var lambda = <P.AstTypeLambda>t;
                lambda.p.forEach(a => this.resolveType(a.type));
                lambda.f.forEach(a => this.resolveType(a.type));
                return t;
            }

            case P.AstTypeKind.Name: {
                var name = <P.AstTypeName>t;
                var sym = this.findSymbol(name.name);
                // TODO: Check that sym is a type
                return sym;
            }

            default:
                return t;
        }
    }

    addSymbol(name: string, sym: any) {
        if (this.scope.symbols[name]) {
            throw "Identifier already used " + name;
        }
        console.log("Adding", name);
        this.scope.symbols[name] = sym;
    }



    findSymbol(name: string): any {
        function find(name: string, sc: Scope) {
            //if (!sc) return null;
            if (!sc) throw "Did not find symbol " + name;
            var val = sc.symbols[name];
            if (val) return val;
            return find(name, sc.parent);
        }
        
        return find(name, this.scope);
    }

    resolveMatch(name: P.Ast, value: P.Ast) {
        if (name) {
            if (name.kind === P.AstKind.Name) {
                var n = <P.AstName>name;
                this.addSymbol(n.name, { kind: P.AstKind.ValRef, name: n.name });
                // TODO: Handle other patterns
            } else {
                throw "Unimplemented: patterns";
            }
        }
        
        this.resolve(value, null);
        // value.type
    }

    resolve(m: P.Ast, contextType: P.AstType) {
        switch (m.kind) {
            case P.AstKind.TypeVal: {
                var typeVal = <P.AstTypeVal>m;
                typeVal.type = { kind: P.AstTypeKind.TypeVal };
                typeVal.typeVal = this.resolveType(typeVal.typeVal);
                break;
            }

            case P.AstKind.App: {
                var app = <P.AstApp>m;
                this.resolve(app.f, null);
                app.params.forEach(a => this.resolve(a.value, null));
                break;
            }

            case P.AstKind.Record: {
                var record = <P.AstRecord>m;
                record.f.forEach(a => this.resolve(a.value, null));
                break;
            }

            case P.AstKind.Lambda: {
                var lambda = <P.AstLambda>m;
                this.scope = { parent: this.scope, symbols: {} };

                lambda.p.forEach(p => {
                    if (p.name.kind === P.AstKind.Name) {
                        var n = <P.AstName>p.name;
                        this.addSymbol(n.name, { kind: P.AstKind.ValRef, name: n.name });
                        // TODO: Handle other patterns
                    }
                });

                lambda.f.forEach(f => {
                    this.resolveMatch(f.name, f.value);
                });
                
                break;
            }

            case P.AstKind.Name: {
                var name = <P.AstName>m;
                var sym = this.findSymbol(name.name);
                var ref = <P.AstValRef>m;
                ref.kind = P.AstKind.ValRef;
                // TODO: Handle type constructors
                console.log("Found", name.name);
                return sym;
            }
        }

        /*
        P.traverseValues(m, a => {
            this.resolve(a);
        });

        P.traversePatterns(m, a => {
            // Nothing
            console.log("Pattern:", a);
        });
        */

        switch (m.kind) {
            case P.AstKind.Lambda: {

                this.scope = this.scope.parent;
                break;
            }
        }
    }
}