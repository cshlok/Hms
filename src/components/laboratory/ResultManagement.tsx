import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Spin, message, Modal, Form, Tabs, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;

const ResultManagement = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [orderFilter, setOrderFilter] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEntryModalVisible, setIsEntryModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [form] = Form.useForm();
  const [entryForm] = Form.useForm();
  const [orders, setOrders] = useState([]); // For order selection
  const [orderItems, setOrderItems] = useState([]); // For result entry
  const [parameters, setParameters] = useState([]); // For parameter selection

  // Fetch results with optional filters
  const fetchResults = async () => {
    setLoading(true);
    try {
      let url = '/api/laboratory/results';
      const params = new URLSearchParams();
      
      if (orderFilter) {
        params.append('orderId', orderFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch results');
      const data = await response.json();
      
      // Filter by search text if provided
      let filteredData = data.results || data;
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filteredData = filteredData.filter(result => 
          result.test_name?.toLowerCase().includes(searchLower) || 
          result.parameter_name?.toLowerCase().includes(searchLower) ||
          result.result_value?.toLowerCase().includes(searchLower)
        );
      }
      
      setResults(filteredData);
    } catch (error) {
      console.error('Error fetching results:', error);
      message.error('Failed to load laboratory results');
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders for filter dropdown
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/laboratory/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.results || data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Failed to load laboratory orders');
    }
  };

  // Fetch order items for a specific order
  const fetchOrderItems = async (orderId) => {
    try {
      const response = await fetch(`/api/laboratory/orders/${orderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      const data = await response.json();
      setOrderItems(data.results || data);
    } catch (error) {
      console.error('Error fetching order items:', error);
      message.error('Failed to load order items');
    }
  };

  // Fetch parameters for a specific test
  const fetchParameters = async (testId) => {
    try {
      const response = await fetch(`/api/laboratory/tests/${testId}/parameters`);
      if (!response.ok) throw new Error('Failed to fetch test parameters');
      const data = await response.json();
      setParameters(data.results || data);
    } catch (error) {
      console.error('Error fetching test parameters:', error);
      message.error('Failed to load test parameters');
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchResults();
    fetchOrders();
  }, []);

  // Reload results when filters change
  useEffect(() => {
    fetchResults();
  }, [orderFilter]);

  // Handle updating a result
  const handleUpdateResult = async (values) => {
    try {
      const response = await fetch('/api/laboratory/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedResult.id,
          ...values
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update result');
      }
      
      message.success('Result updated successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchResults();
    } catch (error) {
      console.error('Error updating result:', error);
      message.error(error.message);
    }
  };

  // Handle creating a new result
  const handleCreateResult = async (values) => {
    try {
      const response = await fetch('/api/laboratory/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_item_id: selectedOrderItem.id,
          ...values
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create result');
      }
      
      message.success('Result created successfully');
      setIsEntryModalVisible(false);
      entryForm.resetFields();
      fetchResults();
    } catch (error) {
      console.error('Error creating result:', error);
      message.error(error.message);
    }
  };

  // Handle verifying a result
  const handleVerifyResult = async (result) => {
    try {
      const response = await fetch('/api/laboratory/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: result.id,
          verify: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify result');
      }
      
      message.success('Result verified successfully');
      fetchResults();
    } catch (error) {
      console.error('Error verifying result:', error);
      message.error(error.message);
    }
  };

  // Show result entry modal
  const showResultEntryModal = (orderItem) => {
    setSelectedOrderItem(orderItem);
    entryForm.resetFields();
    
    // If the test has parameters, fetch them
    if (orderItem.test_id) {
      fetchParameters(orderItem.test_id);
    }
    
    setIsEntryModalVisible(true);
  };

  // Show result update modal
  const showResultUpdateModal = (result) => {
    setSelectedResult(result);
    form.setFieldsValue({
      result_value: result.result_value,
      is_abnormal: result.is_abnormal,
      notes: result.notes || ''
    });
    setIsModalVisible(true);
  };

  // Table columns
  const columns = [
    {
      title: 'Test',
      dataIndex: 'test_name',
      key: 'test_name',
      width: '15%',
    },
    {
      title: 'Parameter',
      dataIndex: 'parameter_name',
      key: 'parameter_name',
      width: '15%',
      render: (name) => name || 'N/A',
    },
    {
      title: 'Result',
      dataIndex: 'result_value',
      key: 'result_value',
      width: '15%',
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: '10%',
      render: (unit) => unit || 'N/A',
    },
    {
      title: 'Reference Range',
      key: 'reference_range',
      width: '15%',
      render: (_, record) => {
        // Simplified - in a real app, you'd use patient gender/age to determine which range to show
        return record.reference_range_male || 'N/A';
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: '10%',
      render: (_, record) => {
        if (record.verified_by) {
          return <Tag color="success">Verified</Tag>;
        } else if (record.is_abnormal) {
          return <Tag color="error">Abnormal</Tag>;
        } else {
          return <Tag color="processing">Pending Verification</Tag>;
        }
      },
    },
    {
      title: 'Performed By',
      dataIndex: 'performed_by_name',
      key: 'performed_by_name',
      width: '15%',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (_, record) => {
        const actions = [];
        
        // Edit action (only if not verified)
        if (!record.verified_by) {
          actions.push(
            <Button 
              key="edit" 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => showResultUpdateModal(record)}
            >
              Edit
            </Button>
          );
        }
        
        // Verify action (only if not verified and user has permission)
        if (!record.verified_by) {
          actions.push(
            <Button 
              key="verify" 
              type="link" 
              icon={<CheckOutlined />} 
              onClick={() => handleVerifyResult(record)}
            >
              Verify
            </Button>
          );
        }
        
        return actions;
      },
    },
  ];

  return (
    <div className="result-management-container">
      <Card
        title="Laboratory Result Management"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => {
              // In a real app, you'd show a modal to select an order first
              message.info('Select an order to enter results for');
            }}
          >
            Enter Results
          </Button>
        }
      >
        <div className="filter-container" style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Input
            placeholder="Search results..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={fetchResults}
            style={{ width: 250 }}
          />
          
          <Select
            placeholder="Filter by Order"
            allowClear
            style={{ width: 200 }}
            value={orderFilter}
            onChange={setOrderFilter}
          >
            {orders.map(order => (
              <Option key={order.id} value={order.id}>
                Order #{order.id} - {order.patient_name}
              </Option>
            ))}
          </Select>
          
          <Button 
            onClick={() => {
              setSearchText('');
              setOrderFilter(null);
              fetchResults();
            }}
          >
            Reset
          </Button>
        </div>
        
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={results}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      </Card>
      
      {/* Update Result Modal */}
      <Modal
        title={`Update Result: ${selectedResult?.test_name} ${selectedResult?.parameter_name ? `- ${selectedResult.parameter_name}` : ''}`}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateResult}
        >
          <Form.Item
            name="result_value"
            label="Result Value"
            rules={[{ required: true, message: 'Please enter result value' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="is_abnormal"
            label="Abnormal"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Update Result
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Result Entry Modal */}
      <Modal
        title={`Enter Result: ${selectedOrderItem?.test_name || 'Test'}`}
        visible={isEntryModalVisible}
        onCancel={() => setIsEntryModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={entryForm}
          layout="vertical"
          onFinish={handleCreateResult}
        >
          {parameters.length > 0 ? (
            <Form.Item
              name="parameter_id"
              label="Parameter"
              rules={[{ required: true, message: 'Please select parameter' }]}
            >
              <Select placeholder="Select parameter">
                {parameters.map(param => (
                  <Option key={param.id} value={param.id}>
                    {param.name} ({param.unit || 'No unit'})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          ) : null}
          
          <Form.Item
            name="result_value"
            label="Result Value"
            rules={[{ required: true, message: 'Please enter result value' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="is_abnormal"
            label="Abnormal"
            initialValue={false}
          >
            <Select>
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save Result
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResultManagement;
