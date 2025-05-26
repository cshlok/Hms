'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileUploader } from '@/components/shared/FileUploader';

// Form schema
const complaintFormSchema = z.object({
  title: z.string().min(5, {
    message: "Title must be at least 5 characters",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters",
  }),
  category: z.string({
    required_error: "Please select a complaint category",
  }),
  severity: z.string({
    required_error: "Please select a severity level",
  }),
  departmentId: z.string().optional(),
  anonymous: z.boolean().default(false),
  contactInfo: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

type ComplaintFormValues = z.infer<typeof complaintFormSchema>;

interface ComplaintFormProps {
  departments?: { id: string; name: string }[];
  onSuccess?: (data: any) => void;
  defaultValues?: Partial<ComplaintFormValues>;
}

export default function ComplaintForm({ departments = [], onSuccess, defaultValues }: ComplaintFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formValues, setFormValues] = useState<ComplaintFormValues | null>(null);

  // Initialize form
  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintFormSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      description: defaultValues?.description || '',
      category: defaultValues?.category || '',
      severity: defaultValues?.severity || '',
      departmentId: defaultValues?.departmentId || '',
      anonymous: defaultValues?.anonymous || false,
      contactInfo: defaultValues?.contactInfo || {
        name: '',
        email: '',
        phone: '',
      },
    },
  });

  // Watch for anonymous field changes
  const isAnonymous = form.watch('anonymous');
  const severity = form.watch('severity');

  useEffect(() => {
    setShowContactInfo(isAnonymous);
  }, [isAnonymous]);

  // Handle form submission
  const onSubmit = async (values: ComplaintFormValues) => {
    // For critical complaints, show confirmation dialog
    if (values.severity === 'CRITICAL') {
      setFormValues(values);
      setShowConfirmDialog(true);
      return;
    }

    await submitComplaint(values);
  };

  const submitComplaint = async (values: ComplaintFormValues) => {
    setIsSubmitting(true);
    try {
      // Submit complaint
      const response = await fetch('/api/support-services/feedback/complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit complaint');
      }

      const data = await response.json();

      // If there are files, upload them
      if (files.length > 0) {
        await uploadFiles(data.id);
      }

      toast({
        title: "Complaint Submitted",
        description: "Your complaint has been submitted successfully.",
      });

      // Reset form
      form.reset();
      setFiles([]);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while submitting complaint",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const uploadFiles = async (complaintId: string) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await fetch(`/api/support-services/feedback/complaint/${complaintId}/attachment`, {
          method: 'POST',
          body: formData,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Submit Complaint</CardTitle>
          <CardDescription>
            Please provide details about your complaint. We take all complaints seriously and will address them promptly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  {...form.register('title')}
                  placeholder="Brief title of your complaint"
                  disabled={isSubmitting}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select complaint category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLINICAL">Clinical Care</SelectItem>
                        <SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
                        <SelectItem value="FACILITY">Facility</SelectItem>
                        <SelectItem value="STAFF">Staff Behavior</SelectItem>
                        <SelectItem value="BILLING">Billing</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.category && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="severity">Severity</Label>
                <Controller
                  name="severity"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low - Minor issue</SelectItem>
                        <SelectItem value="MEDIUM">Medium - Moderate concern</SelectItem>
                        <SelectItem value="HIGH">High - Serious issue</SelectItem>
                        <SelectItem value="CRITICAL">Critical - Urgent attention needed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.severity && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.severity.message}</p>
                )}
                {severity === 'CRITICAL' && (
                  <div className="flex items-center mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                    <p className="text-sm text-red-500">
                      Critical complaints require immediate attention and will be escalated to senior management.
                    </p>
                  </div>
                )}
              </div>

              {departments.length > 0 && (
                <div>
                  <Label htmlFor="departmentId">Department (Optional)</Label>
                  <Controller
                    name="departmentId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  {...form.register('description')}
                  placeholder="Please provide detailed information about your complaint..."
                  className="min-h-[150px]"
                  disabled={isSubmitting}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div>
                <Label>Attachments (Optional)</Label>
                <FileUploader
                  onFilesChange={handleFileChange}
                  maxFiles={5}
                  maxSize={5 * 1024 * 1024} // 5MB
                  acceptedFileTypes={[
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  ]}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can upload up to 5 files (images, PDFs, or documents) to support your complaint.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => {
                    form.setValue('anonymous', checked === true);
                  }}
                  disabled={isSubmitting}
                />
                <Label htmlFor="anonymous" className="cursor-pointer">
                  Submit anonymously
                </Label>
              </div>

              {showContactInfo && (
                <div className="space-y-4 p-4 border rounded-md bg-gray-50">
                  <p className="text-sm text-gray-500">
                    If you'd like us to follow up with you, please provide your contact information (optional):
                  </p>
                  <div>
                    <Label htmlFor="contactInfo.name">Name</Label>
                    <Input
                      {...form.register('contactInfo.name')}
                      placeholder="Your name"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactInfo.email">Email</Label>
                    <Input
                      {...form.register('contactInfo.email')}
                      type="email"
                      placeholder="Your email"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactInfo.phone">Phone</Label>
                    <Input
                      {...form.register('contactInfo.phone')}
                      placeholder="Your phone number"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Complaint'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <p className="text-sm text-gray-500">
            {!isAnonymous && session ? 'Your complaint will be linked to your account.' : 'Your complaint will be anonymous.'}
          </p>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog for Critical Complaints */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Confirm Critical Complaint
            </DialogTitle>
            <DialogDescription>
              You are about to submit a critical complaint. This will be immediately escalated to senior management.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium">Are you sure this complaint requires critical priority?</p>
            <p className="text-sm text-gray-500 mt-2">
              Critical complaints should be reserved for serious issues that require immediate attention, such as:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-500 mt-1">
              <li>Patient safety concerns</li>
              <li>Serious breaches of protocol</li>
              <li>Situations that pose immediate risk</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => formValues && submitComplaint(formValues)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Confirm & Submit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
