import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Editor } from '@/components/ui/editor';

interface TemplateEditorProps {
  templateId?: string;
  onSuccess?: (template: any) => void;
}

export default function TemplateEditor({ templateId, onSuccess }: TemplateEditorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [template, setTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'EMAIL',
    content: '',
    variables: {},
    previewImage: '',
    isActive: true
  });
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [variableKey, setVariableKey] = useState<string>('');
  const [variableDescription, setVariableDescription] = useState<string>('');

  // Fetch template data if editing an existing template
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/support-services/marketing/templates/${templateId}`);
        if (!response.ok) throw new Error('Failed to fetch template');
        
        const data = await response.json();
        setTemplate(data);
        
        // Set form values from template data
        setFormData({
          name: data.name || '',
          description: data.description || '',
          type: data.type || 'EMAIL',
          content: data.content || '',
          variables: data.variables || {},
          previewImage: data.previewImage || '',
          isActive: data.isActive !== undefined ? data.isActive : true
        });
        
        // Initialize preview data from variables
        if (data.variables) {
          const initialPreviewData: Record<string, string> = {};
          Object.keys(data.variables).forEach(key => {
            initialPreviewData[key] = `[${key}]`;
          });
          setPreviewData(initialPreviewData);
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        toast({
          title: "Error",
          description: "Failed to load template data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplate();
  }, [templateId]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle switch changes
  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isActive: checked
    });
  };

  // Handle content change
  const handleContentChange = (content: string) => {
    setFormData({
      ...formData,
      content
    });
  };

  // Handle preview data change
  const handlePreviewDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPreviewData({
      ...previewData,
      [name]: value
    });
  };

  // Add variable to template
  const handleAddVariable = () => {
    if (!variableKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Variable key is required.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if variable already exists
    if (formData.variables[variableKey]) {
      toast({
        title: "Validation Error",
        description: "Variable key already exists.",
        variant: "destructive",
      });
      return;
    }
    
    const newVariables = {
      ...formData.variables,
      [variableKey]: variableDescription || variableKey
    };
    
    setFormData({
      ...formData,
      variables: newVariables
    });
    
    // Add to preview data
    setPreviewData({
      ...previewData,
      [variableKey]: `[${variableKey}]`
    });
    
    // Reset inputs
    setVariableKey('');
    setVariableDescription('');
  };

  // Remove variable from template
  const handleRemoveVariable = (key: string) => {
    const newVariables = { ...formData.variables };
    delete newVariables[key];
    
    setFormData({
      ...formData,
      variables: newVariables
    });
    
    // Remove from preview data
    const newPreviewData = { ...previewData };
    delete newPreviewData[key];
    setPreviewData(newPreviewData);
  };

  // Render template preview
  const handleRenderPreview = async () => {
    if (!templateId) {
      // For new templates, do a simple variable replacement
      let content = formData.content;
      Object.entries(previewData).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(regex, value);
      });
      setRenderedContent(content);
      return;
    }
    
    try {
      const response = await fetch(`/api/support-services/marketing/templates/${templateId}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variables: previewData }),
      });
      
      if (!response.ok) throw new Error('Failed to render template');
      
      const data = await response.json();
      setRenderedContent(data.renderedContent);
    } catch (error) {
      console.error('Error rendering template:', error);
      toast({
        title: "Error",
        description: "Failed to render template preview. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const url = templateId 
        ? `/api/support-services/marketing/templates/${templateId}` 
        : '/api/support-services/marketing/templates';
      
      const method = templateId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to save template');
      
      const savedTemplate = await response.json();
      
      toast({
        title: "Success",
        description: `Template ${templateId ? 'updated' : 'created'} successfully.`,
      });
      
      if (onSuccess) {
        onSuccess(savedTemplate);
      } else if (!templateId) {
        router.push(`/marketing/templates/${savedTemplate.id}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{templateId ? 'Edit Template' : 'Create New Template'}</CardTitle>
        <CardDescription>
          {templateId 
            ? 'Update your marketing template' 
            : 'Create a new template for your marketing communications'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Template Details</TabsTrigger>
            <TabsTrigger value="content">Content Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter template name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter template description"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Template Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleSelectChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="LETTER">Letter</SelectItem>
                      <SelectItem value="SOCIAL">Social Media</SelectItem>
                      <SelectItem value="PUSH">Push Notification</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="previewImage">Preview Image URL (Optional)</Label>
                  <Input
                    id="previewImage"
                    name="previewImage"
                    value={formData.previewImage}
                    onChange={handleInputChange}
                    placeholder="Enter preview image URL"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                
                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <Label>Template Variables</Label>
                    <Badge>{Object.keys(formData.variables).length} variables</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      value={variableKey}
                      onChange={(e) => setVariableKey(e.target.value)}
                      placeholder="Variable key (e.g., firstName)"
                    />
                    <Input
                      value={variableDescription}
                      onChange={(e) => setVariableDescription(e.target.value)}
                      placeholder="Description (optional)"
                    />
                    <Button type="button" onClick={handleAddVariable}>
                      Add Variable
                    </Button>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    {Object.entries(formData.variables).map(([key, description]) => (
                      <div key={key} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{`{{${key}}}`}</span>
                          {description !== key && (
                            <p className="text-sm text-muted-foreground">{description}</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveVariable(key)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    
                    {Object.keys(formData.variables).length === 0 && (
                      <p className="text-sm text-muted-foreground">No variables defined yet</p>
                    )}
                  </div>
                </div>
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
                  {isLoading ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="content">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Template Content</Label>
                <p className="text-sm text-muted-foreground">
                  Use {`{{variableName}}`} syntax for variables
                </p>
                
                <div className="border rounded-md">
                  <Editor
                    value={formData.content}
                    onChange={handleContentChange}
                    placeholder="Enter your template content here..."
                    minHeight="400px"
                  />
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
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Content'}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Preview Variables</Label>
                <p className="text-sm text-muted-foreground">
                  Enter test values for your template variables
                </p>
                
                <div className="space-y-2 mt-2">
                  {Object.entries(formData.variables).map(([key, description]) => (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <div className="md:col-span-1">
                        <Label htmlFor={`preview-${key}`}>{`${key}`}</Label>
                        {description !== key && (
                          <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          id={`preview-${key}`}
                          name={key}
                          value={previewData[key] || ''}
                          onChange={handlePreviewDataChange}
                          placeholder={`Value for ${key}`}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(formData.variables).length === 0 && (
                    <p className="text-sm text-muted-foreground">No variables defined yet</p>
                  )}
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    type="button" 
                    onClick={handleRenderPreview}
                  >
                    Generate Preview
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 border-t pt-4">
                <Label>Preview Result</Label>
                <div className="p-4 border rounded-md bg-white min-h-[200px]">
                  {renderedContent ? (
                    <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
                  ) : (
                    <p className="text-muted-foreground">Click "Generate Preview" to see the rendered template</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveTab("content")}
                >
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
