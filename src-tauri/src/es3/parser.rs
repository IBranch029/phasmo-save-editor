//! A tolerant scanner for the Easy Save 3 JSON dialect.
//!
//! The scanner is deliberately *not* a standard JSON parser: ES3 emits bare
//! integer keys (`{11:11}`), pair lists (`{ {k}:{v} }`) and `System.Int64`
//! values split into `{"low":N,"high":N}`. Every node keeps the byte span it
//! occupies in the payload so that values can be patched in place instead of
//! re-serialising the whole document.

use super::Es3Error;

/// A byte range inside the payload.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

impl Span {
    pub fn new(start: usize, end: usize) -> Self {
        Self { start, end }
    }
}

/// A single member of an ES3 object.
#[derive(Debug, Clone)]
pub struct Member {
    pub key: String,
    pub value: Node,
}

/// A key/value entry of an ES3 pair list.
///
/// The pair list is parsed so that the scanner can step over it; the editor
/// never rewrites its content.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Pair {
    pub key: Node,
    pub value: Node,
}

/// The shape of a parsed node.
///
/// Every variant of the document model is kept, even when the editor does not
/// read it, so that the scanner can describe the whole payload.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum NodeKind {
    Object(Vec<Member>),
    PairList(Vec<Pair>),
    Array(Vec<Node>),
    Str(String),
    Number { value: f64, raw: String },
    Bool(bool),
    Null,
}

/// A parsed node together with the span it occupies in the source payload.
#[derive(Debug, Clone)]
pub struct Node {
    pub kind: NodeKind,
    pub span: Span,
}

/// Streaming scanner over an ES3 payload.
pub struct Parser<'a> {
    src: &'a [u8],
    pos: usize,
}

impl<'a> Parser<'a> {
    pub fn new(src: &'a [u8]) -> Self {
        let mut parser = Self { src, pos: 0 };
        parser.skip_bom();
        parser
    }

    fn skip_bom(&mut self) {
        if self.src.len() >= 3 && self.src[..3] == [0xEF, 0xBB, 0xBF] {
            self.pos = 3;
        }
    }

    fn peek(&self) -> Option<u8> {
        self.src.get(self.pos).copied()
    }

    fn skip_ws(&mut self) {
        while let Some(c) = self.peek() {
            if c == b' ' || c == b'\t' || c == b'\n' || c == b'\r' {
                self.pos += 1;
            } else {
                break;
            }
        }
    }

    fn err(&self, message: impl Into<String>) -> Es3Error {
        Es3Error::Malformed(format!("{} (at byte offset {})", message.into(), self.pos))
    }

    fn expect(&mut self, expected: u8) -> Result<(), Es3Error> {
        self.skip_ws();
        match self.peek() {
            Some(c) if c == expected => {
                self.pos += 1;
                Ok(())
            }
            Some(c) => Err(self.err(format!(
                "expected '{}' but found '{}'",
                expected as char, c as char
            ))),
            None => Err(self.err(format!("expected '{}' but the payload ended", expected as char))),
        }
    }

    /// Parses the whole payload and makes sure nothing but whitespace follows.
    pub fn parse_document(&mut self) -> Result<Node, Es3Error> {
        let node = self.parse_value()?;
        self.skip_ws();
        if self.pos != self.src.len() {
            return Err(self.err("unexpected trailing data"));
        }
        Ok(node)
    }

    fn parse_value(&mut self) -> Result<Node, Es3Error> {
        self.skip_ws();
        match self.peek() {
            Some(b'{') => self.parse_brace(),
            Some(b'[') => self.parse_array(),
            Some(b'"') => self.parse_string(),
            Some(b'-') | Some(b'0'..=b'9') => self.parse_number(),
            Some(b't') | Some(b'f') | Some(b'n') => self.parse_literal(),
            Some(c) => Err(self.err(format!("unexpected character '{}'", c as char))),
            None => Err(self.err("the payload ended unexpectedly")),
        }
    }

    /// Parses a `{ ... }` block, which is either a plain object or an ES3 pair list.
    fn parse_brace(&mut self) -> Result<Node, Es3Error> {
        let start = self.pos;
        self.pos += 1; // '{'
        self.skip_ws();

        if self.peek() == Some(b'}') {
            self.pos += 1;
            return Ok(Node {
                kind: NodeKind::Object(Vec::new()),
                span: Span::new(start, self.pos),
            });
        }

        // ES3 serialises collections of key/value pairs as `{ {key} : {value}, ... }`.
        if self.peek() == Some(b'{') {
            let mut pairs = Vec::new();
            loop {
                let key = self.parse_value()?;
                self.expect(b':')?;
                let value = self.parse_value()?;
                pairs.push(Pair { key, value });
                self.skip_ws();
                match self.peek() {
                    Some(b',') => {
                        self.pos += 1;
                        self.skip_ws();
                        if self.peek() == Some(b'}') {
                            self.pos += 1;
                            break;
                        }
                    }
                    Some(b'}') => {
                        self.pos += 1;
                        break;
                    }
                    _ => return Err(self.err("expected ',' or '}'")),
                }
            }
            return Ok(Node {
                kind: NodeKind::PairList(pairs),
                span: Span::new(start, self.pos),
            });
        }

        let mut members = Vec::new();
        loop {
            self.skip_ws();
            let key = self.parse_key()?;
            self.expect(b':')?;
            let value = self.parse_value()?;
            members.push(Member { key, value });

            self.skip_ws();
            match self.peek() {
                Some(b',') => {
                    self.pos += 1;
                    self.skip_ws();
                    if self.peek() == Some(b'}') {
                        self.pos += 1;
                        break;
                    }
                }
                Some(b'}') => {
                    self.pos += 1;
                    break;
                }
                _ => return Err(self.err("expected ',' or '}'")),
            }
        }

        Ok(Node {
            kind: NodeKind::Object(members),
            span: Span::new(start, self.pos),
        })
    }

    fn parse_array(&mut self) -> Result<Node, Es3Error> {
        let start = self.pos;
        self.pos += 1; // '['
        self.skip_ws();

        let mut items = Vec::new();
        if self.peek() == Some(b']') {
            self.pos += 1;
            return Ok(Node {
                kind: NodeKind::Array(items),
                span: Span::new(start, self.pos),
            });
        }

        loop {
            items.push(self.parse_value()?);
            self.skip_ws();
            match self.peek() {
                Some(b',') => {
                    self.pos += 1;
                    self.skip_ws();
                    if self.peek() == Some(b']') {
                        self.pos += 1;
                        break;
                    }
                }
                Some(b']') => {
                    self.pos += 1;
                    break;
                }
                _ => return Err(self.err("expected ',' or ']'")),
            }
        }

        Ok(Node {
            kind: NodeKind::Array(items),
            span: Span::new(start, self.pos),
        })
    }

    /// Parses an object key: either a quoted string or a bare integer.
    fn parse_key(&mut self) -> Result<String, Es3Error> {
        self.skip_ws();
        match self.peek() {
            Some(b'"') => match self.parse_string()?.kind {
                NodeKind::Str(value) => Ok(value),
                _ => unreachable!("parse_string always yields a string"),
            },
            Some(b'}') | Some(b',') | Some(b':') => Err(self.err("expected an object key")),
            _ => {
                let start = self.pos;
                while let Some(c) = self.peek() {
                    if c == b':' || c == b',' || c == b'}' || c == b']' || c.is_ascii_whitespace() {
                        break;
                    }
                    self.pos += 1;
                }
                if self.pos == start {
                    return Err(self.err("expected an object key"));
                }
                Ok(String::from_utf8_lossy(&self.src[start..self.pos]).into_owned())
            }
        }
    }

    fn parse_string(&mut self) -> Result<Node, Es3Error> {
        let start = self.pos;
        self.pos += 1; // opening quote
        let mut out = String::new();

        loop {
            let c = match self.peek() {
                Some(c) => c,
                None => return Err(self.err("unterminated string")),
            };

            match c {
                b'"' => {
                    self.pos += 1;
                    break;
                }
                b'\\' => {
                    self.pos += 1;
                    let escape = match self.peek() {
                        Some(e) => e,
                        None => return Err(self.err("unterminated escape sequence")),
                    };
                    self.pos += 1;
                    match escape {
                        b'n' => out.push('\n'),
                        b't' => out.push('\t'),
                        b'r' => out.push('\r'),
                        b'b' => out.push('\u{8}'),
                        b'f' => out.push('\u{c}'),
                        b'/' => out.push('/'),
                        b'\\' => out.push('\\'),
                        b'"' => out.push('"'),
                        b'u' => {
                            let hex = self
                                .src
                                .get(self.pos..self.pos + 4)
                                .ok_or_else(|| self.err("truncated unicode escape"))?;
                            let hex = std::str::from_utf8(hex)
                                .map_err(|_| self.err("invalid unicode escape"))?;
                            let code = u32::from_str_radix(hex, 16)
                                .map_err(|_| self.err("invalid unicode escape"))?;
                            self.pos += 4;
                            out.push(char::from_u32(code).unwrap_or('\u{FFFD}'));
                        }
                        other => out.push(other as char),
                    }
                }
                _ => {
                    let len = utf8_char_len(c);
                    let chunk = self
                        .src
                        .get(self.pos..self.pos + len)
                        .ok_or_else(|| self.err("truncated UTF-8 sequence"))?;
                    out.push_str(&String::from_utf8_lossy(chunk));
                    self.pos += len;
                }
            }
        }

        Ok(Node {
            kind: NodeKind::Str(out),
            span: Span::new(start, self.pos),
        })
    }

    fn parse_number(&mut self) -> Result<Node, Es3Error> {
        let start = self.pos;
        while let Some(c) = self.peek() {
            if c.is_ascii_whitespace() || c == b',' || c == b'}' || c == b']' || c == b':' {
                break;
            }
            self.pos += 1;
        }
        if self.pos == start {
            return Err(self.err("expected a number"));
        }

        let raw = String::from_utf8_lossy(&self.src[start..self.pos]).into_owned();
        let value = raw
            .parse::<f64>()
            .map_err(|_| self.err(format!("invalid number '{raw}'")))?;

        Ok(Node {
            kind: NodeKind::Number { value, raw },
            span: Span::new(start, self.pos),
        })
    }

    fn parse_literal(&mut self) -> Result<Node, Es3Error> {
        let start = self.pos;
        while let Some(c) = self.peek() {
            if c.is_ascii_whitespace() || c == b',' || c == b'}' || c == b']' {
                break;
            }
            self.pos += 1;
        }

        let raw = String::from_utf8_lossy(&self.src[start..self.pos]).into_owned();
        let kind = match raw.as_str() {
            "true" => NodeKind::Bool(true),
            "false" => NodeKind::Bool(false),
            "null" => NodeKind::Null,
            other => return Err(self.err(format!("unknown literal '{other}'"))),
        };

        Ok(Node {
            kind,
            span: Span::new(start, self.pos),
        })
    }
}

/// Returns the length in bytes of the UTF-8 sequence starting with `first`.
fn utf8_char_len(first: u8) -> usize {
    match first {
        0x00..=0x7F => 1,
        0xC0..=0xDF => 2,
        0xE0..=0xEF => 3,
        0xF0..=0xF7 => 4,
        _ => 1,
    }
}

/// Returns `true` when the literal has no fractional or exponent part.
pub fn is_integer_literal(raw: &str) -> bool {
    !raw.contains('.') && !raw.contains('e') && !raw.contains('E')
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(text: &str) -> Node {
        Parser::new(text.as_bytes()).parse_document().expect("parse")
    }

    #[test]
    fn parses_standard_objects() {
        let node = parse(r#"{"a":1,"b":"two","c":true}"#);
        let NodeKind::Object(members) = node.kind else {
            panic!("expected an object");
        };
        assert_eq!(members.len(), 3);
        assert_eq!(members[0].key, "a");
    }

    #[test]
    fn parses_bare_integer_keys() {
        let node = parse("{11:11,0:32}");
        let NodeKind::Object(members) = node.kind else {
            panic!("expected an object");
        };
        assert_eq!(members[0].key, "11");
        assert_eq!(members[1].key, "0");
    }

    #[test]
    fn parses_pair_lists() {
        let node = parse(r#"{{"low":1,"high":0}:{"guid":{"value":"x"}}}"#);
        let NodeKind::PairList(pairs) = node.kind else {
            panic!("expected a pair list");
        };
        assert_eq!(pairs.len(), 1);
    }

    #[test]
    fn records_spans_that_hold_the_source_text() {
        let text = r#"{"PlayersMoney":{"__type":"int","value":8164}}"#;
        let node = parse(text);
        let NodeKind::Object(members) = node.kind else {
            panic!("expected an object");
        };
        let NodeKind::Object(inner) = &members[0].value.kind else {
            panic!("expected an object");
        };
        let value = &inner[1].value;
        assert_eq!(&text[value.span.start..value.span.end], "8164");
    }

    #[test]
    fn rejects_trailing_garbage() {
        assert!(Parser::new(b"{} junk").parse_document().is_err());
    }
}
