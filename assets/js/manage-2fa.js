(function () {
  const TOTP_SECRET_KEY = 'bw_artist_manage_totp_secret_v1';
  const TOTP_ISSUER = 'T. Kempenaar';
  const TOTP_PERIOD = 30;
  const TOTP_DIGITS = 6;
  const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function readSecret() {
    try {
      return String(localStorage.getItem(TOTP_SECRET_KEY) || '').trim().toUpperCase();
    } catch (error) {
      return '';
    }
  }

  function saveSecret(secret) {
    const normalized = String(secret || '').trim().toUpperCase();
    if (!/^[A-Z2-7]{16,}$/.test(normalized)) return false;
    try {
      localStorage.setItem(TOTP_SECRET_KEY, normalized);
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearSecret() {
    try {
      localStorage.removeItem(TOTP_SECRET_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  function isEnabled() {
    return Boolean(readSecret());
  }

  function base32Encode(bytes) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < bytes.length; i += 1) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
  }

  function base32Decode(input) {
    const cleaned = String(input || '').toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];

    for (let i = 0; i < cleaned.length; i += 1) {
      const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return new Uint8Array(bytes);
  }

  function generateSecret(byteLength = 20) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return base32Encode(bytes);
  }

  function buildOtpAuthUrl(secret, accountName) {
    const account = encodeURIComponent(accountName || 'beheer');
    const issuer = encodeURIComponent(TOTP_ISSUER);
    const encodedSecret = encodeURIComponent(secret);
    return `otpauth://totp/${issuer}:${account}?secret=${encodedSecret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
  }

  function buildQrImageUrl(otpauthUrl) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(otpauthUrl)}`;
  }

  async function hotp(secret, counter) {
    const keyData = base32Decode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    const high = Math.floor(counter / 0x100000000);
    const low = counter >>> 0;
    view.setUint32(0, high);
    view.setUint32(4, low);

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
    const bytes = new Uint8Array(signature);
    const offset = bytes[bytes.length - 1] & 0x0f;
    const binary = (
      ((bytes[offset] & 0x7f) << 24) |
      ((bytes[offset + 1] & 0xff) << 16) |
      ((bytes[offset + 2] & 0xff) << 8) |
      (bytes[offset + 3] & 0xff)
    ) >>> 0;
    const otp = binary % (10 ** TOTP_DIGITS);
    return String(otp).padStart(TOTP_DIGITS, '0');
  }

  async function totpAt(secret, timestampMs) {
    const counter = Math.floor((timestampMs / 1000) / TOTP_PERIOD);
    return hotp(secret, counter);
  }

  async function verifyCodeWithSecret(secret, code) {
    const normalizedCode = String(code || '').trim();
    if (!/^\d{6}$/.test(normalizedCode)) return false;
    const now = Date.now();
    const windows = [-1, 0, 1];

    for (let i = 0; i < windows.length; i += 1) {
      const candidate = await totpAt(secret, now + (windows[i] * TOTP_PERIOD * 1000));
      if (candidate === normalizedCode) return true;
    }

    return false;
  }

  async function verifyCode(code) {
    const secret = readSecret();
    if (!secret) return false;
    return verifyCodeWithSecret(secret, code);
  }

  window.BWManage2FA = {
    isEnabled,
    getSecret: readSecret,
    saveSecret,
    clearSecret,
    generateSecret,
    buildOtpAuthUrl,
    buildQrImageUrl,
    verifyCode,
    verifyCodeWithSecret
  };
})();
