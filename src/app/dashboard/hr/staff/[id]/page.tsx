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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  UserCog, 
  Award, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Briefcase,
  Plus,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function EmployeeProfile({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hr/staff/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Employee not found');
          }
          throw new Error('Failed to fetch employee data');
        }
        
        const data = await response.json();
        setEmployee(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployee();
  }, [params.id]);

  // Handle employee deletion (soft delete)
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/hr/staff/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }
      
      toast({
        title: "Employee Deactivated",
        description: "The employee has been successfully deactivated.",
      });
      
      // Navigate back to staff list
      router.push('/dashboard/hr/staff');
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Handle edit navigation
  const handleEdit = () => {
    router.push(`/dashboard/hr/staff/${params.id}/edit`);
  };

  // Handle add position
  const handleAddPosition = () => {
    router.push(`/dashboard/hr/staff/${params.id}/positions/new`);
  };

  // Handle add qualification
  const handleAddQualification = () => {
    router.push(`/dashboard/hr/staff/${params.id}/qualifications/new`);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/hr/staff')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Staff List
          </Button>
        </div>
        <div className="flex justify-center items-center h-64">
          <p>Loading employee data...</p>
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
            onClick={() => router.push('/dashboard/hr/staff')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Staff List
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/dashboard/hr/staff')}
            >
              Return to Staff List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/dashboard/hr/staff')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Staff List
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-muted-foreground">
            Employee ID: {employee.employeeId}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deactivate Employee</DialogTitle>
                <DialogDescription>
                  Are you sure you want to deactivate this employee? This will mark the employee as inactive but preserve all records.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deactivating...' : 'Deactivate Employee'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Employee Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4">
                {employee.photo ? (
                  <img 
                    src={employee.photo} 
                    alt={`${employee.firstName} ${employee.lastName}`} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserCog className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              
              <Badge variant={employee.active ? "success" : "destructive"} className="mb-2">
                {employee.active ? 'Active' : 'Inactive'}
              </Badge>
              
              {employee.department && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{employee.department.name}</p>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{format(new Date(employee.joiningDate), 'PPP')}</p>
                </div>
              </div>
              
              {employee.terminationDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Terminated</p>
                    <p className="font-medium">{format(new Date(employee.terminationDate), 'PPP')}</p>
                  </div>
                </div>
              )}
              
              {employee.birthDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{format(new Date(employee.birthDate), 'PPP')}</p>
                  </div>
                </div>
              )}
              
              {employee.gender && (
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{employee.gender.charAt(0) + employee.gender.slice(1).toLowerCase()}</p>
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              {employee.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{employee.email}</p>
                  </div>
                </div>
              )}
              
              {employee.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{employee.phone}</p>
                  </div>
                </div>
              )}
              
              {employee.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {employee.address.line && employee.address.line[0]}{' '}
                      {employee.address.city && employee.address.city}{' '}
                      {employee.address.state && employee.address.state}{' '}
                      {employee.address.postalCode && employee.address.postalCode}{' '}
                      {employee.address.country && employee.address.country}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-3">
          <Tabs defaultValue="positions">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Employee Details</CardTitle>
                <TabsList>
                  <TabsTrigger value="positions">Positions</TabsTrigger>
                  <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
                  <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="positions" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Positions & Roles</h3>
                  <Button size="sm" onClick={handleAddPosition}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Position
                  </Button>
                </div>
                
                {employee.positions && employee.positions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.positions.map((position) => (
                        <TableRow key={position.id}>
                          <TableCell className="font-medium">
                            {position.position.title}
                            {position.isPrimary && (
                              <Badge variant="outline" className="ml-2">Primary</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {position.position.department?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(position.startDate), 'PP')}
                          </TableCell>
                          <TableCell>
                            {position.endDate ? format(new Date(position.endDate), 'PP') : 'Current'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={position.endDate ? "outline" : "default"}>
                              {position.endDate ? 'Past' : 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/staff/${params.id}/positions/${position.id}`)}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 border rounded-md bg-muted/20">
                    <p className="text-muted-foreground">No positions assigned yet</p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={handleAddPosition}
                    >
                      Assign a position
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="qualifications" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Qualifications & Certifications</h3>
                  <Button size="sm" onClick={handleAddQualification}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Qualification
                  </Button>
                </div>
                
                {employee.qualifications && employee.qualifications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Qualification</TableHead>
                        <TableHead>Issuer</TableHead>
                        <TableHead>Identifier</TableHead>
                        <TableHead>Valid From</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.qualifications.map((qualification) => (
                        <TableRow key={qualification.id}>
                          <TableCell className="font-medium">
                            {qualification.name}
                          </TableCell>
                          <TableCell>
                            {qualification.issuer || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {qualification.identifier || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(qualification.startDate), 'PP')}
                          </TableCell>
                          <TableCell>
                            {qualification.endDate ? format(new Date(qualification.endDate), 'PP') : 'No Expiry'}
                          </TableCell>
                          <TableCell>
                            {qualification.endDate ? (
                              new Date(qualification.endDate) < new Date() ? (
                                <Badge variant="destructive">Expired</Badge>
                              ) : (
                                <Badge variant="default">Valid</Badge>
                              )
                            ) : (
                              <Badge variant="default">Valid</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/staff/${params.id}/qualifications/${qualification.id}`)}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 border rounded-md bg-muted/20">
                    <p className="text-muted-foreground">No qualifications added yet</p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={handleAddQualification}
                    >
                      Add a qualification
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="emergency">
                <Card>
                  <CardHeader>
                    <CardTitle>Emergency Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {employee.emergencyContact ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">{employee.emergencyContact.name || 'Not provided'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Relationship</p>
                            <p className="font-medium">{employee.emergencyContact.relationship || 'Not provided'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{employee.emergencyContact.phone || 'Not provided'}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{employee.emergencyContact.email || 'Not provided'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">No emergency contact information provided</p>
                        <Button 
                          variant="link" 
                          className="mt-2"
                          onClick={handleEdit}
                        >
                          Add emergency contact
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
