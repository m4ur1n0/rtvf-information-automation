"use client";

import { useState } from 'react';
import { EmailBodyEditor } from './EmailBodyEditor';
import {
  type PetitionFormData,
  COMMON_ROLES,
  PRODUCTION_TYPES,
  generateEmailBody,
  validatePetitionForm,
} from '@/lib/petition-types';

interface CreatePetitionModalProps {
  onClose: () => void;
  onSuccess: (opportunityId: string) => void;
}

type Step = 'form' | 'email' | 'review';

export function CreatePetitionModal({ onClose, onSuccess }: CreatePetitionModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<PetitionFormData>({
    senderName: '',
    senderEmail: '',
    filmTitle: '',
    logline: '',
    productionType: '',
    directorName: '',
    shootDates: '',
    location: '',
    applicationUrl: '',
    roles: [],
    deadline: null,
  });
  const [customRole, setCustomRole] = useState('');
  const [emailBodyHtml, setEmailBodyHtml] = useState('');
  const [emailBodyText, setEmailBodyText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof PetitionFormData, value: string | Date | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleAddCustomRole = () => {
    const trimmed = customRole.trim();
    if (trimmed && !formData.roles.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        roles: [...prev.roles, trimmed],
      }));
      setCustomRole('');
    }
  };

  const handleRemoveRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r !== role),
    }));
  };

  const handleNextToEmail = () => {
    const validationErrors = validatePetitionForm(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Generate initial email body
    const body = generateEmailBody(formData);
    setEmailBodyText(body);
    setEmailBodyHtml(`<p>${body.split('\n').join('</p><p>')}</p>`);
    setEmailBodyHtml(`<div>${emailBodyHtml} <p>`)
    setStep('email');
  };

  const handleEmailChange = (html: string, text: string) => {
    setEmailBodyHtml(html);
    setEmailBodyText(text);
  };

  const handleNextToReview = () => {
    setStep('review');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await fetch('/api/petitions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          deadline: formData.deadline?.toISOString(),
          emailBodyHtml,
          emailBodyText,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        setErrors([result.error || 'Failed to create petition']);
        setIsSubmitting(false);
        return;
      }

      onSuccess(result.opportunityId);
    } catch (error) {
      console.error('Submit error:', error);
      setErrors(['An unexpected error occurred. Please try again.']);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="petition-form-modal" onClick={onClose}>
      <div className="petition-form-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'form' && 'Create New Petition'}
            {step === 'email' && 'Customize Email'}
            {step === 'review' && 'Review & Submit'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="form-errors">
            {errors.map((error, idx) => (
              <div key={idx} className="form-error">
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Form */}
        {step === 'form' && (
          <div className="modal-body">
            <div className="form-field">
              <label htmlFor="senderName">Your Name *</label>
              <input
                id="senderName"
                type="text"
                value={formData.senderName}
                onChange={(e) => handleInputChange('senderName', e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div className="form-field">
              <label htmlFor="senderEmail">Your Email *</label>
              <input
                id="senderEmail"
                type="email"
                value={formData.senderEmail}
                onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                placeholder="jane@example.com"
              />
            </div>

            <div className="form-field">
              <label htmlFor="filmTitle">Film Title *</label>
              <input
                id="filmTitle"
                type="text"
                value={formData.filmTitle}
                onChange={(e) => handleInputChange('filmTitle', e.target.value)}
                placeholder="The Short Film"
              />
            </div>

            <div className="form-field">
              <label htmlFor="logline">Logline *</label>
              <textarea
                id="logline"
                value={formData.logline}
                onChange={(e) => handleInputChange('logline', e.target.value)}
                placeholder="A brief, compelling description of your film..."
                rows={3}
              />
            </div>

            <div className="form-field">
              <label htmlFor="productionType">Production Type</label>
              <select
                id="productionType"
                value={formData.productionType}
                onChange={(e) => handleInputChange('productionType', e.target.value)}
              >
                <option value="">Select...</option>
                {PRODUCTION_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="directorName">Director Name</label>
              <input
                id="directorName"
                type="text"
                value={formData.directorName}
                onChange={(e) => handleInputChange('directorName', e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div className="form-field">
              <label htmlFor="shootDates">Shoot Dates</label>
              <input
                id="shootDates"
                type="text"
                value={formData.shootDates}
                onChange={(e) => handleInputChange('shootDates', e.target.value)}
                placeholder="e.g., March 15-17, 2026"
              />
            </div>

            <div className="form-field">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Evanston, IL"
              />
            </div>

            <div className="form-field">
              <label htmlFor="applicationUrl">Application URL</label>
              <input
                id="applicationUrl"
                type="url"
                value={formData.applicationUrl}
                onChange={(e) => handleInputChange('applicationUrl', e.target.value)}
                placeholder="https://forms.gle/..."
              />
            </div>

            <div className="form-field">
              <label htmlFor="deadline">Application Deadline</label>
              <input
                id="deadline"
                type="date"
                value={formData.deadline?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleInputChange('deadline', e.target.value ? new Date(e.target.value) : null)}
              />
            </div>

            <div className="form-field">
              <label>Roles Needed</label>
              <div className="role-checkboxes">
                {COMMON_ROLES.map(role => (
                  <label key={role} className="role-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomRole())}
                  placeholder="Add custom role..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomRole}
                  className="btn-secondary"
                  disabled={!customRole.trim()}
                >
                  Add
                </button>
              </div>

              {formData.roles.filter(r => !(COMMON_ROLES as readonly string[]).includes(r)).length > 0 && (
                <div className="custom-roles-list" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {formData.roles.filter(r => !(COMMON_ROLES as readonly string[]).includes(r)).map(role => (
                    <span key={role} className="custom-role-tag">
                      {role}
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role)}
                        style={{ marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Email Editor */}
        {step === 'email' && (
          <div className="modal-body">
            <p className="step-description">
              Edit the email body below. You can paste images directly (Cmd+V / Ctrl+V) or use the image button.
              Images will appear inline where you place them.
            </p>
            <EmailBodyEditor
              initialContent={emailBodyText}
              onChange={handleEmailChange}
            />
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="modal-body">
            <div className="review-section">
              <h3>Petition Details</h3>
              <div className="review-field">
                <strong>From:</strong> {formData.senderName} ({formData.senderEmail})
              </div>
              <div className="review-field">
                <strong>Film:</strong> {formData.filmTitle}
              </div>
              {formData.deadline && (
                <div className="review-field">
                  <strong>Deadline:</strong> {formData.deadline.toLocaleDateString()}
                </div>
              )}
              {formData.roles.length > 0 && (
                <div className="review-field">
                  <strong>Roles:</strong> {formData.roles.join(', ')}
                </div>
              )}
            </div>

            <div className="review-section">
              <h3>Email Preview</h3>
              <div className="email-preview" dangerouslySetInnerHTML={{ __html: emailBodyHtml }} />
            </div>

            <div className="review-notice">
              This petition will be sent to the RTVF listserv with a reply-to address of {formData.senderEmail}.
              Once sent, it will appear on the petitions dashboard.
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="form-actions">
          {step !== 'form' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep(step === 'email' ? 'form' : 'email')}
              disabled={isSubmitting}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          {step === 'form' && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleNextToEmail}
            >
              Next: Customize Email
            </button>
          )}
          {step === 'email' && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleNextToReview}
            >
              Next: Review
            </button>
          )}
          {step === 'review' && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Petition'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
