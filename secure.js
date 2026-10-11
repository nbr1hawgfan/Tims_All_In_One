/* ============================================================
   Personal Toolkit — Secure Vault crypto helpers
   AES-GCM encryption, key derived from a passphrase via PBKDF2.
   The derived key only ever lives in memory for this page load —
   it is never written to disk. Forgetting the passphrase means
   the vault contents cannot be recovered; there is no reset path
   by design, since this is on-device only with no account/email.
   ============================================================ */

const toolkitSecure = (() => {
  let sessionKey = null; // CryptoKey, memory-only

  function bufToB64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function b64ToBuf(b64) {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
  }

  async function deriveKey(passphrase, saltB64) {
    const salt = b64ToBuf(saltB64);
    const baseKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function isSetUp() {
    const meta = await dbGet('vault_meta', 'meta');
    return !!meta;
  }

  async function setup(passphrase) {
    const saltBuf = crypto.getRandomValues(new Uint8Array(16));
    const saltB64 = bufToB64(saltBuf);
    const key = await deriveKey(passphrase, saltB64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const verifierPlain = new TextEncoder().encode('toolkit-vault-ok');
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, verifierPlain);
    await dbPut('vault_meta', {
      id: 'meta',
      salt: saltB64,
      iv: bufToB64(iv),
      verifier: bufToB64(cipher),
    });
    sessionKey = key;
    return true;
  }

  async function unlock(passphrase) {
    const meta = await dbGet('vault_meta', 'meta');
    if (!meta) throw new Error('Vault has not been set up yet.');
    const key = await deriveKey(passphrase, meta.salt);
    try {
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(meta.iv)) },
        key,
        b64ToBuf(meta.verifier)
      );
      const text = new TextDecoder().decode(plain);
      if (text !== 'toolkit-vault-ok') throw new Error('bad passphrase');
      sessionKey = key;
      return true;
    } catch (e) {
      throw new Error('Incorrect passphrase.');
    }
  }

  function isUnlocked() {
    return !!sessionKey;
  }

  function lock() {
    sessionKey = null;
  }

  async function encryptJson(obj) {
    if (!sessionKey) throw new Error('Vault is locked.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(obj));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, plain);
    return { cipherText: bufToB64(cipher), iv: bufToB64(iv) };
  }

  async function decryptJson(record) {
    if (!sessionKey) throw new Error('Vault is locked.');
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(record.iv)) },
      sessionKey,
      b64ToBuf(record.cipherText)
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function resetVault() {
    // Destructive: wipes all vault data (logins + cards) and meta. Used if passphrase is lost.
    await dbClearStore('vault_meta');
    await dbClearStore('vault_items');
    sessionKey = null;
  }

  return { isSetUp, setup, unlock, isUnlocked, lock, encryptJson, decryptJson, resetVault };
})();
