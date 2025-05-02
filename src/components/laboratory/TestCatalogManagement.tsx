import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Spin, message, Modal, Form, Switch } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { TableColumnsType, TableProps, FormProps, TablePaginationConfig } from 'antd';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';

const { Option } = Select;

// Define interfaces
interface TestCategory {
  id: string;
  name: string;
}

interface Test {
  id: string;
  code: string;
  name: string;
  category_id: string;
  category_name?: string; // Joined field
  description?: string | null;
  sample_type: string;
  sample_volume?: string | null;
  processing_time?: number | null; // Assuming minutes
  price: number;
  is_active: boolean;
}

// Define API response types
interface CategoriesApiResponse {
  results?: TestCategory[];
}

interface TestsApiResponse {
  results?: Test[];
  totalCount?: number; // Optional total count for pagination
}

interface ApiErrorResponse {
  error?: string;
  message?: string; // Add message for flexibility
}

interface AddTestFormValues {
  code: string;
  name: string;
  category_id: string;
  description?: string;
  sample_type: string;
  sample_volume?: string;
  processing_time?: string; // Form input might be string
  price: string; // Form input might be string
  is_active: boolean;
}

// Define Table parameters type
interface TableParams {
  pagination?: TablePaginationConfig; // Use imported type
  sorter?: SorterResult<Test> | SorterResult<Test>[]; // Sorter can be single or array
  filters?: Record<string, FilterValue | null>;
}

const TestCatalogManagement: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [form] = Form.useForm<AddTestFormValues>();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 10,
      showSizeChanger: true,
      pageSizeOptions: ['10', '20', '50'],
      total: 0, // Initialize total
    },
    sorter: undefined, // Initialize sorter
    filters: {}, // Initialize filters
  });

  // Fetch test categories
  const fetchCategories = async (): Promise<void> => {
    try {
      const response = await fetch('/api/laboratory/categories');
      if (!response.ok) {
        let errorMsg = 'Failed to fetch categories';
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      const data: CategoriesApiResponse = await response.json();
      setCategories(data.results || []);
    } catch (err: unknown) {
      const messageText = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching categories:', err);
      message.error(`Failed to load test categories: ${messageText}`);
    }
  };

  // Fetch tests with optional filters
  const fetchTests = async (params: TableParams = {}): Promise<void> => {
    setLoading(true);
    try {
      let url = '/api/laboratory/tests';
      const queryParams = new URLSearchParams();

      // Add category filter from state
      if (categoryFilter) {
        queryParams.append('categoryId', categoryFilter);
      }

      // Add pagination, sort, filter params from table state if needed by API
      queryParams.append('page', `${params.pagination?.current ?? 1}`);
      queryParams.append('limit', `${params.pagination?.pageSize ?? 10}`);

      // Handle sorter (single or array)
      const currentSorter = Array.isArray(params.sorter) ? params.sorter[0] : params.sorter;
      if (currentSorter?.field && currentSorter.order) {
        queryParams.append('sortField', String(currentSorter.field));
        queryParams.append('sortOrder', currentSorter.order === 'ascend' ? 'asc' : 'desc');
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = 'Failed to fetch tests';
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      const data: TestsApiResponse = await response.json();

      let fetchedData: Test[] = data.results || [];

      // Client-side filtering by search text (if API doesn't support it)
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        fetchedData = fetchedData.filter(test =>
          test.name.toLowerCase().includes(searchLower) ||
          test.code.toLowerCase().includes(searchLower) ||
          (test.description && test.description.toLowerCase().includes(searchLower))
        );
      }

      setTests(fetchedData);
      // FIX: Update table pagination correctly, avoid assigning boolean
      setTableParams(prev => {
        const newPagination: TablePaginationConfig | undefined = prev.pagination ? {
            ...prev.pagination,
            current: params.pagination?.current ?? 1,
            pageSize: params.pagination?.pageSize ?? 10,
            total: data.totalCount ?? fetchedData.length,
        } : undefined; // Keep pagination undefined if it was initially undefined

        return {
          ...prev,
          pagination: newPagination,
        };
      });

    } catch (err: unknown) {
      const messageText = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching tests:', err);
      message.error(`Failed to load laboratory tests: ${messageText}`);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCategories();
    fetchTests(tableParams);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Handle table changes (pagination, filters, sorter)
  const handleTableChange: TableProps<Test>['onChange'] = (pagination, filters, sorter) => {
    const newTableParams: TableParams = {
        pagination,
        filters,
        sorter, // Pass the sorter directly as received (can be single or array)
      };
    setTableParams(newTableParams);
    // Fetch data with new params if API handles server-side processing
    fetchTests(newTableParams);
  };

  // Reload tests when external filters change (category or search)
  useEffect(() => {
    // FIX: Reset pagination correctly, avoid assigning boolean
    const newParams: TableParams = {
      ...tableParams,
      pagination: tableParams.pagination ? { // Check if pagination exists before spreading
        ...tableParams.pagination,
        current: 1,
      } : undefined, // Keep pagination undefined if it doesn't exist
    };
    setTableParams(newParams);
    fetchTests(newParams);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, searchText]); // Re-fetch if category or search text changes

  // Handle adding a new test
  const handleAddTest: FormProps<AddTestFormValues>['onFinish'] = async (values) => {
    try {
      const priceNum = parseFloat(values.price);
      const processingTimeNum = values.processing_time ? parseInt(values.processing_time, 10) : null;

      if (isNaN(priceNum)) {
        throw new Error("Invalid price entered. Must be a number.");
      }
      if (values.processing_time && (processingTimeNum === null || isNaN(processingTimeNum))) {
         throw new Error("Invalid processing time entered. Must be a number.");
      }

      const payload: Omit<Test, 'id' | 'category_name'> = {
        ...values,
        price: priceNum,
        processing_time: processingTimeNum,
        is_active: values.is_active ?? true, // Default to true if not provided
      };

      const response = await fetch('/api/laboratory/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Failed to add test (status: ${response.status})`;
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }

      message.success('Test added successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchTests(tableParams); // Refresh the list with current params
    } catch (err: unknown) {
      const messageText = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error adding test:', err);
      message.error(`Error adding test: ${messageText}`);
    }
  };

  // Get current sorter (handle array case)
  const getCurrentSorter = (): SorterResult<Test> | undefined => {
    const sorter = tableParams.sorter;
    return Array.isArray(sorter) ? sorter[0] : sorter;
  };

  // Table columns definition with types
  const columns: TableColumnsType<Test> = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: '10%',
      sorter: true, // Enable server-side sorting
      sortOrder: getCurrentSorter()?.field === 'code' ? getCurrentSorter()?.order : undefined,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      sorter: true,
      sortOrder: getCurrentSorter()?.field === 'name' ? getCurrentSorter()?.order : undefined,
    },
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category_name',
      width: '15%',
      render: (categoryName: string | undefined) => categoryName || 'N/A',
      sorter: true,
      sortOrder: getCurrentSorter()?.field === 'category_name' ? getCurrentSorter()?.order : undefined,
    },
    {
      title: 'Sample Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: '15%',
      sorter: true,
      sortOrder: getCurrentSorter()?.field === 'sample_type' ? getCurrentSorter()?.order : undefined,
    },
    {
      title: 'Processing Time',
      dataIndex: 'processing_time',
      key: 'processing_time',
      width: '15%',
      render: (time: number | null | undefined) => time != null ? `${time} minutes` : 'N/A',
      sorter: true,
      sortOrder: getCurrentSorter()?.field === 'processing_time' ? getCurrentSorter()?.order : undefined,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: '10%',
      render: (price: number | undefined) => price != null ? `$${price.toFixed(2)}` : 'N/A',
      sorter: true,
      sortOrder: getCurrentSorter()?.field === 'price' ? getCurrentSorter()?.order : undefined,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: '10%',
      render: (active: boolean | undefined) => (
        <span style={{ color: active ? 'green' : 'red' }}>
          {active === true ? 'Active' : active === false ? 'Inactive' : 'N/A'}
        </span>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      filteredValue: tableParams.filters?.is_active || null,
      // onFilter: (value, record) => record.is_active === (value as boolean), // Use server-side filtering if API supports it
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_, record: Test) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewTest(record)}>
          View
        </Button>
        // Add Edit/Delete buttons here if needed
      ),
    },
  ];

  // View test details
  const handleViewTest = (test: Test): void => {
    Modal.info({
      title: `Test Details: ${test.name}`,
      content: (
        <div>
          <p><strong>Code:</strong> {test.code}</p>
          <p><strong>Category:</strong> {test.category_name || 'N/A'}</p>
          <p><strong>Description:</strong> {test.description || 'N/A'}</p>
          <p><strong>Sample Type:</strong> {test.sample_type}</p>
          <p><strong>Sample Volume:</strong> {test.sample_volume || 'N/A'}</p>
          <p><strong>Processing Time:</strong> {test.processing_time != null ? `${test.processing_time} minutes` : 'N/A'}</p>
          <p><strong>Price:</strong> {test.price != null ? `$${test.price.toFixed(2)}` : 'N/A'}</p>
          <p><strong>Status:</strong> {test.is_active ? 'Active' : 'Inactive'}</p>
        </div>
      ),
      width: 500,
    });
  };

  return (
    <div className="test-catalog-container p-4">
      <Card
        title="Laboratory Test Catalog"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            Add Test
          </Button>
        }
      >
        <div className="filter-container mb-4 flex flex-wrap gap-4 items-center">
          <Input
            placeholder="Search tests (Code, Name, Desc)..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />

          <Select<string | undefined>
            placeholder="Filter by category"
            allowClear
            style={{ width: 200 }}
            value={categoryFilter}
            onChange={(value: string | undefined) => setCategoryFilter(value)}
            loading={!categories.length} // Show loading indicator if categories aren't loaded
            showSearch // Allow searching categories
            optionFilterProp="children" // Filter based on option text
            filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {categories.map(category => (
              <Option key={category.id} value={category.id}>{category.name}</Option>
            ))}
          </Select>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearchText('');
              setCategoryFilter(undefined);
              // FIX: Reset table params correctly, avoid assigning boolean
              const resetParams: TableParams = {
                pagination: tableParams.pagination ? { // Check if pagination exists
                  ...tableParams.pagination,
                  current: 1,
                } : undefined,
                sorter: undefined,
                filters: {},
              };
              setTableParams(resetParams);
              fetchTests(resetParams);
            }}
          >
            Reset Filters
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table<Test>
            columns={columns}
            dataSource={tests}
            rowKey="id"
            pagination={tableParams.pagination} // Controlled pagination
            loading={loading} // Pass loading state to Table
            onChange={handleTableChange} // Handle table changes
            scroll={{ x: 'max-content' }} // Enable horizontal scroll if needed
          />
        </Spin>
      </Card>

      {/* Add Test Modal */}
      <Modal
        title="Add New Laboratory Test"
        open={isModalVisible} // Use 'open' instead of 'visible'
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null} // Footer handled by Form buttons
        destroyOnClose // Reset form state when modal is closed
        width={700}
      >
        <Form<AddTestFormValues>
          form={form}
          layout="vertical"
          onFinish={handleAddTest}
          initialValues={{ is_active: true }} // Default is_active to true
        >
          <Form.Item
            name="code"
            label="Test Code"
            rules={[{ required: true, message: 'Please input the test code!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="Test Name"
            rules={[{ required: true, message: 'Please input the test name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="category_id"
            label="Category"
            rules={[{ required: true, message: 'Please select a category!' }]}
          >
            <Select placeholder="Select Category" loading={!categories.length}>
              {categories.map(category => (
                <Option key={category.id} value={category.id}>{category.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="sample_type"
            label="Sample Type"
            rules={[{ required: true, message: 'Please input the sample type!' }]}
          >
            <Input placeholder="e.g., Blood, Urine, Serum" />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true, message: 'Please input the price!' }, { pattern: /^\d+(\.\d{1,2})?$/, message: 'Please enter a valid price (e.g., 10.50)' }]}
          >
            <Input prefix="$" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="sample_volume" label="Sample Volume">
            <Input placeholder="e.g., 5 mL" />
          </Form.Item>
          <Form.Item
            name="processing_time"
            label="Processing Time (minutes)"
            rules={[{ pattern: /^\d+$/, message: 'Please enter a valid number of minutes' }]}
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item name="is_active" label="Active Status" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item className="text-right">
            <Button onClick={() => { setIsModalVisible(false); form.resetFields(); }} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Add Test
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestCatalogManagement;

