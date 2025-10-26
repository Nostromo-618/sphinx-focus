/**
 * Encryption Service
 * Provides AES-GCM 256-bit encryption for localStorage data
 * Based on Web Crypto API for secure, browser-native encryption
 */

const KEY_STORAGE_KEY = 'sphinxFocusCryptoKey';

class EncryptionService {
  constructor() {
    this.key = null;
    this.initPromise = this.init();
  }

  /**
   * Initialize the encryption service
   * Loads existing key or generates a new one
   */
  async init() {
    try {
      const storedKey = localStorage.getItem(KEY_STORAGE_KEY);
      if (storedKey) {
        this.key = await this.importKey(JSON.parse(storedKey));
      } else {
        this.key = await this.generateKey();
        const exportedKey = await this.exportKey(this.key);
        localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(exportedKey));
      }
    } catch (error) {
      console.error('Error initializing encryption service:', error);
      throw error;
    }
  }

  /**
   * Generate a new AES-GCM 256-bit encryption key
   */
  async generateKey() {
    return window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export key to JSON Web Key format for storage
   */
  async exportKey(key) {
    return window.crypto.subtle.exportKey('jwk', key);
  }

  /**
   * Import key from JSON Web Key format
   */
  async importKey(jwk) {
    return window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'AES-GCM',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using AES-GCM
   * @param {string} data - The data to encrypt
   * @returns {Promise<string>} Encrypted data as JSON string
   */
  async encrypt(data) {
    // Ensure initialization is complete
    await this.initPromise;
    
    if (!this.key) {
      throw new Error('Encryption key not available');
    }

    // Generate a random initialization vector
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encode the data
    const encodedData = new TextEncoder().encode(data);

    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.key,
      encodedData
    );

    // Convert to arrays for JSON serialization
    const encryptedArray = new Uint8Array(encryptedData);
    const ivArray = Array.from(iv);
    const encryptedDataArray = Array.from(encryptedArray);

    // Return as JSON string
    return JSON.stringify({ iv: ivArray, data: encryptedDataArray });
  }

  /**
   * Decrypt data using AES-GCM
   * @param {string} encrypted - The encrypted data as JSON string
   * @returns {Promise<string>} Decrypted data
   */
  async decrypt(encrypted) {
    // Ensure initialization is complete
    await this.initPromise;
    
    if (!this.key) {
      throw new Error('Decryption key not available');
    }

    // Parse the encrypted data
    const { iv, data } = JSON.parse(encrypted);
    const ivArray = new Uint8Array(iv);
    const encryptedData = new Uint8Array(data);

    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivArray,
      },
      this.key,
      encryptedData
    );

    // Decode and return
    return new TextDecoder().decode(decryptedData);
  }
}

// Export singleton instance
const encryptionService = new EncryptionService();

