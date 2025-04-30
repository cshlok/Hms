import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Spin, message, Modal, Form, DatePicker, Tag } from 'antd';
import type { DatePickerProps, RangePickerProps } from 'antd/es/date-picker'; // FIX: Import Dayjs types
import { PlusOutlined, SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs'; // FIX: Import dayjs
import type { Dayjs } from 'dayjs'; // FIX: Import Dayjs type

const { Option } = Select;
const { RangePicker } = DatePicker;

// Define interfaces for data types
interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface Test {
  id: string;
  name: string;
  price: number;
}

interface OrderItem {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'canceled';
  price: number;
}

interface Order {
  id: string;
  patient_name: string;
  doctor_name: string | null;
  order_date: string;
  source: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'canceled';
  notes?: string;
}

// FIX: Define API response types
interface PatientsApiResponse {
  results?: Patient[];
  // Add other potential fields like pagination info
}

interface TestsApiResponse {
  results?: Test[];
}

interface OrdersApiResponse {
  results?: Order[];
}

interface OrderItemsApiResponse {
  results?: OrderItem[];
}

interface ApiErrorResponse {
  error?: string;
}

// FIX: Update FilterState to use Dayjs
interface FilterState {
  patientId: string;
  status: string | null;
  source: string | null;
  dateRange: [Dayjs, Dayjs] | null;
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    patientId: '',
    status: null,
    source: null,
    dateRange: null,
  });
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch patients
  const fetchPatients = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('/api/patients'); // Assuming this endpoint exists
      if (!response.ok) {
        let errorMsg = 'Failed to fetch patients';
        try {
          // FIX: Type errorData
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      // FIX: Type the response data
      const data: PatientsApiResponse = await response.json();
      setPatients(data.results || []); // Use results array or default to empty
      setError(null);
    } catch (err: unknown) { // FIX: Use unknown
      const messageText = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching patients:', err);
      message.error('Failed to load patients');
      setError(`Failed to load patients: ${messageText}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tests
  const fetchTests = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('/api/laboratory/tests');
      if (!response.ok) {
        let errorMsg = 'Failed to fetch tests';
        try {
          // FIX: Type errorData
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      // FIX: Type the response data
      const data: TestsApiResponse = await response.json();
      setTests(data.results || []);
      setError(null);
    } catch (err: unknown) { // FIX: Use unknown
      const messageText = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching tests:', err);
      message.error('Failed to load tests');
      setError(`Failed to load tests: ${messageText}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders with filters
  const fetchOrders = React.useCallback(async (): Promise<void> => { // Wrapped in useCallback
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
      // FIX: Use Dayjs for date range and convert to ISO string
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        params.append('startDate', filters.dateRange[0].startOf('day').toISOString());
        params.append('endDate', filters.dateRange[1].endOf('day').toISOString());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = 'Failed to fetch orders';
        try {
          // FIX: Type errorData
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      // FIX: Type the response data
      const data: OrdersApiResponse = await response.json();
      setOrders(data.results || []);
    } catch (err: unknown) { // FIX: Use unknown
      const messageText = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching orders:', err);
      message.error('Failed to load laboratory orders');
      setError(`Failed to load laboratory orders: ${messageText}`);
    } finally {
      setLoading(false);
    }
  }, [filters]); // Added filters dependency

  // Fetch order items for a specific order
  const fetchOrderItems = async (orderId: string): Promise<void> => {
    setLoadingOrderItems(true);
    try {
      const response = await fetch(`/api/laboratory/orders/${orderId}/items`);
      if (!response.ok) {
        let errorMsg = 'Failed to fetch order items';
        try {
          // FIX: Type errorData
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      // FIX: Type the response data
      const data: OrderItemsApiResponse = await response.json();
      setOrderItems(data.results || []);
    } catch (err: unknown) { // FIX: Use unknown
      const messageText = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error fetching order items:', err);
      message.error('Failed to load order items');
    } finally {
      setLoadingOrderItems(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPatients();
    fetchTests();
    // fetchOrders(); // fetchOrders is called by the filter useEffect
  }, []);

  // Reload orders when filters change
  useEffect(() => {
    fetchOrders();
  }, [filters, fetchOrders]); // Added fetchOrders dependency

  // FIX: Update type for value in handleFilterChange for dateRange
  const handleFilterChange = (key: keyof FilterState, value: any): void => {
    // Ensure dateRange is correctly typed when setting state
    if (key === 'dateRange') {
      setFilters(prev => ({ ...prev, [key]: value as [Dayjs, Dayjs] | null }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const resetFilters = (): void => {
    setFilters({
      patientId: '',
      status: null,
      source: null,
      dateRange: null,
    });
  };

  // View order details
  const handleViewOrder = async (order: Order): Promise<void> => {
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
      render: (name: string | null) => name || 'N/A',
    },
    {
      title: 'Order Date',
      dataIndex: 'order_date',
      key: 'order_date',
      width: '15%',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'), // FIX: Use dayjs
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: '10%',
      render: (source: string) => source.toUpperCase(),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: '10%',
      render: (priority: string) => {
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
      render: (status: string) => {
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
      render: (_: any, record: Order) => (
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
      render: (status: string) => {
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
      render: (price: number) => `₹${price.toFixed(2)}`
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
            onChange={(value: string) => handleFilterChange('patientId', value)}
            style={{ width: 200 }}
            filterOption={(input: string, option: any) =>
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
            onChange={(value: string | null) => handleFilterChange('status', value)}
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
            onChange={(value: string | null) => handleFilterChange('source', value)}
          >
            <Option value="opd">OPD</Option>
            <Option value="ipd">IPD</Option>
            <Option value="er">ER</Option>
            <Option value="external">External</Option>
          </Select>

          {/* FIX: Use Dayjs for RangePicker value and onChange type */}
          <RangePicker
            value={filters.dateRange}
            onChange={(dates: RangePickerProps['value']) => handleFilterChange('dateRange', dates)}
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
            <p><strong>Order Date:</strong> {dayjs(viewingOrder.order_date).format('YYYY-MM-DD HH:mm')}</p> {/* FIX: Use dayjs */}
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

