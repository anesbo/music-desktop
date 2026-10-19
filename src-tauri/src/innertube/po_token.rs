use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;

const TOKEN_VERSION: u8 = 0x22;
const MAGIC_HEADER: u8 = 0x0A;
const INNER_TAG: u8 = 0x38;
const TIMESTAMP_TAG: u8 = 0x02;

pub fn generate_cold_start_token(identifier: &str, client_state: &str) -> String {
    let timestamp = chrono::Utc::now().timestamp_millis();
    let identifier_bytes = identifier.as_bytes();
    let state_bytes = client_state.as_bytes();

    let mut key_bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut key_bytes);

    let encrypted_id = xor_encrypt(identifier_bytes, &key_bytes);
    let timestamp_bytes = encode_long(timestamp);

    let mut inner_payload = Vec::new();
    inner_payload.push(INNER_TAG);
    append_var_int(&mut inner_payload, state_bytes.len());
    inner_payload.extend_from_slice(state_bytes);
    inner_payload.push(TIMESTAMP_TAG);
    append_var_int(&mut inner_payload, timestamp_bytes.len());
    inner_payload.extend_from_slice(&timestamp_bytes);

    let mut token_payload = Vec::new();
    token_payload.push(MAGIC_HEADER);
    append_var_int(&mut token_payload, key_bytes.len());
    token_payload.extend_from_slice(&key_bytes);
    token_payload.push(TOKEN_VERSION);
    append_var_int(&mut token_payload, encrypted_id.len());
    token_payload.extend_from_slice(&encrypted_id);
    token_payload.extend_from_slice(&inner_payload);

    URL_SAFE_NO_PAD.encode(&token_payload)
}

pub fn generate_session_token(identifier: &str) -> String {
    generate_cold_start_token(identifier, "session")
}

pub fn generate_content_token(identifier: &str, video_id: &str) -> String {
    generate_cold_start_token(identifier, video_id)
}

fn xor_encrypt(data: &[u8], key: &[u8]) -> Vec<u8> {
    data.iter()
        .enumerate()
        .map(|(i, &b)| b ^ key[i % key.len()])
        .collect()
}

fn encode_long(mut value: i64) -> Vec<u8> {
    let mut buf = [0u8; 8];
    for b in &mut buf {
        *b = (value & 0xFF) as u8;
        value >>= 8;
    }
    let mut len = 8;
    while len > 1 && buf[len - 1] == 0 {
        len -= 1;
    }
    buf[..len].to_vec()
}

fn append_var_int(vec: &mut Vec<u8>, mut value: usize) {
    while value >= 0x80 {
        vec.push(((value & 0x7F) | 0x80) as u8);
        value >>= 7;
    }
    vec.push(value as u8);
}
