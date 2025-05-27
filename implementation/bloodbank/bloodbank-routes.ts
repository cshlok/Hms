import { NextRequest, NextResponse } from "next/server";
import { 
  BloodType,
  BloodProductType,
  BloodProductStatus,
  BloodProductAttribute,
  DonorStatus,
  TransfusionPriority,
  TransfusionRequestStatus,
  TransfusionReactionSeverity,
  BloodProduct,
  Donor,
  Donation,
  CompatibilityTest,
  TransfusionRequest,
  createBloodProduct,
  getBloodProduct,
  getBloodProductsByTypeAndStatus,
  getBloodProductsByBloodTypeAndStatus,
  updateBloodProduct,
  createDonor,
  getDonor,
  getDonorsByStatus,
  getDonorsByBloodType,
  updateDonor,
  createDonation,
  getDonation,
  getDonationsByDonor,
  updateDonation,
  createCompatibilityTest,
  getCompatibilityTest,
  getCompatibilityTestsByPatient,
  getCompatibilityTestsByBloodProduct,
  updateCompatibilityTest,
  createTransfusionRequest,
  getTransfusionRequest,
  getTransfusionRequestsByPatient,
  getTransfusionRequestsByStatus,
  updateTransfusionRequest,
  assignBloodProducts,
  issueBloodProducts,
  recordTransfusionCompletion,
  recordTransfusionReaction,
  cancelTransfusionRequest,
  getBloodInventorySummary,
  getCompatibleBloodTypes,
  findCompatibleBloodProducts,
  generateISBT128DonationNumber,
  validateISBT128DonationNumber,
  generateBloodProductLabel,
  checkDonorEligibility,
  processDonation
} from "../../../../../../../implementation/bloodbank/core-data-models";

// GET /api/bloodbank/products - Get blood products with optional filters
export async function GET(
  request: NextRequest
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as BloodProductType | null;
    const status = searchParams.get('status') as BloodProductStatus | null;
    const bloodType = searchParams.get('blood_type') as BloodType | null;
    const productId = searchParams.get('id');
    
    if (productId) {
      const product = getBloodProduct(productId);
      
      if (!product) {
        return NextResponse.json(
          { error: "Blood product not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(product);
    }
    
    if (type && status) {
      const products = getBloodProductsByTypeAndStatus(type, status);
      return NextResponse.json(products);
    }
    
    if (bloodType && status) {
      const products = getBloodProductsByBloodTypeAndStatus(bloodType, status);
      return NextResponse.json(products);
    }
    
    // Return inventory summary if no specific filters
    if (!type && !status && !bloodType) {
      const summary = getBloodInventorySummary();
      return NextResponse.json(summary);
    }
    
    return NextResponse.json(
      { error: "Invalid filter combination" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error fetching blood products",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to fetch blood products", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/products - Create a new blood product
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (
      !body.donation_id ||
      !body.donor_id ||
      !body.type ||
      !body.blood_type ||
      !body.volume ||
      !body.collection_date ||
      !body.expiration_date ||
      !body.isbt_number ||
      !body.modified_by
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Map request body to model
    const product = createBloodProduct({
      donationId: body.donation_id,
      donorId: body.donor_id,
      type: body.type,
      bloodType: body.blood_type,
      volume: body.volume,
      collectionDate: body.collection_date,
      expirationDate: body.expiration_date,
      status: body.status || BloodProductStatus.AVAILABLE,
      location: body.location || 'Blood Bank Storage',
      attributes: body.attributes || [],
      isbtNumber: body.isbt_number,
      processingDetails: body.processing_details,
      testResults: body.test_results,
      notes: body.notes,
      metadata: body.metadata
    }, body.modified_by);
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error creating blood product",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to create blood product", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/bloodbank/products/[id] - Update a blood product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await request.json();
    
    // Basic validation
    if (!body.modified_by) {
      return NextResponse.json(
        { error: "Missing required field: modified_by" },
        { status: 400 }
      );
    }
    
    // Prepare updates
    const updates: any = {};
    
    if (body.status) {
      updates.status = body.status;
    }
    
    if (body.location) {
      updates.location = body.location;
    }
    
    if (body.attributes) {
      updates.attributes = body.attributes;
    }
    
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    
    if (body.metadata) {
      updates.metadata = body.metadata;
    }
    
    // Update the product
    const updatedProduct = updateBloodProduct(
      productId,
      updates,
      body.modified_by
    );
    
    if (!updatedProduct) {
      return NextResponse.json(
        { error: "Blood product not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedProduct);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error updating blood product",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to update blood product", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/bloodbank/donors - Get donors with optional filters
export async function GET(
  request: NextRequest
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as DonorStatus | null;
    const bloodType = searchParams.get('blood_type') as BloodType | null;
    const donorId = searchParams.get('id');
    
    if (donorId) {
      const donor = getDonor(donorId);
      
      if (!donor) {
        return NextResponse.json(
          { error: "Donor not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(donor);
    }
    
    if (status) {
      const donors = getDonorsByStatus(status);
      return NextResponse.json(donors);
    }
    
    if (bloodType) {
      const donors = getDonorsByBloodType(bloodType);
      return NextResponse.json(donors);
    }
    
    // Return error if no filters provided
    return NextResponse.json(
      { error: "At least one filter is required" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error fetching donors",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to fetch donors", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/donors - Create a new donor
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (
      !body.first_name ||
      !body.last_name ||
      !body.date_of_birth ||
      !body.gender ||
      !body.contact_information ||
      !body.updated_by
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Map request body to model
    const donor = createDonor({
      firstName: body.first_name,
      lastName: body.last_name,
      dateOfBirth: body.date_of_birth,
      gender: body.gender,
      bloodType: body.blood_type,
      contactInformation: body.contact_information,
      status: body.status || DonorStatus.ELIGIBLE,
      eligibilityUntil: body.eligibility_until,
      deferralReason: body.deferral_reason,
      lastDonationDate: body.last_donation_date,
      medicalHistory: body.medical_history,
      consentForms: body.consent_forms,
      notes: body.notes
    }, body.updated_by);
    
    return NextResponse.json(donor, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error creating donor",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to create donor", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/bloodbank/donors/[id] - Update a donor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: donorId } = await params;
    const body = await request.json();
    
    // Basic validation
    if (!body.updated_by) {
      return NextResponse.json(
        { error: "Missing required field: updated_by" },
        { status: 400 }
      );
    }
    
    // Prepare updates
    const updates: any = {};
    
    if (body.first_name) {
      updates.firstName = body.first_name;
    }
    
    if (body.last_name) {
      updates.lastName = body.last_name;
    }
    
    if (body.blood_type) {
      updates.bloodType = body.blood_type;
    }
    
    if (body.contact_information) {
      updates.contactInformation = body.contact_information;
    }
    
    if (body.status) {
      updates.status = body.status;
    }
    
    if (body.eligibility_until !== undefined) {
      updates.eligibilityUntil = body.eligibility_until;
    }
    
    if (body.deferral_reason !== undefined) {
      updates.deferralReason = body.deferral_reason;
    }
    
    if (body.medical_history) {
      updates.medicalHistory = body.medical_history;
    }
    
    if (body.consent_forms) {
      updates.consentForms = body.consent_forms;
    }
    
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    
    // Update the donor
    const updatedDonor = updateDonor(
      donorId,
      updates,
      body.updated_by
    );
    
    if (!updatedDonor) {
      return NextResponse.json(
        { error: "Donor not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedDonor);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error updating donor",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to update donor", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/bloodbank/donors/[id]/eligibility - Check donor eligibility
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: donorId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const donationType = searchParams.get('donation_type') as BloodProductType;
    
    if (!donationType) {
      return NextResponse.json(
        { error: "Missing required parameter: donation_type" },
        { status: 400 }
      );
    }
    
    const donor = getDonor(donorId);
    
    if (!donor) {
      return NextResponse.json(
        { error: "Donor not found" },
        { status: 404 }
      );
    }
    
    const eligibility = checkDonorEligibility(donor, donationType);
    
    return NextResponse.json(eligibility);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error checking donor eligibility",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to check donor eligibility", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/bloodbank/donations - Get donations with optional filters
export async function GET(
  request: NextRequest
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const donorId = searchParams.get('donor_id');
    const donationId = searchParams.get('id');
    
    if (donationId) {
      const donation = getDonation(donationId);
      
      if (!donation) {
        return NextResponse.json(
          { error: "Donation not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(donation);
    }
    
    if (donorId) {
      const donations = getDonationsByDonor(donorId);
      return NextResponse.json(donations);
    }
    
    // Return error if no filters provided
    return NextResponse.json(
      { error: "At least one filter is required" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error fetching donations",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to fetch donations", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/donations - Create a new donation
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (
      !body.donor_id ||
      !body.donation_type ||
      !body.donation_date ||
      !body.volume ||
      !body.location ||
      !body.phlebotomist ||
      !body.pre_screening
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Map request body to model
    const donation = createDonation({
      donorId: body.donor_id,
      donationType: body.donation_type,
      donationDate: body.donation_date,
      volume: body.volume,
      location: body.location,
      phlebotomist: body.phlebotomist,
      preScreening: body.pre_screening,
      adverseReaction: body.adverse_reaction,
      processingStatus: body.processing_status || 'pending',
      productsCreated: body.products_created,
      notes: body.notes
    }, body.updated_by);
    
    return NextResponse.json(donation, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error creating donation",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to create donation", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/bloodbank/donations/[id] - Update a donation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: donationId } = await params;
    const body = await request.json();
    
    // Prepare updates
    const updates: any = {};
    
    if (body.adverse_reaction) {
      updates.adverseReaction = body.adverse_reaction;
    }
    
    if (body.processing_status) {
      updates.processingStatus = body.processing_status;
    }
    
    if (body.products_created) {
      updates.productsCreated = body.products_created;
    }
    
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    
    // Update the donation
    const updatedDonation = updateDonation(
      donationId,
      updates
    );
    
    if (!updatedDonation) {
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedDonation);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error updating donation",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to update donation", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/donations/[id]/process - Process a donation into blood products
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: donationId } = await params;
    const body = await request.json();
    
    // Basic validation
    if (
      !body.processed_by ||
      !body.processing_method ||
      !body.products_to_create ||
      !Array.isArray(body.products_to_create) ||
      body.products_to_create.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Map request body to model
    const processingDetails = {
      processedBy: body.processed_by,
      processingMethod: body.processing_method,
      productsToCreate: body.products_to_create.map((product: any) => ({
        type: product.type,
        volume: product.volume,
        attributes: product.attributes
      })),
      notes: body.notes
    };
    
    // Process the donation
    const products = processDonation(donationId, processingDetails);
    
    return NextResponse.json(products, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error processing donation",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to process donation", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/bloodbank/compatibility-tests - Get compatibility tests with optional filters
export async function GET(
  request: NextRequest
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patient_id');
    const productId = searchParams.get('product_id');
    const testId = searchParams.get('id');
    
    if (testId) {
      const test = getCompatibilityTest(testId);
      
      if (!test) {
        return NextResponse.json(
          { error: "Compatibility test not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(test);
    }
    
    if (patientId) {
      const tests = getCompatibilityTestsByPatient(patientId);
      return NextResponse.json(tests);
    }
    
    if (productId) {
      const tests = getCompatibilityTestsByBloodProduct(productId);
      return NextResponse.json(tests);
    }
    
    // Return error if no filters provided
    return NextResponse.json(
      { error: "At least one filter is required" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error fetching compatibility tests",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to fetch compatibility tests", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/compatibility-tests - Create a new compatibility test
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (
      !body.patient_id ||
      !body.blood_product_id ||
      !body.request_id ||
      !body.test_date ||
      !body.tested_by ||
      !body.test_type ||
      !body.results ||
      body.is_compatible === undefined
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Map request body to model
    const test = createCompatibilityTest({
      patientId: body.patient_id,
      bloodProductId: body.blood_product_id,
      requestId: body.request_id,
      testDate: body.test_date,
      testedBy: body.tested_by,
      testType: body.test_type,
      results: body.results,
      isCompatible: body.is_compatible,
      notes: body.notes,
      verifiedBy: body.verified_by,
      verifiedAt: body.verified_at
    });
    
    return NextResponse.json(test, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error creating compatibility test",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to create compatibility test", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/bloodbank/compatibility-tests/[id] - Update a compatibility test
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;
    const body = await request.json();
    
    // Prepare updates
    const updates: any = {};
    
    if (body.results) {
      updates.results = body.results;
    }
    
    if (body.is_compatible !== undefined) {
      updates.isCompatible = body.is_compatible;
    }
    
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    
    if (body.verified_by) {
      updates.verifiedBy = body.verified_by;
    }
    
    if (body.verified_at) {
      updates.verifiedAt = body.verified_at;
    }
    
    // Update the test
    const updatedTest = updateCompatibilityTest(
      testId,
      updates
    );
    
    if (!updatedTest) {
      return NextResponse.json(
        { error: "Compatibility test not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedTest);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error updating compatibility test",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to update compatibility test", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/bloodbank/transfusion-requests - Get transfusion requests with optional filters
export async function GET(
  request: NextRequest
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patient_id');
    const status = searchParams.get('status') as TransfusionRequestStatus | null;
    const requestId = searchParams.get('id');
    
    if (requestId) {
      const request = getTransfusionRequest(requestId);
      
      if (!request) {
        return NextResponse.json(
          { error: "Transfusion request not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(request);
    }
    
    if (patientId) {
      const requests = getTransfusionRequestsByPatient(patientId);
      return NextResponse.json(requests);
    }
    
    if (status) {
      const requests = getTransfusionRequestsByStatus(status);
      return NextResponse.json(requests);
    }
    
    // Return error if no filters provided
    return NextResponse.json(
      { error: "At least one filter is required" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error fetching transfusion requests",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to fetch transfusion requests", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/transfusion-requests - Create a new transfusion request
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (
      !body.patient_id ||
      !body.requesting_physician ||
      !body.requesting_department ||
      !body.request_date ||
      !body.priority ||
      !body.diagnosis ||
      !body.indication_for_transfusion ||
      !body.requested_products ||
      !Array.isArray(body.requested_products) ||
      body.requested_products.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Map request body to model
    const transfusionRequest = createTransfusionRequest({
      patientId: body.patient_id,
      requestingPhysician: body.requesting_physician,
      requestingDepartment: body.requesting_department,
      requestDate: body.request_date,
      priority: body.priority,
      diagnosis: body.diagnosis,
      indicationForTransfusion: body.indication_for_transfusion,
      requestedProducts: body.requested_products.map((product: any) => ({
        type: product.type,
        quantity: product.quantity,
        attributes: product.attributes,
        specialInstructions: product.special_instructions
      })),
      patientBloodType: body.patient_blood_type,
      previousTransfusionHistory: body.previous_transfusion_history,
      notes: body.notes
    }, body.requesting_physician);
    
    return NextResponse.json(transfusionRequest, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error creating transfusion request",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to create transfusion request", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/bloodbank/transfusion-requests/[id] - Update a transfusion request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    // Prepare updates
    const updates: any = {};
    
    if (body.status) {
      updates.status = body.status;
    }
    
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    
    if (body.vital_signs) {
      updates.vitalSigns = body.vital_signs;
    }
    
    if (body.transfusion_start_time) {
      updates.transfusionStartTime = body.transfusion_start_time;
    }
    
    if (body.transfusion_end_time) {
      updates.transfusionEndTime = body.transfusion_end_time;
    }
    
    // Update the request
    const updatedRequest = updateTransfusionRequest(
      requestId,
      updates
    );
    
    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Transfusion request not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error updating transfusion request",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to update transfusion request", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/transfusion-requests/[id]/assign - Assign blood products to a transfusion request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    // Basic validation
    if (
      !body.product_ids ||
      !Array.isArray(body.product_ids) ||
      body.product_ids.length === 0 ||
      !body.assigned_by
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Assign products
    const updatedRequest = assignBloodProducts(
      requestId,
      body.product_ids,
      body.assigned_by
    );
    
    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Transfusion request not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error assigning blood products",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to assign blood products", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/transfusion-requests/[id]/issue - Issue blood products for a transfusion request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    // Basic validation
    if (!body.issued_by) {
      return NextResponse.json(
        {
          error: "Missing required field: issued_by",
        },
        { status: 400 }
      );
    }
    
    // Issue products
    const updatedRequest = issueBloodProducts(
      requestId,
      body.issued_by
    );
    
    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Transfusion request not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error issuing blood products",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to issue blood products", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/transfusion-requests/[id]/complete - Complete a transfusion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    // Basic validation
    if (
      !body.transfusion_end_time ||
      !body.completed_by
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Complete transfusion
    const updatedRequest = recordTransfusionCompletion(
      requestId,
      body.transfusion_end_time,
      body.completed_by,
      body.vital_signs
    );
    
    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Transfusion request not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error completing transfusion",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to complete transfusion", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/transfusion-requests/[id]/reaction - Record a transfusion reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    // Basic validation
    if (
      !body.time ||
      !body.type ||
      !body.severity ||
      !body.symptoms ||
      !Array.isArray(body.symptoms) ||
      !body.reported_by
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Record reaction
    const updatedRequest = recordTransfusionReaction(
      requestId,
      {
        time: body.time,
        type: body.type,
        severity: body.severity,
        symptoms: body.symptoms,
        treatment: body.treatment,
        outcome: body.outcome,
        reportedBy: body.reported_by
      }
    );
    
    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Transfusion request not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error recording transfusion reaction",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to record transfusion reaction", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/transfusion-requests/[id]/cancel - Cancel a transfusion request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const body = await request.json();
    
    // Basic validation
    if (
      !body.reason ||
      !body.cancelled_by
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    
    // Cancel request
    const updatedRequest = cancelTransfusionRequest(
      requestId,
      body.reason,
      body.cancelled_by
    );
    
    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Transfusion request not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error cancelling transfusion request",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to cancel transfusion request", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/bloodbank/compatible-products - Find compatible blood products
export async function GET(
  request: NextRequest
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientBloodType = searchParams.get('patient_blood_type') as BloodType;
    const productType = searchParams.get('product_type') as BloodProductType;
    const quantityStr = searchParams.get('quantity');
    const attributesStr = searchParams.get('attributes');
    
    if (!patientBloodType || !productType || !quantityStr) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }
    
    const quantity = parseInt(quantityStr);
    
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid quantity" },
        { status: 400 }
      );
    }
    
    let attributes: BloodProductAttribute[] | undefined;
    
    if (attributesStr) {
      try {
        attributes = JSON.parse(attributesStr);
        
        if (!Array.isArray(attributes)) {
          return NextResponse.json(
            { error: "Invalid attributes format" },
            { status: 400 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { error: "Invalid attributes format" },
          { status: 400 }
        );
      }
    }
    
    // Find compatible products
    const products = findCompatibleBloodProducts(
      patientBloodType,
      productType,
      quantity,
      attributes
    );
    
    return NextResponse.json(products);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error finding compatible blood products",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to find compatible blood products", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/bloodbank/inventory-summary - Get blood inventory summary
export async function GET(
  _request: NextRequest
) {
  try {
    const summary = getBloodInventorySummary();
    return NextResponse.json(summary);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error getting inventory summary",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to get inventory summary", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/generate-label - Generate a blood product label
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.product_id) {
      return NextResponse.json(
        {
          error: "Missing required field: product_id",
        },
        { status: 400 }
      );
    }
    
    const product = getBloodProduct(body.product_id);
    
    if (!product) {
      return NextResponse.json(
        { error: "Blood product not found" },
        { status: 404 }
      );
    }
    
    // Generate label
    const label = generateBloodProductLabel(product);
    
    return NextResponse.json({ label });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error generating blood product label",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to generate blood product label", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/bloodbank/validate-isbt - Validate an ISBT 128 donation number
export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.isbt_number) {
      return NextResponse.json(
        {
          error: "Missing required field: isbt_number",
        },
        { status: 400 }
      );
    }
    
    // Validate ISBT number
    const isValid = validateISBT128DonationNumber(body.isbt_number);
    
    return NextResponse.json({ is_valid: isValid });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error validating ISBT number",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to validate ISBT number", details: errorMessage },
      { status: 500 }
    );
  }
}
