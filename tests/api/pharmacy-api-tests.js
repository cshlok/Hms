// Automated API tests for Pharmacy module

import fetch from "node-fetch"; // FIX: Use ES module import

const baseUrl = "http://localhost:8787"; // Local development server URL

describe("Pharmacy API Tests", () => {
  // Test data
  const testMedication = {
    generic_name: "Test Medication",
    brand_name: "TestBrand",
    dosage_form: "Tablet",
    strength: "500mg",
    unit_of_measure: "Tablet",
    route: "Oral",
    prescription_required: true,
    narcotic: false,
  };

  const testInventory = {
    medication_id: "", // Will be set after medication creation
    batch_number: "TEST-BATCH-001",
    expiry_date: "2026-12-31",
    quantity: 100,
    cost_price: 1.5,
    selling_price: 2.5,
    supplier: "Test Supplier",
    location: "Main Store",
  };

  let createdMedicationId = "";
  let createdInventoryId = "";

  // Medication API Tests
  describe("Medication API", () => {
    // Create medication
    test("POST /api/pharmacy/medications - Create medication", async () => {
      const response = await fetch(`${baseUrl}/api/pharmacy/medications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testMedication),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.medication).toBeDefined();
      expect(data.medication.id).toBeDefined();

      createdMedicationId = data.medication.id;
      testInventory.medication_id = createdMedicationId;
    });

    // Get all medications
    test("GET /api/pharmacy/medications - Get all medications", async () => {
      const response = await fetch(`${baseUrl}/api/pharmacy/medications`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.medications).toBeDefined();
      expect(Array.isArray(data.medications)).toBe(true);

      // Check if our created medication is in the list
      const found = data.medications.some(
        (med) => med.id === createdMedicationId
      );
      expect(found).toBe(true);
    });

    // Get medication by ID
    test("GET /api/pharmacy/medications/:id - Get medication by ID", async () => {
      const response = await fetch(
        `${baseUrl}/api/pharmacy/medications/${createdMedicationId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.medication).toBeDefined();
      expect(data.medication.id).toBe(createdMedicationId);
      expect(data.medication.generic_name).toBe(testMedication.generic_name);
    });

    // Update medication
    test("PUT /api/pharmacy/medications/:id - Update medication", async () => {
      const updatedData = {
        ...testMedication,
        generic_name: "Updated Test Medication",
      };

      const response = await fetch(
        `${baseUrl}/api/pharmacy/medications/${createdMedicationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.medication.generic_name).toBe(updatedData.generic_name);
    });
  });

  // Inventory API Tests
  describe("Inventory API", () => {
    // Create inventory batch
    test("POST /api/pharmacy/inventory - Create inventory batch", async () => {
      const response = await fetch(`${baseUrl}/api/pharmacy/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testInventory),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.inventory).toBeDefined();
      expect(data.inventory.id).toBeDefined();

      createdInventoryId = data.inventory.id;
    });

    // Get all inventory batches
    test("GET /api/pharmacy/inventory - Get all inventory batches", async () => {
      const response = await fetch(`${baseUrl}/api/pharmacy/inventory`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.inventory).toBeDefined();
      expect(Array.isArray(data.inventory)).toBe(true);

      // Check if our created batch is in the list
      const found = data.inventory.some(
        (item) => item.id === createdInventoryId
      );
      expect(found).toBe(true);
    });

    // Get inventory by ID
    test("GET /api/pharmacy/inventory/:id - Get inventory by ID", async () => {
      const response = await fetch(
        `${baseUrl}/api/pharmacy/inventory/${createdInventoryId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.inventory).toBeDefined();
      expect(data.inventory.id).toBe(createdInventoryId);
      expect(data.inventory.batch_number).toBe(testInventory.batch_number);
    });

    // Update inventory
    test("PUT /api/pharmacy/inventory/:id - Update inventory", async () => {
      const updatedData = {
        ...testInventory,
        quantity: 90, // Simulate stock adjustment
        notes: "Stock adjustment for testing",
      };

      const response = await fetch(
        `${baseUrl}/api/pharmacy/inventory/${createdInventoryId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.inventory.quantity).toBe(updatedData.quantity);
    });
  });

  // Prescription API Tests
  describe("Prescription API", () => {
    // Get prescriptions (filtering test)
    test("GET /api/pharmacy/prescriptions - Get prescriptions with filters", async () => {
      // Test with status filter
      const response = await fetch(
        `${baseUrl}/api/pharmacy/prescriptions?status=pending`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.prescriptions).toBeDefined();
      expect(Array.isArray(data.prescriptions)).toBe(true);

      // All returned prescriptions should have status 'pending'
      const allPending = data.prescriptions.every(
        (p) => p.status === "pending"
      );
      expect(allPending).toBe(true);
    });
  });

  // Dispensing API Tests
  describe("Dispensing API", () => {
    // Create dispensing record
    test("POST /api/pharmacy/dispensing - Create dispensing record", async () => {
      const dispensingData = {
        prescription_id: "test_prescription_id",
        prescription_item_id: "test_prescription_item_id",
        inventory_id: createdInventoryId,
        quantity: 5,
        dispensed_by: "test_user_id",
        notes: "Test dispensing",
      };

      const response = await fetch(`${baseUrl}/api/pharmacy/dispensing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dispensingData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.dispensing).toBeDefined();

      // Verify inventory quantity was reduced
      const inventoryResponse = await fetch(
        `${baseUrl}/api/pharmacy/inventory/${createdInventoryId}`
      );
      const inventoryData = await inventoryResponse.json();

      // Should be 90 - 5 = 85 (90 from previous update test)
      expect(inventoryData.inventory.quantity).toBe(85);
    });
  });

  // Cleanup - Delete created test data
  describe("Cleanup", () => {
    test("DELETE /api/pharmacy/inventory/:id - Delete inventory", async () => {
      const response = await fetch(
        `${baseUrl}/api/pharmacy/inventory/${createdInventoryId}`,
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test("DELETE /api/pharmacy/medications/:id - Delete medication", async () => {
      const response = await fetch(
        `${baseUrl}/api/pharmacy/medications/${createdMedicationId}`,
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
