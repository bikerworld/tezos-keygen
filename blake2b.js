/* ================================================================
   BLAKE2b in pure JavaScript — adapted from blakejs (MIT, DC)
   Ref: RFC 7693. Only blake2b(input, key, outlen) is exposed.
   ================================================================ */
var blake2b = (function () {
    'use strict';

    /* Initialization vectors (fractional parts of sqrt of the first 8 primes) */
    var IV = new Uint32Array([
        0xF3BCC908, 0x6A09E667,
        0x84CAA73B, 0xBB67AE85,
        0xFE94F82B, 0x3C6EF372,
        0x5F1D36F1, 0xA54FF53A,
        0xADE682D1, 0x510E527F,
        0x2B3E6C1F, 0x9B05688C,
        0xFB41BD6B, 0x1F83D9AB,
        0x137E2179, 0x5BE0CD19
    ]);

    /* Sigma permutation table (12 rounds × 16 message word indices) */
    var SIGMA8 = [
         0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15,
        14,10, 4, 8, 9,15,13, 6, 1,12, 0, 2,11, 7, 5, 3,
        11, 8,12, 0, 5, 2,15,13,10,14, 3, 6, 7, 1, 9, 4,
         7, 9, 3, 1,13,12,11,14, 2, 6, 5,10, 4, 0,15, 8,
         9, 0, 5, 7, 2, 4,10,15,14, 1,11,12, 6, 8, 3,13,
         2,12, 6,10, 0,11, 8, 3, 4,13, 7, 5,15,14, 1, 9,
        12, 5, 1,15,14,13, 4,10, 0, 7, 6, 3, 9, 2, 8,11,
        13,11, 7,14,12, 1, 3, 9, 5, 0,15, 4, 8, 6, 2,10,
         6,15,14, 9,11, 3, 0, 8,12, 2,13, 7, 1, 4,10, 5,
        10, 2, 8, 4, 7, 6, 1, 5,15,11, 9,14, 3,12,13, 0,
         0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15,
        14,10, 4, 8, 9,15,13, 6, 1,12, 0, 2,11, 7, 5, 3
    ];
    /* x2 because each 64-bit word occupies 2 uint32 slots in v/m */
    var SIGMA82 = new Uint8Array(SIGMA8.map(function(x){ return x*2; }));

    /* Reusable working arrays */
    var v = new Uint32Array(32);  /* extended state vector (16 x 64-bit words) */
    var m = new Uint32Array(32);  /* current message block */

    /* 64-bit addition: v[a:a+2] += v[b:b+2] */
    function ADD64AA(a, b) {
        var oa = v[a];
        var lo = (oa + v[b]) >>> 0;
        v[a+1] = (v[a+1] + v[b+1] + (lo < oa ? 1 : 0)) >>> 0;
        v[a] = lo;
    }

    /* 64-bit addition with constant: v[a:a+2] += [b0, b1] */
    function ADD64AC(a, b0, b1) {
        var oa = v[a];
        var lo = (oa + b0) >>> 0;
        v[a+1] = (v[a+1] + b1 + (lo < oa ? 1 : 0)) >>> 0;
        v[a] = lo;
    }

    /* G mixing function (RFC 7693 §3.1) */
    function G(a, b, c, d, ix, iy) {
        var x0=m[ix], x1=m[ix+1], y0=m[iy], y1=m[iy+1], t0, t1;

        ADD64AA(a,b); ADD64AC(a,x0,x1);
        /* ROR64(-32): swap the two halves */
        t0=v[d]^v[a]; t1=v[d+1]^v[a+1]; v[d]=t1; v[d+1]=t0;

        ADD64AA(c,d);
        /* ROR64(-24) */
        t0=v[b]^v[c]; t1=v[b+1]^v[c+1];
        v[b]=((t0>>>24)|(t1<<8))>>>0; v[b+1]=((t1>>>24)|(t0<<8))>>>0;

        ADD64AA(a,b); ADD64AC(a,y0,y1);
        /* ROR64(-16) */
        t0=v[d]^v[a]; t1=v[d+1]^v[a+1];
        v[d]=((t0>>>16)|(t1<<16))>>>0; v[d+1]=((t1>>>16)|(t0<<16))>>>0;

        ADD64AA(c,d);
        /* ROR64(-63) = ROL64(+1) */
        t0=v[b]^v[c]; t1=v[b+1]^v[c+1];
        v[b]=((t0<<1)|(t1>>>31))>>>0; v[b+1]=((t1<<1)|(t0>>>31))>>>0;
    }

    /* Compress a 128-byte block */
    function compress(ctx, last) {
        var i, s, j;
        for (i=0; i<16; i++) { v[i]=ctx.h[i]; v[i+16]=IV[i]; }
        v[24]^=ctx.t[0]; v[25]^=ctx.t[1];
        v[26]^=ctx.t[2]; v[27]^=ctx.t[3];
        if (last) { v[28]^=0xFFFFFFFF; v[29]^=0xFFFFFFFF; }
        for (i=0; i<32; i++) {
            j=4*i;
            m[i]=((ctx.b[j])|(ctx.b[j+1]<<8)|(ctx.b[j+2]<<16)|(ctx.b[j+3]<<24))>>>0;
        }
        for (i=0; i<12; i++) {
            s=i*16;
            G( 0, 8,16,24,SIGMA82[s],   SIGMA82[s+1]);
            G( 2,10,18,26,SIGMA82[s+2], SIGMA82[s+3]);
            G( 4,12,20,28,SIGMA82[s+4], SIGMA82[s+5]);
            G( 6,14,22,30,SIGMA82[s+6], SIGMA82[s+7]);
            G( 0,10,20,30,SIGMA82[s+8], SIGMA82[s+9]);
            G( 2,12,22,24,SIGMA82[s+10],SIGMA82[s+11]);
            G( 4,14,16,26,SIGMA82[s+12],SIGMA82[s+13]);
            G( 6, 8,18,28,SIGMA82[s+14],SIGMA82[s+15]);
        }
        for (i=0; i<16; i++) ctx.h[i]^=v[i]^v[i+16];
    }

    /* Public entry point: blake2b(input: Uint8Array, key: Uint8Array|null, outlen: number) */
    return function blake2b(input, key, outlen) {
        outlen = outlen || 64;
        var keylen = key ? key.length : 0;

        var ctx = {
            b: new Uint8Array(128),
            h: new Uint32Array(16),
            t: new Uint32Array(4),
            c: 0,
            outlen: outlen
        };

        for (var i=0; i<16; i++) ctx.h[i]=IV[i];
        ctx.h[0]^=(0x01010000^(keylen<<8)^outlen);

        if (keylen > 0) {
            for (var j=0; j<keylen; j++) ctx.b[j]=key[j];
            ctx.c=128;
        }

        for (var k=0; k<input.length; k++) {
            if (ctx.c===128) {
                var old0=ctx.t[0];
                ctx.t[0]=(old0+128)>>>0;
                if (ctx.t[0]<old0) ctx.t[1]=(ctx.t[1]+1)>>>0;
                compress(ctx,false);
                ctx.c=0;
            }
            ctx.b[ctx.c++]=input[k];
        }

        var oldf=ctx.t[0];
        ctx.t[0]=(oldf+ctx.c)>>>0;
        if (ctx.t[0]<oldf) ctx.t[1]=(ctx.t[1]+1)>>>0;
        while (ctx.c<128) ctx.b[ctx.c++]=0;
        compress(ctx,true);

        var out=new Uint8Array(outlen);
        for (var n=0; n<outlen; n++) out[n]=ctx.h[n>>2]>>(8*(n&3));
        return out;
    };
})();
