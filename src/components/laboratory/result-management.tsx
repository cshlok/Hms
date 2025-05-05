import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Spin,
  message,
  Modal,
  Form,
  Tag,
  Checkbox,
} from "antd"; // FIX: Import Checkbox
import {
  PlusOutlined,
  SearchOutlined,
  CheckOutlined,
  // CloseOutlined, // FIX: Removed unused import
  EditOutlined,
} from "@ant-design/icons";
// import dayjs from "dayjs"; // FIX: Removed unused import
// import type { Dayjs } from "dayjs"; // FIX: Removed unused import

const { Option } = Select;
// const { TabPane } = Tabs; // FIX: Removed unused import

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

// interface LabParameter { // FIX: Commented out unused interface
//   id: string;
//   name: string;
//   unit?: string;
//   // Add other relevant parameter fields if needed
// }

// FIX: Define API response types
interface ResultsApiResponse {
  results?: LabResult[];
}

interface OrdersApiResponse {
  results?: LabOrder[];
}

// interface OrderItemsApiResponse { // Removed unused interface
//   results?: LabOrderItem[];
// }

interface ApiErrorResponse {
  error?: string;
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
  const [searchText, setSearchText] = useState<string>("");
  const [orderFilter, setOrderFilter] = useState<string | null>();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isEntryModalVisible, setIsEntryModalVisible] =
    useState<boolean>(false);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>();
  // const [selectedOrderItem, setSelectedOrderItem] = // Removed unused state
  //   useState<LabOrderItem | null>();
  const [form] = Form.useForm<UpdateResultValues>();
  const [entryForm] = Form.useForm<CreateResultValues>();
  const [orders, setOrders] = useState<LabOrder[]>([]); // For order selection
  // const [orderItems, setOrderItems] = useState<LabOrderItem[]>([]); // FIX: Removed unused state variable (for result entry)
  // const [_parameters, _setParameters] = useState<LabParameter[]>([]); // For parameter selection

  // Fetch results with optional filters
  const fetchResults = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      let url = "/api/laboratory/results";
      const parameters_ = new URLSearchParams();

      if (orderFilter) {
        parameters_.append("orderId", orderFilter);
      }

      if (parameters_.toString()) {
        url += `?${parameters_.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        let errorMessage = "Failed to fetch results";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }
      // FIX: Type the response data
      const data: ResultsApiResponse = await response.json();

      let fetchedResults: LabResult[] = data.results || [];

      // Filter by search text if provided
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        fetchedResults = fetchedResults.filter(
          (result) =>
            result.test_name?.toLowerCase().includes(searchLower) ||
            result.parameter_name?.toLowerCase().includes(searchLower) ||
            result.result_value?.toLowerCase().includes(searchLower)
        );
      }

      setResults(fetchedResults);
    } catch (error: unknown) {
      // FIX: Use unknown
      const messageText =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Error fetching results:", error);
      message.error(`Failed to load laboratory results: ${messageText}`);
    } finally {
      setLoading(false);
    }
  }, [orderFilter, searchText]);

  // Fetch orders for filter dropdown
  const fetchOrders = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/laboratory/orders");
      if (!response.ok) {
        let errorMessage = "Failed to fetch orders";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }
      // FIX: Type the response data
      const data: OrdersApiResponse = await response.json();
      setOrders(data.results || []);
    } catch (error: unknown) {
      // FIX: Use unknown
      const messageText =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Error fetching orders:", error);
      message.error(`Failed to load laboratory orders: ${messageText}`);
    }
  }, []);

  // Fetch order items for a specific order
  // const fetchOrderItems = async (orderId: string): Promise<void> => { // FIX: Removed unused function
  //   try {
  //     const response = await fetch(`/api/laboratory/orders/${orderId}/items`);
  //     if (!response.ok) {
  //       let errorMessage = "Failed to fetch order items";
  //       try {
  //         const errorData: ApiErrorResponse = await response.json();
  //         errorMessage = errorData.error || errorMessage;
  //       } catch {
  //         /* Ignore */
  //       }
  //       throw new Error(errorMessage);
  //     }
  //     // FIX: Type the response data
  //     const data: OrderItemsApiResponse = await response.json();
  //     setOrderItems(data.results || []);
  //   } catch (error: unknown) {
  //     // FIX: Use unknown
  //     const messageText =
  //       error instanceof Error ? error.message : "An unknown error occurred";
  //     console.error("Error fetching order items:", error);
  //     message.error(`Failed to load order items: ${messageText}`);
  //   }
  // };

  // Fetch parameters for a specific test
  // const fetchParameters = async (testId: string): Promise<void> => { // Removed unused function
  //   try {
  //     const response = await fetch(
  //       `/api/laboratory/tests/${testId}/parameters`
  //     );
  //     if (!response.ok) {
  //       let errorMessage = "Failed to fetch test parameters";
  //       try {
  //         const errorData: ApiErrorResponse = await response.json();
  //         errorMessage = errorData.error || errorMessage;
  //       } catch {
  //         /* Ignore */
  //       }
  //       throw new Error(errorMessage);
  //     }
  //     // FIX: Type the response data
  //     const data: ParametersApiResponse = await response.json();
  //     setParameters(data.results || []);
  //   } catch (error: unknown) {
  //     // FIX: Use unknown
  //     const messageText =
  //       error instanceof Error ? error.message : "An unknown error occurred";
  //     console.error("Error fetching test parameters:", error);
  //     message.error(`Failed to load test parameters: ${messageText}`);
  //   }
  // };

  // Load data on component mount
  useEffect(() => {
    fetchResults();
    fetchOrders();
  }, [fetchResults, fetchOrders]);

  // Reload results when filters change
  useEffect(() => {
    fetchResults();
  }, [orderFilter, searchText, fetchResults]); // Also refetch on search text change

  // Handle updating a result
  const handleUpdateResult = async (
    values: UpdateResultValues
  ): Promise<void> => {
    if (!selectedResult) return;
    try {
      const response = await fetch("/api/laboratory/results", {
        method: "POST", // Assuming POST handles updates via ID
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedResult.id,
          ...values,
        }),
      });

      if (!response.ok) {
        // FIX: Type the error response
        let errorMessage = "Failed to update result";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }

      message.success("Result updated successfully");
      setIsModalVisible(false);
      form.resetFields();
      fetchResults();
    } catch (error: unknown) {
      // FIX: Use unknown
      const messageText =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Error updating result:", error);
      message.error(messageText);
    }
  };

  // Handle creating a new result
  const handleCreateResult = async (
    values: CreateResultValues
  ): Promise<void> => {
    // if (!selectedOrderItem) return; // FIX: selectedOrderItem is not defined
    try {
      const response = await fetch("/api/laboratory/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // order_item_id: selectedOrderItem.id, // FIX: selectedOrderItem is not defined
          ...values,
        }),
      });

      if (!response.ok) {
        // FIX: Type the error response
        let errorMessage = "Failed to create result";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }

      message.success("Result created successfully");
      setIsEntryModalVisible(false);
      entryForm.resetFields();
      fetchResults();
    } catch (error: unknown) {
      // FIX: Use unknown
      const messageText =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Error creating result:", error);
      message.error(messageText);
    }
  };

  // Handle verifying a result
  const handleVerifyResult = async (result: LabResult): Promise<void> => {
    try {
      const response = await fetch("/api/laboratory/results", {
        method: "POST", // Assuming POST handles verification
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: result.id,
          verify: true,
        }),
      });

      if (!response.ok) {
        // FIX: Type the error response
        let errorMessage = "Failed to verify result";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }

      message.success("Result verified successfully");
      fetchResults();
    } catch (error: unknown) {
      // FIX: Use unknown
      const messageText =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Error verifying result:", error);
      message.error(messageText);
    }
  };

  // Show result entry modal
  // const showResultEntryModal = (orderItem: LabOrderItem): void => { // FIX: Removed unused function
  //   setSelectedOrderItem(orderItem);
  //   entryForm.resetFields();
  //   setParameters([]); // Reset parameters
  //
  //   // If the test has parameters, fetch them
  //   if (orderItem.test_id) {
  //     fetchParameters(orderItem.test_id);
  //   }
  //
  //   setIsEntryModalVisible(true);
  // };

  // Show result update modal
  const showResultUpdateModal = (result: LabResult): void => {
    setSelectedResult(result);
    form.setFieldsValue({
      result_value: result.result_value,
      is_abnormal: result.is_abnormal,
      notes: result.notes || "",
    });
    setIsModalVisible(true);
  };

  // Table columns
  const columns = [
    {
      title: "Test",
      dataIndex: "test_name",
      key: "test_name",
      width: "15%",
    },
    {
      title: "Parameter",
      dataIndex: "parameter_name",
      key: "parameter_name",
      width: "15%",
      render: (name: string | undefined) => name || "N/A",
    },
    {
      title: "Result",
      dataIndex: "result_value",
      key: "result_value",
      width: "15%",
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      width: "10%",
      render: (unit: string | undefined) => unit || "N/A",
    },
    {
      title: "Reference Range",
      key: "reference_range",
      width: "15%",
      render: (_: unknown, record: LabResult) => {
        // Simplified - in a real app, you'd use patient gender/age to determine which range to show
        return (
          record.reference_range_male || record.reference_range_female || "N/A"
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: "10%",
      render: (_: unknown, record: LabResult) => {
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
      title: "Performed By",
      dataIndex: "performed_by_name",
      key: "performed_by_name",
      width: "15%",
      render: (name: string | undefined) => name || "N/A",
    },
    {
      title: "Actions",
      key: "actions",
      width: "15%",
      render: (_: unknown, record: LabResult) => {
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

        return actions.length > 0 ? <>{actions}</> : "N/A";
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
              message.info(
                "Select an order/item to enter results for (feature pending)."
              );
            }}
          >
            Enter Results
          </Button>
        }
      >
        <div
          className="filter-container"
          style={{
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <Input
            placeholder="Search results..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchText(event.target.value)
            }
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
              (option?.children as unknown as string)
                ?.toLowerCase()
                .includes(input.toLowerCase()) ?? false
            }
          >
            {orders.map((order) => (
              <Option key={order.id} value={order.id}>
                Order #{order.id} - {order.patient_name}
              </Option>
            ))}
          </Select>

          <Button
            onClick={() => {
              setSearchText("");
              setOrderFilter(undefined);
              // fetchResults(); // fetchResults is called via useEffect
            }}
          >
            Reset Filters
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={results}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: loading
                ? "Loading results..."
                : "No laboratory results found matching criteria",
            }}
          />
        </Spin>
      </Card>
      {/* Result Update Modal */}
      <Modal
        title="Update Result"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            Update Result
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateResult}>
          <Form.Item
            name="result_value"
            label="Result Value"
            rules={[
              { required: true, message: "Please enter the result value" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="is_abnormal"
            valuePropName="checked"
            label="Is Abnormal?"
          >
            <Checkbox />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      {/* Result Entry Modal (Placeholder/Example) */}
      <Modal
         title={`Enter Result` /* FIX: Removed reference to undefined selectedOrderItem: for ${selectedOrderItem?.test_name} */}        visible={isEntryModalVisible}
        onCancel={() => setIsEntryModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsEntryModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => entryForm.submit()}
          >
            Save Result
          </Button>,
        ]}
      >
        <Form form={entryForm} layout="vertical" onFinish={handleCreateResult}>
          {/* FIX: Commented out parameters section as 'parameters' is not defined
          {parameters.length > 0 && (
            <Form.Item
              name="parameter_id"
              label="Parameter"
              rules={[{ required: true, message: "Please select a parameter" }]}
            >
              <Select placeholder="Select Parameter">
                {parameters.map((p: any) => ( // Added 'any' type temporarily if uncommented
                  <Option key={p.id} value={p.id}>
                    {p.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          */}
          <Form.Item
            name="result_value"
            label="Result Value"
            rules={[
              { required: true, message: "Please enter the result value" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="is_abnormal"
            valuePropName="checked"
            label="Is Abnormal?"
          >
            <Checkbox />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResultManagement;
