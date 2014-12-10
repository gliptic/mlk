import td = require("transducers");

var Space = ' '.charCodeAt(0);
var Tab = '\t'.charCodeAt(0);
var CR = '\r'.charCodeAt(0);
var LF = '\n'.charCodeAt(0);
var chara = 'a'.charCodeAt(0);
var charz = 'z'.charCodeAt(0);
var charA = 'A'.charCodeAt(0);
var charZ = 'Z'.charCodeAt(0);
var char0 = '0'.charCodeAt(0);
var char9 = '9'.charCodeAt(0);
var isWhitespace = [];
isWhitespace[Space] = true;
isWhitespace[Tab] = true;
isWhitespace[CR] = true;
isWhitespace[LF] = true;

export enum Token {
    Comma = 0,
    Colon,
    Dot,
    Bar,
    Underscore,
    Ident,
    TypeIdent,
    OpIdent,
    ConstInt,
    LBrace,
    RBrace,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Equal,
    Arrow,
    Invalid,
    Eof
}

// Ast
export enum AstKind {
    ConstNum,
    Name,
    Match,
    App,
    Lambda,
    Record,
    AstTypeVal
}

export interface Ast {
    kind: AstKind;
    type?: AstType;
}

export interface AstName extends Ast {
    name: string;
}

export interface AstApp extends Ast {
    f: Ast;
    params: FieldPair[];
}

export interface AstConst extends Ast {
    v: number;
}

export interface AstMatch extends Ast {
    pattern: Ast;
    value: Ast;
}

export interface AstLambda extends Ast {
    p: FieldPair[];
    f: FieldPair[];
}

export interface AstRecord extends Ast {
    f: FieldPair[];
}

export interface AstTypeVal extends Ast {
    typeVal: AstType;
}

export interface FieldPair {
    name: Ast;
    value: Ast;
}

function astName(name: string): AstName {
    return { kind: AstKind.Name, name: name };
}

function astApp(f: Ast, params: FieldPair[]): AstApp {
    return { kind: AstKind.App, f: f, params: params };
}

function addParameters(dest: Ast, params: FieldPair[]): Ast {
    if (dest.kind === AstKind.App) {
        var a = <AstApp>dest;
        a.params = a.params.concat(params);
        return a;
    } else {
        return astApp(dest, params);
    }
}


// Types

export interface TypeFieldTypePair {
    name: string;
    type: AstType;
}

export interface TypeFieldPair extends TypeFieldTypePair {
    value: Ast;
}

export enum AstTypeKind {
    Any,
    Unit,
    Name,
    App,
    Lambda,
    Record,
    TypeVal,
    Named
}

export interface AstType {
    kind: AstTypeKind;
}

export interface AstTypeName extends AstType {
    name: string;
}

export interface AstTypeNamed extends AstType {

}

export interface AstTypeLambda extends AstType {
    p: TypeFieldPair[];
    f: TypeFieldPair[];
}

export interface AstTypeRecord extends AstType {
    f: TypeFieldPair[];
}

export interface AstTypeApp extends AstType {
    f: AstType;
    params: TypeFieldPair[];
}

function addTypeParameters(dest: AstType, params: TypeFieldPair[]): AstType {
    if (dest.kind === AstTypeKind.App) {
        var a = <AstTypeApp>dest;
        a.params = a.params.concat(params);
        return a;
    } else {
        return { kind: AstTypeKind.App, params: params };
    }
}

var typeAny: AstType = { kind: AstTypeKind.Any };

function fmap<T>(a: T[], f: (x: T) => T): T[] {
    for (var i = 0, e = a.length; i < e; ++i) {
        var el = a[i];
        a[i] = f(el) || el;
    }
    return a;
}

export function astPostorder(x: Ast, f: (x: Ast) => Ast): Ast {
    switch (x.kind) {
        case AstKind.App: {
            var app = <AstApp>x;
            app.f = astPostorder(app.f, f) || app.f;
            app.params.forEach((v) => {
                v.name = astPostorder(v.name, f) || v.name;
                v.value = astPostorder(v.value, f) || v.value;
            });
        }
        case AstKind.ConstNum:
            break;
    }

    return f(x) || x;
}

export enum TraverseKind {
    Value,
    Pattern,
    Name,
    Type
}

function traverseArray<T>(arr: T[], f: (x: T) => any): any {
    for (var i = 0, e = arr.length; i < e; ++i) {
        var v = f(arr[i]);
        if (v)
            return v;
    }
}

export function traverseValues(x: Ast, f: (x: Ast) => any) {
    switch (x.kind) {
        case AstKind.App: {
            var app = <AstApp>x;
            return f(app.f)
                 || traverseArray(app.params, x => f(x.value));
        }

        case AstKind.Match: {
            var match = <AstMatch>x;

            return f(match.value);
        }

        case AstKind.Lambda: {
            var lambda = <AstLambda>x;

            return traverseArray(lambda.p, x => f(x.value))
                || traverseArray(lambda.f, x => f(x.value));
        }

        case AstKind.Record: {
            var record = <AstRecord>x;

            return traverseArray(record.f, x => f(x.value));
        }

        case AstKind.Name:
        case AstKind.ConstNum:
        case AstKind.AstTypeVal:
            return;

        default:
            throw "Unimplemented in traverseValues";
    }
}

export function traversePatterns(x: Ast, f: (x: Ast) => any) {
    switch (x.kind) {
        case AstKind.App: {
            var app = <AstApp>x;
            return f(app.f)
                || traverseArray(app.params, x => f(x.name));
        }

        case AstKind.Match: {
            var match = <AstMatch>x;

            return f(match.pattern);
        }

        case AstKind.Lambda: {
            var lambda = <AstLambda>x;

            return traverseArray(lambda.p, x => f(x.name))
                || traverseArray(lambda.f, x => f(x.name));
        }

        case AstKind.Record: {
            var record = <AstRecord>x;

            return traverseArray(record.f, x => f(x.name));
        }

        case AstKind.Name:
        case AstKind.ConstNum:
        case AstKind.AstTypeVal:
            return;

        default:
            throw "Unimplemented in traversePatterns";
    }
}

export function traverse(x: Ast, kind: TraverseKind, enter: (x: Ast, kind?: TraverseKind) => any, exit?: (x: Ast, kind?: TraverseKind) => any): any {
    if (!x)
        return;
    if (enter(x, kind))
        return true;

    switch (x.kind) {
        case AstKind.App: {
            var app = <AstApp>x;
            if (traverse(app.f, kind, enter, exit))
                return true;

            for (var i = 0, e = app.params.length; i < e; ++i) {
                var v = app.params[i];
                if (traverse(v.name, TraverseKind.Name, enter, exit)
                 || traverse(v.value, kind, enter, exit))
                    return true;
            }
            break;
        }

        case AstKind.Match: {
            var match = <AstMatch>x;

            if (traverse(match.pattern, TraverseKind.Pattern, enter, exit)
             || traverse(match.value, kind, enter, exit))
                return true;
            break;
        }

        case AstKind.Lambda: {
            var lambda = <AstLambda>x;

            for (var i = 0, e = lambda.p.length; i < e; ++i) {
                var v = lambda.p[i];
                if (traverse(v.name, TraverseKind.Name, enter, exit)
                 || traverse(v.value, kind, enter, exit))
                    return true;
            }

            for (var i = 0, e = lambda.f.length; i < e; ++i) {
                var v = lambda.f[i];
                if (traverse(v.name, TraverseKind.Name, enter, exit)
                 || traverse(v.value, kind, enter, exit))
                    return true;
            }
            
            break;
        }

        case AstKind.Record: {
            var record = <AstRecord>x;

            for (var i = 0, e = record.f.length; i < e; ++i) {
                var v = record.f[i];
                if (traverse(v.name, TraverseKind.Name, enter, exit)
                 || traverse(v.value, kind, enter, exit))
                    return true;
            }
        }
    }

    return exit && exit(x, kind);
}

interface Context {

}

export interface Module extends AstLambda {
    name: string;
}

export class AstParser {
    source: string;
    sourcePos: number;
    sourceLen: number;
    precedence: number[];
    c: number;
    beginCol: number;
    col: number;
    prevIndent: number;
    indents: number[];
    currentLine: number;
    tokenData: any;
    tokenPrec: number;
    tt: Token;
        
    constructor(source: string) {
        this.source = source;
        this.sourcePos = 0;
        this.sourceLen = source.length;
        this.precedence = [];
        this.col = 0;
        this.currentLine = 0;
        this.precedence['='.charCodeAt(0)] = 1;
        this.precedence['<'.charCodeAt(0)] = 2;
        this.precedence['>'.charCodeAt(0)] = 2;
        this.precedence['+'.charCodeAt(0)] = 3;
        this.precedence['-'.charCodeAt(0)] = 3;
        this.precedence['*'.charCodeAt(0)] = 4;
        this.precedence['/'.charCodeAt(0)] = 4;

        this.nextch();
        this.skipWs();

        this.indents = [];
        this.prevIndent = this.beginCol;

        this.next();
    }

    nextch() {
        this.c = this.sourcePos >= this.sourceLen ? 0 : this.source.charCodeAt(this.sourcePos++);
        this.col += this.c == Tab ? 4 : 1;
    }

    next(): any {
        var data = this.tokenData;
        this.beginCol = this.col;
        this.next2();
        this.skipWs();
        return data;
    }

    skipWs() {
        while (this.c == Space || this.c == Tab) {
            this.nextch();
        }
    }

    beginIndent() {
        this.indents.push(this.prevIndent);
        this.prevIndent = this.beginCol;
    }

    endIndent() {
        this.prevIndent = this.indents.pop();
    }

    next2() {
        while (isWhitespace[this.c]) {
            var firstOnLine = false;
            do {
                if (this.c === LF) {
                    console.log('New line');
                    ++this.currentLine;
                }

                if (this.c === CR || this.c == LF) {
                    this.col = -1;
                    firstOnLine = true;
                }

                this.nextch();

            } while (isWhitespace[this.c]);

            if (firstOnLine && this.c !== 0) {
                if (this.col <= this.prevIndent) {
                    console.log('Insert comma');
                    this.tt = Token.Comma;
                    return;
                }
            }
        }

        if (this.c >= chara && this.c <= charz) {
            var ident = '';
            while ((this.c >= chara && this.c <= charz)
                || (this.c >= charA && this.c <= charZ)) {
                ident += String.fromCharCode(this.c);
                this.nextch();
            }

            console.log("Ident", ident);
            this.tokenData = ident;
            this.tt = Token.Ident;
        } else if (this.c >= charA && this.c <= charZ) {
            var ident = '';
            while ((this.c >= chara && this.c <= charz)
                || (this.c >= charA && this.c <= charZ)) {
                ident += String.fromCharCode(this.c);
                this.nextch();
            }

            console.log("TypeIdent", ident);
            this.tokenData = ident;
            this.tt = Token.TypeIdent;
        } else if (this.c >= char0 && this.c <= char9) {
            var text = '';
            while ((this.c >= char0 && this.c <= char9)) {
                text += String.fromCharCode(this.c);
                this.nextch();
            }

            console.log("Number", ident);
            this.tokenData = +text;
            this.tt = Token.ConstInt;
        } else if (this.c === 0) {
            this.tt = Token.Eof;
        } else {
            var cnum = this.c;
            var c = String.fromCharCode(cnum);
            this.nextch();
            switch (c) {
                case '{': this.tt = Token.LBrace; break;
                case '}': this.tt = Token.RBrace; break;
                case '(': this.tt = Token.LParen; break;
                case ')': this.tt = Token.RParen; break;
                case '[': this.tt = Token.LBracket; break;
                case ']': this.tt = Token.RBracket; break;
                case ':': this.tt = Token.Colon; break;
                case ',': this.tt = Token.Comma; break;
                case '.': this.tt = Token.Dot; break;
                case '|': this.tt = Token.Bar; break;
                case '_': this.tt = Token.Underscore; break;
                default:
                    var prec = this.precedence[cnum];
                    if (prec) {
                        var ident = c;
                        while (this.precedence[this.c]) {
                            ident += String.fromCharCode(this.c);
                            this.nextch();
                        }

                        if (ident === '=') {
                            this.tt = Token.Equal;
                        } else if (ident === '=>') {
                            console.log('Arrow');
                            this.tt = Token.Arrow;
                        } else {
                            console.log("OpIdent", ident);
                            this.tokenData = ident;
                            this.tokenPrec = prec;
                            this.tt = Token.OpIdent;
                        }
                    } else {
                        console.log("Unexpected character", cnum);
                        this.tt = Token.Invalid;
                    }
                    break;
            }
        }
    }

    private expect(t: Token) {
        if (this.tt !== t) {
            throw 'Parse error. Expected ' + Token[t] + ', got ' + Token[this.tt];
        }
        this.next();
    }

    private test(t: Token): boolean {
        return this.tt === t ? (this.next(), true) : false;
    }

    // Type space

    typePrimaryExpression(parseTrail: boolean): AstType {
        var ret: AstType;
        switch (this.tt) {
            case Token.TypeIdent:
            case Token.Ident:
                ret = { kind: AstTypeKind.Name, name: <string>this.next() };
                break;

            case Token.LBrace:
                ret = this.typeLambda();
                break;

            case Token.LBracket:
                ret = this.typeRecord(Token.LBracket, Token.RBracket);
                break;

            default:
                throw "Unexpected token " + Token[this.tt] + " in primary type expression";
        }

        if (parseTrail)
            ret = this.typePrimaryExpressionTrail(ret);

        return ret;
    }

    typePrimaryExpressionTrail(ret: AstType): AstType {
        while (true) {
            switch (this.tt) {
                case Token.LParen:
                    var r = this.typeRecord(Token.LParen, Token.RParen);
                    ret = addTypeParameters(ret, r.f);
                    break;

                case Token.LBracket:
                case Token.LBrace:
                case Token.Ident:
                case Token.TypeIdent:
                    var e = this.typePrimaryExpression(false);
                    ret = addTypeParameters(ret, [{ name: null, type: e, value: null }]);
                    break;

                default:
                    return ret;
            }
        }
    }

    typeExpression(): AstType {
        var p = this.typePrimaryExpression(true);

        if (this.tt === Token.Bar) {
            var v = [];
            v.push(this.typePair(p));
        }
        return p;
    }

    typeExpressionOrBinding(): TypeFieldPair {
        var parseTypeValue = (name: string) => {
            var t = typeAny, e: Ast = null;

            if (this.test(Token.Colon)) {
                t = this.typeExpression();
            }

            if (this.test(Token.Equal)) {
                e = this.ruleExpression();
            }

            return { name: name, type: t, value: e };
        };

        /*
        if (this.tt === Token.Ident) {
            var name = <string>this.next();
            var t = typeAny, e: Ast = null;

            return parseTypeValue(name);
            
        } else {*/
            var a = this.typeExpression();

            if (this.tt === Token.Colon || this.tt === Token.Equal) {
                if (a.kind !== AstTypeKind.Name) {
                    throw "Type binding must be a name";
                }

                return parseTypeValue((<AstTypeName>a).name);

            } else {
                return { name: null, type: a, value: null };
            }
        /*}*/
    }

    typePair(t: AstType): TypeFieldTypePair {
        // TODO
        return null;
    }

    typeLambdaBody(): { p: TypeFieldPair[]; f: TypeFieldPair[] } {
        var params: TypeFieldPair[] = [], fields: TypeFieldPair[] = [];
        var seenParams = false;

        this.beginIndent();

        while (true) {
            while (this.test(Token.Comma)) {
                // Nothing
            }

            if (this.tt === Token.RBrace || this.tt === Token.RParen || this.tt === Token.RBracket || this.tt === Token.Eof) {
                break;
            }

            var e = this.typeExpressionOrBinding();
            console.log("After typeExpressionOrBinding:", Token[this.tt]);

            fields.push(e);

            if (this.test(Token.Arrow)) {
                if (seenParams) {
                    throw "Duplicate parameter block";
                }
                seenParams = true;
                params = fields;
                fields = [];
            } else if (this.tt !== Token.Comma) {
                break;
            }
        }

        this.endIndent();

        return { p: params, f: fields };
    }

    typeLambda() {
        this.expect(Token.LBrace);
        var r = <AstTypeLambda>this.typeLambdaBody();
        this.expect(Token.RBrace);
        r.kind = AstTypeKind.Lambda;
        return r;
    }

    typeRecord(l: Token, r: Token): AstTypeRecord {
        this.expect(l);
        var b = this.typeLambdaBody();
        if (b.p.length)
            throw "Parameters not allowed in a record"; // TODO: Pass whether parameters are allowed to typeLambdaBody
        this.expect(r);
        delete b.p;
        var rec = <AstTypeRecord><any>b;
        rec.kind = AstTypeKind.Record;
        return rec;
    }

    // Value space

    rulePrimaryExpression(parseTrail: boolean): Ast {
        var ret: Ast;
        switch (this.tt) {
            case Token.ConstInt:
                ret = { kind: AstKind.ConstNum, value: <number>this.next() };
                break;
            case Token.Ident:
            case Token.TypeIdent:
                ret = { kind: AstKind.Name, name: <string>this.next() };
                break;
            case Token.Colon:
                this.next();
                var t = this.typeExpression();
                ret = { kind: AstKind.AstTypeVal, typeVal: t };
                break;
            case Token.LParen:
                this.next();
                ret = this.ruleExpression();
                this.expect(Token.RParen);
                break;
            case Token.LBrace:
                ret = this.ruleLambda();
                break;
            case Token.LBracket:
                ret = this.ruleRecord(Token.LBracket, Token.RBracket);
                break;
            default:
                throw "Unexpected token " + Token[this.tt] + " in primary expression";
        }

        if (parseTrail)
            ret = this.rulePrimaryExpressionTrail(ret);
        return ret;
    }

    ruleRecord(l: Token, r: Token): AstRecord {
        this.expect(l);
        var b = this.ruleLambdaBody();
        if (b.p.length)
            throw "Parameters not allowed in a record"; // TODO: Pass whether parameters are allowed to ruleLambdaBody
        this.expect(r);
        delete b.p;
        var rec = <AstRecord><any>b;
        rec.kind = AstKind.Record;
        return rec;
    }

    rulePrimaryExpressionTrail(ret: Ast): Ast {
        while (true) {
            switch (this.tt) {
                case Token.LParen:
                    var r = this.ruleRecord(Token.LParen, Token.RParen);
                    ret = addParameters(ret, r.f);
                    break;

                case Token.LBracket:
                case Token.LBrace:
                case Token.Ident:
                    var e = this.rulePrimaryExpression(false);
                    ret = addParameters(ret, [{ name: null, value: e }]);
                    break;

                default:
                    return ret;
            }
        }
    }

    ruleExpressionRest(lhs: Ast, minPred: number): Ast {
        while (this.tt === Token.OpIdent) {
            var pred = this.tokenPrec;
            if (pred < minPred) break;

            var op = this.next();
            var rhs = this.rulePrimaryExpression(true);

            while (this.tt === Token.OpIdent) {
                var pred2 = this.tokenPrec;
                if (pred2 < pred) break;
                rhs = this.ruleExpressionRest(rhs, pred2);
            }

            lhs = astApp(astName(op), [{ name: null, value: rhs }, { name: null, value: lhs }]);
        }

        return lhs;
    }

    ruleExpression(): Ast {
        var p = this.rulePrimaryExpression(true);
        var e = this.ruleExpressionRest(p, 0);

        if (this.test(Token.Equal)) {
            var pv = this.rulePrimaryExpression(true);
            var ev = this.ruleExpressionRest(pv, 0);

            e = { kind: AstKind.Match, pattern: e, value: ev };
        }
        
        // TODO: Types
        
        return e;
    }

    ruleExpressionOrBinding(): FieldPair {
        var e = <AstMatch>this.ruleExpression();
        if (e.kind === AstKind.Match) {
            return { name: e.pattern, value: e.value };
        } else {
            return { name: null, value: e };
        }
    }

    ruleLambda(): Ast {
        this.expect(Token.LBrace);
        var r = <AstLambda>this.ruleLambdaBody();
        this.expect(Token.RBrace);
        r.kind = AstKind.Lambda;
        return r;
    }

    ruleLambdaBody(): { p: FieldPair[]; f: FieldPair[] } {
        var params: FieldPair[] = [], fields: FieldPair[] = [];
        var seenParams = false;

        this.beginIndent();

        while (true) {
            while (this.test(Token.Comma)) {
                // Nothing
            }

            if (this.tt === Token.RBrace || this.tt === Token.RParen || this.tt === Token.RBracket || this.tt === Token.Eof) {
                break;
            }

            var e = this.ruleExpressionOrBinding();
            console.log('After ruleExpressionOrBinding:', Token[this.tt]);

            fields.push(e);

            if (this.test(Token.Arrow)) {
                if (seenParams) {
                    throw "Duplicate parameter block";
                }
                seenParams = true;
                params = td.map(fields, x => {
                    if (x.value.kind !== AstKind.Name) { throw "Expected name"; }
                    return { name: x.value, value: null };
                });
            } else if (this.tt !== Token.Comma) {
                break;
            }
        }

        this.endIndent();

        return { p: params, f: fields };
    }

    ruleModule(): Module {
        var r = this.ruleLambdaBody();
        console.log(r);
        this.expect(Token.Eof);
        var m = <Module>r;
        m.kind = AstKind.Lambda;
        m.name = "";
        return m;
    }
}

/*
f = foo
  bar

f = [ a = 1
      b = 2 ]

*/