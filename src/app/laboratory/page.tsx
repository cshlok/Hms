import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import TestCatalogManagement from '@/components/laboratory/TestCatalogManagement';
import OrderManagement from '@/components/laboratory/OrderManagement';
import SampleManagement from '@/components/laboratory/SampleManagement';
import ResultManagement from '@/components/laboratory/ResultManagement';

const { TabPane } = Tabs;

export default function LaboratoryPage() {
  const [activeTab, setActiveTab] = useState('1');

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  return (
    <div className="laboratory-container">
      <Card title="Laboratory Management System" className="laboratory-card">
        <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
          <TabPane tab="Test Catalog" key="1">
            <TestCatalogManagement />
          </TabPane>
          <TabPane tab="Orders" key="2">
            <OrderManagement />
          </TabPane>
          <TabPane tab="Sample Management" key="3">
            <SampleManagement />
          </TabPane>
          <TabPane tab="Results" key="4">
            <ResultManagement />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
