//! High level access to a decoded ES3 payload.

use serde::Deserialize;
use serde_json::Value as JsonValue;

use super::parser::{is_integer_literal, Member, Node, NodeKind, Parser, Span};
use super::Es3Error;

/// The kind of value stored inside a root field of the save file.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FieldKind {
    Int,
    Bool,
    Float,
    Str,
    Complex,
}

impl FieldKind {
    /// Maps an ES3 `__type` marker onto a field kind.
    pub fn from_type_name(name: &str) -> Self {
        match name {
            "int" | "System.Int32" => FieldKind::Int,
            "bool" | "System.Boolean" => FieldKind::Bool,
            "float" | "System.Single" | "double" | "System.Double" => FieldKind::Float,
            "string" | "System.String" => FieldKind::Str,
            _ => FieldKind::Complex,
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            FieldKind::Int => "an integer",
            FieldKind::Bool => "a boolean",
            FieldKind::Float => "a float",
            FieldKind::Str => "a string",
            FieldKind::Complex => "a complex value",
        }
    }
}

/// The type of a requested modification.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PatchKind {
    Int,
    Bool,
    Float,
}

impl PatchKind {
    pub fn label(&self) -> &'static str {
        match self {
            PatchKind::Int => "an integer",
            PatchKind::Bool => "a boolean",
            PatchKind::Float => "a float",
        }
    }
}

/// A single requested modification of a root field.
#[derive(Debug, Clone, Deserialize)]
pub struct Patch {
    /// The ES3 field name, e.g. `PlayersMoney`.
    pub key: String,
    /// The expected type of the field.
    #[serde(rename = "type")]
    pub kind: PatchKind,
    /// The new value.
    pub value: JsonValue,
}

impl Patch {
    fn as_i64(&self) -> Result<i64, Es3Error> {
        self.value.as_i64().ok_or_else(|| {
            Es3Error::Malformed(format!("'{}' expects an integer value", self.key))
        })
    }

    fn as_bool(&self) -> Result<bool, Es3Error> {
        self.value.as_bool().ok_or_else(|| {
            Es3Error::Malformed(format!("'{}' expects a boolean value", self.key))
        })
    }

    fn as_f64(&self) -> Result<f64, Es3Error> {
        self.value.as_f64().ok_or_else(|| {
            Es3Error::Malformed(format!("'{}' expects a numeric value", self.key))
        })
    }
}

/// A decoded Easy Save 3 payload.
pub struct SaveDocument {
    raw: String,
    root: Node,
}

impl SaveDocument {
    /// Parses a decoded payload into an ES3 document.
    pub fn parse(raw: String) -> Result<Self, Es3Error> {
        let root = Parser::new(raw.as_bytes()).parse_document()?;
        Ok(Self { raw, root })
    }

    /// The untouched payload text.
    pub fn raw(&self) -> &str {
        &self.raw
    }

    /// All root members of the payload.
    pub fn members(&self) -> &[Member] {
        match &self.root.kind {
            NodeKind::Object(members) => members.as_slice(),
            _ => &[],
        }
    }

    /// Looks up a root member by name.
    pub fn member(&self, key: &str) -> Option<&Member> {
        self.members().iter().find(|member| member.key == key)
    }

    /// The `__type` marker of a root field, e.g. `int`.
    pub fn type_name(&self, key: &str) -> Option<&str> {
        let member = self.member(key)?;
        let NodeKind::Object(fields) = &member.value.kind else {
            return None;
        };
        let marker = fields.iter().find(|field| field.key == "__type")?;
        match &marker.value.kind {
            NodeKind::Str(name) => Some(name.as_str()),
            _ => None,
        }
    }

    /// The payload node of a root field (`{"__type":..,"value":..}` -> the `value`).
    pub fn value_node(&self, key: &str) -> Option<&Node> {
        let member = self.member(key)?;
        let NodeKind::Object(fields) = &member.value.kind else {
            return None;
        };
        fields
            .iter()
            .find(|field| field.key == "value")
            .map(|field| &field.value)
    }

    /// The kind of a root field.
    pub fn field_kind(&self, key: &str) -> Option<FieldKind> {
        if let Some(name) = self.type_name(key) {
            return Some(FieldKind::from_type_name(name));
        }
        match self.value_node(key)?.kind {
            NodeKind::Number { ref raw, .. } => Some(if is_integer_literal(raw) {
                FieldKind::Int
            } else {
                FieldKind::Float
            }),
            NodeKind::Bool(_) => Some(FieldKind::Bool),
            NodeKind::Str(_) => Some(FieldKind::Str),
            _ => Some(FieldKind::Complex),
        }
    }

    /// Reads an integer field.
    pub fn int(&self, key: &str) -> Option<i64> {
        match self.value_node(key)?.kind {
            NodeKind::Number { value, .. } => Some(value as i64),
            _ => None,
        }
    }

    /// Reads a boolean field.
    pub fn boolean(&self, key: &str) -> Option<bool> {
        match self.value_node(key)?.kind {
            NodeKind::Bool(value) => Some(value),
            _ => None,
        }
    }

    /// Reads a floating point field.
    pub fn float(&self, key: &str) -> Option<f64> {
        match self.value_node(key)?.kind {
            NodeKind::Number { value, .. } => Some(value),
            _ => None,
        }
    }
}

/// Applies a set of modifications to a decoded payload.
///
/// The payload is patched in place: only the numeric or boolean literals that
/// belong to the requested fields are rewritten. Everything else stays
/// byte-for-byte identical, which keeps the save readable by Easy Save 3 and
/// avoids the loss of precision a full re-serialisation would cause.
pub fn apply_patches(document: &SaveDocument, patches: &[Patch]) -> Result<String, Es3Error> {
    // The last request for a field wins.
    let mut requests: Vec<&Patch> = Vec::new();
    for patch in patches {
        match requests.iter_mut().find(|existing| existing.key == patch.key) {
            Some(slot) => *slot = patch,
            None => requests.push(patch),
        }
    }

    let mut edits: Vec<(Span, String)> = Vec::new();

    for patch in requests {
        let kind = document
            .field_kind(&patch.key)
            .ok_or_else(|| Es3Error::MissingField(patch.key.clone()))?;
        let node = document
            .value_node(&patch.key)
            .ok_or_else(|| Es3Error::MissingField(patch.key.clone()))?;

        let replacement = match patch.kind {
            PatchKind::Int => {
                if kind != FieldKind::Int {
                    return Err(type_mismatch(patch, kind));
                }
                if !matches!(node.kind, NodeKind::Number { .. }) {
                    return Err(type_mismatch(patch, kind));
                }
                patch.as_i64()?.to_string()
            }
            PatchKind::Bool => {
                if kind != FieldKind::Bool {
                    return Err(type_mismatch(patch, kind));
                }
                if !matches!(node.kind, NodeKind::Bool(_)) {
                    return Err(type_mismatch(patch, kind));
                }
                patch.as_bool()?.to_string()
            }
            PatchKind::Float => {
                if kind != FieldKind::Float {
                    return Err(type_mismatch(patch, kind));
                }
                if !matches!(node.kind, NodeKind::Number { .. }) {
                    return Err(type_mismatch(patch, kind));
                }
                patch.as_f64()?.to_string()
            }
        };

        edits.push((node.span, replacement));
    }

    // Patch from the back so that the earlier spans stay valid.
    edits.sort_by(|a, b| b.0.start.cmp(&a.0.start));

    let mut buffer = document.raw().as_bytes().to_vec();
    for (span, replacement) in edits {
        buffer.splice(span.start..span.end, replacement.as_bytes().iter().copied());
    }

    String::from_utf8(buffer)
        .map_err(|_| Es3Error::Malformed("the patched payload is not valid UTF-8".into()))
}

fn type_mismatch(patch: &Patch, actual: FieldKind) -> Es3Error {
    Es3Error::TypeMismatch {
        field: patch.key.clone(),
        expected: patch.kind.label().to_string(),
        actual: actual.label().to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn doc() -> SaveDocument {
        SaveDocument::parse(
            "{\n\t\"PlayersMoney\" : {\n\t\t\"__type\" : \"int\",\n\t\t\"value\" : 8164\n\t},\n\t\"PrestigeTheme\" : {\n\t\t\"__type\" : \"bool\",\n\t\t\"value\" : true\n\t}\n}"
                .to_string(),
        )
        .expect("parse")
    }

    #[test]
    fn reads_scalar_fields() {
        let document = doc();
        assert_eq!(document.int("PlayersMoney"), Some(8164));
        assert_eq!(document.boolean("PrestigeTheme"), Some(true));
        assert_eq!(document.field_kind("PlayersMoney"), Some(FieldKind::Int));
        assert_eq!(document.field_kind("PrestigeTheme"), Some(FieldKind::Bool));
    }

    #[test]
    fn patches_integers_without_touching_the_rest() {
        let document = doc();
        let patches = vec![Patch {
            key: "PlayersMoney".into(),
            kind: PatchKind::Int,
            value: JsonValue::from(99_999),
        }];
        let updated = apply_patches(&document, &patches).expect("patch");
        assert!(updated.contains("\"value\" : 99999"));
        assert!(updated.contains("\"__type\" : \"int\""));
        assert!(updated.contains("\"value\" : true"));
    }

    #[test]
    fn patches_booleans() {
        let document = doc();
        let patches = vec![Patch {
            key: "PrestigeTheme".into(),
            kind: PatchKind::Bool,
            value: JsonValue::from(false),
        }];
        let updated = apply_patches(&document, &patches).expect("patch");
        assert!(updated.contains("\"value\" : false"));
    }

    #[test]
    fn rejects_unknown_fields() {
        let document = doc();
        let patches = vec![Patch {
            key: "Nope".into(),
            kind: PatchKind::Int,
            value: JsonValue::from(1),
        }];
        assert!(matches!(
            apply_patches(&document, &patches),
            Err(Es3Error::MissingField(_))
        ));
    }

    #[test]
    fn rejects_type_mismatches() {
        let document = doc();
        let patches = vec![Patch {
            key: "PlayersMoney".into(),
            kind: PatchKind::Bool,
            value: JsonValue::from(true),
        }];
        assert!(matches!(
            apply_patches(&document, &patches),
            Err(Es3Error::TypeMismatch { .. })
        ));
    }
}
