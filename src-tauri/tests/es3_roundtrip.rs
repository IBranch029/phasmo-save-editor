//! End to end tests for the Easy Save 3 codec.
//!
//! The tests use a synthetic payload that reproduces every dialect feature of
//! the real save file. When a real `SaveFile.txt` is present on the machine
//! the last test additionally verifies the codec against it.

use phasmo_save_editor_lib::es3::crypto;
use phasmo_save_editor_lib::es3::document::{apply_patches, Patch, PatchKind, SaveDocument};
use serde_json::Value as JsonValue;

const SAMPLE: &str = concat!(
    "{\n",
    "\t\"SaveVersion\" : {\n\t\t\"__type\" : \"int\",\n\t\t\"value\" : 2\n\t},\n",
    "\t\"PlayersMoney\" : {\n\t\t\"__type\" : \"int\",\n\t\t\"value\" : 8164\n\t},\n",
    "\t\"PrestigeTheme\" : {\n\t\t\"__type\" : \"bool\",\n\t\t\"value\" : true\n\t},\n",
    "\t\"RewardMultiplier\" : {\n\t\t\"__type\" : \"float\",\n\t\t\"value\" : 4\n\t},\n",
    "\t\"playedMaps\" : {\n",
    "\t\t\"__type\" : \"System.Collections.Generic.Dictionary`2[[System.Int32, mscorlib]]\",\n",
    "\t\t\"value\" : {11:11,0:32,2:1}\n",
    "\t},\n",
    "\t\"LocalPlayerOutfit\" : {\n",
    "\t\t\"__type\" : \"PlayerOutfit,Assembly-CSharp\",\n",
    "\t\t\"value\" : {\n",
    "\t\t\t\"Items\" : {{\n\t\t\t\t\"low\" : 1,\n\t\t\t\t\"high\" : 0\n\t\t\t}:{\n\t\t\t\t\"guid\" : {\n\t\t\t\t\t\"value\" : \"f49e1360-dc9a-42a2-856e-3043c4dbb989\"\n\t\t\t\t},\n\t\t\t\t\"materialOption\" : 0\n\t\t\t}}\n",
    "\t\t}\n",
    "\t}\n",
    "}\n"
);

fn patch(key: &str, kind: PatchKind, value: JsonValue) -> Patch {
    Patch {
        key: key.to_string(),
        kind,
        value,
    }
}

#[test]
fn encrypts_and_decrypts_a_container() {
    let container = crypto::encrypt(SAMPLE.as_bytes()).expect("encrypt");
    assert_eq!(container.len() % 16, 0);
    assert!(container.len() > crypto::IV_LEN);

    let plaintext = crypto::decrypt(&container).expect("decrypt");
    assert_eq!(plaintext, SAMPLE.as_bytes());
}

#[test]
fn parses_every_dialect_feature() {
    let document = SaveDocument::parse(SAMPLE.to_string()).expect("parse");

    assert_eq!(document.int("PlayersMoney"), Some(8164));
    assert_eq!(document.boolean("PrestigeTheme"), Some(true));
    assert_eq!(document.float("RewardMultiplier"), Some(4.0));
    assert_eq!(document.members().len(), 6);
}

#[test]
fn patches_only_the_requested_literals() {
    let document = SaveDocument::parse(SAMPLE.to_string()).expect("parse");

    let updated = apply_patches(
        &document,
        &[
            patch("PlayersMoney", PatchKind::Int, JsonValue::from(999_999)),
            patch("PrestigeTheme", PatchKind::Bool, JsonValue::from(false)),
        ],
    )
    .expect("patch");

    assert!(updated.contains("\"value\" : 999999"));
    assert!(updated.contains("\"value\" : false"));
    // The rest of the payload is untouched, including the ES3 dialect.
    assert!(updated.contains("{11:11,0:32,2:1}"));
    assert!(updated.contains("\"low\" : 1,"));
    assert!(updated.contains("f49e1360-dc9a-42a2-856e-3043c4dbb989"));

    // The patched payload is still a valid document.
    let reparsed = SaveDocument::parse(updated.clone()).expect("reparse");
    assert_eq!(reparsed.int("PlayersMoney"), Some(999_999));
    assert_eq!(reparsed.boolean("PrestigeTheme"), Some(false));
    assert_eq!(reparsed.int("SaveVersion"), Some(2));
}


#[test]
fn rejects_wrong_types_and_unknown_fields() {
    let document = SaveDocument::parse(SAMPLE.to_string()).expect("parse");

    let mismatch = apply_patches(
        &document,
        &[patch("PlayersMoney", PatchKind::Bool, JsonValue::from(true))],
    );
    assert!(mismatch.is_err());

    let unknown = apply_patches(
        &document,
        &[patch("DoesNotExist", PatchKind::Int, JsonValue::from(1))],
    );
    assert!(unknown.is_err());
}

#[test]
fn survives_an_encrypt_decrypt_round_trip() {
    let document = SaveDocument::parse(SAMPLE.to_string()).expect("parse");
    let updated = apply_patches(
        &document,
        &[patch("PlayersMoney", PatchKind::Int, JsonValue::from(424_242))],
    )
    .expect("patch");

    let container = crypto::encrypt(updated.as_bytes()).expect("encrypt");
    let plaintext = crypto::decrypt(&container).expect("decrypt");
    assert_eq!(plaintext, updated.as_bytes());

    let reparsed = SaveDocument::parse(String::from_utf8(plaintext).expect("utf8")).expect("parse");
    assert_eq!(reparsed.int("PlayersMoney"), Some(424_242));
}

/// Verifies the codec against the real save file when it is available.
#[test]
fn decodes_the_real_save_file_when_present() {
    let Some(path) = real_save_path() else {
        eprintln!("no Phasmophobia save file found - skipping the live check");
        return;
    };

    let bytes = std::fs::read(&path).expect("read the save file");
    let plaintext = crypto::decrypt(&bytes).expect("decrypt the save file");
    let text = String::from_utf8(plaintext).expect("the save file is valid UTF-8");

    let document = SaveDocument::parse(text.clone()).expect("parse the save file");
    assert!(
        document.members().len() > 100,
        "the save file should hold many fields"
    );
    assert!(document.int("PlayersMoney").is_some(), "PlayersMoney must be present");
    assert!(document.int("NewLevel").is_some(), "NewLevel must be present");
    assert!(document.int("Experience").is_some(), "Experience must be present");
    assert!(
        document.int("PrestigeIndex").is_some(),
        "PrestigeIndex must be present"
    );

    // Patching must only touch the requested literal.
    let original = document.int("PlayersMoney").expect("money");
    let needle = format!("\"value\" : {original}");
    assert_eq!(
        text.matches(&needle).count(),
        1,
        "the money literal has to be unique for this check"
    );

    let updated = apply_patches(
        &document,
        &[patch("PlayersMoney", PatchKind::Int, JsonValue::from(original + 1))],
    )
    .expect("patch");

    // Everything except the money literal has to be byte identical.
    assert_eq!(
        updated,
        text.replacen(&needle, &format!("\"value\" : {}", original + 1), 1),
        "only the money literal may change"
    );

    // The patched payload has to survive the encryption round trip.
    let container = crypto::encrypt(updated.as_bytes()).expect("encrypt");
    let restored = crypto::decrypt(&container).expect("decrypt");
    assert_eq!(restored, updated.as_bytes());
}

/// Resolves the default location of the Phasmophobia save file.
fn real_save_path() -> Option<std::path::PathBuf> {
    let home = std::env::var("USERPROFILE").ok()?;
    let path = std::path::PathBuf::from(home)
        .join("AppData")
        .join("LocalLow")
        .join("Kinetic Games")
        .join("Phasmophobia")
        .join("SaveFile.txt");
    if path.is_file() {
        Some(path)
    } else {
        None
    }
}
