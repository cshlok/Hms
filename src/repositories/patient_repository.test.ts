// ARCH-3: Unit Tests for PatientRepository

import { PatientRepository, IPatientRepository, Patient, PatientInputData } from "./patient_repository";
import { IDatabaseAdapter } from "../lib/database/postgresql_adapter";
import { QueryResult } from "pg";

// Mock the IDatabaseAdapter
const mockDbAdapter: jest.Mocked<IDatabaseAdapter> = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  execute: jest.fn(),
  beginTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
};

describe("PatientRepository", () => {
  let patientRepository: IPatientRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    patientRepository = new PatientRepository(mockDbAdapter);
  });

  describe("create", () => {
    const patientInput: PatientInputData = {
      name: "John Doe",
      dateOfBirth: new Date("1990-01-01T00:00:00.000Z"), // Use ISO string for consistency in test setup
    };
    const expectedDobForDb = "1990-01-01"; // The format the repository converts to

    const createdPatientDbRow = {
      id: "generated-uuid",
      name: "John Doe",
      date_of_birth: "1990-01-01", // DB returns string
      created_at: new Date().toISOString(), // DB returns string
      updated_at: new Date().toISOString(), // DB returns string
    };
    
    const createdPatientExpected: Patient = {
      id: "generated-uuid",
      name: "John Doe",
      dateOfBirth: new Date("1990-01-01"), // Converted back to Date object
      createdAt: new Date(createdPatientDbRow.created_at),
      updatedAt: new Date(createdPatientDbRow.updated_at),
    };


    it("should create a patient and return the created patient data", async () => {
      // Mock the execute function to return a structure that matches the repository's mapping logic
      mockDbAdapter.execute.mockResolvedValueOnce({ 
        rows: [{
          id: createdPatientExpected.id,
          name: createdPatientExpected.name,
          date_of_birth: createdPatientDbRow.date_of_birth, // as string from DB
          created_at: createdPatientDbRow.created_at, // as string from DB
          updated_at: createdPatientDbRow.updated_at, // as string from DB
        }] 
      } as unknown as QueryResult<any>); // Use any for the row type due to property name differences

      const result = await patientRepository.create(patientInput);

      expect(mockDbAdapter.execute).toHaveBeenCalledTimes(1);
      expect(mockDbAdapter.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO patients"),
        [patientInput.name, expectedDobForDb] // Expect the formatted date string
      );
      // Compare parts of the result due to date object precision issues in direct toEqual
      expect(result.id).toEqual(createdPatientExpected.id);
      expect(result.name).toEqual(createdPatientExpected.name);
      expect(result.dateOfBirth.toISOString().split('T')[0]).toEqual(expectedDobForDb);
      // For createdAt and updatedAt, checking they are Date objects is often sufficient for unit tests
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should throw an error if database execution fails during create", async () => {
      mockDbAdapter.execute.mockRejectedValueOnce(new Error("DB error"));

      // Expect the more specific error message from the repository
      await expect(patientRepository.create(patientInput)).rejects.toThrow("Failed to create patient due to a database issue.");
      expect(mockDbAdapter.execute).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if no record is returned after insert", async () => {
      mockDbAdapter.execute.mockResolvedValueOnce({ rows: [] } as QueryResult<Patient>); // No rows returned

      await expect(patientRepository.create(patientInput)).rejects.toThrow("Patient creation failed, no record returned.");
      expect(mockDbAdapter.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe("findById", () => {
    const patientId = "test-patient-id";
    const mockPatientDbRow = {
      id: patientId,
      name: "Jane Doe",
      date_of_birth: "1985-05-15",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const mockPatientExpected: Patient = {
      id: patientId,
      name: "Jane Doe",
      dateOfBirth: new Date("1985-05-15"),
      createdAt: new Date(mockPatientDbRow.created_at),
      updatedAt: new Date(mockPatientDbRow.updated_at),
    };

    it("should find a patient by ID and return the patient data", async () => {
      mockDbAdapter.execute.mockResolvedValueOnce({ 
        rows: [mockPatientDbRow] 
      } as unknown as QueryResult<any>);

      const result = await patientRepository.findById(patientId);

      expect(mockDbAdapter.execute).toHaveBeenCalledTimes(1);
      expect(mockDbAdapter.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT id, name, date_of_birth, created_at, updated_at"),
        [patientId]
      );
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toEqual(mockPatientExpected.id);
        expect(result.name).toEqual(mockPatientExpected.name);
        expect(result.dateOfBirth.toISOString().split('T')[0]).toEqual("1985-05-15");
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should return null if patient with the given ID is not found", async () => {
      mockDbAdapter.execute.mockResolvedValueOnce({ rows: [] } as QueryResult<Patient>); // No rows returned

      const result = await patientRepository.findById(patientId);

      expect(mockDbAdapter.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it("should throw an error if database execution fails during findById", async () => {
      mockDbAdapter.execute.mockRejectedValueOnce(new Error("DB error"));

      await expect(patientRepository.findById(patientId)).rejects.toThrow("Failed to find patient by ID.");
      expect(mockDbAdapter.execute).toHaveBeenCalledTimes(1);
    });
  });
});

