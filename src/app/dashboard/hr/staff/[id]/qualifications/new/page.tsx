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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Save, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/components/ui/use-toast';

// Form schema for qualification
const qualificationSchema = z.object({
  code: z.string().min(1, "Qualification code is required"),
  name: z.string().min(1, "Qualification name is required"),
  issuer: z.string().optional(),
  identifier: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  attachment: z.string().optional(),
});

export default function AddQualification({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState(null);

  // Initialize form
  const form = useForm({
    resolver: zodResolver(qualificationSchema),
    defaultValues: {
      code: '',
      name: '',
      issuer: '',
      identifier: '',
      startDate: new Date(),
      endDate: undefined,
      attachment: '',
    },
  });

  // Fetch employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`/api/hr/staff/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setEmployee(data);
        }
      } catch (err) {
        console.error('Error fetching employee:', err);
        toast({
          title: "Error",
          description: "Failed to load employee data",
          variant: "destructive",
        });
      }
    };
    
    fetchEmployee();
  }, [params.id]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Format dates for API
      const formattedData = {
        ...data,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: data.endDate ? format(data.endDate, 'yyyy-MM-dd') : undefined,
      };
      
      const response = await fetch(`/api/hr/staff/${params.id}/qualifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add qualification');
      }
      
      toast({
        title: "Qualification Added",
        description: "Successfully added qualification to employee record",
      });
      
      // Navigate back to employee profile
      router.push(`/dashboard/hr/staff/${params.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/dashboard/hr/staff/${params.id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employee Profile
        </Button>
      </div>
      
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Add Qualification</h1>
        <p className="text-muted-foreground">
          {employee ? `Add a qualification for ${employee.firstName} ${employee.lastName}` : 'Add a qualification to employee record'}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Qualification Details</CardTitle>
          <CardDescription>
            Enter the qualification or certification details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Registered Nurse, ACLS Certification" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of the qualification or certification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification Code*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., RN, ACLS" {...field} />
                      </FormControl>
                      <FormDescription>
                        A code or abbreviation for the qualification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="issuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuing Organization</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., American Heart Association" {...field} />
                      </FormControl>
                      <FormDescription>
                        The organization that issued the qualification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License/Certificate Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., RN12345" {...field} />
                      </FormControl>
                      <FormDescription>
                        The unique identifier for this qualification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issue Date*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the qualification was issued
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>No expiry date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Leave blank if the qualification does not expire
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="attachment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/certificate.pdf" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL to the certificate document (if available)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push(`/dashboard/hr/staff/${params.id}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Add Qualification'}
                  {!loading && <Save className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
