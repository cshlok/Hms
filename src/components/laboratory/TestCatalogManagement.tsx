import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Spin, message, Modal, Form } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

const TestCatalogManagement = () => {
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Fetch test categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/laboratory/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.results || data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Failed to load test categories');
    }
  };

  // Fetch tests with optional filters
  const fetchTests = async () => {
    setLoading(true);
    try {
      let url = '/api/laboratory/tests';
      const params = new URLSearchParams();
      
      if (categoryFilter) {
        params.append('categoryId', categoryFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tests');
      const data = await response.json();
      
      // Filter by search text if provided
      let filteredData = data.results || data;
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filteredData = filteredData.filter(test => 
          test.name.toLowerCase().includes(searchLower) || 
          test.code.toLowerCase().includes(searchLower) ||
          test.description?.toLowerCase().includes(searchLower)
        );
      }
      
      setTests(filteredData);
    } catch (error) {
      console.error('Error fetching tests:', error);
      message.error('Failed to load laboratory tests');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCategories();
    fetchTests();
  }, []);

  // Reload tests when filters change
  useEffect(() => {
    fetchTests();
  }, [categoryFilter]);

  // Handle adding a new test
  const handleAddTest = async (values) => {
    try {
      const response = await fetch('/api/laboratory/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add test');
      }
      
      message.success('Test added successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchTests();
    } catch (error) {
      console.error('Error adding test:', error);
      message.error(error.message);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: '10%',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
    },
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category_name',
      width: '15%',
    },
    {
      title: 'Sample Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: '15%',
    },
    {
      title: 'Processing Time',
      dataIndex: 'processing_time',
      key: 'processing_time',
      width: '15%',
      render: (time) => time ? `${time} minutes` : 'N/A',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: '10%',
      render: (price) => `$${price.toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: '10%',
      render: (active) => (
        <span style={{ color: active ? 'green' : 'red' }}>
          {active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_, record) => (
        <Button type="link" onClick={() => handleViewTest(record)}>
          View Details
        </Button>
      ),
    },
  ];

  // View test details (placeholder for now)
  const handleViewTest = (test) => {
    Modal.info({
      title: `Test Details: ${test.name}`,
      content: (
        <div>
          <p><strong>Code:</strong> {test.code}</p>
          <p><strong>Category:</strong> {test.category_name}</p>
          <p><strong>Description:</strong> {test.description || 'N/A'}</p>
          <p><strong>Sample Type:</strong> {test.sample_type}</p>
          <p><strong>Sample Volume:</strong> {test.sample_volume || 'N/A'}</p>
          <p><strong>Processing Time:</strong> {test.processing_time ? `${test.processing_time} minutes` : 'N/A'}</p>
          <p><strong>Price:</strong> ${test.price.toFixed(2)}</p>
          <p><strong>Status:</strong> {test.is_active ? 'Active' : 'Inactive'}</p>
        </div>
      ),
      width: 500,
    });
  };

  return (
    <div className="test-catalog-container">
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
        <div className="filter-container" style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Input
            placeholder="Search tests..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={fetchTests}
            style={{ width: 250 }}
          />
          
          <Select
            placeholder="Filter by category"
            allowClear
            style={{ width: 200 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
          >
            {categories.map(category => (
              <Option key={category.id} value={category.id}>{category.name}</Option>
            ))}
          </Select>
          
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              setSearchText('');
              setCategoryFilter(null);
              fetchTests();
            }}
          >
            Reset
          </Button>
        </div>
        
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={tests}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      </Card>
      
      {/* Add Test Modal */}
      <Modal
        title="Add New Laboratory Test"
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddTest}
        >
          <Form.Item
            name="code"
            label="Test Code"
            rules={[{ required: true, message: 'Please enter test code' }]}
          >
            <Input placeholder="e.g., CBC001" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="Test Name"
            rules={[{ required: true, message: 'Please enter test name' }]}
          >
            <Input placeholder="e.g., Complete Blood Count" />
          </Form.Item>
          
          <Form.Item
            name="category_id"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select category">
              {categories.map(category => (
                <Option key={category.id} value={category.id}>{category.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Test description..." />
          </Form.Item>
          
          <Form.Item
            name="sample_type"
            label="Sample Type"
            rules={[{ required: true, message: 'Please select sample type' }]}
          >
            <Select placeholder="Select sample type">
              <Option value="blood">Blood</Option>
              <Option value="urine">Urine</Option>
              <Option value="stool">Stool</Option>
              <Option value="sputum">Sputum</Option>
              <Option value="csf">Cerebrospinal Fluid</Option>
              <Option value="swab">Swab</Option>
              <Option value="tissue">Tissue</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="sample_volume"
            label="Sample Volume"
          >
            <Input placeholder="e.g., 5ml" />
          </Form.Item>
          
          <Form.Item
            name="processing_time"
            label="Processing Time (minutes)"
          >
            <Input type="number" min={0} placeholder="e.g., 60" />
          </Form.Item>
          
          <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true, message: 'Please enter price' }]}
          >
            <Input type="number" min={0} step={0.01} placeholder="e.g., 25.00" />
          </Form.Item>
          
          <Form.Item
            name="is_active"
            label="Status"
            initialValue={true}
          >
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
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
