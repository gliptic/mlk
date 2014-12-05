import P = require("parser")

export class Compiler {
    mods: P.Module[];

    constructor() {
        this.mods = [];
    }

    resolve(m: P.Ast) {
        P.traverse(m, P.TraverseKind.Value, (a, k) => {
            switch (a.kind) {
                case P.AstKind.Name: {
                    var name = <P.AstName>a;
                    console.log(name.name);
                    break;
                }
            }
        });
    }
}