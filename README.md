<div align="center">

# PhasmoSave Editor

**A standalone desktop editor for your local Phasmophobia profile.**

Tauri v2 · Rust · React · TypeScript · Tailwind CSS · Framer Motion

[![Rust](https://img.shields.io/badge/rust-stable-orange.svg)](https://www.rust-lang.org)
[![Tauri](https://img.shields.io/badge/tauri-v2-blue.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/react-18-61dafb.svg)](https://react.dev)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## Overview

Phasmophobia keeps the player profile in a single encrypted file called
`SaveFile.txt`. PhasmoSave Editor decrypts that file, shows what is inside and
lets you change the parts that matter - **money**, **experience**, **prestige
level** and **every piece of equipment in your kit** - without ever leaving the
save in a broken state.

Everything happens locally on your machine. The editor talks to your profile
through the game's own file format and never to the network.

### Highlights

| | |
| --- | --- |
| **Money** | Direct entry, a fine tuned slider and quick presets (+10 000, +100 000, Max). |
| **Level & XP** | Set the level, set the progress inside the level, and a small XP calculator on top. |
| **Prestige** | Prestige index from 0 to 3999, reward multiplier and the prestige theme flag. |
| **Equipment** | All 32 pieces of kit with quantities, tier 1 - 3 unlocks and a one click *unlock all*. |
| **Backups** | A timestamped backup is written before every change and can be restored at any time. |
| **Safety** | Refuses to write while the game is running, verifies the result and replaces the file atomically. |

---

## Features

- **Automatic detection** of `%USERPROFILE%\AppData\LocalLow\Kinetic Games\Phasmophobia\`,
  with a folder picker for non standard installations.
- **Portable mode** - set `PHASMO_SAVE_DIR` to point the editor at any folder.
- **Full Easy Save 3 support** - the real save format is a non standard JSON
  dialect, which is parsed by a dedicated scanner instead of a generic parser.
- **Surgical writes** - only the fields you changed are rewritten, the rest of
  the payload stays byte for byte identical.
- **Verification loop** - the new payload is parsed, encrypted, decrypted again
  and compared before it is allowed to touch the file on disk.
- **Backup archive** - every automatic backup is listed with its size and
  timestamp and can be restored with one click.
- **Dark, atmospheric interface** - frameless window, CRT scan lines, candlelit
  amber accents, tactile controls and spring animated numbers.
- **Resilient to game updates** - the equipment list is derived from the save
  file itself, so new items appear automatically.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Shell | [Tauri v2](https://tauri.app) - Rust backend, WebView2 frontend |
| Backend | Rust 2021, `aes` + `cbc` + `pbkdf2`, hand written ES3 scanner |
| Frontend | React 18, TypeScript (strict), Vite 5 |
| Styling | Tailwind CSS 3 with a custom horror palette |
| Motion | Framer Motion |
| Icons | Lucide React |
| Packaging | NSIS installer via `tauri build` |


---

## The save format

The implementation in `src-tauri/src/es3/` is based on the format of the
installed game.

### Container

```text
| IV (16 random bytes) | AES-128-CBC ciphertext (PKCS#7 padded) |
```

### Key derivation

Easy Save 3 turns the encryption password into a 128 bit AES key with
PBKDF2-HMAC-SHA1. The **IV doubles as the salt**, and the iteration count is
100:

```text
key = PBKDF2-HMAC-SHA1(password, salt = IV, iterations = 100, length = 16)
```

### Payload dialect

The decrypted payload is **not** valid JSON. Every root member is an object
with a type marker and a value:

```json
{
  "PlayersMoney" : { "__type" : "int", "value" : 8164 }
}
```

On top of that Easy Save 3 emits three constructs that break every generic
JSON parser:

| Construct | Example |
| --- | --- |
| Bare integer keys | `{11:11,0:32}` |
| Key/value pair lists | `{{"low":1,"high":0}:{"guid":{...}}}` |
| `System.Int64` values | `{"low":268435456,"high":0}` |

The editor therefore ships its own scanner (`es3/parser.rs`) that understands
the dialect and records the **byte span** of every node. A modification is
applied by rewriting the requested literal in place, so the rest of the payload
is never touched. This keeps the save readable for Easy Save 3 and avoids the
precision loss that a full re-serialisation would cause.

### Equipment tiers

The tiers use the same trick. The current tier of an item lives in
`<Item>Tier`, while the amount of every owned tier is kept in a separate
counter whose name carries an internal index of the game:

| Field | Meaning |
| --- | --- |
| `<Item>Tier` | the current tier of the item |
| `<Item>TierOneUnlockOwned` | whether the item is owned at all |
| `<Item>-1Tier` | how many tier two items are owned |
| `<Item>0Tier` | how many tier three items are owned |
| `<Item>1Tier` | reserved, the game never writes it |

The tier buttons in the dashboard mirror that representation, so unlocking tier
three produces exactly the state the game itself writes.

---

## Safety model

1. The game process is checked before every write. A write is refused while
   Phasmophobia is running.
2. A backup `SaveFile.txt.bak_<UTC timestamp>` is created **before** anything
   is changed.
3. The patched payload is parsed again and every patched field is verified.
4. The payload is encrypted, decrypted again and compared byte for byte. A
   container that cannot be read back is never written.
5. The file is replaced atomically through a temporary file in the same folder,
   so an interrupted write can never truncate the save.
6. The editor never deletes or moves the original file.

---

## Building from source

### Requirements

- [Node.js](https://nodejs.org) 20 or newer
- [Rust](https://www.rust-lang.org/tools/install) stable
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- WebView2 (preinstalled on Windows 11)

### Commands

```bash
npm install          # install the frontend dependencies
npm run tauri:build  # build the NSIS installer and the portable binary
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on <http://localhost:1420> |
| `npm run tauri:dev` | the desktop application with hot reloading |
| `npm run typecheck` | TypeScript only |
| `npm run build` | type check + production frontend bundle |
| `npm run tauri:build` | release build, installer and portable binary |
| `cd src-tauri && cargo test` | the Rust test suite |

The release bundle ends up in
`src-tauri/target/release/bundle/nsis/PhasmoSave Editor_1.0.0_x64-setup.exe`.

### Portable mode

```bash
set PHASMO_SAVE_DIR=D:\Games\Phasmophobia
```

## Project layout

```text
phasmo-save-editor/
├── src/                        # React dashboard
│   ├── App.tsx                 # state, command wiring, layout
│   ├── components/             # title bar, cards, controls, toasts
│   └── lib/                    # backend bridge, catalogue, formatting
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── es3/
│       │   ├── crypto.rs       # AES-128-CBC + PBKDF2
│       │   ├── parser.rs       # tolerant ES3 scanner with byte spans
│       │   └── document.rs     # field access and span based patching
│       ├── save.rs             # path resolution, backups, atomic writes
│       ├── commands.rs         # the Tauri command surface
│       └── error.rs            # user facing error type
└── scripts/                    # icon generation and test profile tooling
```

---

## Tauri commands

| Command | Purpose |
| --- | --- |
| `detect_save(directory)` | Resolves the save folder, reports the file, the game state and the backups. |
| `load_save(path)` | Decrypts and parses the save file, returns every scalar field. |
| `apply_modifications(path, patches, force)` | Backs up, patches, verifies, encrypts and writes the save. |
| `create_backup(path)` | Creates a timestamped backup. |
| `list_backups(path)` | Lists every automatic backup, newest first. |
| `restore_backup(path, backup)` | Restores a backup over the current save. |
| `game_running()` | Reports whether Phasmophobia is running. |

---

## Tests

`cargo test` runs five groups:

| Suite | Covers |
| --- | --- |
| `es3::crypto` | container layout, key derivation, round trip, rejection of damaged containers |
| `es3::parser` | every dialect construct, byte spans, rejection of trailing data |
| `es3::document` | field access, span based patching, type and name validation |
| `tests/es3_roundtrip.rs` | the full codec against a synthetic payload **and against the real save file** when one is present |
| `tests/write_path.rs` | the complete write path (backup, patch, verify, encrypt, atomic replace, reload) on a **copy** of the real save file |

The two live tests skip themselves when no Phasmophobia save file is found, so
the suite stays green on a fresh machine and never touches the original save.

---

## Notes and limitations

- `Experience` is the progress **inside** the current level, not a cumulative
  total. The XP a level needs is a game side value that is printed on the
  in-game ID card, so the dashboard keeps it as an editable field and offers
  the usual calculator actions on top of it.
- Only the scalar fields of the save are exposed. Collections such as the
  ghost statistics, the outfit and the daily challenges are preserved exactly
  as the game wrote them.
- The editor is meant for your own local profile and for offline use.

---

## Contributing

Bug reports and pull requests are welcome. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) first - it explains how to build the
project, how to test it and, most importantly, the two rules that keep the
save format safe: never re-serialise the payload and never write before
verifying.

---

## License

[MIT](LICENSE) © PhasmoSave Editor

Phasmophobia is a trademark of Kinetic Games. This project is not affiliated
with or endorsed by Kinetic Games.


The editor then reads and writes `SaveFile.txt` from that folder instead of
the default location.

---
