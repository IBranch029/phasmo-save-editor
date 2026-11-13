//! Error type shared by every Tauri command.

use serde::{Serialize, Serializer};

/// A user facing error. The message is written in plain English because it is
/// shown verbatim inside the desktop application.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// A file system problem.
    #[error("{0}")]
    Io(String),

    /// The save file could not be decoded or re-encoded.
    #[error("{0}")]
    Es3(String),

    /// The requested file or directory does not exist.
    #[error("{0}")]
    NotFound(String),

    /// The operation is not allowed in the current state.
    #[error("{0}")]
    Conflict(String),
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        AppError::Io(value.to_string())
    }
}

impl From<crate::es3::Es3Error> for AppError {
    fn from(value: crate::es3::Es3Error) -> Self {
        AppError::Es3(value.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
