'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Edit, 
  Trash,
  Package, 
  Calendar, 
  Building,
  User,
  MapPin,
  Tag,
  AlertTriangle,
  Wrench,
  Clock,
  DollarSign,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function AssetDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch asset data
  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hr/assets/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Asset not found');
          }
          throw new Error('Failed to fetch asset data');
        }
        
        const data = await response.json();
        setAsset(data);
      } catch (err) {
        setError(err.message);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAsset();
  }, [params.id]);

  // Handle edit navigation
  const handleEdit = () => {
    router.push(`/dashboard/hr/assets/${params.id}/edit`);
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/hr/assets/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }
      
      toast({
        title: "Success",
        description: "Asset has been deleted",
      });
      
      router.push('/dashboard/hr/assets');
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Handle maintenance record
  const handleAddMaintenance = () => {
    router.push(`/dashboard/hr/assets/${params.id}/maintenance/new`);
  };

  // Handle asset transfer
  const handleTransfer = () => {
    router.push(`/dashboard/hr/assets/${params.id}/transfer`);
  };

  // Handle asset assignment
  const handleAssign = () => {
    router.push(`/dashboard/hr/assets/${params.id}/assign`);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'default';
      case 'IN_USE':
        return 'secondary';
      case 'UNDER_MAINTENANCE':
        return 'warning';
      case 'DISPOSED':
        return 'destructive';
      case 'LOST':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date or show placeholder
  const formatDateOrPlaceholder = (date) => {
    return date ? format(new Date(date), 'PPP') : '—';
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/hr/assets')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </div>
        <div className="flex justify-center items-center h-64">
          <p>Loading asset data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/hr/assets')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/dashboard/hr/assets')}
            >
              Return to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/dashboard/hr/assets')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assets
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {asset.name}
          </h1>
          <p className="text-muted-foreground">
            {asset.serialNumber ? `Serial: ${asset.serialNumber}` : 'No serial number'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this asset? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Asset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                  
                  <h3 className="text-xl font-semibold">
                    {asset.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {asset.serialNumber || 'No serial number'}
                  </p>
                  
                  <Badge variant={getStatusBadgeVariant(asset.status)} className="mb-2">
                    {asset.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Asset Type</p>
                      <p className="font-medium">{asset.assetType}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium">{asset.department?.name || 'Not Assigned'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{asset.location || 'Not Specified'}</p>
                    </div>
                  </div>
                  
                  {asset.assignedTo && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Assigned To</p>
                        <p className="font-medium">{asset.assignedTo.firstName} {asset.assignedTo.lastName}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex flex-col gap-2">
                  <Button onClick={handleAddMaintenance}>
                    <Wrench className="h-4 w-4 mr-2" />
                    Record Maintenance
                  </Button>
                  
                  <Button variant="outline" onClick={handleTransfer}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Transfer Asset
                  </Button>
                  
                  <Button variant="outline" onClick={handleAssign}>
                    <User className="h-4 w-4 mr-2" />
                    {asset.assignedTo ? 'Reassign Asset' : 'Assign Asset'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Asset Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Manufacturer</p>
                    <p className="font-medium">{asset.manufacturer || '—'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{asset.model || '—'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">{formatDateOrPlaceholder(asset.purchaseDate)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Purchase Price</p>
                    <p className="font-medium">{formatCurrency(asset.purchasePrice)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Warranty Expiry</p>
                    <p className="font-medium">{formatDateOrPlaceholder(asset.warrantyExpiryDate)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Last Maintenance</p>
                    <p className="font-medium">{formatDateOrPlaceholder(asset.lastMaintenanceDate)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Next Maintenance</p>
                    <p className="font-medium">{formatDateOrPlaceholder(asset.nextMaintenanceDate)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Created On</p>
                    <p className="font-medium">{formatDateOrPlaceholder(asset.createdAt)}</p>
                  </div>
                </div>
                
                {asset.tags && asset.tags.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {asset.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {asset.notes && (
                  <>
                    <Separator className="my-6" />
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <div className="p-4 bg-muted rounded-md">
                        <p className="whitespace-pre-line">{asset.notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset History</CardTitle>
              <CardDescription>
                Track changes and events related to this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!asset.assetHistory || asset.assetHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p>No history records found for this asset.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Performed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {asset.assetHistory.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell>
                            {format(new Date(history.date), 'PPP p')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {history.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {history.type === 'TRANSFER' && (
                              <span>
                                Transferred from {history.details.previousLocation || 'Unknown'} to {history.details.newLocation}
                              </span>
                            )}
                            {history.type === 'ASSIGNMENT' && (
                              <span>
                                Assigned to {history.employee?.firstName} {history.employee?.lastName}
                              </span>
                            )}
                            {history.type === 'UNASSIGNMENT' && (
                              <span>
                                Unassigned from employee
                              </span>
                            )}
                            {history.type === 'MAINTENANCE' && (
                              <span>
                                {history.details.maintenanceType} maintenance: {history.details.description}
                              </span>
                            )}
                            {history.type === 'DISPOSAL' && (
                              <span>
                                Disposed via {history.details.disposalMethod}: {history.details.reason}
                              </span>
                            )}
                            {history.type === 'STATUS_CHANGE' && (
                              <span>
                                Status changed from {history.details.previousStatus} to {history.details.newStatus}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {history.employee ? (
                              <span>{history.employee.firstName} {history.employee.lastName}</span>
                            ) : (
                              <span>System</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Maintenance Records</CardTitle>
                  <CardDescription>
                    View and manage maintenance history
                  </CardDescription>
                </div>
                <Button onClick={handleAddMaintenance}>
                  <Wrench className="h-4 w-4 mr-2" />
                  Record Maintenance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!asset.maintenanceRecords || asset.maintenanceRecords.length === 0 ? (
                <div className="text-center py-4">
                  <p>No maintenance records found for this asset.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Next Maintenance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {asset.maintenanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {format(new Date(record.date), 'PPP')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {record.maintenanceType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.performedBy || '—'}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(record.cost)}
                          </TableCell>
                          <TableCell>
                            {formatDateOrPlaceholder(record.nextMaintenanceDate)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/assets/${asset.id}/maintenance/${record.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
