import P = require("parser");
import td = require("transducers");

export class Compiler {
    mods: P.Module[];
    scanContext: P.Case;

    constructor() {
        this.mods = [];
    }

    resolveType(t: P.AstType): P.AstType {
        if (!t) return t;

        switch (t.kind) {
            case P.AstKind.TypeApp: {
                var app = <P.AstTypeApp>t;
                //if (app.f.kind === P.AstTypeKind.Name && (<any>app.f).name === "type") {
                if (app.f.kind === P.AstKind.TypeName) {
                    // TODO: Only allow one parameter
                    var tv = app.params[0];
                    // TODO: tv.name must be null here
                    tv.type = this.resolveType(tv.type);
                }
                return t;
            }

            case P.AstKind.TypeRecord: {
                var record = <P.AstTypeRecord>t;
                record.f.forEach(a => a.type = this.resolveType(a.type));
                return t;
            }

            case P.AstKind.TypeLambda: {
                var lambda = <P.AstTypeLambda>t;
                lambda.p.forEach(a => a.type = this.resolveType(a.type));
                this.resolveType(lambda.r);
                return t;
            }

            case P.AstKind.TypeName: {
                var name = <P.AstTypeName>t;
                var sym = this.findTypeSymbol(name.name);
                if (sym) {
                    // TODO: Check that sym is a type
                    console.log("Found type symbol", name.name);
                    return sym;
                } else {
                    return name;
                }
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

    addValueSymbol(name: string, sym: any) {
        if (this.scanContext.valueSymbols[name]) {
            throw "Identifier already used " + name;
        }
        console.log("Adding value", name);
        this.scanContext.valueSymbols[name] = sym;
    }

    addTypeSymbol(name: string, sym: any) {
        if (this.scanContext.typeSymbols[name]) {
            throw "Identifier already used " + name;
        }
        console.log("Adding type", name);
        this.scanContext.typeSymbols[name] = sym;
    }

    findValueSymbol(name: string): any {
        function find(name: string, sc: P.Case) {
            var val = sc.valueSymbols[name];
            if (val) return val;
            if (!sc.parent) {
                return null;
            }
            return find(name, sc.parent);
        }
        
        return find(name, this.scanContext);
    }

    findTypeSymbol(name: string): any {
        function find(name: string, sc: P.Case) {
            var val = sc.typeSymbols[name];
            if (val) return val;
            if (!sc.parent) {
                return null;
            }
            return find(name, sc.parent);
        }

        return find(name, this.scanContext);
    }

    resolveMatch(name: P.Ast, value: P.Ast) {
        if (name) {
            this.resolvePattern(name);
            if (name.kind === P.AstKind.Name) {
                var n = <P.AstName>name;
                this.addValueSymbol(n.name, { kind: P.AstKind.ValRef, name: n.name });
                // TODO: Handle other patterns
            } else {
                throw "Unimplemented: patterns";
            }
        }
        
        this.scan(value, null);
        // value.type
    }

    unifyTypes(a: P.AstType, b: P.AstType) {
        if (!a) return a;
        if (!b) return b;

        if (a.kind === b.kind) {
            return a; // TODO
        }

        throw "Types must be the same kind";
    }

    unifyTypeArrayInto(a: P.AstType[], b: P.AstType[]) {
        if (!a) return b;
        if (!b) return a;

        if (a.length !== b.length) {
            throw "Type lists have different number of types";
        }

        for (var i = 0, e = a.length; i < e; ++i) {
            a[i] = this.unifyTypes(a[i], b[i]);
        }
    }

    scan(m: P.Ast, contextType: P.AstType) {
        if (!m) return;

        switch (m.kind) {
            case P.AstKind.ValOfType: {
                var typeVal = <P.AstTypeVal>m;
                typeVal.type = { kind: P.AstKind.TypeValOfType };
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
                        //console.log("Resolving pending node", n.name);
                        this.scan(p.value, p.name.type);
                    });

                    pendingAdding.length = 0;
                }

                if (lambda.scanState === P.ScanState.NotScanned) {
                    lambda.scanState = P.ScanState.Scanning;

                    var oldScanContext = this.scanContext;
                    
                    var ptypes: P.AstType[];
                    var ftype: P.AstType;

                    lambda.cases.forEach(c => {
                        var casePtypes = [];

                        this.scanContext = c;

                        // TODO: Use context type to fill in parameter types
                        c.p.forEach(p => {
                            if (p.name.kind === P.AstKind.Name) {
                                this.scan(p.value, p.type);

                                var n = <P.AstName>p.name;
                                this.addValueSymbol(n.name, { kind: P.AstKind.ParRef, name: n.name });
                            }
                            // TODO: Handle other patterns

                            casePtypes.push(p.type)
                        });

                        c.f.forEach(f => {
                            if (f.value.kind === P.AstKind.Lambda) {
                                // TODO: Handle other patterns
                                var n = <P.AstName>f.name;
                                this.addValueSymbol(n.name, { kind: P.AstKind.ValRef, name: n.name });
                                pendingAdding.push(f);
                            } else {
                                var n = <P.AstName>f.name;
                                flushPending();

                                var val = this.scan(f.value, null); // TODO: Get a type from declaration
                                if (n) {
                                    if (f.value.kind === P.AstKind.ValOfType) {
                                        this.addTypeSymbol(n.name, val);
                                    } else {
                                        // TODO: Assign to variable
                                        this.addValueSymbol(n.name, { kind: P.AstKind.ValRef, name: n.name });
                                    }
                                }
                            }
                        });

                        this.unifyTypeArrayInto(ptypes, casePtypes);

                        P.assert(c.f.length > 0, "Functions with no bindings nor expressions are not yet supported");

                        // TODO: Unify types of ptypes and ftype
                        ftype = this.unifyTypes(ftype, c.f[c.f.length - 1].type); // TODO: Handle conditional returns
                    });

                    flushPending();

                    lambda.type = { kind: P.AstKind.TypeLambda, p: ptypes, f: [ftype] };

                    lambda.scanState = P.ScanState.Scanned;
                    this.scanContext = oldScanContext;
                }

                break;
            }

            case P.AstKind.Name: {
                var name = <P.AstName>m;
                var sym = this.findValueSymbol(name.name);
                if (sym) {
                    var ref = <P.AstValRef>m;
                    ref.kind = P.AstKind.ValRef;
                    // TODO: Handle type constructors
                    console.log("Found value symbol", name.name);
                    console.log(ref);
                    return sym;
                } else {
                    return name;
                }
            }
        }
    }
}