/**
 * Types for petition creation form
 */

export interface PetitionFormData {
  // Identity & Contact
  senderName: string;
  senderEmail: string;

  // Project Details
  filmTitle: string;
  logline: string;
  productionType: string;
  directorName: string;

  // Logistics
  shootDates: string;
  location: string;
  applicationUrl: string;

  // Roles
  roles: string[];

  // Deadline
  deadline: Date | null;
}

export const COMMON_ROLES = [
  'DP',
  'Sound',
  'Editor',
  'Gaffer/Grip',
  'Producer',
  'AD',
  'PA',
  'Actor',
  'Extras',
] as const;

export const PRODUCTION_TYPES = [
  '572',
  '590',
  'Thesis',
  'Independent',
  'Other',
] as const;

/**
 * Generate email body template from form data
 */
export function generateEmailBody(formData: PetitionFormData): string {
  const parts: string[] = [];

  // Title and logline
  parts.push(formData.filmTitle);
  if (formData.logline) {
    parts.push('');
    parts.push(formData.logline);
  }

  // Details
  parts.push('');
  if (formData.productionType) {
    parts.push(`Production Type: ${formData.productionType}`);
    parts.push('\n');
  }
  if (formData.directorName) {
    parts.push(`Director: ${formData.directorName}`);
    parts.push('\n');

  }
  if (formData.shootDates) {
    parts.push(`Shoot Dates: ${formData.shootDates}`);
    parts.push('\n');

  }
  if (formData.location) {
    parts.push(`Location: ${formData.location}`);
    parts.push('\n');

  }

  // Roles
  if (formData.roles.length > 0) {
    parts.push('');
    parts.push('Roles Needed:');
    parts.push('\n');

    formData.roles.forEach(role => {
      parts.push(`• ${role}`);
      parts.push('\n');

    });
  }

  // Application info
  parts.push('');
  if (formData.applicationUrl) {
    parts.push(`Apply: ${formData.applicationUrl}`);
  }
  if (formData.deadline) {
    parts.push(`Deadline: ${formData.deadline.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`);
  }

  return parts.join('\n');
}

/**
 * Validate petition form data
 */
export function validatePetitionForm(data: Partial<PetitionFormData>): string[] {
  const errors: string[] = [];

  if (!data.senderEmail?.trim()) {
    errors.push('Email address is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.senderEmail)) {
    errors.push('Valid email address required');
  }

  if (!data.senderName?.trim()) {
    errors.push('Your name is required');
  }

  if (!data.filmTitle?.trim()) {
    errors.push('Film title is required');
  }

  if (!data.logline?.trim()) {
    errors.push('Logline is required');
  }

  if (data.applicationUrl && !data.applicationUrl.match(/^https?:\/\//)) {
    errors.push('Application URL must start with http:// or https://');
  }

  return errors;
}
