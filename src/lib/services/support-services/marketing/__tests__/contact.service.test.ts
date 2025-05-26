import { ContactService } from '../contact.service';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';
import { EncryptionService } from '@/lib/encryption';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  contact: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  contactNote: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  contactSegment: {
    findMany: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/encryption', () => ({
  EncryptionService: {
    encryptField: jest.fn(data => `encrypted_${data}`),
    decryptField: jest.fn(data => data.replace('encrypted_', '')),
  },
}));

describe('ContactService', () => {
  let service: ContactService;
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContactService();
  });
  
  describe('createContact', () => {
    const mockContactData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '123-456-7890',
      source: 'WEBSITE',
      status: 'ACTIVE',
    };
    
    const mockCreatedContact = {
      id: 'contact-123',
      ...mockContactData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    it('should create a contact successfully', async () => {
      // Arrange
      (prisma.contact.create as jest.Mock).mockResolvedValue(mockCreatedContact);
      
      // Act
      const result = await service.createContact(mockContactData, mockUserId);
      
      // Assert
      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: mockContactData.name,
          email: mockContactData.email,
          phone: expect.stringContaining('encrypted_'),
          source: mockContactData.source,
          status: mockContactData.status,
          createdById: mockUserId,
        }),
      });
      
      expect(result).toEqual(expect.objectContaining({
        id: mockCreatedContact.id,
        name: mockCreatedContact.name,
        email: mockCreatedContact.email,
      }));
      
      // Verify phone was encrypted
      expect(EncryptionService.encryptField).toHaveBeenCalledWith(mockContactData.phone);
    });
    
    it('should throw ValidationError if contact data is invalid', async () => {
      // Arrange
      const invalidData = {
        ...mockContactData,
        email: 'invalid-email', // Invalid email format
      };
      
      // Act & Assert
      await expect(service.createContact(invalidData, mockUserId))
        .rejects
        .toThrow(ValidationError);
    });
    
    it('should throw DatabaseError if database operation fails', async () => {
      // Arrange
      (prisma.contact.create as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      // Act & Assert
      await expect(service.createContact(mockContactData, mockUserId))
        .rejects
        .toThrow(DatabaseError);
    });
    
    it('should log audit event after creating contact', async () => {
      // Arrange
      (prisma.contact.create as jest.Mock).mockResolvedValue(mockCreatedContact);
      
      // Act
      await service.createContact(mockContactData, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'contact.create',
        resourceId: mockCreatedContact.id,
        userId: mockUserId,
        details: expect.any(Object),
      });
    });
  });
  
  describe('getContactById', () => {
    const mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: 'encrypted_123-456-7890',
      source: 'WEBSITE',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    it('should retrieve a contact by ID', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      
      // Act
      const result = await service.getContactById('contact-123');
      
      // Assert
      expect(prisma.contact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        include: expect.any(Object),
      });
      
      // Verify phone was decrypted
      expect(EncryptionService.decryptField).toHaveBeenCalledWith(mockContact.phone);
      expect(result.phone).not.toContain('encrypted_');
    });
    
    it('should throw NotFoundError if contact does not exist', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.getContactById('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should include FHIR representation when requested', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      
      // Act
      const result = await service.getContactById('contact-123', true);
      
      // Assert
      expect(result).toHaveProperty('fhir');
      expect(result.fhir).toHaveProperty('resourceType', 'Person');
      expect(result.fhir).toHaveProperty('id', mockContact.id);
      expect(result.fhir.name[0].text).toBe(mockContact.name);
    });
  });
  
  describe('getContacts', () => {
    const mockContacts = [
      {
        id: 'contact-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: 'encrypted_123-456-7890',
        source: 'WEBSITE',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'contact-2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: 'encrypted_987-654-3210',
        source: 'REFERRAL',
        status: 'INACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    it('should retrieve contacts with pagination', async () => {
      // Arrange
      (prisma.contact.count as jest.Mock).mockResolvedValue(2);
      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockContacts);
      
      // Act
      const result = await service.getContacts({ page: 1, limit: 10 });
      
      // Assert
      expect(prisma.contact.count).toHaveBeenCalled();
      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );
      
      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockContacts[0].id,
            name: mockContacts[0].name,
            phone: expect.not.stringContaining('encrypted_'),
          }),
          expect.objectContaining({
            id: mockContacts[1].id,
            name: mockContacts[1].name,
            phone: expect.not.stringContaining('encrypted_'),
          }),
        ]),
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      
      // Verify phones were decrypted
      expect(EncryptionService.decryptField).toHaveBeenCalledTimes(2);
    });
    
    it('should apply filters correctly', async () => {
      // Arrange
      const filters = {
        status: 'ACTIVE',
        source: 'WEBSITE',
        search: 'john',
        page: 2,
        limit: 5,
      };
      
      (prisma.contact.count as jest.Mock).mockResolvedValue(10);
      (prisma.contact.findMany as jest.Mock).mockResolvedValue([mockContacts[0]]);
      
      // Act
      const result = await service.getContacts(filters);
      
      // Assert
      expect(prisma.contact.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: filters.status,
          source: filters.source,
          OR: expect.arrayContaining([
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ]),
        }),
      });
      
      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: filters.status,
            source: filters.source,
          }),
          skip: 5, // (page-1) * limit
          take: 5,
        })
      );
      
      expect(result.pagination).toEqual({
        total: 10,
        page: 2,
        limit: 5,
        totalPages: 2,
      });
    });
  });
  
  describe('updateContact', () => {
    const mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: 'encrypted_123-456-7890',
      source: 'WEBSITE',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updateData = {
      name: 'John Updated',
      phone: '555-123-4567',
      status: 'INACTIVE',
    };
    
    it('should update a contact successfully', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contact.update as jest.Mock).mockResolvedValue({
        ...mockContact,
        ...updateData,
        phone: `encrypted_${updateData.phone}`,
      });
      
      // Act
      const result = await service.updateContact('contact-123', updateData, mockUserId);
      
      // Assert
      expect(prisma.contact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
      });
      
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: expect.objectContaining({
          name: updateData.name,
          phone: expect.stringContaining('encrypted_'),
          status: updateData.status,
          updatedById: mockUserId,
        }),
      });
      
      // Verify phone was encrypted
      expect(EncryptionService.encryptField).toHaveBeenCalledWith(updateData.phone);
      
      // Verify returned phone was decrypted
      expect(result.phone).toBe(updateData.phone);
    });
    
    it('should throw NotFoundError if contact does not exist', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.updateContact('non-existent-id', updateData, mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after updating contact', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contact.update as jest.Mock).mockResolvedValue({
        ...mockContact,
        ...updateData,
        phone: `encrypted_${updateData.phone}`,
      });
      
      // Act
      await service.updateContact('contact-123', updateData, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'contact.update',
        resourceId: 'contact-123',
        userId: mockUserId,
        details: expect.objectContaining({
          updatedFields: Object.keys(updateData),
        }),
      });
    });
  });
  
  describe('addContactNote', () => {
    const mockContact = {
      id: 'contact-123',
      name: 'John Doe',
    };
    
    const mockNote = {
      id: 'note-123',
      contactId: 'contact-123',
      content: 'This is a test note',
      createdById: 'user-123',
      createdAt: new Date(),
    };
    
    it('should add a note to a contact successfully', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contactNote.create as jest.Mock).mockResolvedValue(mockNote);
      
      // Act
      const result = await service.addContactNote(
        'contact-123',
        'This is a test note',
        mockUserId
      );
      
      // Assert
      expect(prisma.contact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
      });
      
      expect(prisma.contactNote.create).toHaveBeenCalledWith({
        data: {
          contactId: 'contact-123',
          content: 'This is a test note',
          createdById: mockUserId,
        },
      });
      
      expect(result).toEqual(mockNote);
    });
    
    it('should throw NotFoundError if contact does not exist', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.addContactNote('non-existent-id', 'Test note', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after adding note', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contactNote.create as jest.Mock).mockResolvedValue(mockNote);
      
      // Act
      await service.addContactNote('contact-123', 'This is a test note', mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'contact.note.add',
        resourceId: 'contact-123',
        userId: mockUserId,
        details: expect.objectContaining({
          noteId: mockNote.id,
        }),
      });
    });
  });
  
  describe('linkContactToPatient', () => {
    const mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      patientId: null,
    };
    
    const mockPatient = {
      id: 'patient-123',
      name: 'John Doe',
    };
    
    const mockUpdatedContact = {
      ...mockContact,
      patientId: 'patient-123',
    };
    
    it('should link a contact to a patient successfully', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      // Mock patient service call
      jest.spyOn(service as any, 'getPatientById').mockResolvedValue(mockPatient);
      (prisma.contact.update as jest.Mock).mockResolvedValue(mockUpdatedContact);
      
      // Act
      const result = await service.linkContactToPatient(
        'contact-123',
        'patient-123',
        mockUserId
      );
      
      // Assert
      expect(prisma.contact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
      });
      
      expect(service['getPatientById']).toHaveBeenCalledWith('patient-123');
      
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: {
          patientId: 'patient-123',
          updatedById: mockUserId,
        },
      });
      
      expect(result).toEqual(mockUpdatedContact);
    });
    
    it('should throw NotFoundError if contact does not exist', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.linkContactToPatient('non-existent-id', 'patient-123', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should throw NotFoundError if patient does not exist', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      jest.spyOn(service as any, 'getPatientById').mockRejectedValue(new NotFoundError('Patient not found'));
      
      // Act & Assert
      await expect(service.linkContactToPatient('contact-123', 'non-existent-id', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after linking patient', async () => {
      // Arrange
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      jest.spyOn(service as any, 'getPatientById').mockResolvedValue(mockPatient);
      (prisma.contact.update as jest.Mock).mockResolvedValue(mockUpdatedContact);
      
      // Act
      await service.linkContactToPatient('contact-123', 'patient-123', mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'contact.patient.link',
        resourceId: 'contact-123',
        userId: mockUserId,
        details: expect.objectContaining({
          patientId: 'patient-123',
        }),
      });
    });
  });
});
