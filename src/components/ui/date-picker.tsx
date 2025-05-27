'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

/**
 * Date Picker Component
 * 
 * A reusable date picker component for the HMS Financial Management module
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className = "",
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [date, setDate] = React.useState(value || null);
  
  const handleSelect = (selectedDate) => {
    setDate(selectedDate);
    onChange?.(selectedDate);
    setIsOpen(false);
  };
  
  return (
    <div className={`relative ${className}`}>
      <div 
        className={`flex items-center border rounded-md p-2 ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        <span>
          {date ? format(date, 'PPP') : placeholder}
        </span>
      </div>
      
      {isOpen && (
        <div className="absolute top-full mt-1 z-50 bg-white border rounded-md shadow-lg p-3">
          <div className="calendar-placeholder">
            {/* In a real implementation, this would be a full calendar component */}
            <div className="text-center p-4">
              Calendar UI would render here
            </div>
            <div className="flex justify-between mt-2">
              <button 
                className="px-3 py-1 bg-gray-200 rounded-md"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="px-3 py-1 bg-blue-500 text-white rounded-md"
                onClick={() => handleSelect(new Date())}
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
