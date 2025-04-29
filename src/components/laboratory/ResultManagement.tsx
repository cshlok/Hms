import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Spin, message, Modal, Form, Tabs, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;

// Define interfaces for data types
interface LabResult {
  id: string;
  order_item_id: string;
  test_name: string;
  parameter_id?: string;
  parameter_name?: string;
  result_value: string;
  unit?: string;
  reference_range_male?: string;
  reference_range_female?: string;
  is_abnormal: boolean;
  notes?: string;
  performed_by?: string;
  performed_by_name?: string;
  performed_at?: string;
  verified_by?: string;
  verified_by_name?: string;
  verified_at?: string;
}

interface LabOrder {
  id: string;
  patient_name: string;
  // Add other relevant order fields if needed for display
}

interface LabOrderItem {
  id: string;
  test_id: string;
  test_name: string;
  // Add other relevant item fields if needed
}

interface LabParameter {
  id: string;
  name: string;
  unit?: string;
  // Add other relevant parameter fields if needed
}

interface UpdateResultValues {
  result_value: string;
  is_abnormal: boolean;
  notes?: string;
}

interface CreateResultValues {
  parameter_id?: string;
  result_value: string;
  is_abnormal: boolean;
  notes?: string;
}

const ResultManagement: React.FC = () => {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isEntryModalVisible, setIsEntryModalVisible] = useState<boolean>(false);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [selectedOrderItem, setSelectedOrderItem] = useState<LabOrderItem | null>(null);
  const [form] = Form.useForm<UpdateResultValues>();
  const [entryForm] = Form.useForm<CreateResultValues>();
  const [orders, setOrders] = useState<LabOrder[]>([]); // For order selection
  const [orderItems, setOrderItems] = useState<LabOrderItem[]>([]); // For result entry
  const [parameters, setParameters] = useState<LabParameter[]>([]); // For parameter selection

  // Fetch results with optional filters
  const fetchResults = async (): Promise<void> => {
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
      
      // Assuming API returns { results: LabResult[] }
      let fetchedResults: LabResult[] = data.results || (Array.isArray(data) ? data : []);
      
      // Filter by search text if provided
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        fetchedResults = fetchedResults.filter(result => 
          result.test_name?.toLowerCase().includes(searchLower) || 
          result.parameter_name?.toLowerCase().includes(searchLower) ||
          result.result_value?.toLowerCase().includes(searchLower)
        );
      }
      
      setResults(fetchedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(`Failed to load laboratory results: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders for filter dropdown
  const fetchOrders = async (): Promise<void> => {
    try {
      const response = await fetch('/api/laboratory/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.results || (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(`Failed to load laboratory orders: ${errorMessage}`);
    }
  };

  // Fetch order items for a specific order
  const fetchOrderItems = async (orderId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/laboratory/orders/${orderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      const data = await response.json();
      setOrderItems(data.results || (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Error fetching order items:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(`Failed to load order items: ${errorMessage}`);
    }
  };

  // Fetch parameters for a specific test
  const fetchParameters = async (testId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/laboratory/tests/${testId}/parameters`);
      if (!response.ok) throw new Error('Failed to fetch test parameters');
      const data = await response.json();
      setParameters(data.results || (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Error fetching test parameters:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(`Failed to load test parameters: ${errorMessage}`);
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
  }, [orderFilter, searchText]); // Also refetch on search text change

  // Handle updating a result
  const handleUpdateResult = async (values: UpdateResultValues): Promise<void> => {
    if (!selectedResult) return;
    try {
      const response = await fetch('/api/laboratory/results', {
        method: 'POST', // Assuming POST handles updates via ID
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedResult.id,
          ...values
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to update result');
      }
      
      message.success('Result updated successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchResults();
    } catch (error) {
      console.error('Error updating result:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  };

  // Handle creating a new result
  const handleCreateResult = async (values: CreateResultValues): Promise<void> => {
    if (!selectedOrderItem) return;
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
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to create result');
      }
      
      message.success('Result created successfully');
      setIsEntryModalVisible(false);
      entryForm.resetFields();
      fetchResults();
    } catch (error) {
      console.error('Error creating result:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  };

  // Handle verifying a result
  const handleVerifyResult = async (result: LabResult): Promise<void> => {
    try {
      const response = await fetch('/api/laboratory/results', {
        method: 'POST', // Assuming POST handles verification
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: result.id,
          verify: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to verify result');
      }
      
      message.success('Result verified successfully');
      fetchResults();
    } catch (error) {
      console.error('Error verifying result:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      message.error(errorMessage);
    }
  };

  // Show result entry modal
  const showResultEntryModal = (orderItem: LabOrderItem): void => {
    setSelectedOrderItem(orderItem);
    entryForm.resetFields();
    setParameters([]); // Reset parameters
    
    // If the test has parameters, fetch them
    if (orderItem.test_id) {
      fetchParameters(orderItem.test_id);
    }
    
    setIsEntryModalVisible(true);
  };

  // Show result update modal
  const showResultUpdateModal = (result: LabResult): void => {
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
      render: (name: string | undefined) => name || 'N/A',
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
      render: (unit: string | undefined) => unit || 'N/A',
    },
    {
      title: 'Reference Range',
      key: 'reference_range',
      width: '15%',
      render: (_: any, record: LabResult) => {
        // Simplified - in a real app, you'd use patient gender/age to determine which range to show
        return record.reference_range_male || record.reference_range_female || 'N/A';
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: '10%',
      render: (_: any, record: LabResult) => {
        if (record.verified_by) {
          return <Tag color="success">Verified</Tag>;
        } else if (record.is_abnormal) {
          return <Tag color="error">Abnormal</Tag>;
        } else {
          return <Tag color="processing">Pending</Tag>;
        }
      },
    },
    {
      title: 'Performed By',
      dataIndex: 'performed_by_name',
      key: 'performed_by_name',
      width: '15%',
      render: (name: string | undefined) => name || 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (_: any, record: LabResult) => {
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
        
        // Verify action (only if not verified and user has permission - permission check omitted for brevity)
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
        
        return actions.length > 0 ? <>{actions}</> : 'N/A';
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
              // TODO: Implement proper order/item selection for result entry
              message.info('Select an order/item to enter results for (feature pending).');
            }}
          >
            Enter Results
          </Button>
        }
      >
        <div className="filter-container" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <Input
            placeholder="Search results..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            // onPressEnter={fetchResults} // fetchResults is called via useEffect
            style={{ width: 250 }}
          />
          
          <Select
            placeholder="Filter by Order"
            allowClear
            showSearch
            optionFilterProp="children"
            style={{ width: 250 }}
            value={orderFilter}
            onChange={(value: string | null) => setOrderFilter(value)}
            filterOption={(input, option) => 
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
            }
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
              // fetchResults(); // Called via useEffect
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
            locale={{ emptyText: 'No laboratory results found' }}
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
        {selectedResult && (
          <Form<UpdateResultValues>
            form={form}
            layout="vertical"
            onFinish={handleUpdateResult}
            initialValues={{
              result_value: selectedResult.result_value,
              is_abnormal: selectedResult.is_abnormal,
              notes: selectedResult.notes || ''
            }}
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
              valuePropName="checked" // Use checked for Checkbox, not Select
            >
              {/* Using Select for Yes/No boolean */}
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
        )}
      </Modal>
      
      {/* Result Entry Modal */}
      <Modal
        title={`Enter Result: ${selectedOrderItem?.test_name || 'Test'}`}
        visible={isEntryModalVisible}
        onCancel={() => setIsEntryModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedOrderItem && (
          <Form<CreateResultValues>
            form={entryForm}
            layout="vertical"
            onFinish={handleCreateResult}
            initialValues={{ is_abnormal: false }} // Set default for abnormal
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
        )}
      </Modal>
    </div>
  );
};

export default ResultManagement;

