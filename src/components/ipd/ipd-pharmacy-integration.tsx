"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Spin,
  message,
  Modal,
  Form,
  Tag,
  Checkbox,
  // notification, // Removed unused import
} from "antd";
import {
  // SearchOutlined, // Removed unused import
  // CheckOutlined, // Removed unused import
  // EditOutlined, // Removed unused import
  // SyncOutlined, // Removed unused import
  // WarningOutlined, // Removed unused import
} from "@ant-design/icons";
import dayjs from "dayjs";
// import { useSession } from "next-auth/react"; // Removed unused import
import { IPDPrescription, IPDPrescriptionItem } from "@/types/ipd";
import { MedicationAdministrationRecord } from "@/types/pharmacy";
import { AdminRecordsApiResponse, ApiErrorResponse } from "@/types/api"; // Import API response types

// const { Option } = Select; // Removed unused variable assignment

interface IPDPharmacyIntegrationProperties {
  admissionId: string;
  prescriptions: IPDPrescription[];
}

interface MedicationScheduleItem {
  id: string; // Unique ID for the schedule item (e.g., prescriptionItemId + time)
  prescriptionItemId: string;
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  scheduledTime: string; // ISO 8601 format
  status: "Pending" | "Administered" | "Missed" | "Refused";
  administrationRecordId?: string;
}

// FIX: Prefix unused variables with underscore
const IPDPharmacyIntegration: React.FC<IPDPharmacyIntegrationProperties> = ({
  admissionId,
  prescriptions,
}) => {
  // const { data: session } = useSession(); // Removed unused variable
  const [_loading, _setLoading] = useState<boolean>(false); // FIX: Unused variable
  const [_medicationSchedule, _setMedicationSchedule] = useState< // FIX: Unused variable
    MedicationScheduleItem[]
  >([]);
   
  const [_administrationRecords, _setAdministrationRecords] = useState<
    MedicationAdministrationRecord[]
  >([]);
   
  const [_error, _setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [selectedScheduleItem, setSelectedScheduleItem] =
    useState<MedicationScheduleItem | null>(null);
  const [form] = Form.useForm();

  // Generate medication schedule based on prescriptions
  const generateSchedule = useCallback(() => {
    const schedule: MedicationScheduleItem[] = [];
    const now = dayjs(); // Use dayjs for date manipulation

    prescriptions.forEach((prescription) => {
      prescription.items.forEach((item: IPDPrescriptionItem) => {
        // Basic frequency parsing (needs improvement for complex schedules)
        let timesPerDay = 1;
        if (item.frequency?.toLowerCase().includes("bd")) timesPerDay = 2;
        if (item.frequency?.toLowerCase().includes("tds")) timesPerDay = 3;
        if (item.frequency?.toLowerCase().includes("qid")) timesPerDay = 4;
        // Add more frequency parsing logic (e.g., q4h, q6h, specific times)

        const intervalHours = 24 / timesPerDay;
        let administrationTime = dayjs(prescription.start_date); // Start from prescription start date

        // Find the first administration time today or in the future
        while (administrationTime.isBefore(now, "day")) {
          administrationTime = administrationTime.add(1, "day"); // Move to today if start date is past
        }
        // Set a default start time if needed (e.g., 8 AM)
        administrationTime = administrationTime.hour(8).minute(0).second(0);

        // Generate schedule items for the next 24 hours (or desired window)
        const scheduleEndDate = now.add(1, "day");
        while (administrationTime.isBefore(scheduleEndDate)) {
          if (administrationTime.isAfter(now)) {
            // Only schedule future administrations
            schedule.push({
              id: `${item.id}-${administrationTime.toISOString()}`,
              prescriptionItemId: item.id,
              medicationName: item.medication_name,
              dosage: item.dosage,
              route: item.route,
              frequency: item.frequency,
              scheduledTime: administrationTime.toISOString(),
              status: "Pending",
            });
          }
          administrationTime = administrationTime.add(intervalHours, "hour");
        }
      });
    });

    // Sort schedule by time
    schedule.sort((alpha, beta) =>
      dayjs(alpha.scheduledTime).diff(dayjs(beta.scheduledTime))
    );
    _setMedicationSchedule(schedule);
  }, [prescriptions]);

  // Fetch administration records
  const fetchAdministrationRecords = useCallback(async () => {
    _setLoading(true);
    _setError(null);
    try {
      const response = await fetch(
        `/api/pharmacy/administration-records?admissionId=${admissionId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch administration records");
      }
      const data: AdminRecordsApiResponse = await response.json();
      _setAdministrationRecords(data.records || []);

      // Update schedule status based on fetched records
      _setMedicationSchedule((currentSchedule) =>
        currentSchedule.map((item) => {
          const record = data.records?.find(
            (r: MedicationAdministrationRecord) =>
              r.prescription_item_id === item.prescriptionItemId &&
              dayjs(r.administration_time).isSame(item.scheduledTime)
          );
          if (record) {
            return {
              ...item,
              status: record.status,
              administrationRecordId: record.id,
            };
          }
          return item;
        })
      );
    } catch (err) {
      const message_ =
        err instanceof Error ? err.message : "An unknown error occurred";
      _setError(message_);
      message.error(`Error fetching records: ${message_}`);
    } finally {
      _setLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    generateSchedule();
    fetchAdministrationRecords();
  }, [generateSchedule, fetchAdministrationRecords]);

  // FIX: Prefix unused function with underscore
  const _handleAdministerMedication = async (
    scheduleItemId: string,
    status: "Administered" | "Missed" | "Refused",
    notes?: string
  ) => {
    const itemToAdminister = _medicationSchedule.find(
      (item) => item.id === scheduleItemId
    );
    if (!itemToAdminister) {
      message.error("Schedule item not found");
      return;
    }

    _setLoading(true);
    try {
      const response = await fetch("/api/pharmacy/administration-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admission_id: admissionId,
          prescription_item_id: itemToAdminister.prescriptionItemId,
          medication_name: itemToAdminister.medicationName,
          dosage: itemToAdminister.dosage,
          route: itemToAdminister.route,
          scheduled_time: itemToAdminister.scheduledTime,
          administration_time: dayjs().toISOString(), // Record actual time
          status,
          administered_by_id: "user_placeholder", // Replace with actual user ID from session
          notes,
        }),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        throw new Error(errorData.error || "Failed to record administration");
      }

      message.success(`Medication marked as ${status}`);
      fetchAdministrationRecords(); // Refresh records and schedule status
      setIsModalVisible(false);
      form.resetFields();
    } catch (err) {
      const message_ =
        err instanceof Error ? err.message : "An unknown error occurred";
      message.error(`Error recording administration: ${message_}`);
    } finally {
      _setLoading(false);
    }
  };

  // Removed unused function _getDosageForScheduleItem

  const showAdministrationModal = (item: MedicationScheduleItem) => {
    setSelectedScheduleItem(item);
    form.setFieldsValue({ notes: "" }); // Reset notes field
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form
      .validateFields()
      .then((values) => {
        if (!selectedScheduleItem) return;

        // Determine status based on which button was implicitly clicked (needs better state management)
        // This is a simplification. A real app might have separate handlers or pass status explicitly.
        const status = values.administered
          ? "Administered"
          : values.refused
          ? "Refused"
          : "Missed"; // Default or based on another field if needed

        _handleAdministerMedication(
          selectedScheduleItem.id,
          status,
          values.notes
        );
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setSelectedScheduleItem(null);
  };

  const columns = [
    {
      title: "Time",
      dataIndex: "scheduledTime",
      key: "time",
      render: (time: string) => dayjs(time).format("HH:mm"),
      sorter: (a: MedicationScheduleItem, b: MedicationScheduleItem) =>
        dayjs(a.scheduledTime).diff(dayjs(b.scheduledTime)),
      defaultSortOrder: "ascend" as const,
    },
    {
      title: "Medication",
      dataIndex: "medicationName",
      key: "medicationName",
    },
    {
      title: "Dosage",
      dataIndex: "dosage",
      key: "dosage",
      // render: (_: unknown, record: MedicationScheduleItem) => getDosageForScheduleItem(record.prescriptionItemId), // Reference removed
    },
    {
      title: "Route",
      dataIndex: "route",
      key: "route",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "default";
        if (status === "Administered") color = "success";
        else if (status === "Missed") color = "warning";
        else if (status === "Refused") color = "error";
        else if (status === "Pending") color = "processing";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: MedicationScheduleItem) => {
        if (record.status === "Pending") {
          return (
            <Button type="primary" onClick={() => showAdministrationModal(record)}>
              Administer
            </Button>
          );
        } else if (record.administrationRecordId) {
          // Optionally show details or edit action for recorded administrations
          return (
            <Button
              type="link"
              onClick={() =>
                message.info(
                  `Record ID: ${record.administrationRecordId} (Details view pending)`
                )
              }
            >
              View Record
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <Card title="Medication Administration Schedule (Next 24h)">
      <Spin spinning={_loading}>
        <Table
          columns={columns}
          dataSource={_medicationSchedule}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Spin>

      <Modal
        title={`Administer: ${selectedScheduleItem?.medicationName}`}
        visible={isModalVisible}
        onOk={handleModalOk} // This might need refinement based on button actions
        onCancel={handleModalCancel}
        footer={[
          <Button key="cancel" onClick={handleModalCancel}>
            Cancel
          </Button>,
          <Button
            key="refused"
            onClick={() => {
              form.setFieldsValue({ refused: true, administered: false });
              handleModalOk(); // Trigger submission with 'Refused' state
            }}
          >
            Mark as Refused
          </Button>,
          <Button
            key="missed"
            onClick={() => {
              form.setFieldsValue({ missed: true, administered: false }); // Assuming a 'missed' field or logic
              handleModalOk(); // Trigger submission with 'Missed' state
            }}
          >
            Mark as Missed
          </Button>,
          <Button
            key="administered"
            type="primary"
            onClick={() => {
              form.setFieldsValue({ administered: true, refused: false });
              handleModalOk(); // Trigger submission with 'Administered' state
            }}
          >
            Mark as Administered
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" name="administration_form">
          <p>
            <strong>Time:</strong>{" "}
            {selectedScheduleItem &&
              dayjs(selectedScheduleItem.scheduledTime).format("YYYY-MM-DD HH:mm")}
          </p>
          <p>
            <strong>Dosage:</strong> {selectedScheduleItem?.dosage}
          </p>
          <p>
            <strong>Route:</strong> {selectedScheduleItem?.route}
          </p>
          <Form.Item name="notes" label="Administration Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          {/* Hidden fields to track button press - not ideal, consider state */}
          <Form.Item name="administered" hidden initialValue={false}>
            <Checkbox />
          </Form.Item>
          <Form.Item name="refused" hidden initialValue={false}>
            <Checkbox />
          </Form.Item>
          <Form.Item name="missed" hidden initialValue={false}>
            <Checkbox />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default IPDPharmacyIntegration;
