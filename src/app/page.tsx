"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Define interfaces for data structures
interface Category {
  id: string;
  name: string;
}

interface Manufacturer {
  id: string;
  name: string;
}

interface MedicationFormData {
  item_code: string;
  generic_name: string;
  brand_name: string;
  category_id: string;
  manufacturer_id: string;
  dosage_form: string;
  strength: string;
  route: string;
  unit_of_measure: string;
  prescription_required: boolean;
  narcotic: boolean;
  description: string;
}

type FormErrors = Partial<Record<keyof MedicationFormData, string>>;

const AddMedicationPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [formData, setFormData] = useState<MedicationFormData>({
    item_code: '',
    generic_name: '',
    brand_name: '',
    category_id: '',
    manufacturer_id: '',
    dosage_form: '',
    strength: '',
    route: '',
    unit_of_measure: '',
    prescription_required: false,
    narcotic: false,
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Fetch categories and manufacturers for dropdowns
    const fetchData = async (): Promise<void> => {
      try {
        // Simulate fetching data
        const simulatedCategories: Category[] = [
          { id: 'cat_001', name: 'Antibiotics' },
          { id: 'cat_002', name: 'Analgesics' },
          { id: 'cat_003', name: 'Antipyretics' },
          { id: 'cat_004', name: 'Antihypertensives' },
          { id: 'cat_005', name: 'Antidiabetics' },
          { id: 'cat_006', name: 'Antihistamines' },
          { id: 'cat_007', name: 'Antacids' },
          { id: 'cat_008', name: 'Vitamins & Supplements' },
        ];
        const simulatedManufacturers: Manufacturer[] = [
          { id: 'mfr_001', name: 'Cipla Ltd.' },
          { id: 'mfr_002', name: 'Sun Pharmaceutical Industries Ltd.' },
          { id: 'mfr_003', name: 'Lupin Limited' },
          { id: 'mfr_004', name: 'Dr. Reddy\'s Laboratories' },
          { id: 'mfr_005', name: 'Zydus Cadila' },
        ];
        setCategories(simulatedCategories);
        setManufacturers(simulatedManufacturers);
      } catch (error) {
        console.error('Error fetching categories/manufacturers:', error);
        // Handle error appropriately, e.g., set an error state
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked; // Type assertion for checked property
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for the field being changed
    if (errors[name as keyof MedicationFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Required fields check
    const requiredFields: (keyof MedicationFormData)[] = [
      'generic_name', 'dosage_form', 'strength', 'unit_of_measure'
    ];
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setSubmitError('');
    setSubmitSuccess(false);
    
    try {
      // Simulate API call
      // const response = await fetch('/api/pharmacy/medications', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });
      
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || 'Failed to add medication');
      // }
      
      console.log("Simulating medication save:", formData);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        item_code: '',
        generic_name: '',
        brand_name: '',
        category_id: '',
        manufacturer_id: '',
        dosage_form: '',
        strength: '',
        route: '',
        unit_of_measure: '',
        prescription_required: false,
        narcotic: false,
        description: ''
      });
      setErrors({}); // Clear errors on success
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/pharmacy/medications'); // Assuming this is the correct path
      }, 2000);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add New Medication</h1>
        <button 
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
          onClick={() => router.push('/pharmacy/medications')} // Assuming this path
        >
          Back to Medications
        </button>
      </div>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-md">
          Medication added successfully! Redirecting...
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
            {/* Item Code */}
            <div>
              <label htmlFor="item_code" className="block text-sm font-medium text-gray-700 mb-1">
                Item Code (Optional)
              </label>
              <input
                type="text"
                id="item_code"
                name="item_code"
                value={formData.item_code}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">Leave blank to auto-generate.</p>
            </div>

            {/* Generic Name */}
            <div>
              <label htmlFor="generic_name" className="block text-sm font-medium text-gray-700 mb-1">
                Generic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="generic_name"
                name="generic_name"
                value={formData.generic_name}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${errors.generic_name ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
                required
                aria-invalid={!!errors.generic_name}
                aria-describedby={errors.generic_name ? "generic_name-error" : undefined}
              />
              {errors.generic_name && <p id="generic_name-error" className="mt-1 text-sm text-red-500">{errors.generic_name}</p>}
            </div>

            {/* Brand Name */}
            <div>
              <label htmlFor="brand_name" className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                id="brand_name"
                name="brand_name"
                value={formData.brand_name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>

            {/* Dosage Form */}
            <div>
              <label htmlFor="dosage_form" className="block text-sm font-medium text-gray-700 mb-1">
                Dosage Form <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="dosage_form"
                name="dosage_form"
                value={formData.dosage_form}
                onChange={handleChange}
                placeholder="e.g., Tablet, Capsule, Syrup, Injection"
                className={`w-full p-2 border rounded-md ${errors.dosage_form ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
                required
                aria-invalid={!!errors.dosage_form}
                aria-describedby={errors.dosage_form ? "dosage_form-error" : undefined}
              />
              {errors.dosage_form && <p id="dosage_form-error" className="mt-1 text-sm text-red-500">{errors.dosage_form}</p>}
            </div>

            {/* Strength */}
            <div>
              <label htmlFor="strength" className="block text-sm font-medium text-gray-700 mb-1">
                Strength <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="strength"
                name="strength"
                value={formData.strength}
                onChange={handleChange}
                placeholder="e.g., 500mg, 10ml, 1g"
                className={`w-full p-2 border rounded-md ${errors.strength ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
                required
                aria-invalid={!!errors.strength}
                aria-describedby={errors.strength ? "strength-error" : undefined}
              />
              {errors.strength && <p id="strength-error" className="mt-1 text-sm text-red-500">{errors.strength}</p>}
            </div>

            {/* Unit of Measure */}
            <div>
              <label htmlFor="unit_of_measure" className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="unit_of_measure"
                name="unit_of_measure"
                value={formData.unit_of_measure}
                onChange={handleChange}
                placeholder="e.g., Tablet, Bottle, Vial"
                className={`w-full p-2 border rounded-md ${errors.unit_of_measure ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
                required
                aria-invalid={!!errors.unit_of_measure}
                aria-describedby={errors.unit_of_measure ? "unit_of_measure-error" : undefined}
              />
              {errors.unit_of_measure && <p id="unit_of_measure-error" className="mt-1 text-sm text-red-500">{errors.unit_of_measure}</p>}
            </div>

            {/* Route */}
            <div>
              <label htmlFor="route" className="block text-sm font-medium text-gray-700 mb-1">
                Route
              </label>
              <input
                type="text"
                id="route"
                name="route"
                value={formData.route}
                onChange={handleChange}
                placeholder="e.g., Oral, Intravenous, Topical"
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Manufacturer */}
            <div>
              <label htmlFor="manufacturer_id" className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <select
                id="manufacturer_id"
                name="manufacturer_id"
                value={formData.manufacturer_id}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              >
                <option value="">Select a manufacturer</option>
                {manufacturers.map(mfr => (
                  <option key={mfr.id} value={mfr.id}>{mfr.name}</option>
                ))}
              </select>
            </div>

            {/* Flags */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  id="prescription_required"
                  name="prescription_required"
                  type="checkbox"
                  checked={formData.prescription_required}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="prescription_required" className="ml-2 block text-sm text-gray-900">
                  Prescription Required
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="narcotic"
                  name="narcotic"
                  type="checkbox"
                  checked={formData.narcotic}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="narcotic" className="ml-2 block text-sm text-gray-900">
                  Narcotic
                </label>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={loading}
            ></textarea>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/pharmacy/medications')} // Assuming this path
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
              {loading ? 'Saving...' : 'Save Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicationPage;

