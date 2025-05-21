# Research: Security Improvements - Password Hashing (Argon2 vs bcrypt vs scrypt)

Source URL: https://stytch.com/blog/argon2-vs-bcrypt-vs-scrypt/

## Key Takeaways:

*   **Hashing vs. Encryption:**
    *   Encryption is two-way (reversible), used when data needs to be decrypted later.
    *   Hashing is one-way (irreversible), converting data into a fixed-length hash. The original input cannot be derived from the hash alone.
*   **Why Hash Passwords:**
    *   **Irreversibility:** Protects original passwords even if the hash database is breached.
    *   **Consistency:** The same input password always generates the same hash, allowing verification without storing the plaintext password.
*   **How Hashing Works (Common Parameters):**
    *   **Input:** The data to be hashed (e.g., password).
    *   **Salt:** A random string added to the input before hashing to protect against rainbow table and dictionary attacks. Each user should have a unique salt.
    *   **Cycles/Work Factor:** Number of iterations the hashing algorithm runs. Higher values increase security but also computational cost.
    *   **Memory Hardness:** Amount of memory required by the algorithm. Algorithms like Argon2 and scrypt are designed to be memory-hard, making them more resistant to GPU/ASIC-based cracking attempts.
    *   **Threads/Parallelism:** Degree of parallelism the algorithm can use.
*   **Recommended Hashing Algorithms for Passwords:** Argon2, bcrypt, and scrypt are recommended due to their configurable memory and cost parameters, increasing resistance against attacks.

*   **Argon2:**
    *   Designed by Alex Biryukov, Daniel Dinu, and Dmitry Khovratovich (2015).
    *   Winner of the Password Hashing Competition (2015).
    *   Considered highly secure and resistant to GPU cracking due to its memory hardness and configurable parallelism.
    *   Three versions: Argon2d (maximizes resistance to GPU cracking attacks), Argon2i (optimized to resist side-channel attacks), and Argon2id (hybrid, recommended for password hashing, provides a balance of Argon2i's side-channel resistance and Argon2d's brute-force resistance).
    *   Parameters: memory cost, number of iterations (time cost), and degree of parallelism.

*   **bcrypt:**
    *   Designed by Niels Provos and David Mazières (1999), based on the Blowfish cipher.
    *   Intentionally slow to make brute-force attacks more difficult.
    *   Uses a salt automatically.
    *   Work factor (cost factor) can be adjusted to increase computational cost.
    *   Widely used and battle-tested, but less memory-hard than Argon2 or scrypt, making it potentially more vulnerable to custom hardware attacks over time.

*   **scrypt:**
    *   Designed by Colin Percival (2009).
    *   Designed to be memory-hard, requiring significant RAM, making large-scale custom hardware attacks more expensive.
    *   Parameters: CPU/memory cost factor (N), block size (r), and parallelization factor (p).

## Which to Choose (Argon2 vs bcrypt):

*   **Argon2 (specifically Argon2id)** is generally considered the strongest and most modern recommendation due to its resistance to various attack types (GPU, side-channel) and its configurability.
*   **bcrypt** is still a solid and widely adopted choice, especially if Argon2 is not readily available or if there are concerns about the maturity of Argon2 libraries in a specific environment (though Argon2 libraries are now quite mature for Node.js).
*   The HMS prompt specifically mentions **Argon2 or bcrypt**. Given Argon2's strengths, it would be the preferred choice if a reliable Node.js library is available and easy to integrate.

## Relevance to HMS Project (SEC-2 - Strengthen Password Hashing):

This research directly informs the task of strengthening password hashing in `src/lib/authUtils.ts`.

*   **Algorithm Choice:** The implementation should use either Argon2 (preferably Argon2id) or bcrypt. The `manus7 (1)` prompt allows for either.
*   **Library Selection:** A well-vetted Node.js library for the chosen algorithm needs to be used (e.g., `argon2` or `bcrypt` npm packages).
*   **Salting:** Ensure that a unique salt is generated for each password and stored alongside the hash.
*   **Configurable Parameters:** The work factor (for bcrypt) or memory/time/parallelism costs (for Argon2) should be set to appropriately high values, balancing security with acceptable performance for login.
*   **Implementation:** The `authUtils.ts` file will need functions for: 
    *   `hashPassword(password: string): Promise<string>`
    *   `verifyPassword(password: string, hash: string): Promise<boolean>`
*   **Comments:** Add comments explaining the choice of algorithm and its parameters.

**Decision for HMS:** Prioritize Argon2id if a suitable library is easily integrated. Otherwise, bcrypt is a strong fallback. The `argon2` npm package is a good candidate for Argon2id.
