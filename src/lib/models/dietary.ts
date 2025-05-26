import { DietaryRequest, MealPlan, Meal, MenuItem, NutritionalProfile } from '@prisma/client';

// FHIR-compliant interfaces for Dietary Management

/**
 * FHIR-compliant Dietary Request
 * Maps to FHIR NutritionOrder resource
 */
export interface FHIRDietaryRequest {
  resourceType: 'NutritionOrder';
  id: string;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order';
  patient: {
    reference: string;
    display?: string;
  };
  encounter?: {
    reference: string;
  };
  dateTime: string;
  orderer?: {
    reference: string;
    display?: string;
  };
  allergyIntolerance?: {
    reference: string;
  }[];
  foodPreferenceModifier?: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  excludeFoodModifier?: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  oralDiet?: {
    type?: {
      coding: {
        system: string;
        code: string;
        display: string;
      }[];
      text?: string;
    }[];
    schedule?: {
      repeat?: {
        boundsPeriod?: {
          start?: string;
          end?: string;
        };
        when?: string[];
      };
    };
    nutrient?: {
      modifier: {
        coding: {
          system: string;
          code: string;
          display: string;
        }[];
      };
      amount: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
    }[];
    texture?: {
      modifier: {
        coding: {
          system: string;
          code: string;
          display: string;
        }[];
      };
      foodType?: {
        coding: {
          system: string;
          code: string;
          display: string;
        }[];
        text?: string;
      };
    }[];
    fluidConsistencyType?: {
      coding: {
        system: string;
        code: string;
        display: string;
      }[];
    }[];
    instruction?: string;
  };
  note?: {
    text: string;
  }[];
}

/**
 * FHIR-compliant Meal Plan
 * Maps to FHIR CarePlan resource with category of 'diet'
 */
export interface FHIRMealPlan {
  resourceType: 'CarePlan';
  id: string;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'option';
  category: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  title: string;
  description?: string;
  subject: {
    reference: string;
    display?: string;
  };
  period: {
    start: string;
    end?: string;
  };
  created: string;
  author: {
    reference: string;
    display?: string;
  };
  activity: {
    detail: {
      status: 'not-started' | 'scheduled' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
      description?: string;
      scheduledTiming?: {
        event?: string[];
        code?: {
          coding: {
            system: string;
            code: string;
            display: string;
          }[];
        };
      };
    };
  }[];
  note?: {
    text: string;
  }[];
}

/**
 * FHIR-compliant Nutritional Profile
 * Maps to FHIR Observation resource with category of 'nutrition'
 */
export interface FHIRNutritionalProfile {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  code: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime: string;
  issued: string;
  performer: {
    reference: string;
    display?: string;
  }[];
  component: {
    code: {
      coding: {
        system: string;
        code: string;
        display: string;
      }[];
      text: string;
    };
    valueQuantity?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
    valueString?: string;
    valueCodeableConcept?: {
      coding: {
        system: string;
        code: string;
        display: string;
      }[];
      text: string;
    };
  }[];
  note?: {
    text: string;
  }[];
}

/**
 * Convert database DietaryRequest to FHIR NutritionOrder
 */
export function toFHIRDietaryRequest(request: DietaryRequest & {
  patient: any;
  requestedByUser: any;
  approvedByUser?: any;
  mealPlans?: any[];
}): FHIRDietaryRequest {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown'> = {
    'PENDING': 'draft',
    'APPROVED': 'active',
    'IN_PREPARATION': 'active',
    'DELIVERED': 'active',
    'COMPLETED': 'completed',
    'CANCELLED': 'revoked'
  };

  // Map dietary restrictions to FHIR excludeFoodModifier
  const excludeFoodModifiers = request.dietaryRestrictions.map(restriction => ({
    coding: [{
      system: 'http://hms.local/fhir/CodeSystem/food-type',
      code: restriction.toLowerCase().replace(/\s/g, '-'),
      display: restriction
    }]
  }));

  // Map meal preferences to FHIR foodPreferenceModifier
  const foodPreferenceModifiers = request.mealPreferences.map(preference => ({
    coding: [{
      system: 'http://hms.local/fhir/CodeSystem/food-preference',
      code: preference.toLowerCase().replace(/\s/g, '-'),
      display: preference
    }]
  }));

  // Map allergies to FHIR allergyIntolerance references
  const allergyIntolerances = request.allergies.map((allergy, index) => ({
    reference: `AllergyIntolerance/${request.patientId}-${index}`,
    display: allergy
  }));

  return {
    resourceType: 'NutritionOrder',
    id: request.id,
    status: statusMap[request.status] || 'unknown',
    intent: 'order',
    patient: {
      reference: `Patient/${request.patientId}`,
      display: request.patient?.name || 'Unknown Patient'
    },
    dateTime: request.createdAt.toISOString(),
    orderer: {
      reference: `User/${request.requestedById}`,
      display: request.requestedByUser?.name || 'Unknown User'
    },
    allergyIntolerance: request.allergies.length > 0 ? allergyIntolerances : undefined,
    foodPreferenceModifier: foodPreferenceModifiers.length > 0 ? foodPreferenceModifiers : undefined,
    excludeFoodModifier: excludeFoodModifiers.length > 0 ? excludeFoodModifiers : undefined,
    oralDiet: {
      type: [{
        coding: [{
          system: 'http://hms.local/fhir/CodeSystem/diet-type',
          code: request.requestType.toLowerCase().replace(/_/g, '-'),
          display: request.requestType.replace(/_/g, ' ')
        }]
      }],
      schedule: {
        repeat: {
          boundsPeriod: {
            start: request.startDate.toISOString(),
            end: request.endDate?.toISOString()
          }
        }
      },
      instruction: request.specialInstructions
    },
    note: request.specialInstructions ? [{ text: request.specialInstructions }] : []
  };
}

/**
 * Convert database MealPlan to FHIR CarePlan
 */
export function toFHIRMealPlan(mealPlan: MealPlan & {
  request: DietaryRequest & { patient: any };
  meals?: Meal[];
  createdByUser: any;
}): FHIRMealPlan {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown'> = {
    'PLANNED': 'active',
    'PREPARED': 'active',
    'DELIVERED': 'active',
    'CONSUMED': 'completed',
    'CANCELLED': 'revoked'
  };

  // Map meal activities
  const activities = mealPlan.meals?.map(meal => ({
    detail: {
      status: meal.status === 'CONSUMED' ? 'completed' : 
              meal.status === 'CANCELLED' ? 'cancelled' : 
              meal.status === 'DELIVERED' ? 'in-progress' : 
              meal.status === 'PREPARED' ? 'scheduled' : 'not-started',
      description: `${meal.mealType} - ${meal.menuItems?.length || 0} items`,
      scheduledTiming: {
        event: [meal.deliveryTime?.toISOString() || mealPlan.date.toISOString()],
        code: {
          coding: [{
            system: 'http://hms.local/fhir/CodeSystem/meal-type',
            code: meal.mealType.toLowerCase(),
            display: meal.mealType
          }]
        }
      }
    }
  })) || [];

  return {
    resourceType: 'CarePlan',
    id: mealPlan.id,
    status: statusMap[mealPlan.status] || 'unknown',
    intent: 'plan',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/care-plan-activity-category',
        code: 'diet',
        display: 'Diet'
      }]
    }],
    title: `Meal Plan for ${mealPlan.date.toISOString().split('T')[0]}`,
    description: `Meal plan for ${mealPlan.request.patient?.name || 'patient'} on ${mealPlan.date.toISOString().split('T')[0]}`,
    subject: {
      reference: `Patient/${mealPlan.request.patientId}`,
      display: mealPlan.request.patient?.name || 'Unknown Patient'
    },
    period: {
      start: mealPlan.date.toISOString(),
      end: new Date(mealPlan.date.getTime() + 24 * 60 * 60 * 1000).toISOString() // Next day
    },
    created: mealPlan.createdAt.toISOString(),
    author: {
      reference: `User/${mealPlan.createdById}`,
      display: mealPlan.createdByUser?.name || 'Unknown User'
    },
    activity: activities,
    note: mealPlan.notes ? [{ text: mealPlan.notes }] : []
  };
}

/**
 * Convert database NutritionalProfile to FHIR Observation
 */
export function toFHIRNutritionalProfile(profile: NutritionalProfile & {
  patient: any;
  lastUpdatedByUser: any;
}): FHIRNutritionalProfile {
  // Create components for each nutritional aspect
  const components = [
    // Height component
    profile.height ? {
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '8302-2',
          display: 'Body height'
        }],
        text: 'Height'
      },
      valueQuantity: {
        value: profile.height,
        unit: 'cm',
        system: 'http://unitsofmeasure.org',
        code: 'cm'
      }
    } : null,
    
    // Weight component
    profile.weight ? {
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '29463-7',
          display: 'Body weight'
        }],
        text: 'Weight'
      },
      valueQuantity: {
        value: profile.weight,
        unit: 'kg',
        system: 'http://unitsofmeasure.org',
        code: 'kg'
      }
    } : null,
    
    // BMI component
    profile.bmi ? {
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '39156-5',
          display: 'Body mass index (BMI)'
        }],
        text: 'BMI'
      },
      valueQuantity: {
        value: profile.bmi,
        unit: 'kg/m2',
        system: 'http://unitsofmeasure.org',
        code: 'kg/m2'
      }
    } : null,
    
    // Dietary preferences component
    profile.dietaryPreferences.length > 0 ? {
      code: {
        coding: [{
          system: 'http://hms.local/fhir/CodeSystem/nutritional-assessment',
          code: 'dietary-preferences',
          display: 'Dietary Preferences'
        }],
        text: 'Dietary Preferences'
      },
      valueString: profile.dietaryPreferences.join(', ')
    } : null,
    
    // Dietary restrictions component
    profile.dietaryRestrictions.length > 0 ? {
      code: {
        coding: [{
          system: 'http://hms.local/fhir/CodeSystem/nutritional-assessment',
          code: 'dietary-restrictions',
          display: 'Dietary Restrictions'
        }],
        text: 'Dietary Restrictions'
      },
      valueString: profile.dietaryRestrictions.join(', ')
    } : null,
    
    // Allergies component
    profile.allergies.length > 0 ? {
      code: {
        coding: [{
          system: 'http://hms.local/fhir/CodeSystem/nutritional-assessment',
          code: 'allergies',
          display: 'Food Allergies'
        }],
        text: 'Food Allergies'
      },
      valueString: profile.allergies.join(', ')
    } : null,
    
    // Medical conditions component
    profile.medicalConditions.length > 0 ? {
      code: {
        coding: [{
          system: 'http://hms.local/fhir/CodeSystem/nutritional-assessment',
          code: 'medical-conditions',
          display: 'Medical Conditions'
        }],
        text: 'Medical Conditions'
      },
      valueString: profile.medicalConditions.join(', ')
    } : null
  ].filter(Boolean) as any[]; // Filter out null components

  return {
    resourceType: 'Observation',
    id: profile.id,
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'nutrition',
        display: 'Nutrition'
      }]
    }],
    code: {
      coding: [{
        system: 'http://hms.local/fhir/CodeSystem/observation-type',
        code: 'nutritional-profile',
        display: 'Nutritional Profile'
      }],
      text: 'Nutritional Profile Assessment'
    },
    subject: {
      reference: `Patient/${profile.patientId}`,
      display: profile.patient?.name || 'Unknown Patient'
    },
    effectiveDateTime: profile.updatedAt.toISOString(),
    issued: profile.createdAt.toISOString(),
    performer: [{
      reference: `User/${profile.lastUpdatedById}`,
      display: profile.lastUpdatedByUser?.name || 'Unknown User'
    }],
    component: components,
    note: profile.notes ? [{ text: profile.notes }] : []
  };
}
