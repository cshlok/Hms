

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AddMedicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [formData, setFormData] = useState({
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
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    // Fetch categories and manufacturers for dropdowns
    const fetchData = async () => {
      try {
        // In a real app, these would be separate API calls
        // Fetch categories
        // const catResponse = await fetch('/api/pharmacy/categories');
        // const catData = await catResponse.json();
        // setCategories(catData.categories || []);
        
        // Fetch manufacturers
        // const mfrResponse = await fetch('/api/pharmacy/manufacturers');
        // const mfrData = await mfrResponse.json();
        // setManufacturers(mfrData.manufacturers || []);
        
        // Mock data for now
        setCategories([
          { id: 'cat_001', name: 'Antibiotics' },
          { id: 'cat_002', name: 'Analgesics' },
          { id: 'cat_003', name: 'Antipyretics' },
          { id: 'cat_004', name: 'Antihypertensives' },
          { id: 'cat_005', name: 'Antidiabetics' },
          { id: 'cat_006', name: 'Antihistamines' },
          { id: 'cat_007', name: 'Antacids' },
          { id: 'cat_008', name: 'Vitamins & Supplements' },
        ]);
        setManufacturers([
          { id: 'mfr_001', name: 'Cipla Ltd.' },
          { id: 'mfr_002', name: 'Sun Pharmaceutical Industries Ltd.' },
          { id: 'mfr_003', name: 'Lupin Limited' },
          { id: 'mfr_004', name: 'Dr. Reddy\'s Laboratories' },
          { id: 'mfr_005', name: 'Zydus Cadila' },
        ]);
      } catch (error) {
        console.error('Error fetching categories/manufacturers:', error);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    const requiredFields = [
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setSubmitError('');
    setSubmitSuccess(false);
    
    try {
      const response = await fetch('/api/pharmacy/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add medication');
      }
      
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
      
      // Redirect to medications list after a short delay
      setTimeout(() => {
        router.push('/pharmacy/medications');
      }, 2000);
      
    } catch (error) {
      setSubmitError(error.message);
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
          onClick={() => router.push('/pharmacy/medications')}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Code (Optional)
              </label>
              <input
                type="text"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="generic_name"
                value={formData.generic_name}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${errors.generic_name ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
                required
              />
              {errors.generic_name && <p className="mt-1 text-sm text-red-500">{errors.generic_name}</p>}
            </div>

            {/* Brand Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                name="brand_name"
                value={formData.brand_name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>

            {/* Dosage Form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dosage Form <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="dosage_form"
                value={formData.dosage_form}
                onChange={handleChange}
                placeholder="e.g., Tablet, Capsule, Syrup, Injection"
                className={`w-full p-2 border rounded-md ${errors.dosage_form ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
                required
              />
              {errors.dosage_form && <p className="mt-1 text-sm text-red-500">{errors.dosage_form}</p>}
            </div>

            {/* Strength */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strength <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="strength"
                value={formData.strength}
                onChange={handleChange}
                placeholder="e.g., 500mg, 10ml, 1g"
                className={`w-full p-2 border rounded-md ${errors.strength ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
                required
              />
              {errors.strength && <p className="mt-1 text-sm text-red-500">{errors.strength}</p>}
            </div>

            {/* Unit of Measure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="unit_of_measure"
                value={formData.unit_of_measure}
                onChange={handleChange}
                placeholder="e.g., Tablet, Bottle, Vial"
                className={`w-full p-2 border rounded-md ${errors.unit_of_measure ? 'border-red-500' : 'border-gray-300'}`}
                disabled={loading}
                required
              />
              {errors.unit_of_measure && <p className="mt-1 text-sm text-red-500">{errors.unit_of_measure}</p>}
            </div>

            {/* Route */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route
              </label>
              <input
                type="text"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <select
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={loading}
            ></textarea>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/pharmacy/medications')}
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
}
