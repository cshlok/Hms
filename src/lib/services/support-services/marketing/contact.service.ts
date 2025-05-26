import { Contact, ContactNote, ContactStatus } from '@/lib/models/marketing';
import { prisma } from '@/lib/prisma';
import { encryptData, decryptData } from '@/lib/encryption';
import { FhirResourceGenerator } from '@/lib/fhir';
import { AuditLogger } from '@/lib/audit';
import { NotificationService } from '@/lib/notifications';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';

/**
 * Service for managing marketing contacts and related operations
 */
export class ContactService {
  private auditLogger = new AuditLogger('marketing-contact');
  private notificationService = new NotificationService();
  private fhirGenerator = new FhirResourceGenerator();

  /**
   * Create a new contact
   */
  async createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Contact> {
    try {
      // Validate contact data
      this.validateContactData(data);
      
      // Encrypt sensitive data
      const encryptedData = {
        ...data,
        email: data.email ? encryptData(data.email) : undefined,
        phone: data.phone ? encryptData(data.phone) : undefined,
        address: data.address ? encryptData(JSON.stringify(data.address)) : undefined,
        dateOfBirth: data.dateOfBirth,
      };
      
      // Create contact in database
      const contact = await prisma.contact.create({
        data: {
          firstName: encryptedData.firstName,
          lastName: encryptedData.lastName,
          email: encryptedData.email,
          phone: encryptedData.phone,
          address: encryptedData.address,
          dateOfBirth: encryptedData.dateOfBirth,
          gender: encryptedData.gender,
          occupation: encryptedData.occupation,
          organization: encryptedData.organization,
          source: encryptedData.source,
          status: encryptedData.status || ContactStatus.ACTIVE,
          tags: encryptedData.tags || [],
          preferences: encryptedData.preferences,
          patientId: encryptedData.patientId,
        },
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'contact.create',
        resourceId: contact.id,
        userId,
        details: { 
          contactSource: contact.source,
          hasPatientRecord: !!contact.patientId
        }
      });
      
      // Decrypt sensitive data before returning
      return this.decryptContactData(contact);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create contact', error);
    }
  }

  /**
   * Get a contact by ID
   */
  async getContactById(id: string, includeFHIR = false): Promise<Contact & { fhir?: any }> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id },
        include: {
          notes: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10,
            include: {
              createdByUser: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          patient: includeFHIR ? true : false,
          segmentMembers: {
            where: {
              isActive: true
            },
            include: {
              segment: true
            }
          },
          leads: {
            take: 5,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
      
      if (!contact) {
        throw new NotFoundError(`Contact with ID ${id} not found`);
      }
      
      // Decrypt sensitive data
      const decryptedContact = this.decryptContactData(contact);
      
      // Generate FHIR representation if requested
      const result: any = decryptedContact;
      if (includeFHIR) {
        result.fhir = this.generateContactFHIR(decryptedContact);
      }
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve contact', error);
    }
  }

  /**
   * Get all contacts with optional filtering
   */
  async getContacts(filters: {
    status?: string;
    source?: string;
    search?: string;
    segmentId?: string;
    hasPatient?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Contact[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const { 
        status, 
        source, 
        search,
        segmentId,
        hasPatient,
        page = 1, 
        limit = 10 
      } = filters;
      
      // Build where clause based on filters
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (source) {
        where.source = source;
      }
      
      if (hasPatient !== undefined) {
        where.patientId = hasPatient ? { not: null } : null;
      }
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { organization: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Handle segment filter
      let segmentFilter = {};
      if (segmentId) {
        segmentFilter = {
          segmentMembers: {
            some: {
              segmentId,
              isActive: true
            }
          }
        };
        Object.assign(where, segmentFilter);
      }
      
      // Get total count for pagination
      const total = await prisma.contact.count({ where });
      
      // Get contacts with pagination
      const contacts = await prisma.contact.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              notes: true,
              leads: true,
              segmentMembers: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Decrypt sensitive data
      const decryptedContacts = contacts.map(contact => this.decryptContactData(contact));
      
      return {
        data: decryptedContacts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve contacts', error);
    }
  }

  /**
   * Update a contact
   */
  async updateContact(id: string, data: Partial<Contact>, userId: string): Promise<Contact> {
    try {
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${id} not found`);
      }
      
      // Encrypt sensitive data if provided
      const updateData: any = { ...data };
      
      if (data.email) {
        updateData.email = encryptData(data.email);
      }
      
      if (data.phone) {
        updateData.phone = encryptData(data.phone);
      }
      
      if (data.address) {
        updateData.address = encryptData(JSON.stringify(data.address));
      }
      
      // Update contact
      const updatedContact = await prisma.contact.update({
        where: { id },
        data: updateData
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'contact.update',
        resourceId: id,
        userId,
        details: { 
          updatedFields: Object.keys(data) 
        }
      });
      
      // Decrypt sensitive data before returning
      return this.decryptContactData(updatedContact);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update contact', error);
    }
  }

  /**
   * Add a note to a contact
   */
  async addContactNote(contactId: string, content: string, userId: string): Promise<ContactNote> {
    try {
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${contactId} not found`);
      }
      
      // Create note
      const note = await prisma.contactNote.create({
        data: {
          contactId,
          content,
          createdById: userId
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'contact.note.add',
        resourceId: contactId,
        userId,
        details: { 
          noteId: note.id
        }
      });
      
      return note;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to add contact note', error);
    }
  }

  /**
   * Link a contact to a patient
   */
  async linkContactToPatient(contactId: string, patientId: string, userId: string): Promise<Contact> {
    try {
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${contactId} not found`);
      }
      
      // Check if patient exists
      const existingPatient = await prisma.patient.findUnique({
        where: { id: patientId }
      });
      
      if (!existingPatient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found`);
      }
      
      // Update contact with patient link
      const updatedContact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          patientId
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'contact.link.patient',
        resourceId: contactId,
        userId,
        details: { 
          patientId
        }
      });
      
      // Decrypt sensitive data before returning
      return this.decryptContactData(updatedContact);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to link contact to patient', error);
    }
  }

  /**
   * Generate FHIR representation of a contact
   * Maps to FHIR Patient and RelatedPerson resources
   */
  private generateContactFHIR(contact: Contact): any {
    // If contact is linked to a patient, use Patient resource
    if (contact.patientId && contact.patient) {
      return {
        resourceType: 'Patient',
        id: `patient-${contact.patientId}`,
        identifier: [
          {
            system: 'urn:oid:2.16.840.1.113883.2.4.6.3',
            value: contact.patientId
          }
        ],
        name: [
          {
            use: 'official',
            family: contact.lastName || '',
            given: [contact.firstName || '']
          }
        ],
        telecom: [
          {
            system: 'email',
            value: contact.email || '',
            use: 'home'
          },
          {
            system: 'phone',
            value: contact.phone || '',
            use: 'mobile'
          }
        ],
        gender: contact.gender?.toLowerCase() || 'unknown',
        birthDate: contact.dateOfBirth ? contact.dateOfBirth.toISOString().split('T')[0] : undefined
      };
    }
    
    // Otherwise use RelatedPerson resource
    return {
      resourceType: 'RelatedPerson',
      id: `contact-${contact.id}`,
      identifier: [
        {
          system: 'urn:oid:2.16.840.1.113883.2.4.6.3',
          value: contact.id
        }
      ],
      name: [
        {
          use: 'official',
          family: contact.lastName || '',
          given: [contact.firstName || '']
        }
      ],
      telecom: [
        {
          system: 'email',
          value: contact.email || '',
          use: 'home'
        },
        {
          system: 'phone',
          value: contact.phone || '',
          use: 'mobile'
        }
      ],
      gender: contact.gender?.toLowerCase() || 'unknown',
      birthDate: contact.dateOfBirth ? contact.dateOfBirth.toISOString().split('T')[0] : undefined
    };
  }

  /**
   * Validate contact data
   */
  private validateContactData(data: Partial<Contact>): void {
    const errors: string[] = [];
    
    // Email or phone is required
    if (!data.email && !data.phone) {
      errors.push('Either email or phone is required');
    }
    
    // Validate email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }
    
    // Validate phone format if provided
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone format');
    }
    
    // Check for valid status
    if (data.status && !Object.values(ContactStatus).includes(data.status as ContactStatus)) {
      errors.push(`Invalid status: ${data.status}`);
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Contact validation failed', errors);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    // Allow various phone formats
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Decrypt sensitive contact data
   */
  private decryptContactData(contact: any): Contact {
    try {
      const decryptedContact = { ...contact };
      
      if (contact.email) {
        decryptedContact.email = decryptData(contact.email);
      }
      
      if (contact.phone) {
        decryptedContact.phone = decryptData(contact.phone);
      }
      
      if (contact.address) {
        decryptedContact.address = JSON.parse(decryptData(contact.address));
      }
      
      return decryptedContact;
    } catch (error) {
      console.error('Error decrypting contact data:', error);
      return contact;
    }
  }
}
