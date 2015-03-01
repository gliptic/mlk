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
var charDash = '-'.charCodeAt(0);
var charUnderscore = '_'.charCodeAt(0);
var charDot = '.'.charCodeAt(0);
var charApostrophe = '\''.charCodeAt(0);
var charQuote = '"'.charCodeAt(0);
var charBackslash = '\\'.charCodeAt(0);
var charSlash = '/'.charCodeAt(0);
var charGt = '>'.charCodeAt(0);
var charLt = '<'.charCodeAt(0);
var charEqual = '='.charCodeAt(0);
var isWhitespace = [];
isWhitespace[Space] = true;
isWhitespace[Tab] = true;
isWhitespace[CR] = true;
isWhitespace[LF] = true;

export function assert(condition: any, message?: string) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

export enum Token {
    Comma = 0,
    Colon,
    Semicolon,
    Dot,
    Bar,
    Underscore,
    Ident,
    OpIdent,
    ConstInt,
    ConstString,
    LBrace,
    RBrace,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Equal,
    Arrow,
    DoubleBackslash,
    Invalid,
    Eof,

    SlashGt,
    Gt,
    Lt,
    LtSlash
}

// Ast
export enum AstKind {
    ConstNum,
    ConstString,
    Name,
    Match,
    App,
    Lambda,
    Record,
    ValRef,
    ParRef,
    ValOfType,
    
    TypeAny,
    TypePrim,
    TypeUnit,
    TypeName,
    TypeApp,
    TypeLambda,
    TypeRecord,
    TypeValOfType,
    TypeNamed
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

export enum ScanState {
    NotScanned = 0,
    Scanning,
    Scanned
}

export interface Scope {
    symbols: any;
    parent: Scope;
}

export interface Case extends Scope {
    p?: FieldPair[];
    f?: FieldPair[];
}

export interface AstLambda extends Ast {
    cases: Case[];
    scanState: ScanState;
}

export interface AstRecord extends Ast {
    f: FieldPair[];
}

export interface AstTypeVal extends Ast {
    typeVal: AstType;
}

export interface AstValRef extends Ast {
    name: string;
}

export interface FieldPair {
    name: Ast;
    value: Ast;
    type?: AstType; // Only used for parameters
}

function astName(name: string): AstName {
    assert(name);
    return { kind: AstKind.Name, name: name };
}

function astTypeName(name: string): AstType {
    assert(name);
    return { kind: AstKind.TypeName, name: name };
}

function astApp(f: Ast, params: FieldPair[]): AstApp {
    return { kind: AstKind.App, f: f, params: params };
}

function astTypeApp(f: AstType, params: TypeFieldPair[]): AstTypeApp {
    return { kind: AstKind.TypeApp, f: f, params: params };
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
    value?: Ast;
}

export interface AstType {
    kind: AstKind;
}

export interface AstTypeName extends AstType {
    name: string;
}

export interface AstTypeNamed extends AstType {

}

export interface AstTypeLambda extends AstType {
    p: TypeFieldPair[];
    r: AstType;
}

export interface AstTypeRecord extends AstType {
    f: TypeFieldPair[];
}

export interface AstTypeApp extends AstType {
    f: AstType;
    params: TypeFieldPair[];
}

function addTypeParameters(dest: AstType, params: TypeFieldPair[]): AstTypeApp {
    if (dest.kind === AstKind.TypeApp) {
        var a = <AstTypeApp>dest;
        a.params = a.params.concat(params);
        return a;
    } else {
        return { kind: AstKind.TypeApp, f: dest, params: params };
    }
}

var typeAny: AstType = { kind: AstKind.TypeAny },
    typeUnit: AstType = { kind: AstKind.TypeUnit };

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

            return traverseArray(lambda.cases, x =>
                       traverseArray(x.p, v => f(v.value))
                    || traverseArray(x.f, v => f(v.value)));
        }

        case AstKind.Record: {
            var record = <AstRecord>x;

            return traverseArray(record.f, x => f(x.value));
        }

        case AstKind.Name:
        case AstKind.ConstNum:
        case AstKind.ConstString:
        case AstKind.ValOfType:
        case AstKind.ValRef:
            return;

        default:
            throw "Unimplemented in traverseValues: " + AstKind[x.kind];
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

            return traverseArray(lambda.cases, x =>
                       traverseArray(x.p, v => f(v.name))
                    || traverseArray(x.f, v => f(v.name)));
        }

        case AstKind.Record: {
            var record = <AstRecord>x;

            return traverseArray(record.f, x => f(x.name));
        }

        case AstKind.Name:
        case AstKind.ConstNum:
        case AstKind.ValOfType:
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

            for (var ic = 0, ec = lambda.cases.length; ic < ec; ++ic) {
                var c = lambda.cases[i];

                for (var i = 0, e = c.p.length; i < e; ++i) {
                    var v = c.p[i];
                    if (traverse(v.name, TraverseKind.Name, enter, exit)
                     || traverse(v.value, kind, enter, exit))
                        return true;
                }

                for (var i = 0, e = c.f.length; i < e; ++i) {
                    var v = c.f[i];
                    if (traverse(v.name, TraverseKind.Name, enter, exit)
                     || traverse(v.value, kind, enter, exit))
                        return true;
                }
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
    tokenBeg: number;
    beginLine: number;
    curIndent: number;
    firstOnLine: boolean;
    prevIndent: number;
    prevArrowIndent: number;
    indents: number[];
    currentLine: number;
    tokenData: any;
    tokenPrec: number;
    tt: Token;
    currentScope: Scope;
        
    constructor(source: string) {
        this.source = source;
        this.sourcePos = 0;
        this.sourceLen = source.length;
        this.precedence = [];
        this.currentLine = 0;
        this.precedence['='.charCodeAt(0)] = 1;
        this.precedence['&'.charCodeAt(0)] = 1;
        this.precedence['<'.charCodeAt(0)] = 2;
        this.precedence['>'.charCodeAt(0)] = 2;
        this.precedence['+'.charCodeAt(0)] = 3;
        this.precedence['-'.charCodeAt(0)] = 3;
        this.precedence['*'.charCodeAt(0)] = 4;
        this.precedence['/'.charCodeAt(0)] = 4;
        this.precedence['\\'.charCodeAt(0)] = 4;
        this.beginLine = 0;
        this.prevArrowIndent = -1;
        this.firstOnLine = true;

        this.nextch();
        this.skipWs();
        
        this.indents = [];
        this.tokenBeg = this.sourcePos - 1;
        this.prevIndent = -1;
        this.curIndent = this.beginCol();

        this.next();
    }

    beginCol() {
        return this.tokenBeg - this.beginLine;
    }

    // TODO: This can be called even if no error will ultimately result
    unexpectedChar() {
        console.log("Unexpected character", String.fromCharCode(this.c));
        this.tt = Token.Invalid;
    }

    nextch() {
        this.c = this.sourcePos >= this.sourceLen ? 0 : this.source.charCodeAt(this.sourcePos);
        ++this.sourcePos;
    }

    nextMarkup(): any {
        var data = this.tokenData;
        this.tokenBeg = this.sourcePos - 1;

        if ((this.c >= chara && this.c <= charz)
         || (this.c >= charA && this.c <= charZ)
         ||  this.c === charDash || this.c === charUnderscore) {
            var ident = '';
            while ((this.c >= chara && this.c <= charz)
                || (this.c >= charA && this.c <= charZ)
                ||  this.c === charDash || this.c === charUnderscore) {
                ident += String.fromCharCode(this.c);
                this.nextch();
            }

            this.tokenData = ident;
            this.tt = Token.Ident;
        } else if (this.c === charDot) {
            this.nextch();
            this.tt = Token.Dot;
        } else if (this.c === charSlash) {
            this.nextch();
            if (this.c === charGt) {
                this.nextch();
                this.tt = Token.SlashGt;
            } else {
                this.unexpectedChar();
            }
        } else if (this.c === charGt) {
            this.nextch();
            this.tt = Token.Gt;
        } else if (this.c === charLt) {
            this.nextch();
            if (this.c === charSlash) {
                this.nextch();
                this.tt = Token.LtSlash;
            } else {
                this.tt = Token.Lt;
            }
        } else if (this.c === charEqual) {
            this.nextch();
            this.tt = Token.Equal;
        }

        this.skipWs();
        return data;
    }

    skipWs() {
        var newline = false;
        while (isWhitespace[this.c]) {
            if (this.c === CR || this.c === LF) {
                this.beginLine = this.sourcePos;
                newline = true;
            }
            this.nextch();
        }

        if (newline) {
            this.firstOnLine = true;
            this.curIndent = this.sourcePos - 1 - this.beginLine;
        }
    }

    next() {
        var data = this.tokenData;
        this.tokenBeg = this.sourcePos - 1;

        if (this.firstOnLine && this.c !== 0) {
            this.firstOnLine = false;
            var beginCol = this.beginCol();
            if (beginCol <= this.prevArrowIndent) {
                this.tt = Token.Semicolon;
                return data;
            } else if (beginCol <= this.prevIndent) {
                this.tt = Token.Comma;
                return data;
            }
        }

        if ((this.c >= chara && this.c <= charz)
         || (this.c >= charA && this.c <= charZ)
         ||  this.c === charDot) {
            var ident = '';
            do {
                ident += String.fromCharCode(this.c);
                this.nextch();
            } while ((this.c >= chara && this.c <= charz)
                  || (this.c >= charA && this.c <= charZ)
                  || (this.c >= char0 && this.c <= char9));

            this.tokenData = ident;
            this.tt = Token.Ident;
        } else if (this.c >= char0 && this.c <= char9) {
            var text = '';
            while ((this.c >= char0 && this.c <= char9)) {
                text += String.fromCharCode(this.c);
                this.nextch();
            }

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
                case ';': this.tt = Token.Semicolon; break;
                case ',': this.tt = Token.Comma; break;
                case '.': this.tt = Token.Dot; break;
                case '|': this.tt = Token.Bar; break;
                case '\'':
                    var ident = '';
                    while (this.c != charApostrophe && this.c) {
                        ident += String.fromCharCode(this.c);
                        this.nextch();
                    }
                    this.nextch();
                    this.tokenData = ident;
                    this.tt = Token.Ident;
                    break;
                case '"':
                    var ident = '';
                    while (this.c != charQuote && this.c) { // TODO: Escape seqs
                        ident += String.fromCharCode(this.c);
                        this.nextch();
                    }
                    if (this.c !== charQuote)
                        throw "Expected end quote";
                    this.nextch();
                    this.tokenData = ident;
                    this.tt = Token.ConstString;
                    break;
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
                        } else if (ident === '->') {
                            this.tt = Token.Arrow;
                        } else if (ident === '\\\\') {
                            this.tt = Token.DoubleBackslash;
                        } else {
                            this.tokenData = ident;
                            this.tokenPrec = prec;
                            this.tt = Token.OpIdent;
                        }
                    } else {
                        this.unexpectedChar();
                    }
                    break;
            }
        }

        this.skipWs();
        return data;
    }

    private expect(t: Token): any {
        if (this.tt !== t) {
            throw 'Parse error. Expected ' + Token[t] + ', got ' + Token[this.tt];
        }
        return this.next();
    }

    private expectPeek(t: Token) {
        if (this.tt !== t) {
            throw 'Parse error. Expected ' + Token[t] + ', got ' + Token[this.tt];
        }
    }

    private expectMarkup(t: Token): any {
        if (this.tt !== t) {
            throw 'Parse error. Expected ' + Token[t] + ', got ' + Token[this.tt];
        }
        return this.nextMarkup();
    }

    private test(t: Token): boolean {
        return this.tt === t ? (this.next(), true) : false;
    }

    private testMarkup(t: Token): boolean {
        return this.tt === t ? (this.nextMarkup(), true) : false;
    }

    // Type space

    // Needs this.next() after
    typePrimaryExpressionDelimited(): AstType {
        var ret: AstType;
        switch (this.tt) {
            case Token.Ident:
                ret = { kind: AstKind.TypeName, name: <string>this.tokenData };
                break;

            case Token.LBrace:
                ret = this.typeLambdaDelimited();
                break;

            case Token.LBracket:
                ret = this.typeRecordDelimited(Token.LBracket, Token.RBracket);
                break;

            case Token.LParen:
                this.next();
                ret = this.typeExpression();
                this.expectPeek(Token.RParen);
                break;

            case Token.OpIdent:
                var op = this.next();
                var rest = this.typePrimaryExpressionDelimited();
                return astTypeApp(astTypeName(op), [{ name: null, type: rest }]);

            default:
                throw "Unexpected token " + Token[this.tt] + " in primary type expression";
        }

        return ret;
    }

    typePrimaryExpressionTail(ret: AstType): AstType {
        this.next();
        while (true) {
            switch (this.tt) {
                case Token.LParen:
                    var r = this.typeRecordDelimited(Token.LParen, Token.RParen);
                    this.next();
                    ret = addTypeParameters(ret, r.f);
                    break;

                case Token.LBracket:
                case Token.LBrace:
                case Token.Ident:
                    var e = this.typePrimaryExpressionDelimited();
                    this.next();
                    ret = addTypeParameters(ret, [{ name: null, type: e, value: null }]);
                    break;

                default:
                    return ret;
            }
        }
    }

    typeExpression(): AstType {
        var p = this.typePrimaryExpressionDelimited();
        p = this.typePrimaryExpressionTail(p);

        return p;
    }

    typeExpressionOrBinding(): TypeFieldPair {
        var a = this.typeExpression();

        if (this.tt === Token.Colon || this.tt === Token.Equal) {
            if (a.kind !== AstKind.TypeName) {
                throw "Type binding must be a name";
            }

            var name = (<AstTypeName>a).name;

            var t = typeAny, e: Ast = null;

            if (this.test(Token.Colon)) {
                t = this.typeExpression();
            }

            if (this.test(Token.Equal)) {
                e = this.ruleExpression();
            }

            return { name: name, type: t, value: e };
        } else {
            return { name: null, type: a, value: null };
        }
    }

    typePair(t: AstType): TypeFieldTypePair {
        // TODO
        return null;
    }

    typeRecordBody(): AstTypeRecord {
        var fields: TypeFieldPair[] = [];

        var oldPrevIndent = this.prevIndent;
        var oldPrevArrowIndent = this.prevArrowIndent;
        this.prevIndent = this.curIndent;
        this.prevArrowIndent = -1; // Do not insert ;

        while (true) {
            while (this.tt === Token.Comma) {
                this.next();
            }

            if (this.tt === Token.RBrace || this.tt === Token.RParen || this.tt === Token.RBracket || this.tt === Token.Eof) {
                break;
            }

            var e = this.typeExpressionOrBinding();

            fields.push(e);

            if (this.tt !== Token.Comma) {
                break;
            }
        }

        this.prevIndent = oldPrevIndent;
        this.prevArrowIndent = oldPrevArrowIndent;
        
        return { kind: AstKind.TypeRecord, f: fields };
    }

    typeLambdaBody(): { p: TypeFieldPair[]; r: AstType } {
        var params: TypeFieldPair[] = [], fields: TypeFieldPair[] = [];
        var seenParams = false;

        var oldPrevIndent = this.prevIndent;
        var oldPrevArrowIndent = this.prevArrowIndent;
        this.prevIndent = this.curIndent;
        this.prevArrowIndent = -1; // Do not insert ;

        while (true) {
            while (this.tt === Token.Comma) {
                this.next();
            }

            if (this.tt === Token.RBrace || this.tt === Token.RParen || this.tt === Token.RBracket || this.tt === Token.Eof) {
                break;
            }

            var e = this.typeExpressionOrBinding();

            fields.push(e);

            if (this.tt === Token.Arrow) {
                this.prevIndent = this.curIndent;
                this.next();

                if (seenParams) {
                    throw "Only one parameter block allowed in a function type";
                }
                seenParams = true;
                params = fields;
                fields = [];
            } else if (this.tt !== Token.Comma && this.tt !== Token.Semicolon) {
                break;
            }
        }

        this.prevIndent = oldPrevIndent;
        this.prevArrowIndent = oldPrevArrowIndent;

        console.log("fields.length", fields.length);

        var rtype;
        if (fields.length > 1) {
            throw "Only one type allowed in return type of function type";
        } else if (fields.length < 1) {
            rtype = typeUnit;
        } else {
            rtype = fields[0];
        }

        return { p: params, r: rtype };
    }

    // Needs this.next() after
    typeLambdaDelimited() {
        this.expect(Token.LBrace);
        var r = <AstTypeLambda>this.typeLambdaBody();
        this.expectPeek(Token.RBrace);
        r.kind = AstKind.TypeLambda;
        return r;
    }

    // Needs this.next() after
    typeRecordDelimited(l: Token, r: Token): AstTypeRecord {
        this.expect(l);
        var b = this.typeRecordBody();
        this.expectPeek(r);
        return b;
    }

    rulePrimaryMarkupDelimited(): Ast {
        this.nextMarkup();
        var tagName: string;
        if (this.tt === Token.Ident) {
            tagName = <string>this.nextMarkup();
        }

        var classes = '';
        var classMode = false;

        while (true) {
            if (this.tt === Token.Dot) {
                this.nextMarkup();
                if (this.tt !== Token.Ident)
                    throw 'Expected class name';
                classes += ' ' + this.nextMarkup();
                classMode = true;
            } else {
                break;
            }
        }

        var args: FieldPair[] = [];

        if (classes) {
            args.push({ name: astName('class'), value: <Ast>{ kind: AstKind.ConstString, value: classes } });
        }

        while (this.tt === Token.Ident) {
            var attrName = <string>this.nextMarkup();
            this.expectPeek(Token.Equal);
            this.next();
            var attrValue = this.rulePrimaryExpressionDelimited();
            this.nextMarkup();
            args.push({ name: astName(attrName), value: attrValue });
        }

        // <a b=c />  ->  a(b = c)

        if (this.tt === Token.SlashGt) {
            /* Nothing to do */
        } else if (this.test(Token.Gt)) { // We use normal lexer here because it can handle <, </ and primary expressions
            var children: FieldPair[] = [];
            while (true) {
                while (this.test(Token.Comma)) /* Nothing */;

                var child;
                if (this.tt === Token.OpIdent && this.tokenData === '<') {
                    child = this.rulePrimaryMarkupDelimited();
                    this.next();
                } else if (this.tt === Token.OpIdent && this.tokenData === '</') {
                    this.nextMarkup();
                    var endTagName = this.expectMarkup(Token.Ident);
                    if (tagName !== endTagName) {
                        throw "Mismatch in end tag. Expected " + tagName + ", got " + endTagName;
                    }
                    this.expectPeek(Token.Gt); // Delimited
                    break;
                } else {
                    child = this.rulePrimaryExpressionDelimited();
                    this.next();
                }

                children.push({
                    name: null, value: child
                });
            }
            args.push({ name: astName('children'), value: { kind: AstKind.Record, f: children } });
        } else {
            throw "Expected end of tag";
        }

        return astApp(astName(tagName), args);
    }

    // Value space
    // Needs this.next() after
    rulePrimaryExpressionDelimited(): Ast {
        switch (this.tt) {
            case Token.ConstInt:    return { kind: AstKind.ConstNum, value: <number>this.tokenData };
            case Token.ConstString: return { kind: AstKind.ConstString, value: <string>this.tokenData };
            case Token.Ident:       return { kind: AstKind.Name, name: <string>this.tokenData };
            case Token.Colon:
                this.next();
                var t = this.typePrimaryExpressionDelimited();
                return { kind: AstKind.ValOfType, typeVal: t };
            case Token.LParen:
                this.next();
                var ret = this.ruleExpression();
                this.expectPeek(Token.RParen);
                return ret;
            case Token.LBrace:
                return this.ruleLambdaDelimited();
            case Token.LBracket:
                return this.ruleRecordDelimited(Token.LBracket, Token.RBracket);
            case Token.OpIdent:
                if (this.tokenData === '<') {
                    return this.rulePrimaryMarkupDelimited();
                } else {
                    var op = this.next();
                    var rest = this.rulePrimaryExpressionDelimited();
                    return astApp(astName(op), [{ name: null, value: rest }]);
                }
            default:
                throw "Unexpected token " + Token[this.tt] + " in primary expression";
        }
    }

    // Needs this.next() after
    ruleRecordDelimited(l: Token, r: Token): AstRecord {
        this.expect(l);
        var b = this.ruleRecordBody();
        this.expectPeek(r);
        return b;
    }

    rulePrimaryExpressionTail(ret: Ast): Ast {
        this.next();
        while (true) {
            switch (this.tt) {
                case Token.LParen:
                    var r = this.ruleRecordDelimited(Token.LParen, Token.RParen);
                    this.next();
                    ret = addParameters(ret, r.f);
                    break;

                case Token.Ident:
                    var name = this.next();
                    ret = astApp(astName(name), [{ name: null, value: ret }]);
                    break;

                case Token.LBracket:
                case Token.LBrace:
                    var e = this.rulePrimaryExpressionDelimited();
                    this.next();
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
            var rhs = this.rulePrimaryExpressionDelimited();
            rhs = this.rulePrimaryExpressionTail(rhs);

            while (this.tt === Token.OpIdent) {
                var pred2 = this.tokenPrec;
                if (pred2 < pred) break;
                rhs = this.ruleExpressionRest(rhs, pred2);
            }

            lhs = astApp(astName(op), [{ name: null, value: rhs }, { name: null, value: lhs }]);
        }

        if (this.test(Token.Colon)) {
            lhs.type = this.typeExpression();
        }

        return lhs;
    }

    ruleExpression(): Ast {
        var p = this.rulePrimaryExpressionDelimited();
        p = this.rulePrimaryExpressionTail(p);
        var e = this.ruleExpressionRest(p, 0);

        if (this.test(Token.Equal)) {
            var pv = this.rulePrimaryExpressionDelimited();
            pv = this.rulePrimaryExpressionTail(pv);
            var ev = this.ruleExpressionRest(pv, 0);

            e = { kind: AstKind.Match, pattern: e, value: ev };
        }
        
        return e;
    }

    ruleExpressionOrBinding(): FieldPair {
        if (this.test(Token.Colon)) {
            var a = this.typeExpression();

            if (this.test(Token.Equal)) {
                var t;

                if (a.kind !== AstKind.TypeName) { // TODO: Support parameters
                    throw "Type binding must be a name";
                }

                var name = (<AstTypeName>a).name;

                if (this.tt === Token.Bar) {
                    var v = [];

                    while (this.test(Token.Bar)) {
                        var tt = this.typeExpression();

                        if (tt.kind !== AstKind.TypeApp && tt.kind !== AstKind.TypeName) {
                            throw "Expected variant";
                        }

                        v.push(tt);
                    }
                } else {
                    t = this.typeExpression();
                }

                return { name: astName(name), value: { kind: AstKind.ValOfType, typeVal: t } };
            } else {
                return { name: null, value: { kind: AstKind.ValOfType, typeVal: t } };
            }
        }

        var e = <AstMatch>this.ruleExpression();
        if (e.kind === AstKind.Match) {
            return { name: e.pattern, value: e.value };
        /*
        } else if (e.type && e.kind === AstKind.Name) { // TODO: Handle other patterns than names
            var type = e.type;
            e.type = null; // Don't leave traces in pattern
            return { name: e, value: e.value, type: e.type };
            */
        } else {
            return { name: null, value: e };
        }
    }

    ruleLambdaDelimited(): Ast {
        this.expect(Token.LBrace);
        var r = this.ruleLambdaBody();
        this.expectPeek(Token.RBrace);
        r.scanState = ScanState.NotScanned;
        return r;
    }

    ruleRecordBody(): AstRecord {
        var fields: FieldPair[] = [];

        var oldPrevIndent = this.prevIndent;
        var oldPrevArrowIndent = this.prevArrowIndent;
        this.prevIndent = this.curIndent;
        this.prevArrowIndent = -1; // Do not insert ;

        while (true) {
            while (this.tt === Token.Comma) {
                this.next();
            }

            if (this.tt === Token.RBrace || this.tt === Token.RParen || this.tt === Token.RBracket || this.tt === Token.Eof) {
                break;
            }

            var e = this.ruleExpressionOrBinding();

            fields.push(e);

            if (this.tt !== Token.Comma) {
                break;
            }
        }

        this.prevIndent = oldPrevIndent;
        this.prevArrowIndent = oldPrevArrowIndent;

        return { kind: AstKind.Record, f: fields };
    }

    ruleLambdaBody(): AstLambda {
        var params: FieldPair[] = [], fields: FieldPair[] = [];
        var seenParams = false;

        var cases: Case[] = [];

        var oldPrevIndent = this.prevIndent;
        var oldPrevArrowIndent = this.prevArrowIndent;
        var oldCurIndent = this.curIndent;
        this.prevIndent = oldCurIndent;
        this.prevArrowIndent = oldPrevIndent;

        var parentScope = this.currentScope;

        var c: Case = { symbols: {}, parent: parentScope };
        var lambda = { kind: AstKind.Lambda, cases: cases, scanState: ScanState.NotScanned };

        this.currentScope = c;

        function flushCase() {
            if (fields.length > 0 || params.length > 0) {
                c.p = params;
                c.f = fields;
                cases.push(c);
                fields = [];
                params = [];

                c = { symbols: {}, parent: parentScope };
                this.currentScope = c;
            }
        }

        while (true) {
            while (true) {
                if (this.tt === Token.Semicolon) {
                    if (seenParams) {
                        // Reverse '->' changes
                        this.prevIndent = this.prevArrowIndent;
                        this.prevArrowIndent = oldPrevIndent;
                        
                        seenParams = false;
                    }

                    flushCase();
                } else if (this.tt !== Token.Comma) {
                    break;
                }

                this.next();
            }

            if (this.tt === Token.RBrace || this.tt === Token.RParen || this.tt === Token.RBracket || this.tt === Token.Eof) {
                break;
            }

            var e = this.ruleExpressionOrBinding();

            fields.push(e);

            if (this.test(Token.DoubleBackslash)) {
                // TODO: Convert to a post-processing step
                var name = e.name;
                e.name = null;

                flushCase();
                cases = [];
                var newLambda = { kind: AstKind.Lambda, cases: cases, scanState: ScanState.NotScanned };

                e.value = addParameters(e.value, [{ name: name, value: newLambda }]);

                seenParams = true;
                params.push({ name: name, value: null });
            } else if (this.tt === Token.Arrow) {
                this.prevArrowIndent = this.prevIndent;
                this.prevIndent = this.curIndent;

                this.next();

                if (seenParams) {
                    throw "Additional parameter blocks must be preceded by ';'";
                }
                seenParams = true;
                params = td.map(fields, x => {
                    if (x.name && x.name.kind === AstKind.Name) {
                        return { name: x.name, value: x.value, type: x.name.type };
                    }
                    if (x.value && x.value.kind === AstKind.Name) {
                        return { name: x.value, value: null, type: x.value.type };
                    }
                    throw "Expected name";
                });
                fields.length = 0;
            } else if (this.tt !== Token.Comma && this.tt !== Token.Semicolon) {
                break;
            }
        }

        flushCase();
        
        this.prevIndent = oldPrevIndent;
        this.prevArrowIndent = oldPrevArrowIndent;
        
        return lambda;
    }

    ruleModule(): Module {
        this.currentScope = {
            parent: null,

            // TODO: Two different symbol namespaces for types vs. values

            symbols: {
                i32: { kind: AstKind.TypePrim, float: false, bits: 32, signed: true },
                f64: { kind: AstKind.TypePrim, float: true, bits: 64, signed: true },
                '&': { kind: AstKind.TypeLambda }, // TODO: & needs to be overloaded

                'if': { kind: AstKind.Lambda },
                'else': { kind: AstKind.Lambda },
                '<': { kind: AstKind.Lambda },
                '+': { kind: AstKind.Lambda },
                '-': { kind: AstKind.Lambda },
            }
        };

        var r = this.ruleLambdaBody();
        console.log(r);
        this.expect(Token.Eof);
        var m = <Module>r;
        m.name = "";
        return m;
    }
}
