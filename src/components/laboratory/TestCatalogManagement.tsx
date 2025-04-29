import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Spin, message, Modal, Form, Switch } from 'antd'; // Added Switch
import { PlusOutlined, SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'; // Added EyeOutlined
import type { TableColumnsType, TableProps, FormProps } from 'antd';
import type { FilterValue, SorterResult, SortOrder } from 'antd/es/table/interface';

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
  pagination?: TableProps<Test>['pagination'];
  sorter?: SorterResult<Test> | SorterResult<Test>[];
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
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      // Ensure data is an array, handle potential API response structures
      const fetchedCategories = data.results || (Array.isArray(data) ? data : []);
      setCategories(fetchedCategories);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching categories:', error);
      message.error(`Failed to load test categories: ${msg}`);
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
      // Example: queryParams.append('page', `${params.pagination?.current ?? 1}`);
      // Example: queryParams.append('limit', `${params.pagination?.pageSize ?? 10}`);
      // Example: if (params.sorter && !Array.isArray(params.sorter)) { ... }
      // Example: if (params.filters) { ... }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tests');
      const data = await response.json();

      // Ensure data is an array, handle potential API response structures
      let fetchedData: Test[] = data.results || (Array.isArray(data) ? data : []);

      // Client-side filtering by search text
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        fetchedData = fetchedData.filter(test =>
          test.name.toLowerCase().includes(searchLower) ||
          test.code.toLowerCase().includes(searchLower) ||
          (test.description && test.description.toLowerCase().includes(searchLower))
        );
      }

      setTests(fetchedData);
      // Update table pagination total if API provides it
      setTableParams(prev => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total: data.totalCount || fetchedData.length, // Use total from API or fallback
        },
      }));

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching tests:', error);
      message.error(`Failed to load laboratory tests: ${msg}`);
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
    const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const newTableParams: TableParams = {
        pagination,
        filters,
        sorter: currentSorter,
      };
    setTableParams(newTableParams);
    // If API supports server-side processing, fetch data here:
    // fetchTests(newTableParams);
    // For client-side sorting/filtering, the table handles it internally, but state needs update.
  };

  // Reload tests when external filters change
  useEffect(() => {
    // Reset pagination to first page when filters change
    const newParams = { ...tableParams, pagination: { ...tableParams.pagination, current: 1 } };
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
        throw new Error("Invalid price entered.");
      }
      if (values.processing_time && processingTimeNum === null) { // Check if parsing failed but input existed
         throw new Error("Invalid processing time entered.");
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add test (status: ${response.status})`);
      }

      message.success('Test added successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchTests(tableParams); // Refresh the list with current params
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error adding test:', error);
      message.error(`Error adding test: ${msg}`);
    }
  };

  // Table columns definition with types
  const columns: TableColumnsType<Test> = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: '10%',
      sorter: (a, b) => a.code.localeCompare(b.code),
      sortOrder: tableParams.sorter?.field === 'code' ? tableParams.sorter.order : undefined,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortOrder: tableParams.sorter?.field === 'name' ? tableParams.sorter.order : undefined,
    },
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category_name',
      width: '15%',
      render: (categoryName: string | undefined) => categoryName || 'N/A',
      sorter: (a, b) => (a.category_name || '').localeCompare(b.category_name || ''),
      sortOrder: tableParams.sorter?.field === 'category_name' ? tableParams.sorter.order : undefined,
    },
    {
      title: 'Sample Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: '15%',
      sorter: (a, b) => a.sample_type.localeCompare(b.sample_type),
      sortOrder: tableParams.sorter?.field === 'sample_type' ? tableParams.sorter.order : undefined,
    },
    {
      title: 'Processing Time',
      dataIndex: 'processing_time',
      key: 'processing_time',
      width: '15%',
      render: (time: number | null | undefined) => time != null ? `${time} minutes` : 'N/A',
      sorter: (a, b) => (a.processing_time ?? 0) - (b.processing_time ?? 0),
      sortOrder: tableParams.sorter?.field === 'processing_time' ? tableParams.sorter.order : undefined,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: '10%',
      render: (price: number | undefined) => price != null ? `$${price.toFixed(2)}` : 'N/A',
      sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
      sortOrder: tableParams.sorter?.field === 'price' ? tableParams.sorter.order : undefined,
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
      onFilter: (value, record) => record.is_active === (value as boolean),
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
              // Reset table params and fetch
              const resetParams: TableParams = { pagination: { ...tableParams.pagination, current: 1 }, sorter: undefined, filters: {} };
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
          initialValues={{ is_active: true }} // Set default values
        >
          <Form.Item<AddTestFormValues>
            name="code"
            label="Test Code"
            rules={[{ required: true, message: 'Please enter test code' }, { pattern: /^[a-zA-Z0-9-_]+$/, message: 'Code can only contain letters, numbers, hyphens, underscores' }]}
          >
            <Input placeholder="e.g., CBC001" />
          </Form.Item>

          <Form.Item<AddTestFormValues>
            name="name"
            label="Test Name"
            rules={[{ required: true, message: 'Please enter test name' }]}
          >
            <Input placeholder="e.g., Complete Blood Count" />
          </Form.Item>

          <Form.Item<AddTestFormValues>
            name="category_id"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select category" loading={!categories.length} showSearch optionFilterProp="children" filterOption={(input, option) => (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}>
              {categories.map(category => (
                <Option key={category.id} value={category.id}>{category.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item<AddTestFormValues>
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Optional: Test description..." />
          </Form.Item>

          <Form.Item<AddTestFormValues>
            name="sample_type"
            label="Sample Type"
            rules={[{ required: true, message: 'Please select sample type' }]}
          >
            <Select placeholder="Select sample type">
              <Option value="Blood">Blood</Option>
              <Option value="Urine">Urine</Option>
              <Option value="Stool">Stool</Option>
              <Option value="Tissue">Tissue</Option>
              <Option value="CSF">CSF</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item<AddTestFormValues>
            name="sample_volume"
            label="Sample Volume (Optional)"
          >
            <Input placeholder="e.g., 5 mL" />
          </Form.Item>

          <Form.Item<AddTestFormValues>
            name="processing_time"
            label="Processing Time (minutes, Optional)"
            rules={[{ pattern: /^[0-9]*$/, message: 'Processing time must be a number' }]}
          >
            <Input type="number" placeholder="e.g., 120" />
          </Form.Item>

          <Form.Item<AddTestFormValues>
            name="price"
            label="Price"
            rules={[{ required: true, message: 'Please enter price' }, { pattern: /^[0-9]+(\.[0-9]{1,2})?$/, message: 'Price must be a valid number (e.g., 150.00)' }]}
          >
            <Input type="number" step="0.01" placeholder="e.g., 150.00" />
          </Form.Item>

          <Form.Item<AddTestFormValues>
            name="is_active"
            label="Active Status"
            valuePropName="checked" // Important for Switch component
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Test
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => {
              setIsModalVisible(false);
              form.resetFields();
            }}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestCatalogManagement;

