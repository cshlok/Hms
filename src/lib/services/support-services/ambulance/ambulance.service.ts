import { prisma } from '@/lib/prisma';
import { Ambulance, AmbulanceCrew, AmbulanceTrip, AmbulanceMaintenance, AmbulanceInventory, AmbulanceRoute } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logging';
import { toFHIRAmbulance, toFHIRAmbulanceTrip, toFHIRAmbulanceCrew, toFHIRAmbulanceMaintenance } from '@/lib/models/ambulance';
import { NotificationService } from '@/lib/services/notification.service';
import { calculateRoute, estimateArrivalTime } from '@/lib/services/support-services/ambulance/routing.service';

export interface AmbulanceFilter {
  status?: string;
  vehicleType?: string;
  page: number;
  limit: number;
}

export interface AmbulanceTripFilter {
  status?: string;
  tripType?: string;
  priority?: string;
  ambulanceId?: string;
  patientId?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface CreateAmbulanceData {
  registrationNumber: string;
  vehicleType: string;
  capacity: number;
  features: string[];
  currentLocationId?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
}

export interface CreateAmbulanceTripData {
  ambulanceId: string;
  tripType: string;
  priority: string;
  patientId?: string;
  pickupLocationId?: string;
  dropLocationId?: string;
  scheduledTime: Date;
  notes?: string;
  medicalDetails?: any;
  crewIds?: string[];
}

export class AmbulanceService {
  private notificationService: NotificationService;
  
  constructor() {
    this.notificationService = new NotificationService();
  }
  
  /**
   * Get ambulances based on filters
   */
  async getAmbulances(filter: AmbulanceFilter) {
    const { status, vehicleType, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) where.status = status;
    if (vehicleType) where.vehicleType = vehicleType;
    
    const [ambulances, total] = await Promise.all([
      prisma.ambulance.findMany({
        where,
        include: {
          currentLocation: true,
          crew: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            where: {
              status: 'ON_DUTY'
            }
          },
          _count: {
            select: {
              trips: {
                where: {
                  status: {
                    in: ['SCHEDULED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_DESTINATION']
                  }
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { registrationNumber: 'asc' }
      }),
      prisma.ambulance.count({ where })
    ]);
    
    // Convert to FHIR format
    const fhirAmbulances = ambulances.map(ambulance => toFHIRAmbulance(ambulance));
    
    return {
      data: ambulances,
      fhir: fhirAmbulances,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get ambulance by ID
   */
  async getAmbulanceById(id: string, includeFHIR: boolean = false): Promise<any> {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: {
        currentLocation: true,
        crew: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        trips: {
          where: {
            status: {
              in: ['SCHEDULED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_DESTINATION', 'ARRIVED_AT_DESTINATION']
            }
          },
          include: {
            patient: true,
            pickupLocation: true,
            dropLocation: true
          },
          orderBy: { scheduledTime: 'asc' }
        },
        maintenanceRecords: {
          where: {
            status: {
              in: ['SCHEDULED', 'IN_PROGRESS']
            }
          },
          orderBy: { scheduledDate: 'asc' }
        }
      }
    });
    
    if (!ambulance) {
      return null;
    }
    
    if (includeFHIR) {
      return {
        data: ambulance,
        fhir: toFHIRAmbulance(ambulance)
      };
    }
    
    return ambulance;
  }
  
  /**
   * Create a new ambulance
   */
  async createAmbulance(data: CreateAmbulanceData, userId: string): Promise<Ambulance> {
    // Check if registration number is already in use
    const existingAmbulance = await prisma.ambulance.findUnique({
      where: { registrationNumber: data.registrationNumber }
    });
    
    if (existingAmbulance) {
      throw new Error(`An ambulance with registration number ${data.registrationNumber} already exists`);
    }
    
    // Create the ambulance
    const ambulance = await prisma.ambulance.create({
      data: {
        registrationNumber: data.registrationNumber,
        vehicleType: data.vehicleType,
        status: 'AVAILABLE',
        capacity: data.capacity,
        features: data.features,
        currentLocationId: data.currentLocationId,
        lastMaintenanceDate: data.lastMaintenanceDate,
        nextMaintenanceDate: data.nextMaintenanceDate
      },
      include: {
        currentLocation: true
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'AMBULANCE',
      entityId: ambulance.id,
      userId,
      details: `Created ambulance with registration number ${ambulance.registrationNumber}`
    });
    
    return ambulance;
  }
  
  /**
   * Update an ambulance
   */
  async updateAmbulance(id: string, data: Partial<Ambulance>, userId: string): Promise<Ambulance> {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id }
    });
    
    if (!ambulance) {
      throw new Error('Ambulance not found');
    }
    
    // If registration number is being updated, check if it's already in use
    if (data.registrationNumber && data.registrationNumber !== ambulance.registrationNumber) {
      const existingAmbulance = await prisma.ambulance.findUnique({
        where: { registrationNumber: data.registrationNumber }
      });
      
      if (existingAmbulance) {
        throw new Error(`An ambulance with registration number ${data.registrationNumber} already exists`);
      }
    }
    
    // Update the ambulance
    const updatedAmbulance = await prisma.ambulance.update({
      where: { id },
      data,
      include: {
        currentLocation: true
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'AMBULANCE',
      entityId: id,
      userId,
      details: `Updated ambulance ${ambulance.registrationNumber}${data.status ? ` - Status changed to ${data.status}` : ''}`
    });
    
    // Send notification if status changed to UNDER_MAINTENANCE
    if (data.status === 'UNDER_MAINTENANCE' && ambulance.status !== 'UNDER_MAINTENANCE') {
      await this.notificationService.sendNotification({
        type: 'AMBULANCE_MAINTENANCE',
        title: `Ambulance Under Maintenance`,
        message: `Ambulance ${ambulance.registrationNumber} is now under maintenance`,
        recipientRoles: ['MAINTENANCE_MANAGER', 'AMBULANCE_COORDINATOR'],
        entityId: ambulance.id,
        metadata: {
          ambulanceId: ambulance.id,
          registrationNumber: ambulance.registrationNumber
        }
      });
    }
    
    return updatedAmbulance;
  }
  
  /**
   * Get ambulance trips based on filters
   */
  async getAmbulanceTrips(filter: AmbulanceTripFilter) {
    const { status, tripType, priority, ambulanceId, patientId, startDate, endDate, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) where.status = status;
    if (tripType) where.tripType = tripType;
    if (priority) where.priority = priority;
    if (ambulanceId) where.ambulanceId = ambulanceId;
    if (patientId) where.patientId = patientId;
    
    // Date range filter for scheduledTime
    if (startDate || endDate) {
      where.scheduledTime = {};
      if (startDate) where.scheduledTime.gte = startDate;
      if (endDate) where.scheduledTime.lte = endDate;
    }
    
    const [trips, total] = await Promise.all([
      prisma.ambulanceTrip.findMany({
        where,
        include: {
          ambulance: true,
          patient: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true,
              gender: true
            }
          },
          requestedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          pickupLocation: true,
          dropLocation: true,
          crew: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { scheduledTime: 'desc' }
      }),
      prisma.ambulanceTrip.count({ where })
    ]);
    
    // Convert to FHIR format
    const fhirTrips = trips.map(trip => toFHIRAmbulanceTrip(trip));
    
    return {
      data: trips,
      fhir: fhirTrips,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get ambulance trip by ID
   */
  async getAmbulanceTripById(id: string, includeFHIR: boolean = false): Promise<any> {
    const trip = await prisma.ambulanceTrip.findUnique({
      where: { id },
      include: {
        ambulance: true,
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true
          }
        },
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        pickupLocation: true,
        dropLocation: true,
        crew: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        route: true
      }
    });
    
    if (!trip) {
      return null;
    }
    
    if (includeFHIR) {
      return {
        data: trip,
        fhir: toFHIRAmbulanceTrip(trip)
      };
    }
    
    return trip;
  }
  
  /**
   * Create a new ambulance trip
   */
  async createAmbulanceTrip(data: CreateAmbulanceTripData, userId: string): Promise<AmbulanceTrip> {
    // Validate ambulance exists and is available
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: data.ambulanceId }
    });
    
    if (!ambulance) {
      throw new Error('Ambulance not found');
    }
    
    if (ambulance.status !== 'AVAILABLE' && ambulance.status !== 'ON_DUTY') {
      throw new Error(`Ambulance ${ambulance.registrationNumber} is not available (current status: ${ambulance.status})`);
    }
    
    // Validate locations if provided
    if (data.pickupLocationId) {
      const pickupLocation = await prisma.location.findUnique({
        where: { id: data.pickupLocationId }
      });
      
      if (!pickupLocation) {
        throw new Error('Pickup location not found');
      }
    }
    
    if (data.dropLocationId) {
      const dropLocation = await prisma.location.findUnique({
        where: { id: data.dropLocationId }
      });
      
      if (!dropLocation) {
        throw new Error('Drop location not found');
      }
    }
    
    // Validate patient if provided
    if (data.patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: data.patientId }
      });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
    }
    
    // Create the trip
    const trip = await prisma.ambulanceTrip.create({
      data: {
        ambulanceId: data.ambulanceId,
        tripType: data.tripType,
        status: 'SCHEDULED',
        priority: data.priority,
        patientId: data.patientId,
        requestedById: userId,
        pickupLocationId: data.pickupLocationId,
        dropLocationId: data.dropLocationId,
        scheduledTime: data.scheduledTime,
        notes: data.notes,
        medicalDetails: data.medicalDetails || {}
      },
      include: {
        ambulance: true,
        patient: true,
        pickupLocation: true,
        dropLocation: true
      }
    });
    
    // If both pickup and drop locations are provided, calculate route
    if (data.pickupLocationId && data.dropLocationId) {
      try {
        const routeData = await calculateRoute(data.pickupLocationId, data.dropLocationId);
        
        await prisma.ambulanceRoute.create({
          data: {
            tripId: trip.id,
            routeData: routeData.routeData,
            estimatedDistance: routeData.distance,
            estimatedDuration: routeData.duration
          }
        });
      } catch (error) {
        console.error('Error calculating route:', error);
        // Continue without route data
      }
    }
    
    // Assign crew if provided
    if (data.crewIds && data.crewIds.length > 0) {
      for (const crewId of data.crewIds) {
        try {
          await prisma.ambulanceCrew.update({
            where: {
              id: crewId
            },
            data: {
              trips: {
                connect: { id: trip.id }
              }
            }
          });
        } catch (error) {
          console.error(`Error assigning crew ${crewId} to trip:`, error);
          // Continue with other crew assignments
        }
      }
    }
    
    // Update ambulance status to ON_DUTY
    await prisma.ambulance.update({
      where: { id: data.ambulanceId },
      data: { status: 'ON_DUTY' }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'AMBULANCE_TRIP',
      entityId: trip.id,
      userId,
      details: `Created ${data.tripType} ambulance trip with ${ambulance.registrationNumber}`
    });
    
    // Send notification to ambulance crew
    await this.notificationService.sendNotification({
      type: 'AMBULANCE_TRIP_ASSIGNED',
      title: `New Ambulance Trip Assigned`,
      message: `A new ${data.tripType} trip has been assigned to ambulance ${ambulance.registrationNumber}`,
      recipientRoles: ['AMBULANCE_DRIVER', 'PARAMEDIC'],
      entityId: trip.id,
      metadata: {
        tripId: trip.id,
        ambulanceId: data.ambulanceId,
        priority: data.priority
      }
    });
    
    return trip;
  }
  
  /**
   * Update ambulance trip status
   */
  async updateAmbulanceTripStatus(id: string, status: string, userId: string, locationData?: any): Promise<AmbulanceTrip> {
    const trip = await prisma.ambulanceTrip.findUnique({
      where: { id },
      include: {
        ambulance: true,
        patient: true
      }
    });
    
    if (!trip) {
      throw new Error('Ambulance trip not found');
    }
    
    const updateData: any = { status };
    
    // Handle status-specific updates
    switch (status) {
      case 'EN_ROUTE_TO_PICKUP':
        updateData.startTime = new Date();
        break;
      
      case 'ARRIVED_AT_DESTINATION':
        // No specific updates needed
        break;
      
      case 'COMPLETED':
        updateData.endTime = new Date();
        if (trip.startTime) {
          const duration = Math.round((new Date().getTime() - trip.startTime.getTime()) / (60 * 1000)); // in minutes
          updateData.duration = duration;
        }
        break;
    }
    
    // Update the trip
    const updatedTrip = await prisma.ambulanceTrip.update({
      where: { id },
      data: updateData,
      include: {
        ambulance: true,
        patient: true,
        pickupLocation: true,
        dropLocation: true,
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // If trip is completed or cancelled, update ambulance status to AVAILABLE
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      // Check if ambulance has other active trips
      const activeTrips = await prisma.ambulanceTrip.count({
        where: {
          ambulanceId: trip.ambulanceId,
          id: { not: id },
          status: {
            in: ['SCHEDULED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_DESTINATION', 'ARRIVED_AT_DESTINATION']
          }
        }
      });
      
      if (activeTrips === 0) {
        await prisma.ambulance.update({
          where: { id: trip.ambulanceId },
          data: { status: 'AVAILABLE' }
        });
      }
    }
    
    // If location data is provided, update the route
    if (locationData && (status === 'EN_ROUTE_TO_PICKUP' || status === 'EN_ROUTE_TO_DESTINATION')) {
      try {
        // Update route with actual data
        await prisma.ambulanceRoute.upsert({
          where: { tripId: id },
          update: {
            routeData: {
              ...locationData,
              lastUpdated: new Date().toISOString()
            }
          },
          create: {
            tripId: id,
            routeData: {
              ...locationData,
              lastUpdated: new Date().toISOString()
            },
            estimatedDistance: locationData.distance || 0,
            estimatedDuration: locationData.duration || 0
          }
        });
      } catch (error) {
        console.error('Error updating route data:', error);
        // Continue without route update
      }
    }
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'AMBULANCE_TRIP',
      entityId: id,
      userId,
      details: `Updated ambulance trip status to ${status}`
    });
    
    // Send notifications based on status
    switch (status) {
      case 'EN_ROUTE_TO_PICKUP':
        await this.notificationService.sendNotification({
          type: 'AMBULANCE_EN_ROUTE',
          title: `Ambulance En Route to Pickup`,
          message: `Ambulance ${trip.ambulance.registrationNumber} is en route to pickup location`,
          recipientIds: [trip.requestedById],
          entityId: trip.id
        });
        break;
      
      case 'ARRIVED_AT_PICKUP':
        await this.notificationService.sendNotification({
          type: 'AMBULANCE_ARRIVED_PICKUP',
          title: `Ambulance Arrived at Pickup`,
          message: `Ambulance ${trip.ambulance.registrationNumber} has arrived at pickup location`,
          recipientIds: [trip.requestedById],
          entityId: trip.id
        });
        break;
      
      case 'COMPLETED':
        await this.notificationService.sendNotification({
          type: 'AMBULANCE_TRIP_COMPLETED',
          title: `Ambulance Trip Completed`,
          message: `Trip with ambulance ${trip.ambulance.registrationNumber} has been completed`,
          recipientIds: [trip.requestedById],
          recipientRoles: ['AMBULANCE_COORDINATOR'],
          entityId: trip.id
        });
        break;
    }
    
    return updatedTrip;
  }
  
  /**
   * Get available ambulances for a trip
   */
  async getAvailableAmbulances(tripType: string, scheduledTime: Date, pickupLocationId?: string): Promise<any[]> {
    // Get all ambulances that are AVAILABLE or ON_DUTY
    const ambulances = await prisma.ambulance.findMany({
      where: {
        status: {
          in: ['AVAILABLE', 'ON_DUTY']
        }
      },
      include: {
        currentLocation: true,
        crew: {
          where: {
            status: 'ON_DUTY'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        trips: {
          where: {
            status: {
              in: ['SCHEDULED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_DESTINATION']
            },
            scheduledTime: {
              // Find trips that might conflict with the scheduled time
              // Assuming trips take at most 2 hours
              gte: new Date(scheduledTime.getTime() - 2 * 60 * 60 * 1000),
              lte: new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000)
            }
          }
        }
      }
    });
    
    // Filter ambulances based on trip type
    const filteredAmbulances = ambulances.filter(ambulance => {
      // For emergency trips, only use ADVANCED_LIFE_SUPPORT ambulances
      if (tripType === 'EMERGENCY' && ambulance.vehicleType !== 'ADVANCED_LIFE_SUPPORT') {
        return false;
      }
      
      // For non-emergency trips, any ambulance type is fine
      
      // Check if ambulance has conflicting trips
      if (ambulance.trips.length > 0) {
        // If ambulance already has trips scheduled around this time, it's not available
        return false;
      }
      
      // Check if ambulance has required crew
      if (tripType === 'EMERGENCY' || tripType === 'NON_EMERGENCY') {
        // Need at least one paramedic and one driver
        const hasParamedic = ambulance.crew.some(crew => crew.role === 'PARAMEDIC' || crew.role === 'EMERGENCY_MEDICAL_TECHNICIAN');
        const hasDriver = ambulance.crew.some(crew => crew.role === 'DRIVER');
        
        if (!hasParamedic || !hasDriver) {
          return false;
        }
      } else {
        // For transfers and returns, just need a driver
        const hasDriver = ambulance.crew.some(crew => crew.role === 'DRIVER');
        
        if (!hasDriver) {
          return false;
        }
      }
      
      return true;
    });
    
    // If pickup location is provided, calculate estimated arrival times
    if (pickupLocationId) {
      const ambulancesWithETA = await Promise.all(
        filteredAmbulances.map(async ambulance => {
          if (ambulance.currentLocationId) {
            try {
              const eta = await estimateArrivalTime(ambulance.currentLocationId, pickupLocationId);
              return {
                ...ambulance,
                eta: {
                  minutes: eta.duration,
                  distance: eta.distance
                }
              };
            } catch (error) {
              console.error('Error estimating arrival time:', error);
              return {
                ...ambulance,
                eta: null
              };
            }
          }
          return {
            ...ambulance,
            eta: null
          };
        })
      );
      
      // Sort by ETA
      return ambulancesWithETA.sort((a, b) => {
        if (!a.eta) return 1;
        if (!b.eta) return -1;
        return a.eta.minutes - b.eta.minutes;
      });
    }
    
    return filteredAmbulances;
  }
  
  /**
   * Assign crew to ambulance
   */
  async assignCrewToAmbulance(ambulanceId: string, userId: string, role: string, shiftStart: Date, shiftEnd: Date, assignedBy: string): Promise<AmbulanceCrew> {
    // Validate ambulance exists
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: ambulanceId }
    });
    
    if (!ambulance) {
      throw new Error('Ambulance not found');
    }
    
    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user is already assigned to this ambulance
    const existingCrew = await prisma.ambulanceCrew.findFirst({
      where: {
        ambulanceId,
        userId
      }
    });
    
    if (existingCrew) {
      // Update existing crew assignment
      const updatedCrew = await prisma.ambulanceCrew.update({
        where: { id: existingCrew.id },
        data: {
          role,
          status: 'ON_DUTY',
          shiftStart,
          shiftEnd
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          ambulance: true
        }
      });
      
      // Create audit log
      await createAuditLog({
        action: 'UPDATE',
        entityType: 'AMBULANCE_CREW',
        entityId: updatedCrew.id,
        userId: assignedBy,
        details: `Updated crew assignment for ${user.name} on ambulance ${ambulance.registrationNumber}`
      });
      
      return updatedCrew;
    } else {
      // Create new crew assignment
      const crew = await prisma.ambulanceCrew.create({
        data: {
          ambulanceId,
          userId,
          role,
          status: 'ON_DUTY',
          shiftStart,
          shiftEnd
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          ambulance: true
        }
      });
      
      // Create audit log
      await createAuditLog({
        action: 'CREATE',
        entityType: 'AMBULANCE_CREW',
        entityId: crew.id,
        userId: assignedBy,
        details: `Assigned ${user.name} as ${role} to ambulance ${ambulance.registrationNumber}`
      });
      
      // Send notification to assigned crew member
      await this.notificationService.sendNotification({
        type: 'CREW_ASSIGNMENT',
        title: `Crew Assignment`,
        message: `You have been assigned as ${role} to ambulance ${ambulance.registrationNumber}`,
        recipientIds: [userId],
        entityId: crew.id,
        metadata: {
          crewId: crew.id,
          ambulanceId,
          role,
          shiftStart: shiftStart.toISOString(),
          shiftEnd: shiftEnd.toISOString()
        }
      });
      
      return crew;
    }
  }
  
  /**
   * End crew shift
   */
  async endCrewShift(crewId: string, userId: string): Promise<AmbulanceCrew> {
    const crew = await prisma.ambulanceCrew.findUnique({
      where: { id: crewId },
      include: {
        user: true,
        ambulance: true
      }
    });
    
    if (!crew) {
      throw new Error('Crew assignment not found');
    }
    
    // Update crew status to OFF_DUTY
    const updatedCrew = await prisma.ambulanceCrew.update({
      where: { id: crewId },
      data: {
        status: 'OFF_DUTY',
        shiftEnd: new Date()
      },
      include: {
        user: true,
        ambulance: true
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'AMBULANCE_CREW',
      entityId: crewId,
      userId,
      details: `Ended shift for ${crew.user.name} on ambulance ${crew.ambulance.registrationNumber}`
    });
    
    return updatedCrew;
  }
  
  /**
   * Schedule ambulance maintenance
   */
  async scheduleAmbulanceMaintenance(ambulanceId: string, data: any, userId: string): Promise<AmbulanceMaintenance> {
    // Validate ambulance exists
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: ambulanceId }
    });
    
    if (!ambulance) {
      throw new Error('Ambulance not found');
    }
    
    // Create maintenance record
    const maintenance = await prisma.ambulanceMaintenance.create({
      data: {
        ambulanceId,
        maintenanceType: data.maintenanceType,
        status: 'SCHEDULED',
        description: data.description,
        scheduledDate: new Date(data.scheduledDate),
        notes: data.notes
      },
      include: {
        ambulance: true
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'AMBULANCE_MAINTENANCE',
      entityId: maintenance.id,
      userId,
      details: `Scheduled ${data.maintenanceType} maintenance for ambulance ${ambulance.registrationNumber}`
    });
    
    // Send notification to maintenance staff
    await this.notificationService.sendNotification({
      type: 'MAINTENANCE_SCHEDULED',
      title: `Ambulance Maintenance Scheduled`,
      message: `${data.maintenanceType} maintenance scheduled for ambulance ${ambulance.registrationNumber} on ${new Date(data.scheduledDate).toLocaleDateString()}`,
      recipientRoles: ['MAINTENANCE_STAFF'],
      entityId: maintenance.id,
      metadata: {
        maintenanceId: maintenance.id,
        ambulanceId,
        maintenanceType: data.maintenanceType,
        scheduledDate: data.scheduledDate
      }
    });
    
    return maintenance;
  }
  
  /**
   * Update ambulance maintenance status
   */
  async updateMaintenanceStatus(id: string, status: string, userId: string, completionData?: any): Promise<AmbulanceMaintenance> {
    const maintenance = await prisma.ambulanceMaintenance.findUnique({
      where: { id },
      include: {
        ambulance: true
      }
    });
    
    if (!maintenance) {
      throw new Error('Maintenance record not found');
    }
    
    const updateData: any = { status };
    
    // If status is COMPLETED, add completion data
    if (status === 'COMPLETED') {
      updateData.completedDate = new Date();
      updateData.performedById = userId;
      
      if (completionData) {
        if (completionData.cost) {
          updateData.cost = completionData.cost;
        }
        if (completionData.notes) {
          updateData.notes = completionData.notes;
        }
      }
      
      // Update ambulance maintenance dates
      await prisma.ambulance.update({
        where: { id: maintenance.ambulanceId },
        data: {
          lastMaintenanceDate: new Date(),
          nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          status: 'AVAILABLE' // Set ambulance back to available
        }
      });
    }
    
    // Update the maintenance record
    const updatedMaintenance = await prisma.ambulanceMaintenance.update({
      where: { id },
      data: updateData,
      include: {
        ambulance: true,
        performedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'AMBULANCE_MAINTENANCE',
      entityId: id,
      userId,
      details: `Updated maintenance status to ${status} for ambulance ${maintenance.ambulance.registrationNumber}`
    });
    
    // Send notification if maintenance is completed
    if (status === 'COMPLETED') {
      await this.notificationService.sendNotification({
        type: 'MAINTENANCE_COMPLETED',
        title: `Ambulance Maintenance Completed`,
        message: `Maintenance for ambulance ${maintenance.ambulance.registrationNumber} has been completed`,
        recipientRoles: ['AMBULANCE_COORDINATOR'],
        entityId: maintenance.id
      });
    }
    
    return updatedMaintenance;
  }
  
  /**
   * Get ambulance inventory
   */
  async getAmbulanceInventory(ambulanceId: string): Promise<AmbulanceInventory[]> {
    // Validate ambulance exists
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: ambulanceId }
    });
    
    if (!ambulance) {
      throw new Error('Ambulance not found');
    }
    
    // Get inventory items
    const inventory = await prisma.ambulanceInventory.findMany({
      where: { ambulanceId },
      orderBy: { itemType: 'asc' }
    });
    
    return inventory;
  }
  
  /**
   * Update ambulance inventory item
   */
  async updateInventoryItem(id: string, data: Partial<AmbulanceInventory>, userId: string): Promise<AmbulanceInventory> {
    const item = await prisma.ambulanceInventory.findUnique({
      where: { id },
      include: {
        ambulance: true
      }
    });
    
    if (!item) {
      throw new Error('Inventory item not found');
    }
    
    // If restocking, update lastRestockedDate
    if (data.quantity !== undefined && data.quantity > item.quantity) {
      data.lastRestockedDate = new Date();
    }
    
    // Update the inventory item
    const updatedItem = await prisma.ambulanceInventory.update({
      where: { id },
      data,
      include: {
        ambulance: true
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'AMBULANCE_INVENTORY',
      entityId: id,
      userId,
      details: `Updated inventory for ${item.itemName} on ambulance ${item.ambulance.registrationNumber}, quantity: ${item.quantity} → ${data.quantity || item.quantity}`
    });
    
    // Send notification if quantity is below minimum
    if (updatedItem.quantity <= updatedItem.minimumQuantity) {
      await this.notificationService.sendNotification({
        type: 'INVENTORY_LOW',
        title: `Low Ambulance Inventory`,
        message: `${updatedItem.itemName} is running low on ambulance ${updatedItem.ambulance.registrationNumber} (${updatedItem.quantity} remaining)`,
        recipientRoles: ['AMBULANCE_COORDINATOR', 'INVENTORY_MANAGER'],
        entityId: updatedItem.id
      });
    }
    
    return updatedItem;
  }
  
  /**
   * Get ambulance analytics
   */
  async getAmbulanceAnalytics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY') {
    // Get date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'DAILY':
        startDate = new Date(now.setDate(now.getDate() - 30)); // Last 30 days
        break;
      case 'WEEKLY':
        startDate = new Date(now.setDate(now.getDate() - 90)); // Last 90 days
        break;
      case 'MONTHLY':
        startDate = new Date(now.setMonth(now.getMonth() - 12)); // Last 12 months
        break;
      case 'YEARLY':
        startDate = new Date(now.setFullYear(now.getFullYear() - 5)); // Last 5 years
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30)); // Default to last 30 days
    }
    
    // Get trip counts by status
    const tripsByStatus = await prisma.ambulanceTrip.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get trip counts by type
    const tripsByType = await prisma.ambulanceTrip.groupBy({
      by: ['tripType'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get trip counts by priority
    const tripsByPriority = await prisma.ambulanceTrip.groupBy({
      by: ['priority'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get ambulance utilization
    const ambulances = await prisma.ambulance.findMany({
      select: {
        id: true,
        registrationNumber: true,
        vehicleType: true,
        _count: {
          select: {
            trips: {
              where: {
                createdAt: {
                  gte: startDate
                }
              }
            }
          }
        }
      }
    });
    
    // Sort ambulances by trip count
    const ambulanceUtilization = ambulances
      .map(ambulance => ({
        id: ambulance.id,
        registrationNumber: ambulance.registrationNumber,
        vehicleType: ambulance.vehicleType,
        tripCount: ambulance._count.trips
      }))
      .sort((a, b) => b.tripCount - a.tripCount);
    
    // Get average trip duration
    const completedTrips = await prisma.ambulanceTrip.findMany({
      where: {
        status: 'COMPLETED',
        startTime: { not: null },
        endTime: { not: null },
        createdAt: {
          gte: startDate
        }
      },
      select: {
        duration: true,
        tripType: true
      }
    });
    
    // Calculate average duration by trip type
    const durationByType: Record<string, { count: number, totalDuration: number, avgDuration: number }> = {};
    
    completedTrips.forEach(trip => {
      if (trip.duration) {
        if (!durationByType[trip.tripType]) {
          durationByType[trip.tripType] = { count: 0, totalDuration: 0, avgDuration: 0 };
        }
        
        durationByType[trip.tripType].count++;
        durationByType[trip.tripType].totalDuration += trip.duration;
      }
    });
    
    // Calculate averages
    Object.keys(durationByType).forEach(type => {
      const data = durationByType[type];
      data.avgDuration = Math.round(data.totalDuration / data.count);
    });
    
    // Get maintenance statistics
    const maintenanceByType = await prisma.ambulanceMaintenance.groupBy({
      by: ['maintenanceType'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true,
      _sum: {
        cost: true
      }
    });
    
    return {
      tripsByStatus,
      tripsByType,
      tripsByPriority,
      ambulanceUtilization,
      durationByType,
      maintenanceByType,
      period
    };
  }
}
