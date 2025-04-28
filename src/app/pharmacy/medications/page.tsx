'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTable, useSortBy, usePagination, useGlobalFilter } from 'react-table';

// Medications List Component
export default function MedicationsListPage() {
  const router = useRouter();
  const [medicationsData, setMedicationsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    const fetchMedications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/pharmacy/medications');
        if (!response.ok) {
          throw new Error('Failed to fetch medications');
        }
        const data = await response.json();
        setMedicationsData(data.medications || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, []);

  const columns = useMemo(
    () => [
      {
        Header: 'Item Code',
        accessor: 'item_code',
      },
      {
        Header: 'Medication',
        accessor: 'generic_name',
        Cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">{row.original.generic_name}</div>
            {row.original.brand_name && (
              <div className="text-sm text-gray-500">{row.original.brand_name}</div>
            )}
          </div>
        ),
      },
      {
        Header: 'Form & Strength',
        accessor: 'dosage_form',
        Cell: ({ row }) => (
          <div>
            <div>{row.original.dosage_form}</div>
            <div className="text-sm text-gray-500">{row.original.strength}</div>
          </div>
        ),
      },
      {
        Header: 'Category',
        accessor: 'category_name',
        Cell: ({ value }) => value || '-',
      },
      {
        Header: 'Manufacturer',
        accessor: 'manufacturer_name',
        Cell: ({ value }) => value || '-',
      },
      {
        Header: 'Stock',
        accessor: 'total_stock',
        Cell: ({ value, row }) => {
          const stockValue = value || 0;
          return (
            <span className={`${stockValue === 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stockValue} {row.original.unit_of_measure}
            </span>
          );
        },
      },
      {
        Header: 'Prescription',
        accessor: 'prescription_required',
        Cell: ({ value }) => (
          <span className={`px-2 py-1 text-xs rounded-full ${value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {value ? 'Required' : 'OTC'}
          </span>
        ),
      },
      {
        Header: 'Actions',
        id: 'actions',
        Cell: ({ row }) => (
          <button
            onClick={() => router.push(`/pharmacy/medications/${row.original.id}`)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View/Edit
          </button>
        ),
      },
    ],
    [router]
  );

  const { 
    getTableProps, 
    getTableBodyProps, 
    headerGroups, 
    page,
    prepareRow, 
    canPreviousPage, 
    canNextPage, 
    pageOptions, 
    pageCount, 
    gotoPage, 
    nextPage, 
    previousPage, 
    setPageSize, 
    state: { pageIndex, pageSize },
    setGlobalFilter: setTableGlobalFilter
  } = useTable(
    {
      columns,
      data: medicationsData,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const handleGlobalFilterChange = (e) => {
    const value = e.target.value || undefined;
    setGlobalFilter(value);
    setTableGlobalFilter(value);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading medications...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Medications Catalog</h1>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          onClick={() => router.push('/pharmacy/medications/add')}
        >
          Add New Medication
        </button>
      </div>

      <div className="mb-4">
        <input
          value={globalFilter || ''}
          onChange={handleGlobalFilterChange}
          placeholder="Search medications (Generic name, Brand name, Item code...)"
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {headerGroups.map(headerGroup => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map(column => (
                    <th
                      {...column.getHeaderProps(column.getSortByToggleProps())}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    >
                      {column.render('Header')}
                      <span>
                        {column.isSorted
                          ? column.isSortedDesc
                            ? ' 🔽'
                            : ' 🔼'
                          : ''}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
              {page.map(row => {
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()} className="hover:bg-gray-50">
                    {row.cells.map(cell => (
                      <td
                        {...cell.getCellProps()}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      >
                        {cell.render('Cell')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Page{' '}
              <strong>
                {pageIndex + 1} of {pageOptions.length}
              </strong>
            </span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
              }}
              className="p-1 border border-gray-300 rounded-md text-sm"
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={() => gotoPage(0)} disabled={!canPreviousPage} className="p-1 border rounded-md disabled:opacity-50">
              {'<<'}
            </button>
            <button onClick={() => previousPage()} disabled={!canPreviousPage} className="p-1 border rounded-md disabled:opacity-50">
              {'<'}
            </button>
            <button onClick={() => nextPage()} disabled={!canNextPage} className="p-1 border rounded-md disabled:opacity-50">
              {'>'}
            </button>
            <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage} className="p-1 border rounded-md disabled:opacity-50">
              {'>>'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
