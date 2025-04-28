'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Badge, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui';

const BedManagementDashboard = () => {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterWard, setFilterWard] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Define ward options
  const wardOptions = ['All', 'General Ward', 'Semi-Private', 'Private', 'Intensive Care'];
  
  // Define category options
  const categoryOptions = ['All', 'general', 'semi-private', 'private', 'icu'];
  
  // Define status options
  const statusOptions = ['All', 'available', 'occupied', 'reserved', 'maintenance'];

  useEffect(() => {
    const fetchBeds = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (filterWard && filterWard !== 'All') params.append('ward', filterWard);
        if (filterCategory && filterCategory !== 'All') params.append('category', filterCategory);
        if (filterStatus && filterStatus !== 'All') params.append('status', filterStatus);
        
        const response = await fetch(`/api/ipd/beds?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch beds');
        }
        
        const data = await response.json();
        setBeds(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching beds:', err);
        setError('Failed to load beds. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBeds();
  }, [filterWard, filterCategory, filterStatus]);

  // Get bed status color
  const getBedStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'occupied':
        return 'destructive';
      case 'reserved':
        return 'secondary';
      case 'maintenance':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Ward</label>
          <select 
            className="h-10 rounded-md border border-gray-300 px-3"
            value={filterWard}
            onChange={(e) => setFilterWard(e.target.value)}
          >
            {wardOptions.map(ward => (
              <option key={ward} value={ward === 'All' ? '' : ward}>{ward}</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Category</label>
          <select 
            className="h-10 rounded-md border border-gray-300 px-3"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categoryOptions.map(category => (
              <option key={category} value={category === 'All' ? '' : category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Status</label>
          <select 
            className="h-10 rounded-md border border-gray-300 px-3"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {statusOptions.map(status => (
              <option key={status} value={status === 'All' ? '' : status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{beds.filter(bed => bed.status === 'available').length}</div>
            <div className="text-sm text-gray-500">Available Beds</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{beds.filter(bed => bed.status === 'occupied').length}</div>
            <div className="text-sm text-gray-500">Occupied Beds</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{beds.filter(bed => bed.status === 'reserved').length}</div>
            <div className="text-sm text-gray-500">Reserved Beds</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{beds.filter(bed => bed.status === 'maintenance').length}</div>
            <div className="text-sm text-gray-500">Under Maintenance</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 text-center">{error}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bed Number</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price/Day</TableHead>
              <TableHead>Features</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">No beds found</TableCell>
              </TableRow>
            ) : (
              beds.map((bed) => (
                <TableRow key={bed.id}>
                  <TableCell>{bed.bed_number}</TableCell>
                  <TableCell>{bed.room_number}</TableCell>
                  <TableCell>{bed.ward}</TableCell>
                  <TableCell>{bed.category}</TableCell>
                  <TableCell>
                    <Badge variant={getBedStatusColor(bed.status)}>
                      {bed.status}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{bed.price_per_day.toFixed(2)}</TableCell>
                  <TableCell>
                    {bed.features ? bed.features.split(',').map(feature => (
                      <Badge key={feature} variant="outline" className="mr-1">
                        {feature.trim()}
                      </Badge>
                    )) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="mr-2">
                      View
                    </Button>
                    {bed.status === 'available' && (
                      <Button size="sm" variant="default">
                        Assign
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default BedManagementDashboard;
