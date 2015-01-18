import P = require("parser");
import td = require("transducers");

export class Compiler {
    mods: P.Module[];
    scanContext: P.AstLambda;

    constructor() {
        this.mods = [];
    }

    resolveType(t: P.AstType): P.AstType {
        if (!t) return t;

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

    resolvePattern(p: P.Ast) {
        switch (p.kind) {
            case P.AstKind.Name: {
                p.type = this.resolveType(p.type);
                break;
            }

            default:
                throw "Unimplemented: complex patterns";
        }
    }

    addSymbol(name: string, sym: any) {
        if (this.scanContext.symbols[name]) {
            throw "Identifier already used " + name;
        }
        console.log("Adding", name);
        this.scanContext.symbols[name] = sym;
    }



    findSymbol(name: string): any {
        function find(name: string, sc: P.AstLambda) {
            //if (!sc) return null;
            if (!sc) throw "Did not find symbol " + name;
            var val = sc.symbols[name];
            if (val) return val;
            return find(name, sc.parent);
        }
        
        return find(name, this.scanContext);
    }

    resolveMatch(name: P.Ast, value: P.Ast) {
        if (name) {
            this.resolvePattern(name);
            if (name.kind === P.AstKind.Name) {
                var n = <P.AstName>name;
                this.addSymbol(n.name, { kind: P.AstKind.ValRef, name: n.name });
                // TODO: Handle other patterns
            } else {
                throw "Unimplemented: patterns";
            }
        }
        
        this.scan(value, null);
        // value.type
    }

    scan(m: P.Ast, contextType: P.AstType) {
        if (!m) return;

        switch (m.kind) {
            case P.AstKind.TypeVal: {
                var typeVal = <P.AstTypeVal>m;
                typeVal.type = { kind: P.AstTypeKind.TypeVal };
                typeVal.typeVal = this.resolveType(typeVal.typeVal);
                break;
            }

            case P.AstKind.App: {
                var app = <P.AstApp>m;
                this.scan(app.f, null);
                app.params.forEach(a => this.scan(a.value, null));
                break;
            }

            case P.AstKind.Record: {
                var record = <P.AstRecord>m;
                record.f.forEach(a => this.scan(a.value, null));
                break;
            }

            case P.AstKind.Lambda: {
                var lambda = <P.AstLambda>m;
                var pendingAdding: P.FieldPair[] = [];

                var flushPending = () => {
                    // TODO
                    pendingAdding.forEach(p => {
                        var n = <P.AstName>p.name;
                        console.log("Resolving pending node", n.name);
                        this.scan(p.value, p.name.type);
                    });

                    pendingAdding.length = 0;
                }

                if (lambda.scanState === P.ScanState.NotScanned) {
                    lambda.scanState = P.ScanState.Scanning;

                    var oldScanContext = this.scanContext;
                    this.scanContext = lambda;

                    var ptypes = [];

                    // TODO: Use context type to fill in parameter types
                    lambda.p.forEach(p => {
                        if (p.name.kind === P.AstKind.Name) {
                            this.scan(p.value, p.type);

                            var n = <P.AstName>p.name;
                            this.addSymbol(n.name, { kind: P.AstKind.ParRef, name: n.name });
                        }
                        // TODO: Handle other patterns

                        ptypes.push(p.type)
                    });

                    lambda.f.forEach(f => {
                        if (f.value.kind === P.AstKind.Lambda) {
                            // TODO: Handle other patterns
                            var n = <P.AstName>f.name;
                            this.addSymbol(n.name, { kind: P.AstKind.ValRef, name: n.name });
                            pendingAdding.push(f);
                        } else {
                            flushPending();

                            this.scan(f.value, null); // TODO: Get a type from declaration
                        }
                    });

                    flushPending();

                    var ftype = lambda.f[lambda.f.length - 1].type; // TODO: Handle conditional returns

                    lambda.type = { kind: P.AstTypeKind.Lambda, p: ptypes, f: [ftype] };

                    lambda.scanState = P.ScanState.Scanned;
                    this.scanContext = oldScanContext;
                }

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
    }
}