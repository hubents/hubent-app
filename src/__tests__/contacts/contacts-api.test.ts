import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Contacts API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('POST /api/contacts', () => {
    it('should create a contact successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 1, name: 'Test Contact', type: 'person' },
        }),
      });

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'person', name: 'Test Contact' }),
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test Contact');
    });

    it('should return duplicate warning when contact exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: {
            code: 'DUPLICATE_WARNING',
            message: 'Possible duplicate contacts found',
            duplicates: [{ id: 1, name: 'Existing Contact' }],
          },
        }),
      });

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'person', name: 'Existing Contact', email: 'test@test.com' }),
      });

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('DUPLICATE_WARNING');
    });

    it('should skip duplicate check when forceDuplicate is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 2, name: 'Duplicate Contact', type: 'person' },
        }),
      });

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'person', 
          name: 'Duplicate Contact', 
          email: 'test@test.com',
          forceDuplicate: true,
        }),
      });

      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it('should create vendor when company isVendor is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { 
            id: 3, 
            name: 'Vendor Company', 
            type: 'company',
            isVendor: true,
            vendorCategory: 'Catering',
            vendorId: 10,
          },
        }),
      });

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'company', 
          name: 'Vendor Company',
          isVendor: true,
          vendorCategory: 'Catering',
        }),
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.isVendor).toBe(true);
      expect(result.data.vendorId).toBeDefined();
    });
  });

  describe('GET /api/contacts/[id]/relationships', () => {
    it('should return relationships for a person contact', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 1,
              role: 'Employee',
              relatedContactId: 5,
              relatedContactName: 'Acme Corp',
              relatedContactType: 'company',
            },
          ],
        }),
      });

      const response = await fetch('/api/contacts/1/relationships');
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].relatedContactType).toBe('company');
    });

    it('should return relationships for a company contact', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 2,
              role: 'CEO',
              relatedContactId: 10,
              relatedContactName: 'John Doe',
              relatedContactType: 'person',
            },
          ],
        }),
      });

      const response = await fetch('/api/contacts/5/relationships');
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data[0].relatedContactType).toBe('person');
    });
  });

  describe('POST /api/contacts/[id]/relationships', () => {
    it('should create a relationship between person and company', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 3,
            personContactId: 1,
            companyContactId: 5,
            role: 'Manager',
          },
        }),
      });

      const response = await fetch('/api/contacts/1/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relatedContactId: 5, role: 'Manager' }),
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data.role).toBe('Manager');
    });

    it('should prevent duplicate relationships', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: { message: 'La relación ya existe' },
        }),
      });

      const response = await fetch('/api/contacts/1/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relatedContactId: 5 }),
      });

      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  describe('DELETE /api/contacts/[id]/relationships', () => {
    it('should delete a relationship', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: 'Relación eliminada' },
        }),
      });

      const response = await fetch('/api/contacts/1/relationships?relationshipId=3', {
        method: 'DELETE',
      });

      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });
});
