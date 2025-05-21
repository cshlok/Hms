// ARCH-1: Unit Tests for PostgresqlAdapter
// Research notes: (General Jest/TypeScript testing practices)

import { PostgresqlAdapter, IDatabaseAdapter } from "./postgresql_adapter";
import { Pool, PoolClient, QueryResult } from "pg";

// Mock the pg module
const mockPoolClient = {
  query: jest.fn(),
  release: jest.fn(),
};
const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockPoolClient)),
  end: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
};
jest.mock("pg", () => {
  return { Pool: jest.fn(() => mockPool) };
});

describe("PostgresqlAdapter", () => {
  let adapter: IDatabaseAdapter;
  // Types for the mocked instances. These are not jest.Mocked<Pool> directly but the objects with jest.fn properties.
  let currentMockPool: typeof mockPool;
  let currentMockPoolClient: typeof mockPoolClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Since Pool is mocked to return mockPool, every new PostgresqlAdapter() will get this same mockPool instance.
    adapter = new PostgresqlAdapter();
    
    // Assign the globally defined mocks to current test run instances for clarity, though they are the same objects.
    currentMockPool = mockPool;
    currentMockPoolClient = mockPoolClient;

    // Reset the state of the connect mock if needed, or ensure it resolves to the client for each test.
    currentMockPool.connect.mockResolvedValue(currentMockPoolClient as unknown as PoolClient);
  });

  describe("connect", () => {
    it("should connect to the pool and release the client", async () => {
      await adapter.connect();
      expect(currentMockPool.connect).toHaveBeenCalledTimes(1);
      expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if connection fails", async () => {
      currentMockPool.connect.mockRejectedValueOnce(new Error("Connection failed"));
      await expect(adapter.connect()).rejects.toThrow("Connection failed");
    });
  });

  describe("disconnect", () => {
    it("should end the pool", async () => {
      await adapter.disconnect();
      expect(currentMockPool.end).toHaveBeenCalledTimes(1);
    });
     it("should throw an error if disconnecting fails", async () => {
      currentMockPool.end.mockRejectedValueOnce(new Error("Disconnection failed"));
      await expect(adapter.disconnect()).rejects.toThrow("Disconnection failed");
    });
  });

  describe("execute", () => {
    const queryText = "SELECT * FROM test";
    const params = [1, "test"];
    const mockQueryResult = { rows: [{ id: 1, name: "Test" }] } as QueryResult;

    it("should execute a query and return the result", async () => {
      currentMockPoolClient.query.mockResolvedValueOnce(mockQueryResult as any);
      const result = await adapter.execute(queryText, params);
      expect(currentMockPool.connect).toHaveBeenCalledTimes(1);
      expect(currentMockPoolClient.query).toHaveBeenCalledWith(queryText, params);
      expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockQueryResult);
    });

    it("should throw an error if query execution fails", async () => {
      currentMockPoolClient.query.mockRejectedValueOnce(new Error("Query failed"));
      await expect(adapter.execute(queryText, params)).rejects.toThrow("Query failed");
      expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1); // Ensure client is released even on error
    });
  });

  describe("Transaction Management", () => {
    beforeEach(() => {
      currentMockPoolClient.query.mockReset();
      // Ensure connect mock is reset for each transaction test that calls beginTransaction
      currentMockPool.connect.mockResolvedValue(currentMockPoolClient as unknown as PoolClient);
    });

    describe("beginTransaction", () => {
      it("should begin a transaction and return the client", async () => {
        currentMockPoolClient.query.mockResolvedValueOnce({} as QueryResult); // Mock for BEGIN
        const client = await adapter.beginTransaction();
        expect(currentMockPool.connect).toHaveBeenCalledTimes(1);
        expect(currentMockPoolClient.query).toHaveBeenCalledWith("BEGIN");
        expect(client).toBe(currentMockPoolClient); // Should return the same client instance
        expect(currentMockPoolClient.release).not.toHaveBeenCalled(); // Client should not be released yet
      });

      it("should release client and throw if BEGIN fails", async () => {
        currentMockPool.connect.mockResolvedValue(currentMockPoolClient as unknown as PoolClient); // ensure connect resolves
        currentMockPoolClient.query.mockRejectedValueOnce(new Error("BEGIN failed"));
        await expect(adapter.beginTransaction()).rejects.toThrow("BEGIN failed");
        expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1);
      });
    });

    describe("commitTransaction", () => {
      it("should commit the transaction and release the client", async () => {
        currentMockPoolClient.query.mockResolvedValueOnce({} as QueryResult); // Mock for COMMIT
        await adapter.commitTransaction(currentMockPoolClient as PoolClient);
        expect(currentMockPoolClient.query).toHaveBeenCalledWith("COMMIT");
        expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1);
      });

      it("should attempt rollback and throw if COMMIT fails", async () => {
        currentMockPoolClient.query
          .mockRejectedValueOnce(new Error("COMMIT failed")) // For COMMIT
          .mockResolvedValueOnce({} as QueryResult); // For ROLLBACK
        await expect(adapter.commitTransaction(currentMockPoolClient as PoolClient)).rejects.toThrow("COMMIT failed");
        expect(currentMockPoolClient.query).toHaveBeenCalledWith("COMMIT");
        expect(currentMockPoolClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1);
      });

       it("should throw if both COMMIT and subsequent ROLLBACK fail", async () => {
        currentMockPoolClient.query
          .mockRejectedValueOnce(new Error("COMMIT failed")) // For COMMIT
          .mockRejectedValueOnce(new Error("ROLLBACK also failed")); // For ROLLBACK
        await expect(adapter.commitTransaction(currentMockPoolClient as PoolClient)).rejects.toThrow("COMMIT failed");
        expect(currentMockPoolClient.query).toHaveBeenCalledWith("COMMIT");
        expect(currentMockPoolClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1);
      });
    });

    describe("rollbackTransaction", () => {
      it("should roll back the transaction and release the client", async () => {
        currentMockPoolClient.query.mockResolvedValueOnce({} as QueryResult); // Mock for ROLLBACK
        await adapter.rollbackTransaction(currentMockPoolClient as PoolClient);
        expect(currentMockPoolClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1);
      });

      it("should throw an error if ROLLBACK fails but still release client", async () => {
        currentMockPoolClient.query.mockRejectedValueOnce(new Error("ROLLBACK failed"));
        await expect(adapter.rollbackTransaction(currentMockPoolClient as PoolClient)).rejects.toThrow("ROLLBACK failed");
        expect(currentMockPoolClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(currentMockPoolClient.release).toHaveBeenCalledTimes(1);
      });
    });
  });
});

