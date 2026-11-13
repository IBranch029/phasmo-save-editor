//! AES-128-CBC codec used by Easy Save 3.

use aes::Aes128;
use cbc::cipher::{block_padding::Pkcs7, BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use hmac::Hmac;
use pbkdf2::pbkdf2;
use rand::rngs::OsRng;
use rand::RngCore;
use sha1::Sha1;

use super::Es3Error;

/// The Easy Save 3 password shipped with Phasmophobia.
pub const PASSWORD: &[u8] = b"t36gref9u84y7f43g";

/// Length of the initialisation vector, in bytes.
pub const IV_LEN: usize = 16;

/// Length of the derived AES key, in bytes (AES-128).
pub const KEY_LEN: usize = 16;

/// PBKDF2 iteration count used by Easy Save 3.
pub const KDF_ITERATIONS: u32 = 100;

/// AES block size, in bytes.
const BLOCK_LEN: usize = 16;

type Aes128CbcEnc = cbc::Encryptor<Aes128>;
type Aes128CbcDec = cbc::Decryptor<Aes128>;

/// Derives the AES key from the password and the IV (which doubles as the salt).
fn derive_key(iv: &[u8]) -> Result<[u8; KEY_LEN], Es3Error> {
    let mut key = [0u8; KEY_LEN];
    pbkdf2::<Hmac<Sha1>>(PASSWORD, iv, KDF_ITERATIONS, &mut key)
        .map_err(|_| Es3Error::Crypto("the password could not be turned into an AES key".into()))?;
    Ok(key)
}

/// Generates a cryptographically random initialisation vector.
pub fn random_iv() -> [u8; IV_LEN] {
    let mut iv = [0u8; IV_LEN];
    OsRng.fill_bytes(&mut iv);
    iv
}

/// Decrypts an ES3 container (`IV || AES-128-CBC ciphertext`) into raw bytes.
pub fn decrypt(blob: &[u8]) -> Result<Vec<u8>, Es3Error> {
    if blob.len() < IV_LEN + BLOCK_LEN || (blob.len() - IV_LEN) % BLOCK_LEN != 0 {
        return Err(Es3Error::BadContainer(blob.len()));
    }

    let iv = &blob[..IV_LEN];
    let ciphertext = &blob[IV_LEN..];
    let key = derive_key(iv)?;

    let decryptor = Aes128CbcDec::new_from_slices(&key, iv)
        .map_err(|_| Es3Error::Crypto("the initialisation vector has an invalid length".into()))?;

    decryptor
        .decrypt_padded_vec_mut::<Pkcs7>(ciphertext)
        .map_err(|_| {
            Es3Error::Crypto(
                "the PKCS#7 padding is invalid - the password does not match or the file is damaged"
                    .into(),
            )
        })
}

/// Encrypts raw bytes into an ES3 container using a freshly generated IV.
pub fn encrypt(plaintext: &[u8]) -> Result<Vec<u8>, Es3Error> {
    encrypt_with_iv(plaintext, &random_iv())
}

/// Encrypts raw bytes into an ES3 container with an explicit IV.
pub fn encrypt_with_iv(plaintext: &[u8], iv: &[u8]) -> Result<Vec<u8>, Es3Error> {
    if iv.len() != IV_LEN {
        return Err(Es3Error::Crypto("the initialisation vector must be 16 bytes".into()));
    }

    let key = derive_key(iv)?;
    let encryptor = Aes128CbcEnc::new_from_slices(&key, iv)
        .map_err(|_| Es3Error::Crypto("the initialisation vector has an invalid length".into()))?;

    let ciphertext = encryptor.encrypt_padded_vec_mut::<Pkcs7>(plaintext);

    let mut container = Vec::with_capacity(IV_LEN + ciphertext.len());
    container.extend_from_slice(iv);
    container.extend_from_slice(&ciphertext);
    Ok(container)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_the_container_format() {
        let plaintext = b"{\"PlayersMoney\":{\"__type\":\"int\",\"value\":8164}}";
        let container = encrypt(plaintext).expect("encrypt");
        assert_eq!(container.len() % BLOCK_LEN, 0);
        assert!(container.len() > IV_LEN);
        let decrypted = decrypt(&container).expect("decrypt");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn rejects_containers_with_a_broken_length() {
        assert!(matches!(decrypt(&[0u8; 20]), Err(Es3Error::BadContainer(_))));
        assert!(matches!(decrypt(&[0u8; 17]), Err(Es3Error::BadContainer(_))));
    }

    #[test]
    fn rejects_containers_with_a_wrong_password() {
        let mut container = encrypt(b"hello").expect("encrypt");
        container[IV_LEN] ^= 0xFF;
        assert!(matches!(decrypt(&container), Err(Es3Error::Crypto(_))));
    }
}
