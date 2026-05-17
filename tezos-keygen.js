/* ================================================================
   Base58 (Bitcoin / Tezos alphabet)
   ================================================================ */
var BASE58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buf) {
    var digits=[0];
    for (var i=0; i<buf.length; i++) {
        var carry=buf[i];
        for (var j=0; j<digits.length; j++) {
            carry+=digits[j]<<8;
            digits[j]=carry%58;
            carry=(carry/58)|0;
        }
        while (carry>0) { digits.push(carry%58); carry=(carry/58)|0; }
    }
    var s='';
    for (var z=0; z<buf.length-1&&buf[z]===0; z++) s+='1';
    for (var d=digits.length-1; d>=0; d--) s+=BASE58[digits[d]];
    return s;
}

/* Base58Check: prefix (Array) + payload (Uint8Array) */
async function b58check(prefix, payload) {
    var msg=new Uint8Array(prefix.length+payload.length);
    msg.set(prefix,0); msg.set(payload,prefix.length);
    var h1=new Uint8Array(await crypto.subtle.digest('SHA-256',msg));
    var h2=new Uint8Array(await crypto.subtle.digest('SHA-256',h1));
    var out=new Uint8Array(msg.length+4);
    out.set(msg,0); out.set(h2.slice(0,4),msg.length);
    return base58Encode(out);
}

/* ================================================================
   Tezos key pair generation (Ed25519)
   Official prefixes:
     tz1  [6,161,159]      ed25519 address
     edpk [13,15,37,217]   ed25519 public key
     edsk [13,15,58,7]     ed25519 32-byte seed
   ================================================================ */
async function generate() {
    var seed=crypto.getRandomValues(new Uint8Array(32));
    var kp=nacl.sign.keyPair.fromSeed(seed);
    var pkHash=blake2b(kp.publicKey,null,20);

    var address   =await b58check([6,161,159],     pkHash);
    var publicKey =await b58check([13,15,37,217],  kp.publicKey);
    var privateKey=await b58check([13,15,58,7],    seed);
    var seedHex   =Array.from(seed).map(function(b){return b.toString(16).padStart(2,'0');}).join('');

    document.getElementById('address').textContent   =address;
    document.getElementById('publicKey').textContent =publicKey;
    document.getElementById('privateKey').textContent=privateKey;
    document.getElementById('seedHex').textContent   =seedHex;
    document.getElementById('results').classList.add('visible');
}

function copyField(id, btn) {
    navigator.clipboard.writeText(document.getElementById(id).textContent).then(function(){
        var orig=btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(function(){ btn.classList.remove('copied'); btn.innerHTML=orig; },1500);
    });
}
