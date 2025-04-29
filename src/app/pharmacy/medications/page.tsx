
'use client';

import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  useTable,
  useSortBy,
  usePagination,
  useGlobalFilter,
  Column,
  Row,
  CellProps,
  HeaderGroup,
  Cell,
  TableInstance,
  UsePaginationInstanceProps,
  UseSortByInstanceProps,
  UseGlobalFiltersInstanceProps,
  UsePaginationState,
  UseGlobalFiltersState,
  UseSortByColumnProps,
  // TableState, // Removed, use specific plugin states for initialState
  ColumnInstance
} from 'react-table';

// Define the interface for a single medication object
interface Medication {
  id: string; // Assuming ID is a string (like nanoid)
  item_code: string;
  generic_name: string;
  brand_name?: string | null;
  dosage_form: string;
  strength: string;
  category_name?: string | null;
  manufacturer_name?: string | null;
  total_stock?: number | null;
  unit_of_measure?: string | null;
  prescription_required: boolean;
}

// Extend the react-table types for pagination, sorting, and global filter
type MedicationTableInstance = TableInstance<Medication> &
  UsePaginationInstanceProps<Medication> &
  UseSortByInstanceProps<Medication> &
  UseGlobalFiltersInstanceProps<Medication> & {
    state: UsePaginationState<Medication> & UseGlobalFiltersState<Medication>;
  };

// Extend ColumnInstance type to include sorting props for type safety in headers
type MedicationColumnInstance = ColumnInstance<Medication> & UseSortByColumnProps<Medication>;

// Medications List Component
export default function MedicationsListPage() {
  const router = useRouter();
  const [medicationsData, setMedicationsData] = useState<Medication[]>([]); // Type the state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Type the error state
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    const fetchMedications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/pharmacy/medications');
        if (!response.ok) {
          // Try to parse error response, default to generic message
          let errorMsg = 'Failed to fetch medications';
          try {
            // Define a type for expected error response
            const errorData: { error?: string } = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (parseError) {
            // Ignore if response is not JSON or doesn't match expected structure
          }
          throw new Error(errorMsg);
        }
        // Assuming the API returns { medications: Medication[] }
        const data: { medications?: Medication[] } = await response.json();
        setMedicationsData(data.medications || []);
      } catch (err: unknown) { // Type the error
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, []);

  const columns = useMemo<Column<Medication>[]>( // Type the columns
    () => [
      {
        Header: 'Item Code',
        accessor: 'item_code',
      },
      {
        Header: 'Medication',
        accessor: 'generic_name',
        Cell: ({ row }: CellProps<Medication>) => ( // Type the row
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
        Cell: ({ row }: CellProps<Medication>) => ( // Type the row
          <div>
            <div>{row.original.dosage_form}</div>
            <div className="text-sm text-gray-500">{row.original.strength}</div>
          </div>
        ),
      },
      {
        Header: 'Category',
        accessor: 'category_name',
        Cell: ({ value }: CellProps<Medication>) => value || '-', // Type the value
      },
      {
        Header: 'Manufacturer',
        accessor: 'manufacturer_name',
        Cell: ({ value }: CellProps<Medication>) => value || '-', // Type the value
      },
      {
        Header: 'Stock',
        accessor: 'total_stock',
        Cell: ({ value, row }: CellProps<Medication>) => { // Type value and row
          const stockValue = value || 0;
          return (
            <span className={`${stockValue === 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stockValue} {row.original.unit_of_measure || ''}
            </span>
          );
        },
      },
      {
        Header: 'Prescription',
        accessor: 'prescription_required',
        Cell: ({ value }: CellProps<Medication>) => ( // Type the value
          <span className={`px-2 py-1 text-xs rounded-full ${value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {value ? 'Required' : 'OTC'}
          </span>
        ),
      },
      {
        Header: 'Actions',
        id: 'actions',
        Cell: ({ row }: CellProps<Medication>) => ( // Type the row
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

  // Define initialState with pagination settings using Partial<UsePaginationState>
  const initialState: Partial<UsePaginationState<Medication>> = {
      pageSize: 10,
      // pageIndex defaults to 0 in usePagination
  };

  const tableInstance = useTable<Medication>( // Specify the type argument
    {
      columns,
      data: medicationsData,
      // Pass the correctly typed initialState for pagination
      initialState: initialState,
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  ) as MedicationTableInstance; // Cast to the extended type

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
  } = tableInstance;

  const handleGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => { // Type the event
    const value = e.target.value || undefined;
    setGlobalFilter(value || ''); // Update local state
    setTableGlobalFilter(value); // Update table state
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
              {headerGroups.map((headerGroup) => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {/* Let TypeScript infer the column type (HeaderGroup<Medication>) in map */} 
                  {headerGroup.headers.map((column) => (
                    <th
                      // Cast column to MedicationColumnInstance to access sorting props safely
                      {...(column as MedicationColumnInstance).getHeaderProps((column as MedicationColumnInstance).getSortByToggleProps())}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    >
                      {column.render('Header')}
                      {/* Add sorting indicator */}
                      <span>
                        {(column as MedicationColumnInstance).isSorted
                          ? (column as MedicationColumnInstance).isSortedDesc
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
              {page.map((row: Row<Medication>) => { // Type row
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()} className="hover:bg-gray-50">
                    {row.cells.map((cell: Cell<Medication>) => { // Type cell
                      return (
                        <td
                          {...cell.getCellProps()}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                        >
                          {cell.render('Cell')}
                        </td>
                      );
                    })}
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

