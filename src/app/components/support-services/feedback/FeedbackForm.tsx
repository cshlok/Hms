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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Star, StarHalf } from 'lucide-react';
import { useSession } from 'next-auth/react';

// Form schema
const feedbackFormSchema = z.object({
  type: z.string({
    required_error: "Please select a feedback type",
  }),
  source: z.string({
    required_error: "Please select a feedback source",
  }),
  rating: z.number({
    required_error: "Please provide a rating",
  }).min(1).max(5),
  comments: z.string().optional(),
  departmentId: z.string().optional(),
  serviceType: z.string().optional(),
  serviceId: z.string().optional(),
  anonymous: z.boolean().default(false),
  contactInfo: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

interface FeedbackFormProps {
  departments?: { id: string; name: string }[];
  serviceTypes?: string[];
  onSuccess?: (data: any) => void;
  defaultValues?: Partial<FeedbackFormValues>;
}

export default function FeedbackForm({ departments = [], serviceTypes = [], onSuccess, defaultValues }: FeedbackFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Initialize form
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      type: defaultValues?.type || '',
      source: defaultValues?.source || '',
      rating: defaultValues?.rating || 0,
      comments: defaultValues?.comments || '',
      departmentId: defaultValues?.departmentId || '',
      serviceType: defaultValues?.serviceType || '',
      serviceId: defaultValues?.serviceId || '',
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

  useEffect(() => {
    setShowContactInfo(isAnonymous);
  }, [isAnonymous]);

  // Handle form submission
  const onSubmit = async (values: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/support-services/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      const data = await response.json();
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });

      // Reset form
      form.reset();

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while submitting feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Submit Feedback</CardTitle>
        <CardDescription>
          We value your feedback to improve our services. Please fill out the form below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Feedback Type</Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select feedback type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PATIENT_SATISFACTION">Patient Satisfaction</SelectItem>
                      <SelectItem value="SERVICE_QUALITY">Service Quality</SelectItem>
                      <SelectItem value="STAFF_PERFORMANCE">Staff Performance</SelectItem>
                      <SelectItem value="FACILITY_CONDITION">Facility Condition</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.type && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="source">Feedback Source</Label>
              <Controller
                name="source"
                control={form.control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select feedback source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PATIENT">Patient</SelectItem>
                      <SelectItem value="VISITOR">Visitor</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.source && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.source.message}</p>
              )}
            </div>

            <div>
              <Label>Rating</Label>
              <Controller
                name="rating"
                control={form.control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2 mt-2">
                    <RadioGroup
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                      className="flex space-x-2"
                      disabled={isSubmitting}
                    >
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <div key={rating} className="flex flex-col items-center">
                          <RadioGroupItem
                            value={rating.toString()}
                            id={`rating-${rating}`}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={`rating-${rating}`}
                            className={`cursor-pointer p-2 rounded-full hover:bg-gray-100 ${
                              field.value === rating ? 'text-yellow-500' : 'text-gray-400'
                            }`}
                          >
                            <Star className="h-8 w-8" fill={field.value >= rating ? 'currentColor' : 'none'} />
                          </Label>
                          <span className="text-xs">{rating}</span>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              />
              {form.formState.errors.rating && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.rating.message}</p>
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

            {serviceTypes.length > 0 && (
              <div>
                <Label htmlFor="serviceType">Service Type (Optional)</Label>
                <Controller
                  name="serviceType"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div>
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                {...form.register('comments')}
                placeholder="Please share your feedback, suggestions, or concerns..."
                className="min-h-[120px]"
                disabled={isSubmitting}
              />
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
              'Submit Feedback'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-sm text-gray-500">
          {!isAnonymous && session ? 'Your feedback will be linked to your account.' : 'Your feedback will be anonymous.'}
        </p>
      </CardFooter>
    </Card>
  );
}
