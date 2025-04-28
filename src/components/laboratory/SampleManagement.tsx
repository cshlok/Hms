import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Spin, message, Modal, Form, Upload, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, BarcodeOutlined, PrinterOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;

const SampleManagement = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [form] = Form.useForm();
  const [updateForm] = Form.useForm();

  // Fetch samples with optional filters
  const fetchSamples = async () => {
    setLoading(true);
    try {
      let url = '/api/laboratory/samples';
      const params = new URLSearchParams();
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch samples');
      const data = await response.json();
      
      // Filter by search text if provided
      let filteredData = data.results || data;
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filteredData = filteredData.filter(sample => 
          sample.barcode.toLowerCase().includes(searchLower) || 
          sample.patient_name?.toLowerCase().includes(searchLower)
        );
      }
      
      setSamples(filteredData);
    } catch (error) {
      console.error('Error fetching samples:', error);
      message.error('Failed to load laboratory samples');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchSamples();
  }, []);

  // Reload samples when filters change
  useEffect(() => {
    fetchSamples();
  }, [statusFilter]);

  // Handle updating a sample
  const handleUpdateSample = async (values) => {
    try {
      const response = await fetch('/api/laboratory/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedSample.id,
          ...values
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update sample');
      }
      
      message.success('Sample updated successfully');
      setIsUpdateModalVisible(false);
      updateForm.resetFields();
      fetchSamples();
    } catch (error) {
      console.error('Error updating sample:', error);
      message.error(error.message);
    }
  };

  // Handle collecting a sample
  const handleCollectSample = async (sample) => {
    try {
      const response = await fetch('/api/laboratory/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: sample.id,
          status: 'collected'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to collect sample');
      }
      
      message.success('Sample marked as collected');
      fetchSamples();
    } catch (error) {
      console.error('Error collecting sample:', error);
      message.error(error.message);
    }
  };

  // Handle receiving a sample
  const handleReceiveSample = async (sample) => {
    try {
      const response = await fetch('/api/laboratory/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: sample.id,
          status: 'received'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to receive sample');
      }
      
      message.success('Sample marked as received');
      fetchSamples();
    } catch (error) {
      console.error('Error receiving sample:', error);
      message.error(error.message);
    }
  };

  // Handle rejecting a sample
  const showRejectModal = (sample) => {
    setSelectedSample(sample);
    updateForm.setFieldsValue({
      status: 'rejected',
      rejection_reason: '',
      notes: sample.notes || ''
    });
    setIsUpdateModalVisible(true);
  };

  // Print barcode (placeholder function)
  const handlePrintBarcode = (sample) => {
    message.info(`Printing barcode for sample ${sample.barcode}`);
    // In a real implementation, this would trigger a print job
  };

  // Table columns
  const columns = [
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      width: '15%',
    },
    {
      title: 'Patient',
      dataIndex: 'patient_name',
      key: 'patient_name',
      width: '20%',
    },
    {
      title: 'Sample Type',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: '10%',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status) => {
        let color = 'default';
        if (status === 'collected') color = 'processing';
        if (status === 'received') color = 'success';
        if (status === 'rejected') color = 'error';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Collected By',
      key: 'collector',
      width: '15%',
      render: (_, record) => record.collector_name || 'Not collected',
    },
    {
      title: 'Collected At',
      dataIndex: 'collected_at',
      key: 'collected_at',
      width: '15%',
      render: (date) => date ? moment(date).format('YYYY-MM-DD HH:mm') : 'Not collected',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (_, record) => {
        const actions = [];
        
        // Print barcode action
        actions.push(
          <Button 
            key="print" 
            type="link" 
            icon={<PrinterOutlined />} 
            onClick={() => handlePrintBarcode(record)}
          >
            Print
          </Button>
        );
        
        // Status-based actions
        if (record.status === 'pending') {
          actions.push(
            <Button 
              key="collect" 
              type="link" 
              icon={<CheckOutlined />} 
              onClick={() => handleCollectSample(record)}
            >
              Collect
            </Button>
          );
        } else if (record.status === 'collected') {
          actions.push(
            <Button 
              key="receive" 
              type="link" 
              icon={<CheckOutlined />} 
              onClick={() => handleReceiveSample(record)}
            >
              Receive
            </Button>
          );
          actions.push(
            <Button 
              key="reject" 
              type="link" 
              danger 
              icon={<CloseOutlined />} 
              onClick={() => showRejectModal(record)}
            >
              Reject
            </Button>
          );
        }
        
        return actions;
      },
    },
  ];

  return (
    <div className="sample-management-container">
      <Card
        title="Laboratory Sample Management"
        extra={
          <Button 
            type="primary" 
            icon={<BarcodeOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            Scan Barcode
          </Button>
        }
      >
        <div className="filter-container" style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Input
            placeholder="Search by barcode or patient..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={fetchSamples}
            style={{ width: 250 }}
          />
          
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 200 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="pending">Pending</Option>
            <Option value="collected">Collected</Option>
            <Option value="received">Received</Option>
            <Option value="rejected">Rejected</Option>
            <Option value="processed">Processed</Option>
          </Select>
          
          <Button 
            onClick={() => {
              setSearchText('');
              setStatusFilter(null);
              fetchSamples();
            }}
          >
            Reset
          </Button>
        </div>
        
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={samples}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      </Card>
      
      {/* Barcode Scan Modal */}
      <Modal
        title="Scan Sample Barcode"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={(values) => {
            // Handle barcode scan
            message.info(`Searching for barcode: ${values.barcode}`);
            setIsModalVisible(false);
            // In a real implementation, this would fetch the sample by barcode
          }}
        >
          <Form.Item
            name="barcode"
            label="Barcode"
            rules={[{ required: true, message: 'Please enter or scan barcode' }]}
          >
            <Input 
              placeholder="Scan or enter barcode" 
              autoFocus 
              suffix={<BarcodeOutlined />}
            />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Search
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Update Sample Modal */}
      <Modal
        title={`Update Sample: ${selectedSample?.barcode}`}
        visible={isUpdateModalVisible}
        onCancel={() => setIsUpdateModalVisible(false)}
        footer={null}
      >
        <Form
          form={updateForm}
          layout="vertical"
          onFinish={handleUpdateSample}
        >
          <Form.Item
            name="status"
            label="Status"
          >
            <Select disabled>
              <Option value="rejected">Rejected</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="rejection_reason"
            label="Rejection Reason"
            rules={[{ required: true, message: 'Please provide rejection reason' }]}
          >
            <Select placeholder="Select rejection reason">
              <Option value="insufficient_volume">Insufficient Volume</Option>
              <Option value="hemolyzed">Hemolyzed Sample</Option>
              <Option value="clotted">Clotted Sample</Option>
              <Option value="wrong_container">Wrong Container</Option>
              <Option value="contaminated">Contaminated</Option>
              <Option value="improper_labeling">Improper Labeling</Option>
              <Option value="delayed_transport">Delayed Transport</Option>
              <Option value="other">Other (specify in notes)</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" danger htmlType="submit">
              Reject Sample
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SampleManagement;
