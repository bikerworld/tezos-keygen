# Tezos Address Generator

A single-page, fully offline tool for generating Tezos (XTZ) key pairs — Ed25519 address, public key, private key, and raw seed — entirely inside your browser. No server, no network request, no tracking.

## What it does

Each time you click **Generate new address**, the tool:

1. Generates 32 cryptographically random bytes using the browser's native `crypto.getRandomValues` API (CSPRNG)
2. Derives an **Ed25519 key pair** from that seed (via [TweetNaCl](https://tweetnacl.js.org/))
3. Hashes the public key with **Blake2b-20** to obtain the address hash
4. Encodes everything in **Base58Check** with the official Tezos prefixes:

| Output                     | Prefix | Encoding                        |
| -------------------------- | ------ | ------------------------------- |
| Address                    | `tz1`  | Base58Check `[6, 161, 159]`     |
| Public key                 | `edpk` | Base58Check `[13, 15, 37, 217]` |
| Private key (encoded seed) | `edsk` | Base58Check `[13, 15, 58, 7]`   |
| Raw seed                   | —      | Hex (32 bytes)                  |

The `edsk` private key and the raw seed are **equivalent** — both give full control over the wallet. Most Tezos wallets and CLI tools (e.g. `octez-client`) accept the `edsk` format directly.

## Security risks

> **Read this before using the generated keys to hold real funds.**

- **Your private key = your funds.** Anyone who obtains your `edsk` key or raw seed can sign transactions and transfer all assets out of your wallet, instantly and irreversibly.
- **This tool does not store, transmit, or log anything.** You can verify this by opening the browser DevTools → Network tab and confirming zero requests are made when clicking the button.
- **Use an air-gapped device for high-value wallets.** The safest way to use this tool is on a machine that has never been and will never be connected to the internet, with the four files copied from a trusted source.
- **Verify the source before use.** If you downloaded this from an untrusted location, the code may have been tampered with. Review `tezos-keygen.js` — it is small and readable.
- **No dependency on external servers.** All libraries (`nacl-fast.min.js`, `blake2b.js`) are vendored locally. Nothing is fetched at runtime.
- **Browser security.** Your OS and browser must not be compromised. Malware or a rogue browser extension could intercept generated keys.
- **Backup your key.** There is no recovery mechanism. If you lose the private key, the funds are gone permanently.

## Files

```
index.html     Main page — open this in your browser
nacl-fast.min.js      TweetNaCl v1.0.3 — Ed25519 key derivation
blake2b.js            BLAKE2b implementation (pure JS, adapted from blakejs)
tezos-keygen.js       Base58Check encoding and Tezos key generation logic
```

## How to use locally

No installation, no build step, no internet connection required after cloning.

**1. Clone or download**

```bash
git clone https://github.com/bikerworld/tezos-keygen.git
cd tezos-keygen
```

**2. Open in your browser**

```bash
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or drag and drop `index.html` onto any browser window.

**3. Generate a key pair**

Click **Generate new address**. Use the copy buttons to capture each value. Store your private key (`edsk`) and/or raw seed in a safe place (password manager, encrypted storage, written on paper in a secure location).

> All four files must stay in the same directory — the HTML page loads the JS files as local relative paths.

## Importing into a Tezos wallet

The `edsk` key (54-character Base58Check string) is the standard format accepted by most Tezos tooling:

```bash
# octez-client (formerly tezos-client)
octez-client import secret key my-wallet unencrypted:edsk...
```

Wallets like **Temple**, **Kukai**, or **Umami** can import via the raw seed (mnemonic-less import) or the `edsk` key depending on the wallet.

## Cryptographic details

| Component      | Algorithm                         | Library                 |
| -------------- | --------------------------------- | ----------------------- |
| Randomness     | `crypto.getRandomValues` (CSPRNG) | Browser native          |
| Key derivation | Ed25519 (RFC 8032)                | TweetNaCl v1.0.3        |
| Address hash   | BLAKE2b, 20-byte digest           | Adapted from blakejs    |
| Encoding       | Base58Check (SHA-256 checksum)    | Web Crypto API + custom |

## License

MIT
