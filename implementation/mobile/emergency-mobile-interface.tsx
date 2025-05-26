/**
 * Emergency Mobile Interface
 * 
 * This file implements a responsive, mobile-optimized interface for emergency scenarios,
 * including:
 * - Offline-capable emergency dashboard
 * - Rapid triage interface with touch optimization
 * - Barcode scanning for patient and medication identification
 * - Emergency mode with simplified workflows
 * - Real-time alerts and notifications
 * 
 * The implementation uses React with TypeScript and follows responsive design principles
 * to ensure usability on various mobile devices.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Button, 
  Card, 
  CircularProgress, 
  Dialog, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  Snackbar, 
  Tab, 
  Tabs, 
  TextField, 
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Alert as AlertIcon, 
  ArrowBack, 
  Cached, 
  CameraAlt, 
  Close, 
  Menu, 
  NetworkCheck, 
  Person, 
  QrCodeScanner, 
  Search, 
  Sync, 
  Warning 
} from '@mui/icons-material';
import { useSwipeable } from 'react-swipeable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertSeverity, AlertStatus, AlertType, ClinicalAlert } from '../clinical-decision-support/clinical-alert-system';
import { VitalSigns } from '../clinical-decision-support/clinical-alert-system';
import { hasPermission, Permission, Resource } from '../security/enhanced-security-framework';

// Offline storage helper
import { offlineStorage } from './offline-storage';

// Barcode scanner component
import { BarcodeScanner } from './barcode-scanner';

// API client
import { apiClient } from '../utils/api-client';

// Types
interface Patient {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  triageLevel?: number;
  triageColor?: string;
  chiefComplaint?: string;
  location?: string;
  status: 'waiting' | 'in_progress' | 'ready_for_discharge' | 'discharged';
  waitTime?: number;
  alerts?: ClinicalAlert[];
}

interface EmergencyDashboardProps {
  isOffline: boolean;
  onSync: () => Promise<void>;
  session: any;
}

interface TriageScreenProps {
  patient: Patient;
  onSave: (patient: Patient, vitals: VitalSigns) => Promise<void>;
  onBack: () => void;
  isOffline: boolean;
  session: any;
}

interface PatientDetailsProps {
  patientId: string;
  isOffline: boolean;
  session: any;
  onBack: () => void;
}

interface AlertsListProps {
  patientId?: string;
  isOffline: boolean;
  session: any;
}

/**
 * Main Emergency Mobile Interface Component
 */
export const EmergencyMobileInterface: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [session, setSession] = useState<any>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'triage' | 'patient' | 'alerts'>('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  
  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    setIsOffline(!navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Load session
  useEffect(() => {
    const loadSession = async () => {
      try {
        // In a real app, this would come from an auth provider
        const sessionData = localStorage.getItem('session');
        if (sessionData) {
          setSession(JSON.parse(sessionData));
        } else {
          // Redirect to login if no session
          router.push('/login');
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }
    };
    
    loadSession();
  }, [router]);
  
  // Handle barcode scan result
  const handleScanResult = (result: string) => {
    setScannerOpen(false);
    
    // Check if it's a patient barcode
    if (result.startsWith('PATIENT:')) {
      const patientId = result.replace('PATIENT:', '');
      setSelectedPatientId(patientId);
      setCurrentView('patient');
    } 
    // Check if it's a medication barcode
    else if (result.startsWith('MED:')) {
      // Handle medication scan
      // This would typically open the medication verification screen
      alert(`Medication scanned: ${result}`);
    } 
    // Unknown barcode format
    else {
      alert(`Unknown barcode format: ${result}`);
    }
  };
  
  // Handle sync
  const handleSync = async () => {
    try {
      // Sync offline data with server
      await offlineStorage.syncWithServer();
      
      // Show success message
      alert('Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Sync failed: ${error.message}`);
    }
  };
  
  // Toggle emergency mode
  const toggleEmergencyMode = () => {
    setIsEmergencyMode(!isEmergencyMode);
    
    // In emergency mode, we might want to:
    // 1. Simplify the UI
    // 2. Prioritize critical functions
    // 3. Reduce data requirements
    // 4. Enable offline functionality
    
    if (!isEmergencyMode) {
      // Entering emergency mode
      // Pre-cache essential data
      offlineStorage.preloadEssentialData();
    }
  };
  
  // Render current view
  const renderCurrentView = () => {
    if (!session) {
      return <CircularProgress />;
    }
    
    switch (currentView) {
      case 'dashboard':
        return (
          <EmergencyDashboard 
            isOffline={isOffline} 
            onSync={handleSync}
            session={session}
          />
        );
      case 'triage':
        return selectedPatient ? (
          <TriageScreen 
            patient={selectedPatient} 
            onSave={handleSaveTriageData}
            onBack={() => setCurrentView('dashboard')}
            isOffline={isOffline}
            session={session}
          />
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography>No patient selected for triage</Typography>
            <Button onClick={() => setCurrentView('dashboard')}>
              Back to Dashboard
            </Button>
          </Box>
        );
      case 'patient':
        return selectedPatientId ? (
          <PatientDetails 
            patientId={selectedPatientId}
            isOffline={isOffline}
            session={session}
            onBack={() => {
              setSelectedPatientId(null);
              setCurrentView('dashboard');
            }}
          />
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography>No patient selected</Typography>
            <Button onClick={() => setCurrentView('dashboard')}>
              Back to Dashboard
            </Button>
          </Box>
        );
      case 'alerts':
        return (
          <AlertsList 
            isOffline={isOffline}
            session={session}
          />
        );
      default:
        return <CircularProgress />;
    }
  };
  
  // Handle saving triage data
  const handleSaveTriageData = async (patient: Patient, vitals: VitalSigns) => {
    try {
      if (isOffline) {
        // Save to offline storage
        await offlineStorage.saveTriageData(patient.id, { patient, vitals });
        alert('Triage data saved offline. Will sync when online.');
      } else {
        // Save directly to server
        await apiClient.post(`/api/er/patients/${patient.id}/triage`, { patient, vitals });
      }
      
      // Return to dashboard
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Error saving triage data:', error);
      alert(`Error saving triage data: ${error.message}`);
    }
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      bgcolor: isEmergencyMode ? 'error.dark' : 'background.default'
    }}>
      {/* App Bar */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1, 
        bgcolor: isEmergencyMode ? 'error.main' : 'primary.main',
        color: 'white'
      }}>
        <IconButton 
          color="inherit" 
          onClick={() => setDrawerOpen(true)}
          edge="start"
        >
          <Menu />
        </IconButton>
        
        <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
          {isEmergencyMode ? '🚨 EMERGENCY MODE' : 'ER Mobile'}
        </Typography>
        
        {isOffline && (
          <IconButton color="inherit" onClick={handleSync} disabled={!isOffline}>
            <Sync />
          </IconButton>
        )}
        
        <IconButton color="inherit" onClick={() => setScannerOpen(true)}>
          <QrCodeScanner />
        </IconButton>
      </Box>
      
      {/* Offline Banner */}
      {isOffline && (
        <Box sx={{ 
          bgcolor: 'warning.main', 
          color: 'warning.contrastText',
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <NetworkCheck sx={{ mr: 1 }} />
          <Typography variant="body2">
            Offline Mode - Limited functionality available
          </Typography>
        </Box>
      )}
      
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {renderCurrentView()}
      </Box>
      
      {/* Bottom Navigation */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        p: 1, 
        bgcolor: isEmergencyMode ? 'error.dark' : 'background.paper',
        borderTop: 1,
        borderColor: 'divider'
      }}>
        <Button 
          startIcon={<Person />}
          onClick={() => setCurrentView('dashboard')}
          color={currentView === 'dashboard' ? 'primary' : 'inherit'}
          sx={{ flex: 1 }}
        >
          Patients
        </Button>
        
        <Button 
          startIcon={<AlertIcon />}
          onClick={() => setCurrentView('alerts')}
          color={currentView === 'alerts' ? 'primary' : 'inherit'}
          sx={{ flex: 1 }}
        >
          Alerts
        </Button>
        
        <Button 
          color={isEmergencyMode ? 'error' : 'warning'}
          variant={isEmergencyMode ? 'contained' : 'outlined'}
          onClick={toggleEmergencyMode}
          sx={{ flex: 1 }}
        >
          {isEmergencyMode ? 'Exit Emergency' : 'Emergency'}
        </Button>
      </Box>
      
      {/* Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 250 }}>
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'white'
          }}>
            <Typography variant="h6">Menu</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton color="inherit" onClick={() => setDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          
          <List>
            <ListItem button onClick={() => {
              setCurrentView('dashboard');
              setDrawerOpen(false);
            }}>
              <Typography>Dashboard</Typography>
            </ListItem>
            
            <ListItem button onClick={() => {
              setCurrentView('alerts');
              setDrawerOpen(false);
            }}>
              <Typography>Alerts</Typography>
            </ListItem>
            
            {!isOffline && (
              <ListItem button onClick={() => {
                offlineStorage.preloadEssentialData();
                setDrawerOpen(false);
                alert('Essential data preloaded for offline use');
              }}>
                <Typography>Preload Offline Data</Typography>
              </ListItem>
            )}
            
            <ListItem button onClick={() => {
              // In a real app, this would clear the session and redirect to login
              localStorage.removeItem('session');
              router.push('/login');
            }}>
              <Typography>Logout</Typography>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      
      {/* Barcode Scanner Dialog */}
      <Dialog 
        fullScreen={isMobile} 
        open={scannerOpen} 
        onClose={() => setScannerOpen(false)}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 2 
          }}>
            <Typography variant="h6">Scan Barcode</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton onClick={() => setScannerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          
          <BarcodeScanner onScan={handleScanResult} />
          
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            Position the barcode within the scanner area
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
};

/**
 * Emergency Dashboard Component
 */
const EmergencyDashboard: React.FC<EmergencyDashboardProps> = ({ isOffline, onSync, session }) => {
  const [tabValue, setTabValue] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const queryClient = useQueryClient();
  
  // Fetch patients based on tab value
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['patients', tabValue],
    queryFn: async () => {
      if (isOffline) {
        // Get from offline storage
        return offlineStorage.getPatients(getStatusFromTabValue(tabValue));
      } else {
        // Get from API
        const response = await apiClient.get(`/api/er/patients?status=${getStatusFromTabValue(tabValue)}`);
        return response.data;
      }
    },
    enabled: !!session && hasPermission(session, Resource.ER_VISIT, Permission.READ)
  });
  
  // Map tab value to status
  const getStatusFromTabValue = (value: number): string => {
    switch (value) {
      case 0: return 'waiting';
      case 1: return 'in_progress';
      case 2: return 'ready_for_discharge';
      default: return 'waiting';
    }
  };
  
  // Filter patients by search term
  const filteredPatients = patients?.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.mrn.includes(searchTerm)
  ) || [];
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle patient selection for triage
  const handlePatientSelect = (patient: Patient) => {
    // Navigate to patient details
    router.push(`/er/patients/${patient.id}`);
  };
  
  // Swipe handlers for tab navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (tabValue < 2) setTabValue(tabValue + 1);
    },
    onSwipedRight: () => {
      if (tabValue > 0) setTabValue(tabValue - 1);
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: false
  });
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search Bar */}
      <Box sx={{ p: 1, bgcolor: 'background.paper' }}>
        <TextField
          fullWidth
          placeholder="Search patients by name or MRN"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Box>
      
      {/* Tabs */}
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="Waiting" />
        <Tab label="In Progress" />
        <Tab label="Ready" />
      </Tabs>
      
      {/* Patient List */}
      <Box 
        {...swipeHandlers} 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          bgcolor: 'background.default',
          p: 1
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Typography color="error">
              Error loading patients: {(error as Error).message}
            </Typography>
            {isOffline && (
              <Button 
                startIcon={<Cached />} 
                onClick={onSync}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Try to Sync
              </Button>
            )}
          </Box>
        ) : filteredPatients.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">
              {searchTerm ? 'No patients match your search' : 'No patients in this category'}
            </Typography>
          </Box>
        ) : (
          filteredPatients.map(patient => (
            <PatientCard 
              key={patient.id} 
              patient={patient} 
              onSelect={handlePatientSelect}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

/**
 * Patient Card Component
 */
const PatientCard: React.FC<{ 
  patient: Patient; 
  onSelect: (patient: Patient) => void;
}> = ({ patient, onSelect }) => {
  // Calculate wait time display
  const getWaitTimeDisplay = () => {
    if (!patient.waitTime) return '';
    
    if (patient.waitTime < 60) {
      return `${patient.waitTime}m`;
    } else {
      const hours = Math.floor(patient.waitTime / 60);
      const minutes = patient.waitTime % 60;
      return `${hours}h ${minutes}m`;
    }
  };
  
  // Get triage color
  const getTriageColor = () => {
    if (!patient.triageColor) return 'grey.400';
    return patient.triageColor;
  };
  
  return (
    <Card 
      sx={{ 
        mb: 1, 
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 4,
        borderColor: getTriageColor()
      }}
      onClick={() => onSelect(patient)}
    >
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {patient.name}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {patient.alerts && patient.alerts.length > 0 && (
            <IconButton size="small" color="error">
              <Warning />
            </IconButton>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', mt: 0.5 }}>
          <Typography variant="body2" color="textSecondary">
            MRN: {patient.mrn}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="textSecondary">
            {patient.gender}, {new Date(patient.dateOfBirth).toLocaleDateString()}
          </Typography>
        </Box>
        
        {patient.chiefComplaint && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            CC: {patient.chiefComplaint}
          </Typography>
        )}
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mt: 1,
          pt: 1,
          borderTop: 1,
          borderColor: 'divider'
        }}>
          {patient.triageLevel && (
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              ESI {patient.triageLevel}
            </Typography>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          {patient.location && (
            <Typography variant="body2" color="textSecondary">
              {patient.location}
            </Typography>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          {patient.waitTime && (
            <Typography 
              variant="body2" 
              color={patient.waitTime > 60 ? 'error' : 'textSecondary'}
            >
              {getWaitTimeDisplay()}
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
};

/**
 * Triage Screen Component
 */
const TriageScreen: React.FC<TriageScreenProps> = ({ 
  patient, 
  onSave, 
  onBack,
  isOffline,
  session
}) => {
  const [triageLevel, setTriageLevel] = useState<number>(patient.triageLevel || 3);
  const [chiefComplaint, setChiefComplaint] = useState<string>(patient.chiefComplaint || '');
  const [vitals, setVitals] = useState<VitalSigns>({
    patientId: patient.id,
    timestamp: new Date().toISOString(),
    temperature: 37.0,
    heartRate: 80,
    respiratoryRate: 16,
    systolicBP: 120,
    diastolicBP: 80,
    oxygenSaturation: 98,
    oxygenSupplementation: false,
    consciousness: 'alert'
  });
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update patient with triage data
    const updatedPatient = {
      ...patient,
      triageLevel,
      triageColor: getTriageColor(triageLevel),
      chiefComplaint
    };
    
    // Save triage data
    await onSave(updatedPatient, vitals);
  };
  
  // Get triage color based on level
  const getTriageColor = (level: number): string => {
    switch (level) {
      case 1: return 'red';
      case 2: return 'orange';
      case 3: return 'yellow';
      case 4: return 'green';
      case 5: return 'blue';
      default: return 'grey';
    }
  };
  
  // Update vital sign
  const updateVital = (key: keyof VitalSigns, value: any) => {
    setVitals(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={onBack}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }}>
          Triage: {patient.name}
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        {/* Chief Complaint */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Chief Complaint
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="Enter chief complaint"
            required
          />
        </Box>
        
        {/* ESI Triage Level */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            ESI Triage Level
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mb: 1
          }}>
            {[1, 2, 3, 4, 5].map(level => (
              <Button
                key={level}
                variant={triageLevel === level ? 'contained' : 'outlined'}
                onClick={() => setTriageLevel(level)}
                sx={{ 
                  flex: 1, 
                  mx: 0.5,
                  bgcolor: triageLevel === level ? getTriageColor(level) : undefined,
                  '&.MuiButton-contained': {
                    color: 'white'
                  }
                }}
              >
                {level}
              </Button>
            ))}
          </Box>
          <Typography variant="caption" color="textSecondary">
            {triageLevel === 1 && 'Resuscitation - Immediate life-saving intervention'}
            {triageLevel === 2 && 'Emergency - High risk, unstable vitals'}
            {triageLevel === 3 && 'Urgent - Stable with multiple resources needed'}
            {triageLevel === 4 && 'Less Urgent - Stable with one resource needed'}
            {triageLevel === 5 && 'Non-Urgent - Stable with no resources needed'}
          </Typography>
        </Box>
        
        {/* Vital Signs */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Vital Signs
          </Typography>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              label="Temp (°C)"
              type="number"
              value={vitals.temperature}
              onChange={(e) => updateVital('temperature', parseFloat(e.target.value))}
              InputProps={{ inputProps: { step: 0.1, min: 30, max: 45 } }}
              sx={{ flex: 1, mr: 1 }}
            />
            <TextField
              label="HR (bpm)"
              type="number"
              value={vitals.heartRate}
              onChange={(e) => updateVital('heartRate', parseInt(e.target.value))}
              InputProps={{ inputProps: { step: 1, min: 0, max: 300 } }}
              sx={{ flex: 1 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              label="RR (bpm)"
              type="number"
              value={vitals.respiratoryRate}
              onChange={(e) => updateVital('respiratoryRate', parseInt(e.target.value))}
              InputProps={{ inputProps: { step: 1, min: 0, max: 100 } }}
              sx={{ flex: 1, mr: 1 }}
            />
            <TextField
              label="SpO2 (%)"
              type="number"
              value={vitals.oxygenSaturation}
              onChange={(e) => updateVital('oxygenSaturation', parseInt(e.target.value))}
              InputProps={{ inputProps: { step: 1, min: 0, max: 100 } }}
              sx={{ flex: 1 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              label="BP Systolic"
              type="number"
              value={vitals.systolicBP}
              onChange={(e) => updateVital('systolicBP', parseInt(e.target.value))}
              InputProps={{ inputProps: { step: 1, min: 0, max: 300 } }}
              sx={{ flex: 1, mr: 1 }}
            />
            <TextField
              label="BP Diastolic"
              type="number"
              value={vitals.diastolicBP}
              onChange={(e) => updateVital('diastolicBP', parseInt(e.target.value))}
              InputProps={{ inputProps: { step: 1, min: 0, max: 200 } }}
              sx={{ flex: 1 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              Consciousness:
            </Typography>
            <Button
              variant={vitals.consciousness === 'alert' ? 'contained' : 'outlined'}
              onClick={() => updateVital('consciousness', 'alert')}
              sx={{ mr: 1 }}
            >
              A
            </Button>
            <Button
              variant={vitals.consciousness === 'verbal' ? 'contained' : 'outlined'}
              onClick={() => updateVital('consciousness', 'verbal')}
              sx={{ mr: 1 }}
            >
              V
            </Button>
            <Button
              variant={vitals.consciousness === 'pain' ? 'contained' : 'outlined'}
              onClick={() => updateVital('consciousness', 'pain')}
              sx={{ mr: 1 }}
            >
              P
            </Button>
            <Button
              variant={vitals.consciousness === 'unresponsive' ? 'contained' : 'outlined'}
              onClick={() => updateVital('consciousness', 'unresponsive')}
            >
              U
            </Button>
          </Box>
        </Box>
        
        {/* Submit Button */}
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          fullWidth
          size="large"
        >
          Save Triage Data
        </Button>
      </form>
    </Box>
  );
};

/**
 * Patient Details Component
 */
const PatientDetails: React.FC<PatientDetailsProps> = ({ 
  patientId, 
  isOffline,
  session,
  onBack
}) => {
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Fetch patient details
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (isOffline) {
        // Get from offline storage
        return offlineStorage.getPatient(patientId);
      } else {
        // Get from API
        const response = await apiClient.get(`/api/er/patients/${patientId}`);
        return response.data;
      }
    },
    enabled: !!session && hasPermission(session, Resource.ER_VISIT, Permission.READ)
  });
  
  // Fetch patient alerts
  const { data: alerts } = useQuery({
    queryKey: ['patient-alerts', patientId],
    queryFn: async () => {
      if (isOffline) {
        // Get from offline storage
        return offlineStorage.getPatientAlerts(patientId);
      } else {
        // Get from API
        const response = await apiClient.get(`/api/er/patients/${patientId}/alerts`);
        return response.data;
      }
    },
    enabled: !!session && hasPermission(session, Resource.ALERT, Permission.READ)
  });
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Render tab content
  const renderTabContent = () => {
    switch (tabValue) {
      case 0: // Overview
        return (
          <Box sx={{ p: 2 }}>
            {patient && (
              <>
                <Typography variant="h6" gutterBottom>
                  Patient Information
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    MRN
                  </Typography>
                  <Typography variant="body1">
                    {patient.mrn}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Date of Birth
                  </Typography>
                  <Typography variant="body1">
                    {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Gender
                  </Typography>
                  <Typography variant="body1">
                    {patient.gender}
                  </Typography>
                </Box>
                
                {patient.chiefComplaint && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Chief Complaint
                    </Typography>
                    <Typography variant="body1">
                      {patient.chiefComplaint}
                    </Typography>
                  </Box>
                )}
                
                {patient.triageLevel && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Triage Level
                    </Typography>
                    <Typography variant="body1">
                      ESI {patient.triageLevel}
                    </Typography>
                  </Box>
                )}
                
                {patient.location && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Location
                    </Typography>
                    <Typography variant="body1">
                      {patient.location}
                    </Typography>
                  </Box>
                )}
                
                {alerts && alerts.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Active Alerts
                    </Typography>
                    
                    {alerts.map(alert => (
                      <Box 
                        key={alert.id}
                        sx={{ 
                          p: 1.5, 
                          mb: 1, 
                          bgcolor: 'background.paper',
                          borderLeft: 4,
                          borderColor: alert.severity === AlertSeverity.CRITICAL ? 'error.main' :
                                      alert.severity === AlertSeverity.URGENT ? 'warning.main' :
                                      alert.severity === AlertSeverity.WARNING ? 'info.main' : 'success.main',
                          borderRadius: 1
                        }}
                      >
                        <Typography variant="subtitle2">
                          {alert.title}
                        </Typography>
                        <Typography variant="body2">
                          {alert.description}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </>
            )}
          </Box>
        );
      case 1: // Vitals
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Vital Signs
            </Typography>
            
            {/* Vitals would be displayed here */}
            <Typography variant="body2" color="textSecondary">
              Vital signs history would be displayed here
            </Typography>
          </Box>
        );
      case 2: // Orders
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Orders
            </Typography>
            
            {/* Orders would be displayed here */}
            <Typography variant="body2" color="textSecondary">
              Orders would be displayed here
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={onBack}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>
            Error
          </Typography>
        </Box>
        
        <Typography color="error">
          Error loading patient: {(error as Error).message}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ 
        p: 1.5, 
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={onBack} edge="start">
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>
            {patient?.name}
          </Typography>
        </Box>
      </Box>
      
      {/* Tabs */}
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="Overview" />
        <Tab label="Vitals" />
        <Tab label="Orders" />
      </Tabs>
      
      {/* Tab Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {renderTabContent()}
      </Box>
      
      {/* Action Buttons */}
      <Box sx={{ 
        p: 1.5, 
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button 
          variant="outlined" 
          color="primary"
          sx={{ flex: 1, mr: 1 }}
        >
          Update Vitals
        </Button>
        
        <Button 
          variant="contained" 
          color="primary"
          sx={{ flex: 1 }}
        >
          Place Orders
        </Button>
      </Box>
    </Box>
  );
};

/**
 * Alerts List Component
 */
const AlertsList: React.FC<AlertsListProps> = ({ 
  patientId,
  isOffline,
  session
}) => {
  // Fetch alerts
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['alerts', patientId],
    queryFn: async () => {
      if (isOffline) {
        // Get from offline storage
        return patientId ? 
          offlineStorage.getPatientAlerts(patientId) : 
          offlineStorage.getAllAlerts();
      } else {
        // Get from API
        const url = patientId ? 
          `/api/er/patients/${patientId}/alerts` : 
          '/api/er/alerts';
        const response = await apiClient.get(url);
        return response.data;
      }
    },
    enabled: !!session && hasPermission(session, Resource.ALERT, Permission.READ)
  });
  
  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string, userId: string }) => {
      if (isOffline) {
        // Update in offline storage
        return offlineStorage.acknowledgeAlert(alertId, userId);
      } else {
        // Update via API
        return apiClient.post(`/api/er/alerts/${alertId}/acknowledge`, { userId });
      }
    }
  });
  
  // Handle alert acknowledgement
  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeMutation.mutateAsync({ 
        alertId, 
        userId: session.userId 
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      alert(`Error acknowledging alert: ${(error as Error).message}`);
    }
  };
  
  // Get severity color
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 'error.main';
      case AlertSeverity.URGENT: return 'warning.main';
      case AlertSeverity.WARNING: return 'info.main';
      case AlertSeverity.INFO: return 'success.main';
      default: return 'text.primary';
    }
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">
          Error loading alerts: {(error as Error).message}
        </Typography>
      </Box>
    );
  }
  
  if (!alerts || alerts.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No active alerts
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h6" sx={{ mb: 2, px: 1 }}>
        Active Alerts
      </Typography>
      
      {alerts.map(alert => (
        <Card 
          key={alert.id}
          sx={{ 
            mb: 1.5, 
            borderLeft: 4,
            borderColor: getSeverityColor(alert.severity)
          }}
        >
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle1">
                {alert.title}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Typography 
                variant="caption" 
                color="textSecondary"
              >
                {new Date(alert.timestamp).toLocaleTimeString()}
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {alert.description}
            </Typography>
            
            {alert.patientId && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                Patient: {alert.patientId}
              </Typography>
            )}
            
            {alert.suggestedActions && alert.suggestedActions.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  Suggested Actions:
                </Typography>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  {alert.suggestedActions.map((action, index) => (
                    <li key={index}>
                      <Typography variant="caption">
                        {action}
                      </Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            )}
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              mt: 1,
              pt: 1,
              borderTop: 1,
              borderColor: 'divider'
            }}>
              <Button 
                size="small" 
                onClick={() => handleAcknowledge(alert.id)}
                disabled={alert.status === AlertStatus.ACKNOWLEDGED || 
                          alert.status === AlertStatus.RESOLVED}
              >
                {alert.status === AlertStatus.ACKNOWLEDGED ? 'Acknowledged' : 
                 alert.status === AlertStatus.RESOLVED ? 'Resolved' : 
                 'Acknowledge'}
              </Button>
            </Box>
          </Box>
        </Card>
      ))}
    </Box>
  );
};

export default EmergencyMobileInterface;
