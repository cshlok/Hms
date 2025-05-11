// ARCH-3: Create Data Access Layer (DAL) with Repository Pattern (Initial Repositories)
// Research notes: (General TypeScript/Node.js data access patterns)

import { IDatabaseAdapter } from "../lib/database/postgresql_adapter";
import { QueryResult } from "pg";

// Basic Patient interface (could be expanded from a models/entities directory)
export interface Patient {
  id: string;
  name: string;
  dateOfBirth: Date; // Or string, depending on how it's handled
  // other relevant fields like contactInfo, medicalHistoryId, etc.
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientInputData {
  name: string;
  dateOfBirth: Date | string;
  // other fields...
}

export interface IPatientRepository {
  create(patientData: PatientInputData): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  // other methods like update, delete, findByCriteria, etc.
}

export class PatientRepository implements IPatientRepository {
  constructor(private db: IDatabaseAdapter) {}

  async create(patientData: PatientInputData): Promise<Patient> {
    const queryText = `
      INSERT INTO patients (name, date_of_birth /*, other_fields */)
      VALUES ($1, $2 /*, ... */)
      RETURNING id, name, date_of_birth, created_at, updated_at;
    `;
    // Ensure dateOfBirth is in a format suitable for DB (e.g., YYYY-MM-DD string or ISO string)
    const dobForDb = patientData.dateOfBirth instanceof Date ? patientData.dateOfBirth.toISOString().split('T')[0] : patientData.dateOfBirth;
    const values = [patientData.name, dobForDb /*, ... */];
    
    let result: QueryResult<Patient>;
    try {
      result = await this.db.execute(queryText, values);
    } catch (dbError: any) {
      console.error("Database error during patient creation in repository:", dbError);
      // Throw a more specific error or a domain error if applicable
      throw new Error("Failed to create patient due to a database issue.");
    }

    if (result && result.rows && result.rows.length > 0) {
      // Ensure date fields are converted back to Date objects if they are strings from DB
      const dbPatient = result.rows[0];
      return {
        ...dbPatient,
        dateOfBirth: new Date(dbPatient.dateOfBirth),
        createdAt: new Date(dbPatient.createdAt),
        updatedAt: new Date(dbPatient.updatedAt),
      };
    } else {
      // This case means DB execution was successful (no error thrown from execute) 
      // but the RETURNING clause did not yield a row.
      console.error("Patient creation in repository: DB execution successful but no record returned by RETURNING clause.");
      throw new Error("Patient creation failed, no record returned.");
    }
  }

  async findById(id: string): Promise<Patient | null> {
    const queryText = "SELECT id, name, date_of_birth, created_at, updated_at FROM patients WHERE id = $1";
    try {
      const result = await this.db.execute(queryText, [id]);
      if (result.rows && result.rows.length > 0) {
        const dbPatient = result.rows[0];
        return {
          ...dbPatient,
          dateOfBirth: new Date(dbPatient.dateOfBirth),
          createdAt: new Date(dbPatient.createdAt),
          updatedAt: new Date(dbPatient.updatedAt),
        };
      }
      return null; // Not found
    } catch (error: any) {
      console.error(`Error finding patient by ID (${id}) in repository:`, error);
      throw new Error("Failed to find patient by ID.");
    }
  }
}

