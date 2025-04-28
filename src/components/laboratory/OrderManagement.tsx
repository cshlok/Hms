import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Spin, message, Modal, Form, DatePicker, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    patientId: '',
    status: null,
    source: null,
    dateRange: null,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);
  const [error, setError] = useState(null);

  // Fetch patients
  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      setPatients(data.results || data);
      setError(null);
    } catch (error) {
      console.error('Error fetching patients:', error);
      message.error('Failed to load patients');
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tests
  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/laboratory/tests');
      if (!response.ok) throw new Error('Failed to fetch tests');
      const data = await response.json();
      setTests(data.results || data);
      setError(null);
    } catch (error) {
      console.error('Error fetching tests:', error);
      message.error('Failed to load tests');
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders with filters
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/laboratory/orders';
      const params = new URLSearchParams();
      
      if (filters.patientId) {
        params.append('patientId', filters.patientId);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.source) {
        params.append('source', filters.source);
      }
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.append('startDate', moment(filters.dateRange[0]).startOf('day').toISOString());
        params.append('endDate', moment(filters.dateRange[1]).endOf('day').toISOString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.results || data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Failed to load laboratory orders');
      setError('Failed to load laboratory orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch order items for a specific order
  const fetchOrderItems = async (orderId) => {
    setLoadingOrderItems(true);
    try {
      const response = await fetch(`/api/laboratory/orders/${orderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      const data = await response.json();
      setOrderItems(data.results || data);
    } catch (error) {
      console.error('Error fetching order items:', error);
      message.error('Failed to load order items');
    } finally {
      setLoadingOrderItems(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPatients();
    fetchTests();
    fetchOrders();
  }, []);

  // Reload orders when filters change
  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      patientId: '',
      status: null,
      source: null,
      dateRange: null,
    });
  };

  // View order details
  const handleViewOrder = async (order) => {
    setViewingOrder(order);
    setIsModalVisible(true);
    fetchOrderItems(order.id);
  };

  // Table columns
  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      width: '10%',
    },
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
      width: '20%',
    },
    {
      title: 'Ordering Doctor',
      dataIndex: 'doctor_name',
      key: 'doctor_name',
      width: '15%',
      render: (name) => name || 'N/A',
    },
    {
      title: 'Order Date',
      dataIndex: 'order_date',
      key: 'order_date',
      width: '15%',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: '10%',
      render: (source) => source.toUpperCase(),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: '10%',
      render: (priority) => {
        let color = 'blue';
        if (priority === 'urgent') color = 'orange';
        if (priority === 'stat') color = 'red';
        return <Tag color={color}>{priority.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status) => {
        let color = 'default';
        if (status === 'collected') color = 'processing';
        if (status === 'processing') color = 'warning';
        if (status === 'completed') color = 'success';
        if (status === 'canceled') color = 'error';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => handleViewOrder(record)}
        >
          View
        </Button>
      ),
    },
  ];

  // Order items columns for the modal
  const orderItemColumns = [
    { 
      title: 'Test/Panel', 
      dataIndex: 'name', 
      key: 'name' 
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'pending') color = 'default';
        if (status === 'in_progress') color = 'processing';
        if (status === 'completed') color = 'success';
        if (status === 'canceled') color = 'error';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    { 
      title: 'Price', 
      dataIndex: 'price', 
      key: 'price',
      render: (price) => `₹${price.toFixed(2)}`
    },
  ];

  return (
    <div className="order-management-container">
      <Card title="Laboratory Order Management">
        <div className="filter-container" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <Select
            showSearch
            placeholder="Search Patient"
            optionFilterProp="children"
            value={filters.patientId || undefined}
            onChange={(value) => handleFilterChange('patientId', value)}
            style={{ width: 200 }}
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            allowClear
          >
            {patients.map(p => <Option key={p.id} value={p.id}>{`${p.first_name} ${p.last_name} (ID: ${p.id})`}</Option>)}
          </Select>
          
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: 150 }}
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
          >
            <Option value="pending">Pending</Option>
            <Option value="collected">Collected</Option>
            <Option value="processing">Processing</Option>
            <Option value="completed">Completed</Option>
            <Option value="canceled">Canceled</Option>
          </Select>
          
          <Select
            placeholder="Filter by Source"
            allowClear
            style={{ width: 150 }}
            value={filters.source}
            onChange={(value) => handleFilterChange('source', value)}
          >
            <Option value="opd">OPD</Option>
            <Option value="ipd">IPD</Option>
            <Option value="er">ER</Option>
            <Option value="external">External</Option>
          </Select>
          
          <RangePicker 
            value={filters.dateRange}
            onChange={(dates) => handleFilterChange('dateRange', dates)}
          />
          
          <Button 
            icon={<ReloadOutlined />} 
            onClick={resetFilters}
          >
            Reset
          </Button>
        </div>
        
        {error && (
          <div style={{ marginBottom: 16, color: 'red', padding: '8px', background: '#ffeeee', borderRadius: '4px' }}>
            {error}
          </div>
        )}
        
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'No laboratory orders found' }}
          />
        </Spin>
      </Card>
      
      {/* View Order Modal */}
      <Modal
        title={`Order Details: ${viewingOrder?.id}`}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        {viewingOrder && (
          <div>
            <p><strong>Patient:</strong> {viewingOrder.patient_name}</p>
            <p><strong>Order Date:</strong> {moment(viewingOrder.order_date).format('YYYY-MM-DD HH:mm')}</p>
            <p><strong>Doctor:</strong> {viewingOrder.doctor_name || 'N/A'}</p>
            <p><strong>Source:</strong> {viewingOrder.source.toUpperCase()}</p>
            <p><strong>Priority:</strong> <Tag color={viewingOrder.priority === 'stat' ? 'red' : viewingOrder.priority === 'urgent' ? 'orange' : 'blue'}>{viewingOrder.priority.toUpperCase()}</Tag></p>
            <p><strong>Status:</strong> <Tag color={viewingOrder.status === 'completed' ? 'success' : viewingOrder.status === 'canceled' ? 'error' : 'processing'}>{viewingOrder.status.toUpperCase()}</Tag></p>
            <p><strong>Notes:</strong> {viewingOrder.notes || 'N/A'}</p>
            
            <h4>Order Items:</h4>
            <Spin spinning={loadingOrderItems}>
              {orderItems.length > 0 ? (
                <Table 
                  dataSource={orderItems} 
                  columns={orderItemColumns}
                  rowKey="id"
                  pagination={false}
                />
              ) : (
                <p>No items found for this order.</p>
              )}
            </Spin>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderManagement;
