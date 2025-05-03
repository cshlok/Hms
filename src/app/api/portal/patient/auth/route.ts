// src/app/api/portal/patient/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Define interfaces for request bodies
interface LoginData {
  email?: string;
  password?: string;
}

interface RegisterData {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  blood_group?: string;
  emergency_contact?: string;
}

// Placeholder function to simulate patient login
async function authenticatePatient(email: string, password: string) {
  console.log("Simulating patient authentication for:", email);
  // Replace with actual D1 query and password verification when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   `SELECT id, name, email, password_hash FROM patients WHERE email = ? LIMIT 1`
  // ).bind(email).all();
  //
  // if (results.length === 0) return null;
  //
  // const patient = results[0];
  // const passwordMatch = await bcrypt.compare(password, patient.password_hash);
  //
  // if (!passwordMatch) return null;
  //
  // // Don't return password hash in response
  // delete patient.password_hash;
  // return patient;

  // For now, return mock data for specific test accounts
  if (email === "patient@example.com" && password === "password123") {
    return {
      id: 1,
      name: "John Smith",
      email: "patient@example.com",
      phone: "555-1234",
      date_of_birth: "1985-05-15",
      gender: "Male",
      address: "123 Main St, Anytown",
      medical_record_number: "MRN00101",
      blood_group: "O+",
      emergency_contact: "+91-9876543210",
      created_at: "2025-01-01T10:00:00Z",
    };
  }

  return;
}

// Placeholder function to simulate patient registration
async function registerPatient(patientData: RegisterData) {
  // Use RegisterData interface
  console.log("Simulating patient registration:", patientData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  //
  // // Hash the password
  // const passwordHash = await bcrypt.hash(patientData.password, 10);
  //
  // // Generate a unique medical record number
  // const mrnPrefix = "MRN";
  // const { results: lastMRN } = await env.DB.prepare(
  //   `SELECT medical_record_number FROM patients
  //    WHERE medical_record_number LIKE ?
  //    ORDER BY id DESC LIMIT 1`
  // ).bind(`${mrnPrefix}%`).all();
  //
  // let nextMRNNumber = 1;
  // if (lastMRN.length > 0) {
  //   const lastNumber = parseInt(lastMRN[0].medical_record_number.replace(mrnPrefix, ""));
  //   nextMRNNumber = lastNumber + 1;
  // }
  //
  // const medicalRecordNumber = `${mrnPrefix}${nextMRNNumber.toString().padStart(5, '0')}`;
  //
  // const info = await env.DB.prepare(
  //   `INSERT INTO patients (
  //     name, email, password_hash, phone, date_of_birth, gender,
  //     address, medical_record_number, blood_group, emergency_contact
  //   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  // ).bind(
  //   patientData.name,
  //   patientData.email,
  //   passwordHash,
  //   patientData.phone,
  //   patientData.date_of_birth,
  //   patientData.gender,
  //   patientData.address,
  //   medicalRecordNumber,
  //   patientData.blood_group,
  //   patientData.emergency_contact
  // ).run();
  //
  // return {
  //   id: info.meta.last_row_id,
  //   ...patientData,
  //   medical_record_number: medicalRecordNumber,
  //   password: undefined // Don't return password
  // };

  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  const medicalRecordNumber = `MRN${newId.toString().padStart(5, "0")}`;

  return {
    id: newId,
    name: patientData.name,
    email: patientData.email,
    phone: patientData.phone,
    date_of_birth: patientData.date_of_birth,
    gender: patientData.gender,
    address: patientData.address,
    medical_record_number: medicalRecordNumber,
    blood_group: patientData.blood_group,
    emergency_contact: patientData.emergency_contact,
    created_at: new Date().toISOString(),
  };
}

/**
 * POST /api/portal/patient/auth/login
 * POST /api/portal/patient/auth/register
 * Authenticates or registers a patient and returns patient data.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if this is a login or register request
    const path = request.nextUrl.pathname;
    const isLoginRequest = path.endsWith("/login");
    const isRegisterRequest = path.endsWith("/register");

    if (!isLoginRequest && !isRegisterRequest) {
      return NextResponse.json(
        { error: "Invalid authentication endpoint" },
        { status: 400 }
      );
    }

    if (isLoginRequest) {
      // Handle login request
      const data = (await request.json()) as LoginData;
      const { email, password } = data;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      const patient = await authenticatePatient(email, password);

      if (!patient) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // In a real implementation, you would generate a JWT token here
      // const token = jwt.sign({ id: patient.id, email: patient.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

      return NextResponse.json({
        patient,
        token: "mock_jwt_token_for_patient_portal", // Replace with real JWT in production
      });
    } else {
      // isRegisterRequest
      // Handle register request
      const data = (await request.json()) as RegisterData;
      const {
        name,
        email,
        password,
        phone,
        date_of_birth,
        gender,
        address,
        blood_group,
        emergency_contact,
      } = data;

      // Basic validation
      if (!name || !email || !password) {
        return NextResponse.json(
          { error: "Name, email, and password are required" },
          { status: 400 }
        );
      }

      // In a real implementation, you would check if the email is already in use
      // const { results } = await env.DB.prepare(`SELECT id FROM patients WHERE email = ?`).bind(email).all();
      // if (results.length > 0) {
      //   return NextResponse.json(
      //     { error: "Email is already in use" },
      //     { status: 409 }
      //   );
      // }

      const newPatient = await registerPatient({
        name,
        email,
        password,
        phone,
        date_of_birth,
        gender,
        address,
        blood_group,
        emergency_contact,
      });

      // In a real implementation, you would generate a JWT token here
      // const token = jwt.sign({ id: newPatient.id, email: newPatient.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

      return NextResponse.json(
        {
          patient: newPatient,
          token: "mock_jwt_token_for_patient_portal", // Replace with real JWT in production
        },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    // Add type annotation for error
    console.error("Error in patient authentication:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred"; // Handle unknown error type
    return NextResponse.json(
      { error: "Authentication failed", details: message },
      { status: 500 }
    );
  }
}
