import td = require("transducers");

var Space = ' '.charCodeAt(0);
var Tab = '\t'.charCodeAt(0);
var CR = '\r'.charCodeAt(0);
var LF = '\r'.charCodeAt(0);
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

export enum AstKind {
    ConstNum,
    Call,
    Name,
    Match,
    App
}

interface Ast {
    kind: AstKind;
}

interface AstName extends Ast {
    name: string;
}

interface AstApp extends Ast {
    f: Ast;
    params: FieldPair[];
}

interface AstConst extends Ast {
    v: number;
}

interface AstMatch extends Ast {
    pattern: Ast;
    value: Ast;
}

interface FieldPair {
    name: Ast;
    value: Ast;
}

function astName(name: string): AstName {
    return { kind: AstKind.Name, name: name };
}

function astApp(f: Ast, params: FieldPair[]): AstApp {
    return { kind: AstKind.Name, f: f, params: params };
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

    next() {
        this.beginCol = this.col;
        this.next2();
        this.skipWs();
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
                    this.tt = Token.Comma;
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

            console.log("Ident", ident);
            this.tokenData = ident;
            this.tt = Token.Ident;
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
                            this.tt = Token.Arrow;
                        } else {
                            console.log("OpIdent", ident);
                            this.tokenData = ident;
                            this.tokenPrec = prec;
                            this.tt = Token.OpIdent;
                        }
                    } else {
                        console.log("Unexpected character", c);
                        this.tt = Token.Invalid;
                    }
                    break;
            }
        }
    }

    private expect(t: Token) {
        if (this.tt !== t) {
            throw 'Parse error. Expected ' + Token[t];
        }
        this.next();
    }

    private test(t: Token): boolean {
        return this.tt === t ? (this.next(), true) : false;
    }

    rulePrimaryExpression(): Ast {
        var ret: Ast;
        switch (this.tt) {
            case Token.ConstInt: ret = { kind: AstKind.ConstNum, value: <number>this.tokenData }; this.next(); break;
            case Token.Ident: ret = { kind: AstKind.Name, name: <string>this.tokenData }; this.next(); break;
            default:
                throw "Unexpected in primary expression";
        }

        // TODO: Trail
        return ret;
    }

    ruleExpressionRest(lhs: Ast, minPred: number): Ast {
        while (this.tt === Token.OpIdent) {
            var pred = this.tokenPrec;
            if (pred < minPred) break;

            var op = this.tokenData;
            this.next();
            var rhs = this.rulePrimaryExpression();

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
        var p = this.rulePrimaryExpression();
        var e = this.ruleExpressionRest(p, 0);

        if (this.test(Token.Equal)) {
            var pv = this.rulePrimaryExpression();
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

            fields.push(e);

            if (this.test(Token.Arrow)) {
                if (seenParams) {
                    throw "Duplicate parameter block";
                }
                seenParams = true;
                params = td.seq(fields, td.map((x: Ast) => {
                    if (x.kind !== AstKind.Name) { throw "Expected name"; }
                    return { name: x, value: null };
                }));
            } else if (this.tt !== Token.Comma) {
                break;
            }
        }

        this.endIndent();

        return { p: params, f: fields };
    }

    ruleModule() {
        var r = this.ruleLambdaBody();
        console.log(r);
        this.expect(Token.Eof);
    }
}

/*
f = foo
  bar

f = [ a = 1
      b = 2 ]

*/