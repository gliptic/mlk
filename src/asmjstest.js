function mod(stdlib, foreign, buffer) {
    "use asm";

    var imul = stdlib.Math.imul;
    //var values = new stdlib.Float64Array(buffer);
    var U8 = new stdlib.Uint8Array(buffer);
    var I32 = new stdlib.Int32Array(buffer);
    var lim = 2; // Bitmap size in bytes (0x10000 / 4086 / 8)

    var curpagebyte = 0;

    function init() {
        var i = 0;
        for (; (i | 0) < (lim | 0) ; i = (i + 1) | 0) {
            U8[i] = 0;
        }
    }

    function allocpage() {
        var bits = 0, offs = 0x80, p = 0;
        for (; (U8[curpagebyte >> 0] | 0) == 0xff;) {
            curpagebyte = (curpagebyte + 1) | 0;
        }

        bits = U8[curpagebyte >> 0] | 0;
        p = (curpagebyte << 15);

        while ((bits & offs) != 0) {
            offs = offs >> 1;
            p = (p + 4096) | 0;
        }

        U8[curpagebyte >> 0] = bits | offs;

        return (p + (lim | 0)) | 0;
    }

    function freepage(p) {
        p = p | 0;

        U8[(p >> 15) >> 0] = (U8[(p >> 15) >> 0] & ~(0x80 >> (p & 3)));
    }

    function d(x) {
        x = x | 0;
    }

    function getcurpagebyte() {
        return U8[curpagebyte >> 0] | 0;
        //return curpagebyte|0;
    }

    return {
        init: init,
        allocpage: allocpage,
        freepage: freepage,
        curpagebyte: getcurpagebyte,
        d: d
    }
}

function fibmod(stdlib, foreign, buffer) {
    "use asm";

    var stack = 0x100000;
    var I32 = new stdlib.Int32Array(buffer);

    function fib(x) {
        x = x | 0;
        if ((x | 0) < 3) {
            return 1;
        }
        stack = (stack - 4) | 0;
        I32[stack >> 2] = fib((x - 2) | 0) | 0;
        x = fib((x - 1) | 0) | 0;
        x = ((I32[stack >> 2] | 0) + x) | 0;
        stack = (stack + 4) | 0;
        return x | 0;
    }

    return {
        fib: fib
    };
}

var heap = new ArrayBuffer(0x100000);
var m = mod(window, null, heap);
m.init();
var um = fibmod(window, { allocpage: m.allocpage }, heap);
//var a = um.a();
//var b = um.a();
//console.log(a, b);
for (var i = 0; i < 10; ++i) {
    console.log(um.fib(i));
}