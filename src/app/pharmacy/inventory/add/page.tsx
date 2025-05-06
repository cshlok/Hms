"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Define interfaces for data structures
interface Medication {
  id: string;
  generic_name: string;
  brand_name?: string;
  strength: string;
  dosage_form: string;
}

interface InventoryFormData {
  medication_id: string;
  batch_number: string;
  expiry_date: string;
  manufacturing_date: string;
  purchase_date: string;
  purchase_price: string; // Keep as string for input
  selling_price: string; // Keep as string for input
  initial_quantity: string; // Keep as string for input
  supplier: string;
  invoice_number: string;
  storage_location: string;
  notes: string;
}

interface InventorySubmitData
  extends Omit<
    InventoryFormData,
    "purchase_price" | "selling_price" | "initial_quantity"
  > {
  purchase_price: number;
  selling_price: number;
  initial_quantity: number;
}

type FormErrors = Partial<Record<keyof InventoryFormData, string>>;

const AddInventoryPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [formData, setFormData] = useState<InventoryFormData>({
    medication_id: "",
    batch_number: "",
    expiry_date: "",
    manufacturing_date: "",
    purchase_date: new Date().toISOString().split("T")[0],
    purchase_price: "",
    selling_price: "",
    initial_quantity: "",
    supplier: "",
    invoice_number: "",
    storage_location: "Main Pharmacy",
    notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchMedications = async (): Promise<void> => {
      try {
        // Simulate fetching medications
        // const response = await fetch("/api/pharmacy/medications");
        // if (!response.ok) {
        //   throw new Error("Failed to fetch medications");
        // }
        // const data = await response.json();
        // setMedications(data.medications || []);
        const simulatedMedications: Medication[] = [
          {
            id: "med_001",
            generic_name: "Paracetamol",
            brand_name: "Calpol",
            strength: "500mg",
            dosage_form: "Tablet",
          },
          {
            id: "med_002",
            generic_name: "Amoxicillin",
            brand_name: "Amoxil",
            strength: "250mg",
            dosage_form: "Capsule",
          },
          // Add more mock medications as needed
        ];
        setMedications(simulatedMedications);
      } catch (error) {
        console.error("Error fetching medications:", error);
        // Handle error appropriately
      }
    };

    fetchMedications();
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof InventoryFormData]) {
      setErrors((previous) => ({ ...previous, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    const requiredFields: (keyof InventoryFormData)[] = [
      "medication_id",
      "batch_number",
      "expiry_date",
      "purchase_date",
      "purchase_price",
      "selling_price",
      "initial_quantity",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        newErrors[field] = "This field is required";
      }
    }

    // Validate expiry date is in the future
    if (formData.expiry_date) {
      const expiryDate = new Date(formData.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare dates only
      if (expiryDate <= today) {
        newErrors.expiry_date = "Expiry date must be in the future";
      }
    }

    // Validate prices and quantity are positive numbers
    const purchasePrice = Number.parseFloat(formData.purchase_price);
    if (
      formData.purchase_price &&
      (Number.isNaN(purchasePrice) || purchasePrice <= 0)
    ) {
      newErrors.purchase_price = "Purchase price must be a positive number";
    }

    const sellingPrice = Number.parseFloat(formData.selling_price);
    if (formData.selling_price && (Number.isNaN(sellingPrice) || sellingPrice <= 0)) {
      newErrors.selling_price = "Selling price must be a positive number";
    }

    const initialQuantity = Number.parseInt(formData.initial_quantity, 10);
    if (
      formData.initial_quantity &&
      (Number.isNaN(initialQuantity) || initialQuantity <= 0)
    ) {
      newErrors.initial_quantity =
        "Initial quantity must be a positive integer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const submitData: InventorySubmitData = {
        ...formData,
        purchase_price: Number.parseFloat(formData.purchase_price),
        selling_price: Number.parseFloat(formData.selling_price),
        initial_quantity: Number.parseInt(formData.initial_quantity, 10),
      };

      // Simulate API call
      // const response = await fetch("/api/pharmacy/inventory", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(submitData),
      // });

      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || "Failed to add inventory batch");
      // }

      console.log("Simulating inventory save:", submitData);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay

      setSubmitSuccess(true);

      // Reset form
      setFormData({
        medication_id: "",
        batch_number: "",
        expiry_date: "",
        manufacturing_date: "",
        purchase_date: new Date().toISOString().split("T")[0],
        purchase_price: "",
        selling_price: "",
        initial_quantity: "",
        supplier: "",
        invoice_number: "",
        storage_location: "Main Pharmacy",
        notes: "",
      });
      setErrors({}); // Clear errors on success

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/pharmacy/inventory");
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Add New Inventory Batch
        </h1>
        <button
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
          onClick={() => router.push("/pharmacy/inventory")}
        >
          Back to Inventory
        </button>
      </div>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-md">
          Inventory batch added successfully! Redirecting...
        </div>
      )}

      {submitError && (
        <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-md">
          Error: {submitError}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Medication Selection */}
            <div>
              <label
                htmlFor="medication_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Medication <span className="text-red-500">*</span>
              </label>
              <select
                id="medication_id"
                name="medication_id"
                value={formData.medication_id}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${errors.medication_id ? "border-red-500" : "border-gray-300"}`}
                disabled={loading}
                required
                aria-invalid={!!errors.medication_id}
                aria-describedby={
                  errors.medication_id ? "medication_id-error" : undefined
                }
              >
                <option value="">Select a medication</option>
                {medications.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.generic_name}{" "}
                    {med.brand_name ? `(${med.brand_name})` : ""} -{" "}
                    {med.strength} {med.dosage_form}
                  </option>
                ))}
              </select>
              {errors.medication_id && (
                <p
                  id="medication_id-error"
                  className="mt-1 text-sm text-red-500"
                >
                  {errors.medication_id}
                </p>
              )}
            </div>

            {/* Batch Number */}
            <div>
              <label
                htmlFor="batch_number"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Batch Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="batch_number"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${errors.batch_number ? "border-red-500" : "border-gray-300"}`}
                disabled={loading}
                required
                aria-invalid={!!errors.batch_number}
                aria-describedby={
                  errors.batch_number ? "batch_number-error" : undefined
                }
              />
              {errors.batch_number && (
                <p
                  id="batch_number-error"
                  className="mt-1 text-sm text-red-500"
                >
                  {errors.batch_number}
                </p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label
                htmlFor="expiry_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="expiry_date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${errors.expiry_date ? "border-red-500" : "border-gray-300"}`}
                disabled={loading}
                required
                aria-invalid={!!errors.expiry_date}
                aria-describedby={
                  errors.expiry_date ? "expiry_date-error" : undefined
                }
              />
              {errors.expiry_date && (
                <p id="expiry_date-error" className="mt-1 text-sm text-red-500">
                  {errors.expiry_date}
                </p>
              )}
            </div>

            {/* Manufacturing Date */}
            <div>
              <label
                htmlFor="manufacturing_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Manufacturing Date
              </label>
              <input
                type="date"
                id="manufacturing_date"
                name="manufacturing_date"
                value={formData.manufacturing_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label
                htmlFor="purchase_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Purchase Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="purchase_date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${errors.purchase_date ? "border-red-500" : "border-gray-300"}`}
                disabled={loading}
                required
                aria-invalid={!!errors.purchase_date}
                aria-describedby={
                  errors.purchase_date ? "purchase_date-error" : undefined
                }
              />
              {errors.purchase_date && (
                <p
                  id="purchase_date-error"
                  className="mt-1 text-sm text-red-500"
                >
                  {errors.purchase_date}
                </p>
              )}
            </div>

            {/* Purchase Price */}
            <div>
              <label
                htmlFor="purchase_price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Purchase Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="purchase_price"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                className={`w-full p-2 border rounded-md ${errors.purchase_price ? "border-red-500" : "border-gray-300"}`}
                disabled={loading}
                required
                aria-invalid={!!errors.purchase_price}
                aria-describedby={
                  errors.purchase_price ? "purchase_price-error" : undefined
                }
              />
              {errors.purchase_price && (
                <p
                  id="purchase_price-error"
                  className="mt-1 text-sm text-red-500"
                >
                  {errors.purchase_price}
                </p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label
                htmlFor="selling_price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="selling_price"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                className={`w-full p-2 border rounded-md ${errors.selling_price ? "border-red-500" : "border-gray-300"}`}
                disabled={loading}
                required
                aria-invalid={!!errors.selling_price}
                aria-describedby={
                  errors.selling_price ? "selling_price-error" : undefined
                }
              />
              {errors.selling_price && (
                <p
                  id="selling_price-error"
                  className="mt-1 text-sm text-red-500"
                >
                  {errors.selling_price}
                </p>
              )}
            </div>

            {/* Initial Quantity */}
            <div>
              <label
                htmlFor="initial_quantity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Initial Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="initial_quantity"
                name="initial_quantity"
                value={formData.initial_quantity}
                onChange={handleChange}
                min="1"
                step="1" // Ensure integer input
                className={`w-full p-2 border rounded-md ${errors.initial_quantity ? "border-red-500" : "border-gray-300"}`}
                disabled={loading}
                required
                aria-invalid={!!errors.initial_quantity}
                aria-describedby={
                  errors.initial_quantity ? "initial_quantity-error" : undefined
                }
              />
              {errors.initial_quantity && (
                <p
                  id="initial_quantity-error"
                  className="mt-1 text-sm text-red-500"
                >
                  {errors.initial_quantity}
                </p>
              )}
            </div>

            {/* Supplier */}
            <div>
              <label
                htmlFor="supplier"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Supplier
              </label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label
                htmlFor="invoice_number"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Invoice Number
              </label>
              <input
                type="text"
                id="invoice_number"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>

            {/* Storage Location */}
            <div>
              <label
                htmlFor="storage_location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Storage Location
              </label>
              <input
                type="text"
                id="storage_location"
                name="storage_location"
                value={formData.storage_location}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={loading}
            ></textarea>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => router.push("/pharmacy/inventory")}
              className="mr-4 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Inventory Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInventoryPage;
