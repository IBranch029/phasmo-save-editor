//! Easy Save 3 (ES3) compatible codec for Phasmophobia save files.
//!
//! # On-disk layout
//!
//! ```text
//! | IV (16 bytes, random per write) | AES-128-CBC ciphertext (PKCS#7 padded) |
//! ```
//!
//! # Key derivation
//!
//! ES3 turns the encryption password into a 128-bit AES key with
//! PBKDF2-HMAC-SHA1, using the *IV itself* as the salt and iterating 100 times.
//!
//! ```text
//! key = PBKDF2-HMAC-SHA1(password, salt = IV, iterations = 100, length = 16)
//! ```
//!
//! # Payload dialect
//!
//! The decrypted payload is *not* strict JSON. ES3 writes a custom flavour:
//!
//! * every root member is `{"__type": "...", "value": <payload>}`
//! * integer-keyed dictionaries use **bare** keys: `{11:11,0:32}`
//! * collections of key/value pairs use `{ {key} : {value}, ... }`
//! * `System.Int64` values are stored as `{"low":N,"high":N}`
//!
//! Because of this the document is parsed with a tolerant scanner that records
//! byte spans, and modifications are applied by patching the original text in
//! place. The rest of the payload therefore stays byte-for-byte identical to
//! what the game wrote, which keeps the save readable by Easy Save 3.

pub mod crypto;
pub mod document;
pub mod parser;

use thiserror::Error;

/// Errors produced while decoding or patching an ES3 payload.
#[derive(Debug, Error)]
pub enum Es3Error {
    #[error("the file is not an Easy Save 3 container (expected IV + AES-CBC blocks, got {0} bytes)")]
    BadContainer(usize),

    #[error("could not decrypt the save: {0}")]
    Crypto(String),

    #[error("malformed save payload: {0}")]
    Malformed(String),

    #[error("the save file does not contain the field '{0}'")]
    MissingField(String),

    #[error("'{field}' is a {expected} field but the save stores {actual}")]
    TypeMismatch {
        field: String,
        expected: String,
        actual: String,
    },
}
