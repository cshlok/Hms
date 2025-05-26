import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackService } from '../feedback.service';
import { prisma } from '@/lib/prisma';
import { SecurityService } from '@/lib/security.service';
import { ErrorHandler } from '@/lib/error-handler';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feedback: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    complaint: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    feedbackResponse: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    complaintResolution: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    patient: {
      findUnique: vi.fn()
    },
    department: {
      findUnique: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}));

// Mock Security Service
vi.mock('@/lib/security.service', () => ({
  SecurityService: {
    sanitizeInput: vi.fn(input => input),
    sanitizeObject: vi.fn(obj => obj),
    encryptSensitiveData: vi.fn(data => `encrypted_${data}`),
    decryptSensitiveData: vi.fn(data => data.replace('encrypted_', '')),
    validateHipaaCompliance: vi.fn(() => true)
  }
}));

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  
  beforeEach(() => {
    feedbackService = new FeedbackService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('getFeedbacks', () => {
    it('should return feedbacks with pagination', async () => {
      // Mock data
      const mockFeedbacks = [
        {
          id: '1',
          patientId: 'patient1',
          departmentId: 'dept1',
          feedbackType: 'GENERAL',
          rating: 4,
          comments: 'Great service',
          status: 'NEW',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          patientId: 'patient2',
          departmentId: 'dept2',
          feedbackType: 'CARE_QUALITY',
          rating: 5,
          comments: 'Excellent care',
          status: 'REVIEWED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.feedback.findMany as any).mockResolvedValue(mockFeedbacks);
      (prisma.feedback.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await feedbackService.getFeedbacks({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockFeedbacks,
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 2,
          totalPages: 1
        }
      });
    });
    
    it('should apply filters correctly', async () => {
      // Mock data
      const mockFeedbacks = [
        {
          id: '1',
          patientId: 'patient1',
          departmentId: 'dept1',
          feedbackType: 'GENERAL',
          rating: 4,
          comments: 'Great service',
          status: 'NEW',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.feedback.findMany as any).mockResolvedValue(mockFeedbacks);
      (prisma.feedback.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await feedbackService.getFeedbacks({
        status: 'NEW',
        feedbackType: 'GENERAL',
        departmentId: 'dept1',
        minRating: 4,
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'NEW',
            feedbackType: 'GENERAL',
            departmentId: 'dept1',
            rating: { gte: 4 }
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockFeedbacks);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('createFeedback', () => {
    it('should create a new feedback', async () => {
      // Mock data
      const mockFeedback = {
        patientId: 'patient1',
        departmentId: 'dept1',
        feedbackType: 'GENERAL',
        rating: 4,
        comments: 'Great service',
        contactEmail: 'patient@example.com',
        contactPhone: '555-1234',
        isAnonymous: false
      };
      
      const mockCreatedFeedback = {
        id: '1',
        ...mockFeedback,
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.patient.findUnique as any).mockResolvedValue({ id: 'patient1', name: 'John Doe' });
      (prisma.department.findUnique as any).mockResolvedValue({ id: 'dept1', name: 'Cardiology' });
      (prisma.feedback.create as any).mockResolvedValue(mockCreatedFeedback);
      
      // Call the service method
      const result = await feedbackService.createFeedback(mockFeedback);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'patient1',
          departmentId: 'dept1',
          feedbackType: 'GENERAL',
          rating: 4,
          comments: 'Great service',
          contactEmail: expect.stringContaining('encrypted_'),
          contactPhone: expect.stringContaining('encrypted_'),
          isAnonymous: false,
          status: 'NEW'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedFeedback);
    });
    
    it('should create anonymous feedback without patient ID', async () => {
      // Mock data
      const mockFeedback = {
        departmentId: 'dept1',
        feedbackType: 'GENERAL',
        rating: 4,
        comments: 'Great service',
        isAnonymous: true
      };
      
      const mockCreatedFeedback = {
        id: '1',
        ...mockFeedback,
        patientId: null,
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.department.findUnique as any).mockResolvedValue({ id: 'dept1', name: 'Cardiology' });
      (prisma.feedback.create as any).mockResolvedValue(mockCreatedFeedback);
      
      // Call the service method
      const result = await feedbackService.createFeedback(mockFeedback);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          departmentId: 'dept1',
          feedbackType: 'GENERAL',
          rating: 4,
          comments: 'Great service',
          isAnonymous: true,
          status: 'NEW'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedFeedback);
    });
    
    it('should throw an error if department does not exist', async () => {
      // Mock data
      const mockFeedback = {
        departmentId: 'invalid-dept',
        feedbackType: 'GENERAL',
        rating: 4,
        comments: 'Great service',
        isAnonymous: true
      };
      
      // Mock Prisma response
      (prisma.department.findUnique as any).mockResolvedValue(null);
      
      // Expect the creation to throw an error
      await expect(feedbackService.createFeedback(mockFeedback)).rejects.toThrow();
    });
  });
  
  describe('getFeedbackById', () => {
    it('should return a feedback by ID', async () => {
      // Mock data
      const mockFeedback = {
        id: '1',
        patientId: 'patient1',
        departmentId: 'dept1',
        feedbackType: 'GENERAL',
        rating: 4,
        comments: 'Great service',
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.feedback.findUnique as any).mockResolvedValue(mockFeedback);
      
      // Call the service method
      const result = await feedbackService.getFeedbackById('1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.feedback.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockFeedback);
    });
    
    it('should throw an error if feedback does not exist', async () => {
      // Mock Prisma response
      (prisma.feedback.findUnique as any).mockResolvedValue(null);
      
      // Expect the retrieval to throw an error
      await expect(feedbackService.getFeedbackById('invalid-id')).rejects.toThrow();
    });
  });
  
  describe('updateFeedbackStatus', () => {
    it('should update a feedback status', async () => {
      // Mock data
      const mockExistingFeedback = {
        id: '1',
        patientId: 'patient1',
        departmentId: 'dept1',
        feedbackType: 'GENERAL',
        rating: 4,
        comments: 'Great service',
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdatedFeedback = {
        ...mockExistingFeedback,
        status: 'REVIEWED',
        reviewedById: 'user1',
        reviewedBy: { id: 'user1', name: 'Admin User' },
        reviewedAt: expect.any(Date),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.feedback.findUnique as any).mockResolvedValue(mockExistingFeedback);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Admin User' });
      (prisma.feedback.update as any).mockResolvedValue(mockUpdatedFeedback);
      
      // Call the service method
      const result = await feedbackService.updateFeedbackStatus('1', 'REVIEWED', 'user1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.feedback.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'REVIEWED',
          reviewedById: 'user1',
          reviewedAt: expect.any(Date)
        },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedFeedback);
    });
    
    it('should throw an error if feedback does not exist', async () => {
      // Mock Prisma response
      (prisma.feedback.findUnique as any).mockResolvedValue(null);
      
      // Expect the update to throw an error
      await expect(feedbackService.updateFeedbackStatus('invalid-id', 'REVIEWED', 'user1')).rejects.toThrow();
    });
  });
  
  describe('respondToFeedback', () => {
    it('should create a response to feedback', async () => {
      // Mock data
      const mockExistingFeedback = {
        id: '1',
        patientId: 'patient1',
        departmentId: 'dept1',
        feedbackType: 'GENERAL',
        rating: 4,
        comments: 'Great service',
        status: 'REVIEWED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockResponse = {
        feedbackId: '1',
        responseText: 'Thank you for your feedback',
        respondedById: 'user1'
      };
      
      const mockCreatedResponse = {
        id: 'resp1',
        ...mockResponse,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdatedFeedback = {
        ...mockExistingFeedback,
        status: 'RESPONDED',
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.feedback.findUnique as any).mockResolvedValue(mockExistingFeedback);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Admin User' });
      (prisma.feedbackResponse.create as any).mockResolvedValue(mockCreatedResponse);
      (prisma.feedback.update as any).mockResolvedValue(mockUpdatedFeedback);
      
      // Call the service method
      const result = await feedbackService.respondToFeedback('1', 'Thank you for your feedback', 'user1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.feedbackResponse.create).toHaveBeenCalledWith({
        data: {
          feedbackId: '1',
          responseText: 'Thank you for your feedback',
          respondedById: 'user1'
        }
      });
      
      expect(prisma.feedback.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'RESPONDED'
        },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual({
        feedback: mockUpdatedFeedback,
        response: mockCreatedResponse
      });
    });
    
    it('should throw an error if feedback does not exist', async () => {
      // Mock Prisma response
      (prisma.feedback.findUnique as any).mockResolvedValue(null);
      
      // Expect the response creation to throw an error
      await expect(feedbackService.respondToFeedback('invalid-id', 'Response', 'user1')).rejects.toThrow();
    });
  });
  
  describe('getComplaints', () => {
    it('should return complaints with pagination', async () => {
      // Mock data
      const mockComplaints = [
        {
          id: '1',
          patientId: 'patient1',
          departmentId: 'dept1',
          complaintType: 'SERVICE_QUALITY',
          description: 'Long waiting time',
          severity: 'MEDIUM',
          status: 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          patientId: 'patient2',
          departmentId: 'dept2',
          complaintType: 'BILLING',
          description: 'Incorrect charges',
          severity: 'HIGH',
          status: 'INVESTIGATING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.complaint.findMany as any).mockResolvedValue(mockComplaints);
      (prisma.complaint.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await feedbackService.getComplaints({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockComplaints,
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 2,
          totalPages: 1
        }
      });
    });
    
    it('should apply filters correctly', async () => {
      // Mock data
      const mockComplaints = [
        {
          id: '1',
          patientId: 'patient1',
          departmentId: 'dept1',
          complaintType: 'SERVICE_QUALITY',
          description: 'Long waiting time',
          severity: 'MEDIUM',
          status: 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.complaint.findMany as any).mockResolvedValue(mockComplaints);
      (prisma.complaint.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await feedbackService.getComplaints({
        status: 'OPEN',
        complaintType: 'SERVICE_QUALITY',
        departmentId: 'dept1',
        severity: 'MEDIUM',
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'OPEN',
            complaintType: 'SERVICE_QUALITY',
            departmentId: 'dept1',
            severity: 'MEDIUM'
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockComplaints);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('createComplaint', () => {
    it('should create a new complaint', async () => {
      // Mock data
      const mockComplaint = {
        patientId: 'patient1',
        departmentId: 'dept1',
        complaintType: 'SERVICE_QUALITY',
        description: 'Long waiting time',
        severity: 'MEDIUM',
        incidentDate: new Date(),
        contactEmail: 'patient@example.com',
        contactPhone: '555-1234',
        preferredContactMethod: 'EMAIL',
        isAnonymous: false
      };
      
      const mockCreatedComplaint = {
        id: '1',
        ...mockComplaint,
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.patient.findUnique as any).mockResolvedValue({ id: 'patient1', name: 'John Doe' });
      (prisma.department.findUnique as any).mockResolvedValue({ id: 'dept1', name: 'Cardiology' });
      (prisma.complaint.create as any).mockResolvedValue(mockCreatedComplaint);
      
      // Call the service method
      const result = await feedbackService.createComplaint(mockComplaint);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.complaint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'patient1',
          departmentId: 'dept1',
          complaintType: 'SERVICE_QUALITY',
          description: 'Long waiting time',
          severity: 'MEDIUM',
          incidentDate: expect.any(Date),
          contactEmail: expect.stringContaining('encrypted_'),
          contactPhone: expect.stringContaining('encrypted_'),
          preferredContactMethod: 'EMAIL',
          isAnonymous: false,
          status: 'OPEN'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedComplaint);
    });
    
    it('should create anonymous complaint without patient ID', async () => {
      // Mock data
      const mockComplaint = {
        departmentId: 'dept1',
        complaintType: 'SERVICE_QUALITY',
        description: 'Long waiting time',
        severity: 'MEDIUM',
        incidentDate: new Date(),
        isAnonymous: true
      };
      
      const mockCreatedComplaint = {
        id: '1',
        ...mockComplaint,
        patientId: null,
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.department.findUnique as any).mockResolvedValue({ id: 'dept1', name: 'Cardiology' });
      (prisma.complaint.create as any).mockResolvedValue(mockCreatedComplaint);
      
      // Call the service method
      const result = await feedbackService.createComplaint(mockComplaint);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.complaint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          departmentId: 'dept1',
          complaintType: 'SERVICE_QUALITY',
          description: 'Long waiting time',
          severity: 'MEDIUM',
          incidentDate: expect.any(Date),
          isAnonymous: true,
          status: 'OPEN'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedComplaint);
    });
  });
  
  describe('getComplaintById', () => {
    it('should return a complaint by ID', async () => {
      // Mock data
      const mockComplaint = {
        id: '1',
        patientId: 'patient1',
        departmentId: 'dept1',
        complaintType: 'SERVICE_QUALITY',
        description: 'Long waiting time',
        severity: 'MEDIUM',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.complaint.findUnique as any).mockResolvedValue(mockComplaint);
      
      // Call the service method
      const result = await feedbackService.getComplaintById('1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.complaint.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockComplaint);
    });
    
    it('should throw an error if complaint does not exist', async () => {
      // Mock Prisma response
      (prisma.complaint.findUnique as any).mockResolvedValue(null);
      
      // Expect the retrieval to throw an error
      await expect(feedbackService.getComplaintById('invalid-id')).rejects.toThrow();
    });
  });
  
  describe('updateComplaintStatus', () => {
    it('should update a complaint status', async () => {
      // Mock data
      const mockExistingComplaint = {
        id: '1',
        patientId: 'patient1',
        departmentId: 'dept1',
        complaintType: 'SERVICE_QUALITY',
        description: 'Long waiting time',
        severity: 'MEDIUM',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdatedComplaint = {
        ...mockExistingComplaint,
        status: 'INVESTIGATING',
        assignedToId: 'user1',
        assignedTo: { id: 'user1', name: 'Admin User' },
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.complaint.findUnique as any).mockResolvedValue(mockExistingComplaint);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Admin User' });
      (prisma.complaint.update as any).mockResolvedValue(mockUpdatedComplaint);
      
      // Call the service method
      const result = await feedbackService.updateComplaintStatus('1', 'INVESTIGATING', 'user1', 'Started investigation');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.complaint.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'INVESTIGATING',
          assignedToId: 'user1'
        },
        include: expect.any(Object)
      });
      
      expect(prisma.complaintResolution.create).toHaveBeenCalledWith({
        data: {
          complaintId: '1',
          status: 'INVESTIGATING',
          notes: 'Started investigation',
          createdById: 'user1'
        }
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedComplaint);
    });
    
    it('should throw an error if complaint does not exist', async () => {
      // Mock Prisma response
      (prisma.complaint.findUnique as any).mockResolvedValue(null);
      
      // Expect the update to throw an error
      await expect(feedbackService.updateComplaintStatus('invalid-id', 'INVESTIGATING', 'user1')).rejects.toThrow();
    });
  });
  
  describe('resolveComplaint', () => {
    it('should resolve a complaint', async () => {
      // Mock data
      const mockExistingComplaint = {
        id: '1',
        patientId: 'patient1',
        departmentId: 'dept1',
        complaintType: 'SERVICE_QUALITY',
        description: 'Long waiting time',
        severity: 'MEDIUM',
        status: 'INVESTIGATING',
        assignedToId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockResolution = {
        complaintId: '1',
        resolutionDetails: 'Added more staff to reduce waiting time',
        actionTaken: 'PROCESS_IMPROVEMENT',
        resolvedById: 'user1'
      };
      
      const mockCreatedResolution = {
        id: 'res1',
        ...mockResolution,
        status: 'RESOLVED',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdatedComplaint = {
        ...mockExistingComplaint,
        status: 'RESOLVED',
        resolvedAt: expect.any(Date),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.complaint.findUnique as any).mockResolvedValue(mockExistingComplaint);
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Admin User' });
      (prisma.complaintResolution.create as any).mockResolvedValue(mockCreatedResolution);
      (prisma.complaint.update as any).mockResolvedValue(mockUpdatedComplaint);
      
      // Call the service method
      const result = await feedbackService.resolveComplaint(
        '1',
        'Added more staff to reduce waiting time',
        'PROCESS_IMPROVEMENT',
        'user1'
      );
      
      // Verify Prisma was called with correct arguments
      expect(prisma.complaintResolution.create).toHaveBeenCalledWith({
        data: {
          complaintId: '1',
          status: 'RESOLVED',
          resolutionDetails: 'Added more staff to reduce waiting time',
          actionTaken: 'PROCESS_IMPROVEMENT',
          createdById: 'user1'
        }
      });
      
      expect(prisma.complaint.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'RESOLVED',
          resolvedAt: expect.any(Date)
        },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual({
        complaint: mockUpdatedComplaint,
        resolution: mockCreatedResolution
      });
    });
    
    it('should throw an error if complaint does not exist', async () => {
      // Mock Prisma response
      (prisma.complaint.findUnique as any).mockResolvedValue(null);
      
      // Expect the resolution to throw an error
      await expect(feedbackService.resolveComplaint(
        'invalid-id',
        'Resolution details',
        'PROCESS_IMPROVEMENT',
        'user1'
      )).rejects.toThrow();
    });
    
    it('should throw an error if complaint is already resolved', async () => {
      // Mock data
      const mockExistingComplaint = {
        id: '1',
        status: 'RESOLVED',
        resolvedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.complaint.findUnique as any).mockResolvedValue(mockExistingComplaint);
      
      // Expect the resolution to throw an error
      await expect(feedbackService.resolveComplaint(
        '1',
        'Resolution details',
        'PROCESS_IMPROVEMENT',
        'user1'
      )).rejects.toThrow();
    });
  });
  
  describe('getFeedbackAnalytics', () => {
    it('should return feedback analytics data', async () => {
      // Mock data for feedback types
      const mockFeedbackTypes = [
        { feedbackType: 'GENERAL', count: 10 },
        { feedbackType: 'CARE_QUALITY', count: 15 },
        { feedbackType: 'STAFF', count: 8 },
        { feedbackType: 'FACILITIES', count: 5 }
      ];
      
      // Mock data for ratings distribution
      const mockRatings = [
        { rating: 1, count: 2 },
        { rating: 2, count: 3 },
        { rating: 3, count: 8 },
        { rating: 4, count: 15 },
        { rating: 5, count: 10 }
      ];
      
      // Mock data for department distribution
      const mockDepartments = [
        { departmentId: 'dept1', _count: { id: 12 } },
        { departmentId: 'dept2', _count: { id: 8 } },
        { departmentId: 'dept3', _count: { id: 5 } }
      ];
      
      // Mock Prisma response for each query
      (prisma.feedback.groupBy as any) = vi.fn();
      (prisma.feedback.groupBy as any)
        .mockResolvedValueOnce(mockFeedbackTypes)
        .mockResolvedValueOnce(mockRatings);
      
      (prisma.feedback.count as any).mockResolvedValue(38);
      
      (prisma.feedback.groupBy as any).mockResolvedValue(mockDepartments);
      
      // Call the service method
      const result = await feedbackService.getFeedbackAnalytics();
      
      // Verify result structure
      expect(result).toHaveProperty('totalFeedbacks', 38);
      expect(result).toHaveProperty('feedbackTypeDistribution');
      expect(result).toHaveProperty('ratingDistribution');
      expect(result).toHaveProperty('departmentDistribution');
      expect(result).toHaveProperty('averageRating');
      
      // Verify specific data
      expect(result.feedbackTypeDistribution).toEqual(expect.arrayContaining([
        { feedbackType: 'GENERAL', count: 10 },
        { feedbackType: 'CARE_QUALITY', count: 15 }
      ]));
      
      expect(result.ratingDistribution).toEqual(expect.arrayContaining([
        { rating: 4, count: 15 },
        { rating: 5, count: 10 }
      ]));
      
      // Verify average rating calculation
      const totalRatings = mockRatings.reduce((sum, item) => sum + (item.rating * item.count), 0);
      const totalCount = mockRatings.reduce((sum, item) => sum + item.count, 0);
      expect(result.averageRating).toBeCloseTo(totalRatings / totalCount, 2);
    });
    
    it('should apply date filters when provided', async () => {
      // Mock dates
      const fromDate = new Date('2025-05-01');
      const toDate = new Date('2025-05-25');
      
      // Mock Prisma response
      (prisma.feedback.groupBy as any) = vi.fn().mockResolvedValue([]);
      (prisma.feedback.count as any).mockResolvedValue(0);
      
      // Call the service method with date filters
      await feedbackService.getFeedbackAnalytics(fromDate, toDate);
      
      // Verify Prisma was called with date filters
      expect(prisma.feedback.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      });
      
      expect(prisma.feedback.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: fromDate,
              lte: toDate
            }
          }
        })
      );
    });
  });
  
  describe('getComplaintAnalytics', () => {
    it('should return complaint analytics data', async () => {
      // Mock data for complaint types
      const mockComplaintTypes = [
        { complaintType: 'SERVICE_QUALITY', count: 8 },
        { complaintType: 'BILLING', count: 12 },
        { complaintType: 'STAFF_BEHAVIOR', count: 5 },
        { complaintType: 'FACILITIES', count: 3 }
      ];
      
      // Mock data for status distribution
      const mockStatuses = [
        { status: 'OPEN', count: 10 },
        { status: 'INVESTIGATING', count: 8 },
        { status: 'RESOLVED', count: 7 },
        { status: 'CLOSED', count: 3 }
      ];
      
      // Mock data for severity distribution
      const mockSeverities = [
        { severity: 'LOW', count: 5 },
        { severity: 'MEDIUM', count: 12 },
        { severity: 'HIGH', count: 8 },
        { severity: 'CRITICAL', count: 3 }
      ];
      
      // Mock Prisma response for each query
      (prisma.complaint.groupBy as any) = vi.fn();
      (prisma.complaint.groupBy as any)
        .mockResolvedValueOnce(mockComplaintTypes)
        .mockResolvedValueOnce(mockStatuses)
        .mockResolvedValueOnce(mockSeverities);
      
      (prisma.complaint.count as any).mockResolvedValue(28);
      
      // Call the service method
      const result = await feedbackService.getComplaintAnalytics();
      
      // Verify result structure
      expect(result).toHaveProperty('totalComplaints', 28);
      expect(result).toHaveProperty('complaintTypeDistribution');
      expect(result).toHaveProperty('statusDistribution');
      expect(result).toHaveProperty('severityDistribution');
      expect(result).toHaveProperty('resolutionRate');
      
      // Verify specific data
      expect(result.complaintTypeDistribution).toEqual(expect.arrayContaining([
        { complaintType: 'SERVICE_QUALITY', count: 8 },
        { complaintType: 'BILLING', count: 12 }
      ]));
      
      expect(result.statusDistribution).toEqual(expect.arrayContaining([
        { status: 'OPEN', count: 10 },
        { status: 'RESOLVED', count: 7 }
      ]));
      
      expect(result.severityDistribution).toEqual(expect.arrayContaining([
        { severity: 'MEDIUM', count: 12 },
        { severity: 'HIGH', count: 8 }
      ]));
      
      // Verify resolution rate calculation
      const resolvedCount = mockStatuses.find(s => s.status === 'RESOLVED')?.count || 0;
      const closedCount = mockStatuses.find(s => s.status === 'CLOSED')?.count || 0;
      const totalCount = mockStatuses.reduce((sum, item) => sum + item.count, 0);
      expect(result.resolutionRate).toBeCloseTo(((resolvedCount + closedCount) / totalCount) * 100, 2);
    });
    
    it('should apply date filters when provided', async () => {
      // Mock dates
      const fromDate = new Date('2025-05-01');
      const toDate = new Date('2025-05-25');
      
      // Mock Prisma response
      (prisma.complaint.groupBy as any) = vi.fn().mockResolvedValue([]);
      (prisma.complaint.count as any).mockResolvedValue(0);
      
      // Call the service method with date filters
      await feedbackService.getComplaintAnalytics(fromDate, toDate);
      
      // Verify Prisma was called with date filters
      expect(prisma.complaint.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      });
      
      expect(prisma.complaint.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: fromDate,
              lte: toDate
            }
          }
        })
      );
    });
  });
});
