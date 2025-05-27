/**
 * Blood Bank Inventory Management System
 * 
 * This module implements advanced inventory management features for the Blood Bank,
 * including product tracking, expiration management, quarantine workflows, and
 * inventory reporting.
 */

import {
  BloodProduct,
  BloodProductType,
  BloodProductStatus,
  BloodProductAttribute,
  BloodType,
  getBloodProduct,
  updateBloodProduct,
  getBloodProductsByTypeAndStatus,
  getBloodProductsByBloodTypeAndStatus,
  getBloodInventorySummary
} from './core-data-models';

// Inventory location
export enum InventoryLocation {
  MAIN_STORAGE = 'main_storage',
  QUARANTINE = 'quarantine',
  EMERGENCY_STORAGE = 'emergency_storage',
  ISSUED = 'issued',
  DISCARDED = 'discarded',
  OPERATING_ROOM = 'operating_room',
  EMERGENCY_DEPARTMENT = 'emergency_department',
  INTENSIVE_CARE = 'intensive_care',
  TRANSPORT = 'transport'
}

// Inventory transaction type
export enum InventoryTransactionType {
  RECEIPT = 'receipt',
  ISSUE = 'issue',
  TRANSFER = 'transfer',
  DISCARD = 'discard',
  RETURN = 'return',
  QUARANTINE = 'quarantine',
  RELEASE = 'release',
  CROSSMATCH = 'crossmatch',
  TRANSFUSION = 'transfusion'
}

// Inventory transaction
export interface InventoryTransaction {
  id: string;
  productId: string;
  transactionType: InventoryTransactionType;
  fromLocation?: InventoryLocation;
  toLocation?: InventoryLocation;
  quantity: number;
  transactionDate: string;
  performedBy: string;
  reason?: string;
  requestId?: string;
  patientId?: string;
  notes?: string;
}

// Expiration alert
export interface ExpirationAlert {
  id: string;
  productId: string;
  productType: BloodProductType;
  bloodType: BloodType;
  expirationDate: string;
  daysUntilExpiration: number;
  alertLevel: 'warning' | 'critical';
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  actionTaken?: string;
}

// Inventory threshold
export interface InventoryThreshold {
  bloodType: BloodType;
  productType: BloodProductType;
  minLevel: number;
  optimalLevel: number;
  maxLevel: number;
  emergencyMinLevel: number;
  lastUpdated: string;
  updatedBy: string;
}

// Inventory alert
export interface InventoryAlert {
  id: string;
  bloodType: BloodType;
  productType: BloodProductType;
  currentLevel: number;
  thresholdLevel: number;
  alertType: 'below_minimum' | 'below_emergency' | 'above_maximum';
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  actionTaken?: string;
}

// Mock data stores
const mockInventoryTransactions: InventoryTransaction[] = [];
const mockExpirationAlerts: ExpirationAlert[] = [];
const mockInventoryThresholds: InventoryThreshold[] = [];
const mockInventoryAlerts: InventoryAlert[] = [];

/**
 * Records an inventory transaction
 */
export function recordInventoryTransaction(
  transaction: Omit<InventoryTransaction, 'id'>
): InventoryTransaction {
  const id = Math.random().toString(36).substring(2, 15);
  
  const newTransaction: InventoryTransaction = {
    id,
    ...transaction
  };
  
  // Store the transaction
  mockInventoryTransactions.push(newTransaction);
  
  return newTransaction;
}

/**
 * Gets inventory transactions by product ID
 */
export function getInventoryTransactionsByProduct(productId: string): InventoryTransaction[] {
  return mockInventoryTransactions.filter(t => t.productId === productId);
}

/**
 * Gets inventory transactions by type
 */
export function getInventoryTransactionsByType(transactionType: InventoryTransactionType): InventoryTransaction[] {
  return mockInventoryTransactions.filter(t => t.transactionType === transactionType);
}

/**
 * Gets inventory transactions by location
 */
export function getInventoryTransactionsByLocation(location: InventoryLocation): InventoryTransaction[] {
  return mockInventoryTransactions.filter(
    t => t.fromLocation === location || t.toLocation === location
  );
}

/**
 * Gets inventory transactions by date range
 */
export function getInventoryTransactionsByDateRange(
  startDate: string,
  endDate: string
): InventoryTransaction[] {
  return mockInventoryTransactions.filter(
    t => t.transactionDate >= startDate && t.transactionDate <= endDate
  );
}

/**
 * Transfers a blood product between locations
 */
export function transferBloodProduct(
  productId: string,
  fromLocation: InventoryLocation,
  toLocation: InventoryLocation,
  performedBy: string,
  reason?: string,
  notes?: string
): { product: BloodProduct | null; transaction: InventoryTransaction } {
  // Get the product
  const product = getBloodProduct(productId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${productId} not found`);
  }
  
  // Update product location
  const updatedProduct = updateBloodProduct(
    productId,
    { location: toLocation },
    performedBy
  );
  
  // Record the transaction
  const transaction = recordInventoryTransaction({
    productId,
    transactionType: InventoryTransactionType.TRANSFER,
    fromLocation,
    toLocation,
    quantity: 1,
    transactionDate: new Date().toISOString(),
    performedBy,
    reason,
    notes
  });
  
  return { product: updatedProduct, transaction };
}

/**
 * Quarantines a blood product
 */
export function quarantineBloodProduct(
  productId: string,
  performedBy: string,
  reason: string,
  notes?: string
): { product: BloodProduct | null; transaction: InventoryTransaction } {
  // Get the product
  const product = getBloodProduct(productId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${productId} not found`);
  }
  
  // Update product status and location
  const updatedProduct = updateBloodProduct(
    productId,
    {
      status: BloodProductStatus.QUARANTINED,
      location: InventoryLocation.QUARANTINE
    },
    performedBy
  );
  
  // Record the transaction
  const transaction = recordInventoryTransaction({
    productId,
    transactionType: InventoryTransactionType.QUARANTINE,
    fromLocation: product.location as InventoryLocation,
    toLocation: InventoryLocation.QUARANTINE,
    quantity: 1,
    transactionDate: new Date().toISOString(),
    performedBy,
    reason,
    notes
  });
  
  return { product: updatedProduct, transaction };
}

/**
 * Releases a blood product from quarantine
 */
export function releaseBloodProductFromQuarantine(
  productId: string,
  performedBy: string,
  reason: string,
  notes?: string
): { product: BloodProduct | null; transaction: InventoryTransaction } {
  // Get the product
  const product = getBloodProduct(productId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${productId} not found`);
  }
  
  if (product.status !== BloodProductStatus.QUARANTINED) {
    throw new Error(`Blood product with ID ${productId} is not in quarantine`);
  }
  
  // Update product status and location
  const updatedProduct = updateBloodProduct(
    productId,
    {
      status: BloodProductStatus.AVAILABLE,
      location: InventoryLocation.MAIN_STORAGE
    },
    performedBy
  );
  
  // Record the transaction
  const transaction = recordInventoryTransaction({
    productId,
    transactionType: InventoryTransactionType.RELEASE,
    fromLocation: InventoryLocation.QUARANTINE,
    toLocation: InventoryLocation.MAIN_STORAGE,
    quantity: 1,
    transactionDate: new Date().toISOString(),
    performedBy,
    reason,
    notes
  });
  
  return { product: updatedProduct, transaction };
}

/**
 * Discards a blood product
 */
export function discardBloodProduct(
  productId: string,
  performedBy: string,
  reason: string,
  notes?: string
): { product: BloodProduct | null; transaction: InventoryTransaction } {
  // Get the product
  const product = getBloodProduct(productId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${productId} not found`);
  }
  
  // Update product status and location
  const updatedProduct = updateBloodProduct(
    productId,
    {
      status: BloodProductStatus.DISCARDED,
      location: InventoryLocation.DISCARDED
    },
    performedBy
  );
  
  // Record the transaction
  const transaction = recordInventoryTransaction({
    productId,
    transactionType: InventoryTransactionType.DISCARD,
    fromLocation: product.location as InventoryLocation,
    toLocation: InventoryLocation.DISCARDED,
    quantity: 1,
    transactionDate: new Date().toISOString(),
    performedBy,
    reason,
    notes
  });
  
  return { product: updatedProduct, transaction };
}

/**
 * Creates an expiration alert
 */
export function createExpirationAlert(
  productId: string,
  daysUntilExpiration: number
): ExpirationAlert {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  // Get the product
  const product = getBloodProduct(productId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${productId} not found`);
  }
  
  // Determine alert level
  const alertLevel = daysUntilExpiration <= 1 ? 'critical' : 'warning';
  
  const alert: ExpirationAlert = {
    id,
    productId,
    productType: product.type,
    bloodType: product.bloodType,
    expirationDate: product.expirationDate,
    daysUntilExpiration,
    alertLevel,
    createdAt: now
  };
  
  // Store the alert
  mockExpirationAlerts.push(alert);
  
  return alert;
}

/**
 * Gets expiration alerts by alert level
 */
export function getExpirationAlertsByLevel(alertLevel: 'warning' | 'critical'): ExpirationAlert[] {
  return mockExpirationAlerts.filter(
    a => a.alertLevel === alertLevel && !a.acknowledgedBy
  );
}

/**
 * Gets expiration alerts by product type
 */
export function getExpirationAlertsByProductType(productType: BloodProductType): ExpirationAlert[] {
  return mockExpirationAlerts.filter(
    a => a.productType === productType && !a.acknowledgedBy
  );
}

/**
 * Gets expiration alerts by blood type
 */
export function getExpirationAlertsByBloodType(bloodType: BloodType): ExpirationAlert[] {
  return mockExpirationAlerts.filter(
    a => a.bloodType === bloodType && !a.acknowledgedBy
  );
}

/**
 * Acknowledges an expiration alert
 */
export function acknowledgeExpirationAlert(
  alertId: string,
  acknowledgedBy: string,
  actionTaken: string
): ExpirationAlert | null {
  const alertIndex = mockExpirationAlerts.findIndex(a => a.id === alertId);
  
  if (alertIndex === -1) {
    return null;
  }
  
  const existingAlert = mockExpirationAlerts[alertIndex];
  const now = new Date().toISOString();
  
  const updatedAlert: ExpirationAlert = {
    ...existingAlert,
    acknowledgedBy,
    acknowledgedAt: now,
    actionTaken
  };
  
  // Store the updated alert
  mockExpirationAlerts[alertIndex] = updatedAlert;
  
  return updatedAlert;
}

/**
 * Checks for expiring products and creates alerts
 */
export function checkForExpiringProducts(): ExpirationAlert[] {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
  
  // Get available products
  const availableProducts = getBloodProductsByTypeAndStatus(
    BloodProductType.RED_BLOOD_CELLS, // Check all types in a real implementation
    BloodProductStatus.AVAILABLE
  );
  
  const alerts: ExpirationAlert[] = [];
  
  // Check each product
  for (const product of availableProducts) {
    if (product.expirationDate <= oneDayLater) {
      // Critical alert - expires within 1 day
      const alert = createExpirationAlert(product.id, 1);
      alerts.push(alert);
    } else if (product.expirationDate <= threeDaysLater) {
      // Warning alert - expires within 3 days
      const alert = createExpirationAlert(product.id, 3);
      alerts.push(alert);
    }
  }
  
  return alerts;
}

/**
 * Creates or updates an inventory threshold
 */
export function setInventoryThreshold(
  bloodType: BloodType,
  productType: BloodProductType,
  minLevel: number,
  optimalLevel: number,
  maxLevel: number,
  emergencyMinLevel: number,
  updatedBy: string
): InventoryThreshold {
  const now = new Date().toISOString();
  
  // Check if threshold already exists
  const existingIndex = mockInventoryThresholds.findIndex(
    t => t.bloodType === bloodType && t.productType === productType
  );
  
  if (existingIndex !== -1) {
    // Update existing threshold
    const updatedThreshold: InventoryThreshold = {
      bloodType,
      productType,
      minLevel,
      optimalLevel,
      maxLevel,
      emergencyMinLevel,
      lastUpdated: now,
      updatedBy
    };
    
    mockInventoryThresholds[existingIndex] = updatedThreshold;
    
    return updatedThreshold;
  } else {
    // Create new threshold
    const newThreshold: InventoryThreshold = {
      bloodType,
      productType,
      minLevel,
      optimalLevel,
      maxLevel,
      emergencyMinLevel,
      lastUpdated: now,
      updatedBy
    };
    
    mockInventoryThresholds.push(newThreshold);
    
    return newThreshold;
  }
}

/**
 * Gets inventory thresholds
 */
export function getInventoryThresholds(): InventoryThreshold[] {
  return mockInventoryThresholds;
}

/**
 * Gets inventory threshold by blood type and product type
 */
export function getInventoryThreshold(
  bloodType: BloodType,
  productType: BloodProductType
): InventoryThreshold | null {
  return mockInventoryThresholds.find(
    t => t.bloodType === bloodType && t.productType === productType
  ) || null;
}

/**
 * Creates an inventory alert
 */
export function createInventoryAlert(
  bloodType: BloodType,
  productType: BloodProductType,
  currentLevel: number,
  thresholdLevel: number,
  alertType: 'below_minimum' | 'below_emergency' | 'above_maximum'
): InventoryAlert {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  const alert: InventoryAlert = {
    id,
    bloodType,
    productType,
    currentLevel,
    thresholdLevel,
    alertType,
    createdAt: now
  };
  
  // Store the alert
  mockInventoryAlerts.push(alert);
  
  return alert;
}

/**
 * Gets inventory alerts by alert type
 */
export function getInventoryAlertsByType(
  alertType: 'below_minimum' | 'below_emergency' | 'above_maximum'
): InventoryAlert[] {
  return mockInventoryAlerts.filter(
    a => a.alertType === alertType && !a.acknowledgedBy
  );
}

/**
 * Gets inventory alerts by blood type
 */
export function getInventoryAlertsByBloodType(bloodType: BloodType): InventoryAlert[] {
  return mockInventoryAlerts.filter(
    a => a.bloodType === bloodType && !a.acknowledgedBy
  );
}

/**
 * Gets inventory alerts by product type
 */
export function getInventoryAlertsByProductType(productType: BloodProductType): InventoryAlert[] {
  return mockInventoryAlerts.filter(
    a => a.productType === productType && !a.acknowledgedBy
  );
}

/**
 * Acknowledges an inventory alert
 */
export function acknowledgeInventoryAlert(
  alertId: string,
  acknowledgedBy: string,
  actionTaken: string
): InventoryAlert | null {
  const alertIndex = mockInventoryAlerts.findIndex(a => a.id === alertId);
  
  if (alertIndex === -1) {
    return null;
  }
  
  const existingAlert = mockInventoryAlerts[alertIndex];
  const now = new Date().toISOString();
  
  const updatedAlert: InventoryAlert = {
    ...existingAlert,
    acknowledgedBy,
    acknowledgedAt: now,
    actionTaken
  };
  
  // Store the updated alert
  mockInventoryAlerts[alertIndex] = updatedAlert;
  
  return updatedAlert;
}

/**
 * Checks inventory levels against thresholds and creates alerts
 */
export function checkInventoryLevels(): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];
  
  // Get inventory summary
  const summary = getBloodInventorySummary();
  
  // Check each threshold
  for (const threshold of mockInventoryThresholds) {
    // Get current level for this blood type and product type
    const availableProducts = getBloodProductsByBloodTypeAndStatus(
      threshold.bloodType,
      BloodProductStatus.AVAILABLE
    ).filter(p => p.type === threshold.productType);
    
    const currentLevel = availableProducts.length;
    
    // Check against thresholds
    if (currentLevel < threshold.emergencyMinLevel) {
      // Below emergency minimum
      const alert = createInventoryAlert(
        threshold.bloodType,
        threshold.productType,
        currentLevel,
        threshold.emergencyMinLevel,
        'below_emergency'
      );
      alerts.push(alert);
    } else if (currentLevel < threshold.minLevel) {
      // Below minimum
      const alert = createInventoryAlert(
        threshold.bloodType,
        threshold.productType,
        currentLevel,
        threshold.minLevel,
        'below_minimum'
      );
      alerts.push(alert);
    } else if (currentLevel > threshold.maxLevel) {
      // Above maximum
      const alert = createInventoryAlert(
        threshold.bloodType,
        threshold.productType,
        currentLevel,
        threshold.maxLevel,
        'above_maximum'
      );
      alerts.push(alert);
    }
  }
  
  return alerts;
}

/**
 * Generates an inventory report
 */
export function generateInventoryReport(): {
  summary: ReturnType<typeof getBloodInventorySummary>;
  byLocation: Record<InventoryLocation, number>;
  expiringProducts: {
    within24Hours: number;
    within72Hours: number;
    within7Days: number;
  };
  alerts: {
    belowEmergency: number;
    belowMinimum: number;
    aboveMaximum: number;
  };
  transactions: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
} {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  // Get inventory summary
  const summary = getBloodInventorySummary();
  
  // Count products by location
  const byLocation: Record<InventoryLocation, number> = {
    [InventoryLocation.MAIN_STORAGE]: 0,
    [InventoryLocation.QUARANTINE]: 0,
    [InventoryLocation.EMERGENCY_STORAGE]: 0,
    [InventoryLocation.ISSUED]: 0,
    [InventoryLocation.DISCARDED]: 0,
    [InventoryLocation.OPERATING_ROOM]: 0,
    [InventoryLocation.EMERGENCY_DEPARTMENT]: 0,
    [InventoryLocation.INTENSIVE_CARE]: 0,
    [InventoryLocation.TRANSPORT]: 0
  };
  
  // Count expiring products
  let expiringWithin24Hours = 0;
  let expiringWithin72Hours = 0;
  let expiringWithin7Days = 0;
  
  // Count alerts
  const belowEmergencyAlerts = getInventoryAlertsByType('below_emergency').length;
  const belowMinimumAlerts = getInventoryAlertsByType('below_minimum').length;
  const aboveMaximumAlerts = getInventoryAlertsByType('above_maximum').length;
  
  // Count transactions
  const transactionsLast24Hours = getInventoryTransactionsByDateRange(last24Hours, now.toISOString()).length;
  const transactionsLast7Days = getInventoryTransactionsByDateRange(last7Days, now.toISOString()).length;
  const transactionsLast30Days = getInventoryTransactionsByDateRange(last30Days, now.toISOString()).length;
  
  return {
    summary,
    byLocation,
    expiringProducts: {
      within24Hours: expiringWithin24Hours,
      within72Hours: expiringWithin72Hours,
      within7Days: expiringWithin7Days
    },
    alerts: {
      belowEmergency: belowEmergencyAlerts,
      belowMinimum: belowMinimumAlerts,
      aboveMaximum: aboveMaximumAlerts
    },
    transactions: {
      last24Hours: transactionsLast24Hours,
      last7Days: transactionsLast7Days,
      last30Days: transactionsLast30Days
    }
  };
}

/**
 * Initializes default inventory thresholds
 */
export function initializeDefaultInventoryThresholds(updatedBy: string): InventoryThreshold[] {
  const bloodTypes = [
    BloodType.A_POSITIVE,
    BloodType.A_NEGATIVE,
    BloodType.B_POSITIVE,
    BloodType.B_NEGATIVE,
    BloodType.AB_POSITIVE,
    BloodType.AB_NEGATIVE,
    BloodType.O_POSITIVE,
    BloodType.O_NEGATIVE
  ];
  
  const productTypes = [
    BloodProductType.RED_BLOOD_CELLS,
    BloodProductType.PLATELETS,
    BloodProductType.PLASMA,
    BloodProductType.CRYOPRECIPITATE
  ];
  
  const thresholds: InventoryThreshold[] = [];
  
  // Set default thresholds for each blood type and product type
  for (const bloodType of bloodTypes) {
    for (const productType of productTypes) {
      // Default values - in a real implementation, these would be based on
      // hospital size, usage patterns, and other factors
      let minLevel = 5;
      let optimalLevel = 10;
      let maxLevel = 20;
      let emergencyMinLevel = 2;
      
      // Adjust based on blood type rarity
      if (bloodType === BloodType.O_NEGATIVE) {
        // Universal donor, keep more in stock
        minLevel = 10;
        optimalLevel = 20;
        maxLevel = 30;
        emergencyMinLevel = 5;
      } else if (
        bloodType === BloodType.AB_POSITIVE ||
        bloodType === BloodType.AB_NEGATIVE
      ) {
        // Rare blood types
        minLevel = 3;
        optimalLevel = 6;
        maxLevel = 12;
        emergencyMinLevel = 1;
      }
      
      // Adjust based on product type
      if (productType === BloodProductType.PLATELETS) {
        // Short shelf life
        minLevel = 3;
        optimalLevel = 6;
        maxLevel = 10;
        emergencyMinLevel = 1;
      } else if (productType === BloodProductType.CRYOPRECIPITATE) {
        // Less commonly used
        minLevel = 2;
        optimalLevel = 5;
        maxLevel = 10;
        emergencyMinLevel = 1;
      }
      
      const threshold = setInventoryThreshold(
        bloodType,
        productType,
        minLevel,
        optimalLevel,
        maxLevel,
        emergencyMinLevel,
        updatedBy
      );
      
      thresholds.push(threshold);
    }
  }
  
  return thresholds;
}
