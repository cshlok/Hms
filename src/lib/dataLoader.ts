import DataLoader from 'dataloader';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * DataLoader implementation for efficient batch loading of database records
 * Prevents N+1 query problems by batching database requests
 */
export function createLoaders() {
  return {
    /**
     * Patient loader - batch loads patients by ID
     */
    patient: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.patient', count: ids.length }, 'Batch loading patients');
      
      const patients = await prisma.patient.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      // Maintain order of requested IDs
      return ids.map(id => patients.find(p => p.id === id) || null);
    }),
    
    /**
     * Bed loader - batch loads beds by ID
     */
    bed: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.bed', count: ids.length }, 'Batch loading beds');
      
      const beds = await prisma.bed.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      return ids.map(id => beds.find(b => b.id === id) || null);
    }),
    
    /**
     * Ward loader - batch loads wards by ID
     */
    ward: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.ward', count: ids.length }, 'Batch loading wards');
      
      const wards = await prisma.ward.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      return ids.map(id => wards.find(w => w.id === id) || null);
    }),
    
    /**
     * Doctor loader - batch loads doctors by ID
     */
    doctor: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.doctor', count: ids.length }, 'Batch loading doctors');
      
      const doctors = await prisma.doctor.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      return ids.map(id => doctors.find(d => d.id === id) || null);
    }),
    
    /**
     * Encounter loader - batch loads encounters by ID
     */
    encounter: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.encounter', count: ids.length }, 'Batch loading encounters');
      
      const encounters = await prisma.encounter.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      return ids.map(id => encounters.find(e => e.id === id) || null);
    }),
    
    /**
     * Admission loader - batch loads admissions by ID
     */
    admission: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.admission', count: ids.length }, 'Batch loading admissions');
      
      const admissions = await prisma.admission.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      return ids.map(id => admissions.find(a => a.id === id) || null);
    }),
    
    /**
     * Discharge loader - batch loads discharges by ID
     */
    discharge: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.discharge', count: ids.length }, 'Batch loading discharges');
      
      const discharges = await prisma.discharge.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      return ids.map(id => discharges.find(d => d.id === id) || null);
    }),
    
    /**
     * Progress note loader - batch loads progress notes by ID
     */
    progressNote: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.progressNote', count: ids.length }, 'Batch loading progress notes');
      
      const progressNotes = await prisma.progressNote.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      return ids.map(id => progressNotes.find(n => n.id === id) || null);
    }),
    
    /**
     * Observation loader - batch loads observations by ID
     */
    observation: new DataLoader(async (ids: string[]) => {
      logger.debug({ action: 'dataLoader.observation', count: ids.length }, 'Batch loading observations');
      
      const observations = await prisma.observation.findMany({
        where: { id: { in: ids as string[] } },
      });
      
      return ids.map(id => observations.find(o => o.id === id) || null);
    }),
  };
}

/**
 * Type definition for the data loaders
 */
export type Loaders = ReturnType<typeof createLoaders>;
