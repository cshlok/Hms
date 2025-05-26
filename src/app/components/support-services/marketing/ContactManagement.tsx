import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface ContactManagementProps {
  contactId?: string;
  onSuccess?: (contact: any) => void;
}

export default function ContactManagement({ contactId, onSuccess }: ContactManagementProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contact, setContact] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'WEBSITE',
    status: 'ACTIVE',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    },
    preferences: {
      emailOptIn: true,
      smsOptIn: false,
      preferredContactMethod: 'EMAIL',
      preferredLanguage: 'English'
    },
    customFields: {}
  });
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [segments, setSegments] = useState<any[]>([]);
  const [availableSegments, setAvailableSegments] = useState<any[]>([]);
  const [patientData, setPatientData] = useState<any>(null);
  const [patientId, setPatientId] = useState('');
  const [activities, setActivities] = useState<any[]>([]);

  // Fetch contact data if editing an existing contact
  useEffect(() => {
    const fetchContact = async () => {
      if (!contactId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/support-services/marketing/contacts/${contactId}`);
        if (!response.ok) throw new Error('Failed to fetch contact');
        
        const data = await response.json();
        setContact(data);
        
        // Set form values from contact data
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          source: data.source || 'WEBSITE',
          status: data.status || 'ACTIVE',
          address: data.address || {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
          },
          preferences: data.preferences || {
            emailOptIn: true,
            smsOptIn: false,
            preferredContactMethod: 'EMAIL',
            preferredLanguage: 'English'
          },
          customFields: data.customFields || {}
        });
        
        // Fetch contact notes
        if (data.notes && data.notes.length > 0) {
          setNotes(data.notes);
        }
        
        // Fetch contact segments
        if (data.segments && data.segments.length > 0) {
          setSegments(data.segments);
        }
        
        // Fetch patient data if linked
        if (data.patientId) {
          setPatientId(data.patientId);
          fetchPatientData(data.patientId);
        }
        
        // Fetch contact activities
        fetchContactActivities(contactId);
      } catch (error) {
        console.error('Error fetching contact:', error);
        toast({
          title: "Error",
          description: "Failed to load contact data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContact();
  }, [contactId]);

  // Fetch available segments
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const response = await fetch('/api/support-services/marketing/segments?isActive=true');
        if (!response.ok) throw new Error('Failed to fetch segments');
        
        const data = await response.json();
        setAvailableSegments(data.data || []);
      } catch (error) {
        console.error('Error fetching segments:', error);
      }
    };
    
    fetchSegments();
  }, []);

  // Fetch patient data
  const fetchPatientData = async (id: string) => {
    try {
      const response = await fetch(`/api/patients/${id}`);
      if (!response.ok) throw new Error('Failed to fetch patient data');
      
      const data = await response.json();
      setPatientData(data);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  // Fetch contact activities
  const fetchContactActivities = async (id: string) => {
    try {
      const response = await fetch(`/api/support-services/marketing/contacts/${id}/activities`);
      if (!response.ok) throw new Error('Failed to fetch contact activities');
      
      const data = await response.json();
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching contact activities:', error);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof typeof formData],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof typeof formData],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof typeof formData],
          [child]: checked
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: checked
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const url = contactId 
        ? `/api/support-services/marketing/contacts/${contactId}` 
        : '/api/support-services/marketing/contacts';
      
      const method = contactId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to save contact');
      
      const savedContact = await response.json();
      
      toast({
        title: "Success",
        description: `Contact ${contactId ? 'updated' : 'created'} successfully.`,
      });
      
      if (onSuccess) {
        onSuccess(savedContact);
      } else if (!contactId) {
        router.push(`/marketing/contacts/${savedContact.id}`);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: "Failed to save contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding a note
  const handleAddNote = async () => {
    if (!contactId || !newNote.trim()) return;
    
    try {
      const response = await fetch(`/api/support-services/marketing/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newNote }),
      });
      
      if (!response.ok) throw new Error('Failed to add note');
      
      const addedNote = await response.json();
      setNotes([...notes, addedNote]);
      setNewNote('');
      
      toast({
        title: "Success",
        description: "Note added successfully.",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle linking patient
  const handleLinkPatient = async () => {
    if (!contactId || !patientId.trim()) return;
    
    try {
      const response = await fetch(`/api/support-services/marketing/contacts/${contactId}/link-patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId }),
      });
      
      if (!response.ok) throw new Error('Failed to link patient');
      
      const updatedContact = await response.json();
      setContact(updatedContact);
      fetchPatientData(patientId);
      
      toast({
        title: "Success",
        description: "Patient linked successfully.",
      });
    } catch (error) {
      console.error('Error linking patient:', error);
      toast({
        title: "Error",
        description: "Failed to link patient. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle adding to segment
  const handleAddToSegment = async (segmentId: string) => {
    if (!contactId) return;
    
    try {
      const response = await fetch(`/api/support-services/marketing/segments/${segmentId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId }),
      });
      
      if (!response.ok) throw new Error('Failed to add to segment');
      
      // Update segments
      const segment = availableSegments.find(s => s.id === segmentId);
      if (segment) {
        setSegments([...segments, segment]);
      }
      
      toast({
        title: "Success",
        description: "Added to segment successfully.",
      });
    } catch (error) {
      console.error('Error adding to segment:', error);
      toast({
        title: "Error",
        description: "Failed to add to segment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{contactId ? 'Edit Contact' : 'Create New Contact'}</CardTitle>
        <CardDescription>
          {contactId 
            ? 'Update contact information and preferences' 
            : 'Add a new contact to your marketing database'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Contact Details</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="segments" disabled={!contactId}>Segments</TabsTrigger>
            <TabsTrigger value="activity" disabled={!contactId}>Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="source">Contact Source</Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value) => handleSelectChange('source', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEBSITE">Website</SelectItem>
                        <SelectItem value="REFERRAL">Referral</SelectItem>
                        <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                        <SelectItem value="EVENT">Event</SelectItem>
                        <SelectItem value="PHONE">Phone</SelectItem>
                        <SelectItem value="WALK_IN">Walk-in</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
                      <SelectItem value="BOUNCED">Bounced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Address Information</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address.street">Street Address</Label>
                      <Input
                        id="address.street"
                        name="address.street"
                        value={formData.address.street}
                        onChange={handleInputChange}
                        placeholder="Enter street address"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address.city">City</Label>
                        <Input
                          id="address.city"
                          name="address.city"
                          value={formData.address.city}
                          onChange={handleInputChange}
                          placeholder="Enter city"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address.state">State/Province</Label>
                        <Input
                          id="address.state"
                          name="address.state"
                          value={formData.address.state}
                          onChange={handleInputChange}
                          placeholder="Enter state/province"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address.postalCode">Postal Code</Label>
                        <Input
                          id="address.postalCode"
                          name="address.postalCode"
                          value={formData.address.postalCode}
                          onChange={handleInputChange}
                          placeholder="Enter postal code"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address.country">Country</Label>
                        <Input
                          id="address.country"
                          name="address.country"
                          value={formData.address.country}
                          onChange={handleInputChange}
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {contactId && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Patient Information</h3>
                    
                    {patientData ? (
                      <div className="p-4 border rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{patientData.name}</h4>
                            <p className="text-sm text-muted-foreground">Patient ID: {patientData.id}</p>
                            {patientData.dateOfBirth && (
                              <p className="text-sm text-muted-foreground">
                                DOB: {new Date(patientData.dateOfBirth).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge>Linked</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end space-x-2">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="patientId">Patient ID</Label>
                          <Input
                            id="patientId"
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                            placeholder="Enter patient ID to link"
                          />
                        </div>
                        <Button type="button" onClick={handleLinkPatient}>
                          Link Patient
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {contactId && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Notes</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-end space-x-2">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="newNote">Add Note</Label>
                          <Input
                            id="newNote"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Enter a note about this contact"
                          />
                        </div>
                        <Button type="button" onClick={handleAddNote}>
                          Add Note
                        </Button>
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {notes.map((note, index) => (
                          <div key={index} className="p-3 border rounded">
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(note.createdAt).toLocaleString()} • {note.createdBy?.name || 'System'}
                            </p>
                          </div>
                        ))}
                        
                        {notes.length === 0 && (
                          <p className="text-sm text-muted-foreground">No notes yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : contactId ? 'Update Contact' : 'Create Contact'}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="preferences">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Communication Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="preferences.emailOptIn">Email Opt-in</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive marketing emails from us
                        </p>
                      </div>
                      <Switch
                        id="preferences.emailOptIn"
                        checked={formData.preferences.emailOptIn}
                        onCheckedChange={(checked) => handleCheckboxChange('preferences.emailOptIn', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="preferences.smsOptIn">SMS Opt-in</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive marketing text messages from us
                        </p>
                      </div>
                      <Switch
                        id="preferences.smsOptIn"
                        checked={formData.preferences.smsOptIn}
                        onCheckedChange={(checked) => handleCheckboxChange('preferences.smsOptIn', checked)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="preferences.preferredContactMethod">Preferred Contact Method</Label>
                      <Select
                        value={formData.preferences.preferredContactMethod}
                        onValueChange={(value) => handleSelectChange('preferences.preferredContactMethod', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preferred method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="PHONE">Phone</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                          <SelectItem value="MAIL">Mail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="preferences.preferredLanguage">Preferred Language</Label>
                      <Select
                        value={formData.preferences.preferredLanguage}
                        onValueChange={(value) => handleSelectChange('preferences.preferredLanguage', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preferred language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                          <SelectItem value="Chinese">Chinese</SelectItem>
                          <SelectItem value="Japanese">Japanese</SelectItem>
                          <SelectItem value="Korean">Korean</SelectItem>
                          <SelectItem value="Arabic">Arabic</SelectItem>
                          <SelectItem value="Hindi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Interest Categories</h3>
                  <p className="text-sm text-muted-foreground">
                    Select topics this contact is interested in
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interest-preventive" />
                      <Label htmlFor="interest-preventive">Preventive Care</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interest-wellness" />
                      <Label htmlFor="interest-wellness">Wellness Programs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interest-nutrition" />
                      <Label htmlFor="interest-nutrition">Nutrition</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interest-fitness" />
                      <Label htmlFor="interest-fitness">Fitness</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interest-mental" />
                      <Label htmlFor="interest-mental">Mental Health</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interest-family" />
                      <Label htmlFor="interest-family">Family Health</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interest-senior" />
                      <Label htmlFor="interest-senior">Senior Care</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interest-specialty" />
                      <Label htmlFor="interest-specialty">Specialty Services</Label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveTab("details")}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="segments">
            {contactId ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Contact Segments</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage which segments this contact belongs to
                  </p>
                  
                  <div className="mt-4">
                    <Select onValueChange={handleAddToSegment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add to segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSegments
                          .filter(segment => !segments.some(s => s.id === segment.id))
                          .map(segment => (
                            <SelectItem key={segment.id} value={segment.id}>
                              {segment.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {segments.map(segment => (
                      <div key={segment.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <h4 className="font-medium">{segment.name}</h4>
                          <p className="text-sm text-muted-foreground">{segment.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">Remove</Button>
                        </div>
                      </div>
                    ))}
                    
                    {segments.length === 0 && (
                      <p className="text-sm text-muted-foreground">Not in any segments yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p>Please save the contact first to manage segments.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="activity">
            {contactId ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Contact Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    Recent interactions and engagement history
                  </p>
                  
                  <div className="mt-4 space-y-4">
                    {activities.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-4 p-3 border rounded">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary text-sm">
                            {activity.type === 'EMAIL_OPEN' ? '📧' : 
                             activity.type === 'EMAIL_CLICK' ? '🔗' :
                             activity.type === 'FORM_SUBMISSION' ? '📝' :
                             activity.type === 'PAGE_VIEW' ? '👁️' : '🔔'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {activity.type === 'EMAIL_OPEN' ? 'Opened Email' : 
                             activity.type === 'EMAIL_CLICK' ? 'Clicked Email Link' :
                             activity.type === 'FORM_SUBMISSION' ? 'Submitted Form' :
                             activity.type === 'PAGE_VIEW' ? 'Viewed Page' : activity.type}
                          </h4>
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {activities.length === 0 && (
                      <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p>Please save the contact first to view activity.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
