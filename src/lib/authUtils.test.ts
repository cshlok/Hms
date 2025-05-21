// SEC-2: Unit tests for password hashing and verification functions
// Research notes: research_notes_password_hashing.md (covers bcrypt)

import { hashPassword, comparePassword } from "./authUtils";
import bcrypt from "bcryptjs";

// Mock bcryptjs functions
// jest.mock("bcryptjs", () => ({
//   hash: jest.fn(),
//   compare: jest.fn(),
// }));
// We will test the actual bcryptjs functions as they are fast enough for unit tests
// and it ensures the integration with the library is correct.

const SALT_ROUNDS = 10; // Should match the one in authUtils.ts if it were configurable there, but it's hardcoded.

describe("authUtils", () => {
  describe("hashPassword", () => {
    it("should hash a given password string", async () => {
      const password = "mySecurePassword123";
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe("string");
      // Bcrypt hashes include the salt and version, so they don't look like the original password.
      expect(hashedPassword).not.toBe(password);
      
      // Verify the hash is a valid bcrypt hash (optional, but good for sanity)
      // A typical bcrypt hash looks like $2a$10$... or $2b$10$...
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
    });

    it("should produce different hashes for the same password due to salting", async () => {
      const password = "mySecurePassword123";
      const hashedPassword1 = await hashPassword(password);
      const hashedPassword2 = await hashPassword(password);

      expect(hashedPassword1).not.toBe(hashedPassword2);
    });
  });

  describe("comparePassword", () => {
    const password = "myTestPassword@!#";
    let hashedPassword: string;

    beforeAll(async () => {
      // Hash the password once before the tests in this describe block
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    });

    it("should return true for a correct password and its hash", async () => {
      const isMatch = await comparePassword(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it("should return false for an incorrect password and a valid hash", async () => {
      const incorrectPassword = "wrongPassword123";
      const isMatch = await comparePassword(incorrectPassword, hashedPassword);
      expect(isMatch).toBe(false);
    });

    it("should return false for a correct password and an invalid/corrupted hash", async () => {
      const invalidHash = "not_a_real_hash";
      // bcrypt.compare itself handles errors with invalid hashes gracefully by returning false or throwing an error
      // depending on the nature of the invalidity. For a clearly invalid format, it might throw.
      // For this test, we expect it to resolve to false if the hash is simply not a match or malformed in a way compare handles.
      // If bcrypt.compare throws for certain malformed hashes, the test would need to expect an error.
      // Based on typical bcryptjs behavior, it should return false for non-matching or structurally invalid (but parsable) hashes.
      const isMatch = await comparePassword(password, invalidHash);
      expect(isMatch).toBe(false);
    });

    it("should handle empty password string correctly when comparing", async () => {
      const emptyPassword = "";
      const hashedEmptyPassword = await hashPassword(emptyPassword);
      
      const isMatchWithCorrectEmpty = await comparePassword(emptyPassword, hashedEmptyPassword);
      expect(isMatchWithCorrectEmpty).toBe(true);

      const isMatchWithNonEmpty = await comparePassword("somepassword", hashedEmptyPassword);
      expect(isMatchWithNonEmpty).toBe(false);
    });
  });
});

