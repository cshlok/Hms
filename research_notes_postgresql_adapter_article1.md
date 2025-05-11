# Research: TypeScript PostgreSQL Adapter - Medium Article 1

Source URL: https://medium.com/@mateogalic112/how-to-build-a-node-js-api-with-postgresql-and-typescript-best-practices-and-tips-84fee3d1c46c

## Key Takeaways:

*   **Database Setup:** Recommends using Docker to run PostgreSQL locally for ease of setup and to avoid local installation dependencies. Provides a `docker run` command example.
*   **Client Library:** Suggests using the `pg` library for connecting Node.js/TypeScript to PostgreSQL due to its simplicity and good documentation.
*   **Connection Pooling:** Shows an example of creating a connection pool using `new Pool()` from the `pg` library. Configuration includes host, user, password, database, port, and `idleTimeoutMillis`.
*   **Environment Variables:** Emphasizes using environment variables (e.g., `env.POSTGRES_HOST`) for database credentials and connection parameters, promoting security and configurability.
*   **Table Creation:** Demonstrates creating a table directly via `psql` after connecting to the Dockerized database.
*   **SQL Queries:** Provides examples of writing SQL `INSERT` and `SELECT` queries within TypeScript functions using `pool.query()`.
*   **Error Handling:** Shows basic `try...catch` blocks for handling errors during database operations and passing errors to the next middleware in an Express-like setup (`next(err)`).
*   **API Route Integration:** Illustrates how to integrate database operations (create user, get users) into API route handlers.

## Code Snippets of Interest:

**Connection Pool Setup:**
```typescript
import { Pool } from "pg";  
import { env } from "./env";  
  
const pool = new Pool({  
  host: env.POSTGRES_HOST,  
  user: env.POSTGRES_USER,  
  password: env.POSTGRES_PASSWORD,  
  database: env.POSTGRES_DB,  
  port: env.POSTGRES_PORT,  
  idleTimeoutMillis: 30000,  
});  
  
export default pool;
```

**Example `createUser` function:**
```typescript
  private createUser = async (  
    request: Request,  
    response: Response,  
    next: NextFunction  
  ) => {  
    const { username, email } = request.body;  
    try {  
      const insertUser =  
        "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *";  
      const result = await pool.query(insertUser, [username, email]);  
  
      const createdUser = result.rows[0];  
      return response.json(createdUser);  
    } catch (err) {  
      next(err);  
    }  
  };
```

## Relevance to HMS Project (ARCH-1):

This article provides a good starting point for implementing the `PostgresqlAdapter`.

*   Confirms the use of the `pg` library is a common practice.
*   Highlights the importance of connection pooling for performance.
*   Shows how to structure basic database interaction methods (connect, execute queries).
*   Reinforces the need for environment variables for configuration.

This information will be useful when creating `src/lib/database/postgresql_adapter.ts`.
