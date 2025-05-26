/**
 * Marketing CRM Module Models
 * TypeScript interfaces corresponding to the Prisma schema for Marketing CRM
 */

// Marketing Campaign Model
export interface MarketingCampaign {
  id: string;
  name: string;
  description?: string;
  type: string; // EMAIL, SMS, SOCIAL_MEDIA, EVENT, PRINT, DIGITAL_AD, OTHER
  status: string; // DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED
  startDate: Date;
  endDate?: Date;
  budget?: number;
  targetAudience?: any; // Target demographics, interests, etc.
  goals: string[]; // Campaign goals
  kpis?: any; // Key Performance Indicators
  createdById: string;
  createdByUser?: User;
  updatedById?: string;
  updatedByUser?: User;
  createdAt: Date;
  updatedAt: Date;
  channels?: CampaignChannel[];
  segments?: CampaignSegment[];
  activities?: MarketingActivity[];
  leads?: Lead[];
  analytics?: CampaignAnalytics[];
}

// Campaign Channel Model
export interface CampaignChannel {
  id: string;
  campaignId: string;
  campaign?: MarketingCampaign;
  channelType: string; // EMAIL, SMS, SOCIAL_MEDIA, EVENT, PRINT, DIGITAL_AD, OTHER
  channelName: string; // Specific channel name (e.g., "Facebook", "Email Newsletter")
  content?: any; // Channel-specific content
  schedule?: any; // Delivery schedule
  status: string; // DRAFT, SCHEDULED, ACTIVE, COMPLETED, CANCELLED
  metrics?: any; // Channel-specific metrics
  createdAt: Date;
  updatedAt: Date;
  messages?: MarketingMessage[];
}

// Marketing Message Model
export interface MarketingMessage {
  id: string;
  channelId: string;
  channel?: CampaignChannel;
  subject?: string; // For email, SMS
  content: string; // Message content
  template?: string; // Template identifier
  mediaUrls: string[]; // URLs to images, videos, etc.
  scheduledDate?: Date;
  sentDate?: Date;
  status: string; // DRAFT, SCHEDULED, SENT, FAILED
  metadata?: any; // Additional message data
  createdAt: Date;
  updatedAt: Date;
  interactions?: MessageInteraction[];
}

// Message Interaction Model
export interface MessageInteraction {
  id: string;
  messageId: string;
  message?: MarketingMessage;
  contactId?: string;
  contact?: Contact;
  interactionType: string; // OPEN, CLICK, REPLY, UNSUBSCRIBE, BOUNCE
  timestamp: Date;
  metadata?: any; // Additional interaction data
  ipAddress?: string;
  userAgent?: string;
  url?: string; // For click interactions
}

// Contact Model (for marketing purposes)
export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: any;
  dateOfBirth?: Date;
  gender?: string;
  occupation?: string;
  organization?: string;
  source?: string; // How the contact was acquired
  status: string; // ACTIVE, INACTIVE, UNSUBSCRIBED, BOUNCED
  tags: string[];
  preferences?: any; // Communication preferences
  patientId?: string; // Link to patient if applicable
  patient?: any; // Patient reference
  createdAt: Date;
  updatedAt: Date;
  notes?: ContactNote[];
  interactions?: MessageInteraction[];
  activities?: MarketingActivity[];
  segmentMembers?: SegmentMember[];
  leads?: Lead[];
}

// Contact Note Model
export interface ContactNote {
  id: string;
  contactId: string;
  contact?: Contact;
  content: string;
  createdById: string;
  createdByUser?: User;
  createdAt: Date;
  updatedAt: Date;
}

// Marketing Activity Model
export interface MarketingActivity {
  id: string;
  campaignId?: string;
  campaign?: MarketingCampaign;
  contactId?: string;
  contact?: Contact;
  activityType: string; // EMAIL_SENT, SMS_SENT, WEBSITE_VISIT, FORM_SUBMISSION, EVENT_REGISTRATION, etc.
  description?: string;
  timestamp: Date;
  metadata?: any; // Additional activity data
  url?: string; // Related URL if applicable
  ipAddress?: string;
  userAgent?: string;
}

// Contact Segment Model
export interface ContactSegment {
  id: string;
  name: string;
  description?: string;
  criteria?: any; // Segmentation criteria
  isActive: boolean;
  createdById: string;
  createdByUser?: User;
  createdAt: Date;
  updatedAt: Date;
  members?: SegmentMember[];
  campaigns?: CampaignSegment[];
}

// Segment Member Model
export interface SegmentMember {
  id: string;
  segmentId: string;
  segment?: ContactSegment;
  contactId: string;
  contact?: Contact;
  addedAt: Date;
  removedAt?: Date;
  isActive: boolean;
}

// Campaign Segment Model (Many-to-Many)
export interface CampaignSegment {
  id: string;
  campaignId: string;
  campaign?: MarketingCampaign;
  segmentId: string;
  segment?: ContactSegment;
  createdAt: Date;
}

// Lead Model
export interface Lead {
  id: string;
  contactId: string;
  contact?: Contact;
  campaignId?: string;
  campaign?: MarketingCampaign;
  source: string; // WEBSITE, REFERRAL, EVENT, ADVERTISEMENT, etc.
  status: string; // NEW, CONTACTED, QUALIFIED, CONVERTED, LOST
  score?: number; // Lead score
  assignedToId?: string;
  assignedToUser?: User;
  notes?: string;
  convertedToPatientId?: string;
  convertedToPatient?: any; // Patient reference
  conversionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  activities?: LeadActivity[];
}

// Lead Activity Model
export interface LeadActivity {
  id: string;
  leadId: string;
  lead?: Lead;
  activityType: string; // NOTE, CALL, EMAIL, MEETING, STATUS_CHANGE, etc.
  description: string;
  performedById: string;
  performedByUser?: User;
  timestamp: Date;
  metadata?: any; // Additional activity data
}

// Campaign Analytics Model
export interface CampaignAnalytics {
  id: string;
  campaignId: string;
  campaign?: MarketingCampaign;
  date: Date;
  metrics: any; // Various metrics (impressions, clicks, conversions, etc.)
  createdAt: Date;
  updatedAt: Date;
}

// Marketing Template Model
export interface MarketingTemplate {
  id: string;
  name: string;
  description?: string;
  type: string; // EMAIL, SMS, SOCIAL_POST, LANDING_PAGE, etc.
  content: string; // HTML, text, or JSON content
  variables?: any; // Template variables
  previewImage?: string; // URL to template preview image
  isActive: boolean;
  createdById: string;
  createdByUser?: User;
  createdAt: Date;
  updatedAt: Date;
}

// Marketing Event Model
export interface MarketingEvent {
  id: string;
  name: string;
  description?: string;
  eventType: string; // WEBINAR, CONFERENCE, WORKSHOP, HEALTH_CAMP, etc.
  startDate: Date;
  endDate: Date;
  location?: string;
  virtualLink?: string;
  capacity?: number;
  registrationLink?: string;
  status: string; // PLANNED, OPEN, FULL, ONGOING, COMPLETED, CANCELLED
  createdById: string;
  createdByUser?: User;
  createdAt: Date;
  updatedAt: Date;
  registrations?: EventRegistration[];
}

// Event Registration Model
export interface EventRegistration {
  id: string;
  eventId: string;
  event?: MarketingEvent;
  contactId?: string;
  patientId?: string;
  patient?: any; // Patient reference
  name: string;
  email: string;
  phone?: string;
  status: string; // REGISTERED, CONFIRMED, ATTENDED, NO_SHOW, CANCELLED
  registrationDate: Date;
  metadata?: any; // Additional registration data
}

// User interface (partial, only for marketing relations)
export interface User {
  id: string;
  name?: string;
  email?: string;
  // Other user fields would be defined elsewhere
}

// Campaign Status enum
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Campaign Type enum
export enum CampaignType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  EVENT = 'EVENT',
  PRINT = 'PRINT',
  DIGITAL_AD = 'DIGITAL_AD',
  OTHER = 'OTHER'
}

// Channel Type enum
export enum ChannelType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  EVENT = 'EVENT',
  PRINT = 'PRINT',
  DIGITAL_AD = 'DIGITAL_AD',
  OTHER = 'OTHER'
}

// Message Status enum
export enum MessageStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

// Interaction Type enum
export enum InteractionType {
  OPEN = 'OPEN',
  CLICK = 'CLICK',
  REPLY = 'REPLY',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  BOUNCE = 'BOUNCE'
}

// Contact Status enum
export enum ContactStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  BOUNCED = 'BOUNCED'
}

// Lead Status enum
export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST'
}

// Lead Source enum
export enum LeadSource {
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  EVENT = 'EVENT',
  ADVERTISEMENT = 'ADVERTISEMENT',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  OTHER = 'OTHER'
}

// Event Status enum
export enum EventStatus {
  PLANNED = 'PLANNED',
  OPEN = 'OPEN',
  FULL = 'FULL',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Registration Status enum
export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  CONFIRMED = 'CONFIRMED',
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED'
}
