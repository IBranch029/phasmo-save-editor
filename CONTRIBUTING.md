# Contributing

Thanks for helping out. This project is small on purpose, so a short change
that is easy to review is worth more than a large one.

## Getting the project running

```bash
npm install
npm run tauri:dev
```

Requirements: Node.js 20 or newer, a stable Rust toolchain, the Microsoft C++
build tools and WebView2 (preinstalled on Windows 11).

## Before you open a pull request

```bash
npm run typecheck        # TypeScript, must be clean
cd src-tauri && cargo test   # the Rust suite, all tests must pass
npm run build           # production frontend bundle
```

## Working on the save format

The interesting part of the project is `src-tauri/src/es3/`. It implements the
Easy Save 3 format the game uses:

- `crypto.rs` - the AES-128-CBC container and its PBKDF2 key derivation.
- `parser.rs` - a tolerant scanner for the ES3 payload dialect. It records the
  byte span of every node.
- `document.rs` - field access and span based patching.

Two rules matter here:

1. **Never re-serialise the whole payload.** It is not valid JSON, it contains
   constructs that a generic parser cannot express, and rewriting it would
   lose precision. Patch the literal you need and leave the rest alone.
2. **Never write before verifying.** A change goes through the patch, then a
   parse check, then an encrypt/decrypt round trip. Only then may it touch the
   file on disk.

## Running against a copy of a real profile

Never point the editor at your live profile while you experiment. Create a
sanitised copy instead:

```bash
node scripts/make-demo-profile.cjs C:\phasmo-demo
set PHASMO_SAVE_DIR=C:\phasmo-demo
npm run tauri:dev
```

The script only reads the original file.

## Commit messages

Follow the conventional style that is already used in the history:

```
feat: add the tier three equipment slot
fix: keep the reserved tier counter untouched
docs: describe the equipment tier representation
```

## Reporting a bug

Open an issue and include the game version, the editor version, what you
expected and what happened. If the editor refuses to read your save, please
attach the error message - it is the most useful piece of information.

## Never commit

- `SaveFile.txt` or any `*.bak_*` file
- anything from `node_modules/`, `dist/` or `src-tauri/target/`
- your local user profile paths

The `.gitignore` already covers all of that.
