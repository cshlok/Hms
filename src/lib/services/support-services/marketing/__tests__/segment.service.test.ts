import { SegmentService } from '../segment.service';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  contactSegment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  segment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  contact: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('SegmentService', () => {
  let service: SegmentService;
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new SegmentService();
  });
  
  describe('createSegment', () => {
    const mockSegmentData = {
      name: 'Test Segment',
      description: 'A test segment',
      isActive: true,
      criteria: {
        type: 'AND',
        conditions: [
          { field: 'email', operator: 'contains', value: 'example.com' }
        ]
      }
    };
    
    const mockCreatedSegment = {
      id: 'segment-123',
      ...mockSegmentData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 'user-123',
      updatedById: null,
    };
    
    it('should create a segment successfully', async () => {
      // Arrange
      (prisma.segment.create as jest.Mock).mockResolvedValue(mockCreatedSegment);
      
      // Act
      const result = await service.createSegment(mockSegmentData, mockUserId);
      
      // Assert
      expect(prisma.segment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: mockSegmentData.name,
          description: mockSegmentData.description,
          isActive: mockSegmentData.isActive,
          criteria: mockSegmentData.criteria,
          createdById: mockUserId,
        }),
      });
      
      expect(result).toEqual(expect.objectContaining({
        id: mockCreatedSegment.id,
        name: mockCreatedSegment.name,
        criteria: mockCreatedSegment.criteria,
      }));
    });
    
    it('should throw ValidationError if segment data is invalid', async () => {
      // Arrange
      const invalidData = {
        ...mockSegmentData,
        name: '', // Invalid empty name
      };
      
      // Act & Assert
      await expect(service.createSegment(invalidData, mockUserId))
        .rejects
        .toThrow(ValidationError);
    });
    
    it('should throw DatabaseError if database operation fails', async () => {
      // Arrange
      (prisma.segment.create as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      // Act & Assert
      await expect(service.createSegment(mockSegmentData, mockUserId))
        .rejects
        .toThrow(DatabaseError);
    });
    
    it('should log audit event after creating segment', async () => {
      // Arrange
      (prisma.segment.create as jest.Mock).mockResolvedValue(mockCreatedSegment);
      
      // Act
      await service.createSegment(mockSegmentData, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'segment.create',
        resourceId: mockCreatedSegment.id,
        userId: mockUserId,
        details: expect.any(Object),
      });
    });
  });
  
  describe('getSegmentById', () => {
    const mockSegment = {
      id: 'segment-123',
      name: 'Test Segment',
      description: 'A test segment',
      isActive: true,
      criteria: {
        type: 'AND',
        conditions: [
          { field: 'email', operator: 'contains', value: 'example.com' }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 'user-123',
      updatedById: null,
    };
    
    it('should retrieve a segment by ID', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      
      // Act
      const result = await service.getSegmentById('segment-123');
      
      // Assert
      expect(prisma.segment.findUnique).toHaveBeenCalledWith({
        where: { id: 'segment-123' },
        include: expect.any(Object),
      });
      
      expect(result).toEqual(expect.objectContaining({
        id: mockSegment.id,
        name: mockSegment.name,
        criteria: mockSegment.criteria,
      }));
    });
    
    it('should include members when requested', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contactSegment.findMany as jest.Mock).mockResolvedValue([
        { contactId: 'contact-1', segmentId: 'segment-123', contact: { id: 'contact-1', name: 'John Doe' } },
        { contactId: 'contact-2', segmentId: 'segment-123', contact: { id: 'contact-2', name: 'Jane Smith' } },
      ]);
      
      // Act
      const result = await service.getSegmentById('segment-123', true);
      
      // Assert
      expect(prisma.contactSegment.findMany).toHaveBeenCalledWith({
        where: { segmentId: 'segment-123' },
        include: { contact: true },
      });
      
      expect(result).toHaveProperty('members');
      expect(result.members).toHaveLength(2);
      expect(result.members[0]).toHaveProperty('contact');
      expect(result.members[0].contact).toHaveProperty('name');
    });
    
    it('should throw NotFoundError if segment does not exist', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.getSegmentById('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
  });
  
  describe('getSegments', () => {
    const mockSegments = [
      {
        id: 'segment-1',
        name: 'Active Customers',
        description: 'Customers who have made a purchase in the last 30 days',
        isActive: true,
        criteria: { type: 'AND', conditions: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'segment-2',
        name: 'Inactive Customers',
        description: 'Customers who have not made a purchase in the last 90 days',
        isActive: false,
        criteria: { type: 'AND', conditions: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    it('should retrieve segments with pagination', async () => {
      // Arrange
      (prisma.segment.count as jest.Mock).mockResolvedValue(2);
      (prisma.segment.findMany as jest.Mock).mockResolvedValue(mockSegments);
      
      // Act
      const result = await service.getSegments({ page: 1, limit: 10 });
      
      // Assert
      expect(prisma.segment.count).toHaveBeenCalled();
      expect(prisma.segment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );
      
      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockSegments[0].id,
            name: mockSegments[0].name,
          }),
          expect.objectContaining({
            id: mockSegments[1].id,
            name: mockSegments[1].name,
          }),
        ]),
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });
    
    it('should apply filters correctly', async () => {
      // Arrange
      const filters = {
        isActive: true,
        search: 'active',
        page: 2,
        limit: 5,
      };
      
      (prisma.segment.count as jest.Mock).mockResolvedValue(10);
      (prisma.segment.findMany as jest.Mock).mockResolvedValue([mockSegments[0]]);
      
      // Act
      const result = await service.getSegments(filters);
      
      // Assert
      expect(prisma.segment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: filters.isActive,
          OR: expect.arrayContaining([
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ]),
        }),
      });
      
      expect(prisma.segment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: filters.isActive,
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
  
  describe('updateSegment', () => {
    const mockSegment = {
      id: 'segment-123',
      name: 'Test Segment',
      description: 'A test segment',
      isActive: true,
      criteria: {
        type: 'AND',
        conditions: [
          { field: 'email', operator: 'contains', value: 'example.com' }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updateData = {
      name: 'Updated Segment',
      description: 'Updated description',
      isActive: false,
      criteria: {
        type: 'OR',
        conditions: [
          { field: 'email', operator: 'contains', value: 'example.com' },
          { field: 'status', operator: 'equals', value: 'ACTIVE' }
        ]
      },
    };
    
    it('should update a segment successfully', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.segment.update as jest.Mock).mockResolvedValue({
        ...mockSegment,
        ...updateData,
      });
      
      // Act
      const result = await service.updateSegment('segment-123', updateData, mockUserId);
      
      // Assert
      expect(prisma.segment.findUnique).toHaveBeenCalledWith({
        where: { id: 'segment-123' },
      });
      
      expect(prisma.segment.update).toHaveBeenCalledWith({
        where: { id: 'segment-123' },
        data: expect.objectContaining({
          name: updateData.name,
          description: updateData.description,
          isActive: updateData.isActive,
          criteria: updateData.criteria,
          updatedById: mockUserId,
        }),
      });
      
      expect(result).toEqual(expect.objectContaining({
        id: mockSegment.id,
        name: updateData.name,
        description: updateData.description,
        isActive: updateData.isActive,
        criteria: updateData.criteria,
      }));
    });
    
    it('should throw NotFoundError if segment does not exist', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.updateSegment('non-existent-id', updateData, mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after updating segment', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.segment.update as jest.Mock).mockResolvedValue({
        ...mockSegment,
        ...updateData,
      });
      
      // Act
      await service.updateSegment('segment-123', updateData, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'segment.update',
        resourceId: 'segment-123',
        userId: mockUserId,
        details: expect.objectContaining({
          updatedFields: Object.keys(updateData),
        }),
      });
    });
  });
  
  describe('addContactToSegment', () => {
    const mockSegment = {
      id: 'segment-123',
      name: 'Test Segment',
    };
    
    const mockContact = {
      id: 'contact-123',
      name: 'John Doe',
    };
    
    const mockContactSegment = {
      segmentId: 'segment-123',
      contactId: 'contact-123',
      createdAt: new Date(),
    };
    
    it('should add a contact to a segment successfully', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(null); // Contact not already in segment
      (prisma.contactSegment.create as jest.Mock).mockResolvedValue(mockContactSegment);
      
      // Act
      const result = await service.addContactToSegment(
        'segment-123',
        'contact-123',
        mockUserId
      );
      
      // Assert
      expect(prisma.segment.findUnique).toHaveBeenCalledWith({
        where: { id: 'segment-123' },
      });
      
      expect(prisma.contact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
      });
      
      expect(prisma.contactSegment.findUnique).toHaveBeenCalledWith({
        where: {
          segmentId_contactId: {
            segmentId: 'segment-123',
            contactId: 'contact-123',
          },
        },
      });
      
      expect(prisma.contactSegment.create).toHaveBeenCalledWith({
        data: {
          segmentId: 'segment-123',
          contactId: 'contact-123',
        },
      });
      
      expect(result).toEqual(mockContactSegment);
    });
    
    it('should throw NotFoundError if segment does not exist', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.addContactToSegment('non-existent-id', 'contact-123', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should throw NotFoundError if contact does not exist', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.addContactToSegment('segment-123', 'non-existent-id', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should return existing record if contact is already in segment', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(mockContactSegment); // Contact already in segment
      
      // Act
      const result = await service.addContactToSegment(
        'segment-123',
        'contact-123',
        mockUserId
      );
      
      // Assert
      expect(prisma.contactSegment.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockContactSegment);
    });
    
    it('should log audit event after adding contact to segment', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.contactSegment.create as jest.Mock).mockResolvedValue(mockContactSegment);
      
      // Act
      await service.addContactToSegment('segment-123', 'contact-123', mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'segment.contact.add',
        resourceId: 'segment-123',
        userId: mockUserId,
        details: expect.objectContaining({
          contactId: 'contact-123',
        }),
      });
    });
  });
  
  describe('removeContactFromSegment', () => {
    const mockSegment = {
      id: 'segment-123',
      name: 'Test Segment',
    };
    
    const mockContact = {
      id: 'contact-123',
      name: 'John Doe',
    };
    
    const mockContactSegment = {
      segmentId: 'segment-123',
      contactId: 'contact-123',
      createdAt: new Date(),
    };
    
    it('should remove a contact from a segment successfully', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(mockContactSegment);
      (prisma.contactSegment.delete as jest.Mock).mockResolvedValue(mockContactSegment);
      
      // Act
      const result = await service.removeContactFromSegment(
        'segment-123',
        'contact-123',
        mockUserId
      );
      
      // Assert
      expect(prisma.segment.findUnique).toHaveBeenCalledWith({
        where: { id: 'segment-123' },
      });
      
      expect(prisma.contact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
      });
      
      expect(prisma.contactSegment.findUnique).toHaveBeenCalledWith({
        where: {
          segmentId_contactId: {
            segmentId: 'segment-123',
            contactId: 'contact-123',
          },
        },
      });
      
      expect(prisma.contactSegment.delete).toHaveBeenCalledWith({
        where: {
          segmentId_contactId: {
            segmentId: 'segment-123',
            contactId: 'contact-123',
          },
        },
      });
      
      expect(result).toEqual({ success: true });
    });
    
    it('should throw NotFoundError if segment does not exist', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.removeContactFromSegment('non-existent-id', 'contact-123', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should throw NotFoundError if contact does not exist', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.removeContactFromSegment('segment-123', 'non-existent-id', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should throw NotFoundError if contact is not in segment', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.removeContactFromSegment('segment-123', 'contact-123', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after removing contact from segment', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findUnique as jest.Mock).mockResolvedValue(mockContact);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(mockContactSegment);
      (prisma.contactSegment.delete as jest.Mock).mockResolvedValue(mockContactSegment);
      
      // Act
      await service.removeContactFromSegment('segment-123', 'contact-123', mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'segment.contact.remove',
        resourceId: 'segment-123',
        userId: mockUserId,
        details: expect.objectContaining({
          contactId: 'contact-123',
        }),
      });
    });
  });
  
  describe('applyCriteria', () => {
    const mockSegment = {
      id: 'segment-123',
      name: 'Test Segment',
      criteria: {
        type: 'AND',
        conditions: [
          { field: 'email', operator: 'contains', value: 'example.com' }
        ]
      },
    };
    
    const mockMatchingContacts = [
      { id: 'contact-1', email: 'john@example.com' },
      { id: 'contact-2', email: 'jane@example.com' },
    ];
    
    it('should apply criteria and add matching contacts to segment', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockMatchingContacts);
      (prisma.contactSegment.findMany as jest.Mock).mockResolvedValue([
        { contactId: 'contact-1', segmentId: 'segment-123' }, // contact-1 already in segment
      ]);
      
      // Act
      const result = await service.applyCriteria('segment-123', mockUserId);
      
      // Assert
      expect(prisma.segment.findUnique).toHaveBeenCalledWith({
        where: { id: 'segment-123' },
      });
      
      expect(prisma.contact.findMany).toHaveBeenCalledWith({
        where: expect.any(Object), // Complex criteria object
      });
      
      expect(prisma.contactSegment.findMany).toHaveBeenCalledWith({
        where: { segmentId: 'segment-123' },
        select: { contactId: true },
      });
      
      // Should only create for contact-2 (not already in segment)
      expect(prisma.contactSegment.create).toHaveBeenCalledTimes(1);
      expect(prisma.contactSegment.create).toHaveBeenCalledWith({
        data: {
          segmentId: 'segment-123',
          contactId: 'contact-2',
        },
      });
      
      expect(result).toEqual({
        matchedCount: 2,
        addedCount: 1,
        existingCount: 1,
      });
    });
    
    it('should throw NotFoundError if segment does not exist', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.applyCriteria('non-existent-id', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should handle empty criteria gracefully', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue({
        ...mockSegment,
        criteria: { type: 'AND', conditions: [] },
      });
      
      // Act & Assert
      await expect(service.applyCriteria('segment-123', mockUserId))
        .rejects
        .toThrow(ValidationError);
    });
    
    it('should log audit event after applying criteria', async () => {
      // Arrange
      (prisma.segment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.contact.findMany as jest.Mock).mockResolvedValue(mockMatchingContacts);
      (prisma.contactSegment.findMany as jest.Mock).mockResolvedValue([
        { contactId: 'contact-1', segmentId: 'segment-123' },
      ]);
      
      // Act
      await service.applyCriteria('segment-123', mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'segment.criteria.apply',
        resourceId: 'segment-123',
        userId: mockUserId,
        details: expect.objectContaining({
          matchedCount: 2,
          addedCount: 1,
        }),
      });
    });
  });
});
