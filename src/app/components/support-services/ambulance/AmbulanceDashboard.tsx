'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, MapPinIcon, ClockIcon, AlertCircleIcon, CheckCircleIcon, TruckIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import AmbulanceMap from './AmbulanceMap';

export default function AmbulanceDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('active');
  const [ambulances, setAmbulances] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    vehicleType: '',
    tripType: '',
    priority: '',
  });

  useEffect(() => {
    fetchAmbulances();
    fetchTrips();
  }, [activeTab, filters]);

  const fetchAmbulances = async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'active' ? 
        'status=AVAILABLE&status=ON_DUTY' : 
        activeTab === 'maintenance' ? 
          'status=UNDER_MAINTENANCE' : '';
      
      const vehicleTypeFilter = filters.vehicleType ? `&vehicleType=${filters.vehicleType}` : '';
      
      const response = await fetch(`/api/support-services/ambulance?${statusFilter}${vehicleTypeFilter}&page=1&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setAmbulances(data.data);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch ambulances",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching ambulances:", error);
      toast({
        title: "Error",
        description: "Failed to fetch ambulances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      let statusFilter = '';
      if (activeTab === 'active') {
        statusFilter = 'status=SCHEDULED&status=EN_ROUTE_TO_PICKUP&status=ARRIVED_AT_PICKUP&status=EN_ROUTE_TO_DESTINATION&status=ARRIVED_AT_DESTINATION';
      } else if (activeTab === 'completed') {
        statusFilter = 'status=COMPLETED';
      } else if (activeTab === 'cancelled') {
        statusFilter = 'status=CANCELLED';
      }
      
      const tripTypeFilter = filters.tripType ? `&tripType=${filters.tripType}` : '';
      const priorityFilter = filters.priority ? `&priority=${filters.priority}` : '';
      
      const response = await fetch(`/api/support-services/ambulance/trips?${statusFilter}${tripTypeFilter}${priorityFilter}&page=1&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setTrips(data.data);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch trips",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast({
        title: "Error",
        description: "Failed to fetch trips",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTripStatus = async (tripId, newStatus) => {
    try {
      const response = await fetch(`/api/support-services/ambulance/trips/${tripId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Trip status updated to ${newStatus}`,
        });
        fetchTrips();
        fetchAmbulances();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update trip status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating trip status:", error);
      toast({
        title: "Error",
        description: "Failed to update trip status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-500';
      case 'ON_DUTY':
        return 'bg-blue-500';
      case 'UNDER_MAINTENANCE':
        return 'bg-yellow-500';
      case 'OUT_OF_SERVICE':
        return 'bg-red-500';
      case 'SCHEDULED':
        return 'bg-purple-500';
      case 'EN_ROUTE_TO_PICKUP':
        return 'bg-blue-500';
      case 'ARRIVED_AT_PICKUP':
        return 'bg-cyan-500';
      case 'EN_ROUTE_TO_DESTINATION':
        return 'bg-indigo-500';
      case 'ARRIVED_AT_DESTINATION':
        return 'bg-teal-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const renderAmbulanceDetails = () => {
    if (!selectedAmbulance) return null;
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Ambulance {selectedAmbulance.registrationNumber}</span>
            <Badge className={getStatusBadgeColor(selectedAmbulance.status)}>{selectedAmbulance.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Details</h3>
              <p><strong>Type:</strong> {selectedAmbulance.vehicleType.replace(/_/g, ' ')}</p>
              <p><strong>Capacity:</strong> {selectedAmbulance.capacity}</p>
              <p><strong>Features:</strong> {selectedAmbulance.features.join(', ')}</p>
              <p><strong>Last Maintenance:</strong> {selectedAmbulance.lastMaintenanceDate ? format(new Date(selectedAmbulance.lastMaintenanceDate), 'PPP') : 'N/A'}</p>
              <p><strong>Next Maintenance:</strong> {selectedAmbulance.nextMaintenanceDate ? format(new Date(selectedAmbulance.nextMaintenanceDate), 'PPP') : 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Current Crew</h3>
              {selectedAmbulance.crew && selectedAmbulance.crew.length > 0 ? (
                <ul className="space-y-2">
                  {selectedAmbulance.crew.map(member => (
                    <li key={member.id} className="flex items-center justify-between">
                      <span>{member.user.name}</span>
                      <Badge variant="outline">{member.role.replace(/_/g, ' ')}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No crew assigned</p>
              )}
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={() => router.push(`/support-services/ambulance/${selectedAmbulance.id}/crew`)}
                >
                  Manage Crew
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/support-services/ambulance/${selectedAmbulance.id}/maintenance`)}
                >
                  Schedule Maintenance
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Active Trips</h3>
            {selectedAmbulance._count?.trips > 0 ? (
              <div className="space-y-2">
                {trips
                  .filter(trip => trip.ambulanceId === selectedAmbulance.id && 
                    ['SCHEDULED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_DESTINATION', 'ARRIVED_AT_DESTINATION'].includes(trip.status))
                  .map(trip => (
                    <Card key={trip.id} className="p-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{trip.tripType.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-gray-500">
                            {trip.pickupLocation?.name} → {trip.dropLocation?.name}
                          </p>
                        </div>
                        <Badge className={getStatusBadgeColor(trip.status)}>{trip.status.replace(/_/g, ' ')}</Badge>
                      </div>
                    </Card>
                  ))
                }
              </div>
            ) : (
              <p>No active trips</p>
            )}
            
            <Button 
              className="mt-4 w-full"
              onClick={() => router.push('/support-services/ambulance/trips/new')}
            >
              Schedule New Trip
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTripDetails = () => {
    if (!selectedTrip) return null;
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>{selectedTrip.tripType.replace(/_/g, ' ')} Trip</span>
            <Badge className={getStatusBadgeColor(selectedTrip.status)}>{selectedTrip.status.replace(/_/g, ' ')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Trip Details</h3>
              <p><strong>Priority:</strong> <Badge className={getPriorityBadgeColor(selectedTrip.priority)}>{selectedTrip.priority}</Badge></p>
              <p><strong>Ambulance:</strong> {selectedTrip.ambulance?.registrationNumber}</p>
              <p><strong>Patient:</strong> {selectedTrip.patient?.name || 'N/A'}</p>
              <p><strong>Scheduled Time:</strong> {format(new Date(selectedTrip.scheduledTime), 'PPp')}</p>
              <p><strong>Requested By:</strong> {selectedTrip.requestedByUser?.name}</p>
              {selectedTrip.notes && <p><strong>Notes:</strong> {selectedTrip.notes}</p>}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Locations</h3>
              <p>
                <MapPinIcon className="inline-block mr-1 h-4 w-4" />
                <strong>Pickup:</strong> {selectedTrip.pickupLocation?.name || 'N/A'}
              </p>
              <p>
                <MapPinIcon className="inline-block mr-1 h-4 w-4" />
                <strong>Destination:</strong> {selectedTrip.dropLocation?.name || 'N/A'}
              </p>
              
              {selectedTrip.route && (
                <>
                  <p>
                    <ClockIcon className="inline-block mr-1 h-4 w-4" />
                    <strong>Est. Duration:</strong> {Math.round(selectedTrip.route.estimatedDuration / 60)} minutes
                  </p>
                  <p>
                    <TruckIcon className="inline-block mr-1 h-4 w-4" />
                    <strong>Est. Distance:</strong> {selectedTrip.route.estimatedDistance.toFixed(1)} km
                  </p>
                </>
              )}
            </div>
          </div>
          
          {selectedTrip.crew && selectedTrip.crew.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Assigned Crew</h3>
              <ul className="space-y-2">
                {selectedTrip.crew.map(member => (
                  <li key={member.id} className="flex items-center justify-between">
                    <span>{member.user.name}</span>
                    <Badge variant="outline">{member.role.replace(/_/g, ' ')}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {['SCHEDULED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_DESTINATION', 'ARRIVED_AT_DESTINATION'].includes(selectedTrip.status) && (
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold mb-2">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTrip.status === 'SCHEDULED' && (
                  <Button onClick={() => handleUpdateTripStatus(selectedTrip.id, 'EN_ROUTE_TO_PICKUP')}>
                    En Route to Pickup
                  </Button>
                )}
                {selectedTrip.status === 'EN_ROUTE_TO_PICKUP' && (
                  <Button onClick={() => handleUpdateTripStatus(selectedTrip.id, 'ARRIVED_AT_PICKUP')}>
                    Arrived at Pickup
                  </Button>
                )}
                {selectedTrip.status === 'ARRIVED_AT_PICKUP' && (
                  <Button onClick={() => handleUpdateTripStatus(selectedTrip.id, 'EN_ROUTE_TO_DESTINATION')}>
                    En Route to Destination
                  </Button>
                )}
                {selectedTrip.status === 'EN_ROUTE_TO_DESTINATION' && (
                  <Button onClick={() => handleUpdateTripStatus(selectedTrip.id, 'ARRIVED_AT_DESTINATION')}>
                    Arrived at Destination
                  </Button>
                )}
                {selectedTrip.status === 'ARRIVED_AT_DESTINATION' && (
                  <Button onClick={() => handleUpdateTripStatus(selectedTrip.id, 'COMPLETED')}>
                    Complete Trip
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  onClick={() => handleUpdateTripStatus(selectedTrip.id, 'CANCELLED')}
                >
                  Cancel Trip
                </Button>
              </div>
            </div>
          )}
          
          {selectedTrip.pickupLocation && selectedTrip.dropLocation && (
            <div className="mt-6 h-64">
              <h3 className="font-semibold mb-2">Route Map</h3>
              <AmbulanceMap 
                pickupLocation={selectedTrip.pickupLocation}
                dropLocation={selectedTrip.dropLocation}
                ambulanceLocation={selectedTrip.ambulance?.currentLocation}
                routeData={selectedTrip.route?.routeData}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Ambulance Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/support-services/ambulance/new')}>
            Add New Ambulance
          </Button>
          <Button onClick={() => router.push('/support-services/ambulance/trips/new')}>
            Schedule Trip
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="ambulances" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ambulances">Ambulances</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ambulances">
          <Card>
            <CardHeader>
              <CardTitle>Ambulance Fleet</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={activeTab === 'active' ? 'default' : 'outline'} 
                  onClick={() => setActiveTab('active')}
                >
                  Active
                </Button>
                <Button 
                  variant={activeTab === 'maintenance' ? 'default' : 'outline'} 
                  onClick={() => setActiveTab('maintenance')}
                >
                  Under Maintenance
                </Button>
                <Button 
                  variant={activeTab === 'all' ? 'default' : 'outline'} 
                  onClick={() => setActiveTab('all')}
                >
                  All
                </Button>
                
                <div className="ml-auto flex gap-2">
                  <Select 
                    value={filters.vehicleType} 
                    onValueChange={(value) => setFilters({...filters, vehicleType: value})}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Vehicle Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="BASIC_LIFE_SUPPORT">Basic Life Support</SelectItem>
                      <SelectItem value="ADVANCED_LIFE_SUPPORT">Advanced Life Support</SelectItem>
                      <SelectItem value="PATIENT_TRANSPORT">Patient Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Crew</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ambulances.length > 0 ? (
                      ambulances.map((ambulance) => (
                        <TableRow 
                          key={ambulance.id}
                          className={cn(selectedAmbulance?.id === ambulance.id && "bg-muted")}
                        >
                          <TableCell>{ambulance.registrationNumber}</TableCell>
                          <TableCell>{ambulance.vehicleType.replace(/_/g, ' ')}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(ambulance.status)}>
                              {ambulance.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{ambulance.crew?.length || 0}</TableCell>
                          <TableCell>{ambulance.currentLocation?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedAmbulance(selectedAmbulance?.id === ambulance.id ? null : ambulance)}
                            >
                              {selectedAmbulance?.id === ambulance.id ? 'Hide Details' : 'View Details'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No ambulances found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {renderAmbulanceDetails()}
        </TabsContent>
        
        <TabsContent value="trips">
          <Card>
            <CardHeader>
              <CardTitle>Ambulance Trips</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={activeTab === 'active' ? 'default' : 'outline'} 
                  onClick={() => setActiveTab('active')}
                >
                  Active
                </Button>
                <Button 
                  variant={activeTab === 'completed' ? 'default' : 'outline'} 
                  onClick={() => setActiveTab('completed')}
                >
                  Completed
                </Button>
                <Button 
                  variant={activeTab === 'cancelled' ? 'default' : 'outline'} 
                  onClick={() => setActiveTab('cancelled')}
                >
                  Cancelled
                </Button>
                <Button 
                  variant={activeTab === 'all' ? 'default' : 'outline'} 
                  onClick={() => setActiveTab('all')}
                >
                  All
                </Button>
                
                <div className="ml-auto flex gap-2">
                  <Select 
                    value={filters.tripType} 
                    onValueChange={(value) => setFilters({...filters, tripType: value})}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Trip Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                      <SelectItem value="NON_EMERGENCY">Non-Emergency</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                      <SelectItem value="RETURN">Return</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={filters.priority} 
                    onValueChange={(value) => setFilters({...filters, priority: value})}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Priorities</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ambulance</TableHead>
                      <TableHead>Scheduled Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.length > 0 ? (
                      trips.map((trip) => (
                        <TableRow 
                          key={trip.id}
                          className={cn(selectedTrip?.id === trip.id && "bg-muted")}
                        >
                          <TableCell>{trip.tripType.replace(/_/g, ' ')}</TableCell>
                          <TableCell>
                            <Badge className={getPriorityBadgeColor(trip.priority)}>
                              {trip.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(trip.status)}>
                              {trip.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{trip.ambulance?.registrationNumber}</TableCell>
                          <TableCell>{format(new Date(trip.scheduledTime), 'PPp')}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
                            >
                              {selectedTrip?.id === trip.id ? 'Hide Details' : 'View Details'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No trips found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {renderTripDetails()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
