/**
 * Blood Bank Donor Management API
 * 
 * This file implements the API endpoints for managing blood donors,
 * including registration, eligibility screening, and donation tracking.
 * 
 * FHIR Compliance: Uses Patient and Observation resources for donor management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { encryptSensitiveData } from '@/lib/encryption';
import { checkDonorEligibility } from '@/lib/bloodbank/donor-eligibility';

// Validation schema for creating a new donor
const createDonorSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().transform(val => new Date(val)),
  gender: z.string(),
  bloodGroup: z.string().optional(),
  rhFactor: z.string().optional(),
  contactNumber: z.string(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  identificationNumber: z.string().optional(),
  identificationType: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    contactNumber: z.string(),
  }).optional(),
  medicalHistory: z.object({
    chronicDiseases: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    previousDonations: z.array(z.object({
      date: z.string().transform(val => new Date(val)),
      location: z.string().optional(),
      reaction: z.string().optional(),
    })).optional(),
  }).optional(),
  consentGiven: z.boolean().default(false),
});

/**
 * POST /api/bloodbank/donors
 * 
 * Registers a new blood donor.
 * 
 * @param request - The incoming request object
 * @returns The newly registered donor
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_REGISTER_DONOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createDonorSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const donorData = validationResult.data;
    
    // Check if donor has given consent
    if (!donorData.consentGiven) {
      return NextResponse.json({ error: 'Donor consent is required' }, { status: 400 });
    }
    
    // Encrypt sensitive data
    const encryptedData = await encryptSensitiveData({
      contactNumber: donorData.contactNumber,
      email: donorData.email,
      address: donorData.address,
      identificationNumber: donorData.identificationNumber,
      emergencyContact: donorData.emergencyContact ? JSON.stringify(donorData.emergencyContact) : undefined,
      medicalHistory: donorData.medicalHistory ? JSON.stringify(donorData.medicalHistory) : undefined,
    });
    
    // Generate unique donor number
    const donorNumber = await generateDonorNumber();
    
    // Create the donor
    const donor = await prisma.bloodDonor.create({
      data: {
        donorNumber,
        firstName: donorData.firstName,
        lastName: donorData.lastName,
        dateOfBirth: donorData.dateOfBirth,
        gender: donorData.gender,
        bloodGroup: donorData.bloodGroup,
        rhFactor: donorData.rhFactor,
        contactNumber: encryptedData.contactNumber,
        email: encryptedData.email,
        address: encryptedData.address,
        identificationNumber: encryptedData.identificationNumber,
        identificationType: donorData.identificationType,
        emergencyContact: encryptedData.emergencyContact,
        medicalHistory: encryptedData.medicalHistory,
        consentGiven: donorData.consentGiven,
        registeredById: session.user.id,
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_DONOR_REGISTER',
      'BloodDonor',
      donor.id,
      { 
        donorId: donor.id,
        donorNumber,
      }
    );
    
    // Return donor without sensitive data
    const sanitizedDonor = {
      id: donor.id,
      donorNumber: donor.donorNumber,
      firstName: donor.firstName,
      lastName: donor.lastName,
      dateOfBirth: donor.dateOfBirth,
      gender: donor.gender,
      bloodGroup: donor.bloodGroup,
      rhFactor: donor.rhFactor,
      registeredAt: donor.registeredAt,
    };
    
    return NextResponse.json(sanitizedDonor, { status: 201 });
  } catch (error) {
    console.error('Error registering donor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/bloodbank/donors
 * 
 * Retrieves a list of blood donors with filtering options.
 * 
 * @param request - The incoming request object
 * @returns A list of blood donors
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_DONORS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const bloodGroup = url.searchParams.get('bloodGroup');
    const searchTerm = url.searchParams.get('searchTerm');
    const eligibleOnly = url.searchParams.get('eligibleOnly') === 'true';
    
    // Build filter conditions
    const where: any = {};
    
    if (bloodGroup) {
      where.bloodGroup = bloodGroup;
    }
    
    if (searchTerm) {
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { donorNumber: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }
    
    // Fetch donors
    const donors = await prisma.bloodDonor.findMany({
      where,
      select: {
        id: true,
        donorNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bloodGroup: true,
        rhFactor: true,
        registeredAt: true,
        lastDonationDate: true,
        donations: {
          orderBy: {
            donationDate: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        lastName: 'asc',
      },
    });
    
    // Filter eligible donors if requested
    let result = donors;
    if (eligibleOnly) {
      result = await Promise.all(
        donors.map(async donor => {
          const eligibility = await checkDonorEligibility(donor.id);
          return { ...donor, eligibility };
        })
      );
      
      result = result.filter(donor => donor.eligibility.isEligible);
    }
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_DONORS_VIEW',
      'BloodDonor',
      null,
      { filters: { bloodGroup, searchTerm, eligibleOnly } }
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching donors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/bloodbank/donors/[id]
 * 
 * Retrieves detailed information about a specific blood donor.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the donor ID
 * @returns Detailed information about the blood donor
 */
export async function GET_detail(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_DONOR_DETAILS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Fetch donor with detailed information
    const donor = await prisma.bloodDonor.findUnique({
      where: { id },
      include: {
        donations: {
          orderBy: {
            donationDate: 'desc',
          },
          include: {
            collectedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        screenings: {
          orderBy: {
            screeningDate: 'desc',
          },
          include: {
            screenedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        deferrals: {
          orderBy: {
            deferralDate: 'desc',
          },
          include: {
            deferredBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    if (!donor) {
      return NextResponse.json({ error: 'Donor not found' }, { status: 404 });
    }
    
    // Check donor eligibility
    const eligibility = await checkDonorEligibility(id);
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_DONOR_DETAIL_VIEW',
      'BloodDonor',
      donor.id,
      { donorId: donor.id }
    );
    
    // Return donor with eligibility information but without sensitive data
    const sanitizedDonor = {
      id: donor.id,
      donorNumber: donor.donorNumber,
      firstName: donor.firstName,
      lastName: donor.lastName,
      dateOfBirth: donor.dateOfBirth,
      gender: donor.gender,
      bloodGroup: donor.bloodGroup,
      rhFactor: donor.rhFactor,
      registeredAt: donor.registeredAt,
      lastDonationDate: donor.lastDonationDate,
      donations: donor.donations,
      screenings: donor.screenings,
      deferrals: donor.deferrals,
      eligibility,
    };
    
    return NextResponse.json(sanitizedDonor);
  } catch (error) {
    console.error('Error fetching donor details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for donor screening
const donorScreeningSchema = z.object({
  donorId: z.string().uuid(),
  hemoglobin: z.number().optional(),
  bloodPressure: z.string().optional(),
  pulse: z.number().optional(),
  temperature: z.number().optional(),
  weight: z.number().optional(),
  questionnaire: z.record(z.string(), z.boolean()).optional(),
  notes: z.string().optional(),
  isEligible: z.boolean(),
  deferralReason: z.string().optional(),
  deferralPeriod: z.number().optional(),
});

/**
 * POST /api/bloodbank/donors/screening
 * 
 * Records a donor screening.
 * 
 * @param request - The incoming request object
 * @returns The screening result with eligibility information
 */
export async function POST_screening(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_SCREEN_DONOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = donorScreeningSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const screeningData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the donor exists
      const donor = await tx.bloodDonor.findUnique({
        where: { id: screeningData.donorId },
      });
      
      if (!donor) {
        throw new Error('Donor not found');
      }
      
      // Create the screening record
      const screening = await tx.donorScreening.create({
        data: {
          donorId: screeningData.donorId,
          hemoglobin: screeningData.hemoglobin,
          bloodPressure: screeningData.bloodPressure,
          pulse: screeningData.pulse,
          temperature: screeningData.temperature,
          weight: screeningData.weight,
          questionnaire: screeningData.questionnaire ? JSON.stringify(screeningData.questionnaire) : null,
          notes: screeningData.notes,
          isEligible: screeningData.isEligible,
          screenedById: session.user.id,
        },
        include: {
          screenedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // If donor is not eligible, create a deferral record
      let deferral = null;
      if (!screeningData.isEligible) {
        deferral = await tx.donorDeferral.create({
          data: {
            donorId: screeningData.donorId,
            deferralReason: screeningData.deferralReason || 'Failed screening',
            deferralPeriod: screeningData.deferralPeriod || 0, // Permanent if not specified
            deferralEndDate: screeningData.deferralPeriod 
              ? new Date(Date.now() + screeningData.deferralPeriod * 24 * 60 * 60 * 1000) 
              : null,
            deferredById: session.user.id,
          },
          include: {
            deferredBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }
      
      return { screening, deferral };
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_DONOR_SCREENING',
      'DonorScreening',
      result.screening.id,
      { 
        screeningId: result.screening.id,
        donorId: screeningData.donorId,
        isEligible: screeningData.isEligible,
        deferralId: result.deferral?.id,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error recording donor screening:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for recording a donation
const recordDonationSchema = z.object({
  donorId: z.string().uuid(),
  donationType: z.string(),
  volume: z.number().positive(),
  bagNumber: z.string(),
  notes: z.string().optional(),
  complications: z.array(z.string()).optional(),
});

/**
 * POST /api/bloodbank/donors/donation
 * 
 * Records a blood donation.
 * 
 * @param request - The incoming request object
 * @returns The donation record
 */
export async function POST_donation(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_RECORD_DONATION')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = recordDonationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const donationData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the donor exists
      const donor = await tx.bloodDonor.findUnique({
        where: { id: donationData.donorId },
      });
      
      if (!donor) {
        throw new Error('Donor not found');
      }
      
      // Check donor eligibility
      const eligibility = await checkDonorEligibility(donationData.donorId);
      
      if (!eligibility.isEligible) {
        throw new Error(`Donor is not eligible to donate: ${eligibility.reason}`);
      }
      
      // Create the donation record
      const donation = await tx.bloodDonation.create({
        data: {
          donorId: donationData.donorId,
          donationType: donationData.donationType,
          volume: donationData.volume,
          bagNumber: donationData.bagNumber,
          notes: donationData.notes,
          complications: donationData.complications ? JSON.stringify(donationData.complications) : null,
          collectedById: session.user.id,
        },
        include: {
          donor: {
            select: {
              id: true,
              donorNumber: true,
              firstName: true,
              lastName: true,
              bloodGroup: true,
              rhFactor: true,
            },
          },
          collectedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // Update donor's last donation date
      await tx.bloodDonor.update({
        where: { id: donationData.donorId },
        data: {
          lastDonationDate: new Date(),
        },
      });
      
      return donation;
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_DONATION_RECORD',
      'BloodDonation',
      result.id,
      { 
        donationId: result.id,
        donorId: donationData.donorId,
        donationType: donationData.donationType,
        volume: donationData.volume,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error recording donation:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to generate a unique donor number
 * 
 * @returns A unique donor number
 */
async function generateDonorNumber(): Promise<string> {
  const prefix = 'DN';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Get the count of donors registered this month
  const count = await prisma.bloodDonor.count({
    where: {
      registeredAt: {
        gte: new Date(date.getFullYear(), date.getMonth(), 1),
        lt: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      },
    },
  });
  
  // Generate a sequential number
  const sequence = (count + 1).toString().padStart(4, '0');
  
  return `${prefix}${year}${month}${sequence}`;
}
