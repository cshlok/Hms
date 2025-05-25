#!/usr/bin/env node

import { SystemValidator } from '../utils/SystemValidator';
import fs from 'fs';
import path from 'path';

/**
 * Validation script for HMS System Infrastructure & Security module
 * Validates all components and generates a validation report
 */
async function runValidation() {
  console.log('HMS System Infrastructure & Security - Validation');
  console.log('================================================');
  
  try {
    // Create validator instance
    const validator = new SystemValidator();
    
    // Run validation
    console.log('Running system validation...');
    const results = await validator.validateAll();
    
    // Generate validation report
    const reportDir = path.join(process.cwd(), 'validation');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, 'validation_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    console.log(`Validation report saved to: ${reportPath}`);
    
    // Generate human-readable report
    const humanReportPath = path.join(reportDir, 'validation_report.md');
    
    let humanReport = `# HMS System Infrastructure & Security - Validation Report\n\n`;
    humanReport += `**Date:** ${results.timestamp.toISOString()}\n`;
    humanReport += `**Overall Status:** ${results.overallStatus === 'success' ? '✅ Success' : '❌ Failure'}\n\n`;
    
    if (results.error) {
      humanReport += `**Error:** ${results.error}\n\n`;
    }
    
    humanReport += `## Component Results\n\n`;
    
    for (const component in results.components) {
      const result = results.components[component];
      humanReport += `### ${component.charAt(0).toUpperCase() + component.slice(1)}\n\n`;
      humanReport += `**Status:** ${result.status === 'success' ? '✅ Success' : '❌ Failure'}\n`;
      humanReport += `**Message:** ${result.message}\n\n`;
      
      if (result.details) {
        humanReport += `**Details:**\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n\n`;
      }
    }
    
    fs.writeFileSync(humanReportPath, humanReport);
    console.log(`Human-readable report saved to: ${humanReportPath}`);
    
    // Exit with appropriate code
    process.exit(results.overallStatus === 'success' ? 0 : 1);
  } catch (error) {
    console.error('Validation failed with error:', error);
    process.exit(1);
  }
}

// Run validation
runValidation();
