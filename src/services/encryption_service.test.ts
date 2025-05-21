// SEC-1: Unit Tests for EncryptionService (Placeholder)

import { EncryptionService, IEncryptionService } from "./encryption_service";

describe("EncryptionService (Placeholder)", () => {
  let encryptionService: IEncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
    // Suppress console.warn for these tests as the warning is expected
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("encrypt", () => {
    it("should return a prefixed placeholder string for non-null input", () => {
      const originalText = "MySensitiveData123";
      const encrypted = encryptionService.encrypt(originalText);
      expect(encrypted).toBe(`encrypted_placeholder_${originalText}`);
    });

    it("should return null if input is null", () => {
      const encrypted = encryptionService.encrypt(null as any);
      expect(encrypted).toBeNull();
    });

    it("should return undefined if input is undefined", () => {
      const encrypted = encryptionService.encrypt(undefined as any);
      expect(encrypted).toBeUndefined();
    });

    it("should handle empty string input", () => {
      const originalText = "";
      const encrypted = encryptionService.encrypt(originalText);
      expect(encrypted).toBe(`encrypted_placeholder_${originalText}`);
    });
  });

  describe("decrypt", () => {
    it("should remove the prefix from a placeholder encrypted string", () => {
      const originalText = "MySensitiveData123";
      const encryptedPlaceholder = `encrypted_placeholder_${originalText}`;
      const decrypted = encryptionService.decrypt(encryptedPlaceholder);
      expect(decrypted).toBe(originalText);
    });

    it("should return the original string if it does not match the placeholder format", () => {
      const nonPlaceholderText = "some_other_encrypted_format_data";
      const decrypted = encryptionService.decrypt(nonPlaceholderText);
      expect(decrypted).toBe(nonPlaceholderText);
      expect(console.warn).toHaveBeenCalledWith(
        `EncryptionService (Placeholder): Attempted to decrypt text that was not in placeholder format: '${nonPlaceholderText}'`
      );
    });

    it("should return null if input is null", () => {
      const decrypted = encryptionService.decrypt(null as any);
      expect(decrypted).toBeNull();
    });

    it("should return undefined if input is undefined", () => {
      const decrypted = encryptionService.decrypt(undefined as any);
      expect(decrypted).toBeUndefined();
    });

    it("should handle empty string if it was placeholder encrypted", () => {
      const encryptedPlaceholder = "encrypted_placeholder_";
      const decrypted = encryptionService.decrypt(encryptedPlaceholder);
      expect(decrypted).toBe("");
    });

    it("should handle empty string if it was not placeholder encrypted", () => {
      const originalText = "";
      const decrypted = encryptionService.decrypt(originalText);
      expect(decrypted).toBe(""); // It doesn't start with prefix, so returns as is
      expect(console.warn).toHaveBeenCalledWith(
        `EncryptionService (Placeholder): Attempted to decrypt text that was not in placeholder format: '${originalText}'`
      );
    });
  });
});

