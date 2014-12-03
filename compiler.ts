import P = require("parser")

class Compiler {
    mods: P.Module[];

    constructor() {
        this.mods = [];
    }

    resolve(m: P.Ast) {
        P.astPostorder(m, a => {
            switch (a.kind) {
                case P.AstKind.Name: {
                    var name = <P.AstName>a;
                    break;
                }
            }
            return null;
        });
    }
}