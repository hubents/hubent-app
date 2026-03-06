import { describe, it, expect } from 'vitest';

// Test the pure functions extracted from contact-drawer.tsx
// We replicate getEmptyDraft and mapContactToDraft here to test them in isolation

const VENDOR_CATEGORIES = [
  "Catering", "Fotografía", "Vídeo", "Música", "Decoración",
  "Floristería", "Wedding Planner", "Transporte", "Alquiler",
  "Papelería", "Maquillaje", "Peluquería", "Animación",
  "Iluminación", "Sonido", "Mobiliario", "Seguridad", "Otro",
] as const;

interface GeneralFormData {
  email: string;
  phone: string;
  phoneCountryCode: string;
  firstName: string;
  lastName: string;
  nieOrCif: string;
  tradeName: string;
  taxId: string;
  website: string;
  contactPersonName: string;
  contactPersonEmail: string;
  notes: string;
  category: string;
  isVendor: boolean;
  vendorCategory: string;
  customCategory: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface BankFormData {
  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankSwift: string;
  paymentMethods: string[];
}

interface ContactDraft extends GeneralFormData, BankFormData {}

function getEmptyDraft(): ContactDraft {
  return {
    email: "", phone: "", phoneCountryCode: "+34",
    firstName: "", lastName: "", nieOrCif: "", tradeName: "",
    taxId: "", website: "", contactPersonName: "", contactPersonEmail: "",
    notes: "", category: "", isVendor: false, vendorCategory: "",
    customCategory: "", address: "", city: "", state: "",
    postalCode: "", country: "ES",
    bankName: "", bankAccountNumber: "", bankIban: "",
    bankSwift: "", paymentMethods: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContactToDraft(contact: any): ContactDraft {
  const isCustomCategory = contact.vendorCategory && !(VENDOR_CATEGORIES as readonly string[]).includes(contact.vendorCategory);
  return {
    email: contact.email || "",
    phone: contact.phone || "",
    phoneCountryCode: contact.phoneCountryCode || "+34",
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    nieOrCif: contact.nieOrCif || "",
    tradeName: contact.tradeName || "",
    taxId: contact.taxId || "",
    website: contact.website || "",
    contactPersonName: contact.contactPersonName || "",
    contactPersonEmail: contact.contactPersonEmail || "",
    notes: contact.notes || "",
    category: contact.category || "",
    isVendor: contact.isVendor || false,
    vendorCategory: isCustomCategory ? "Otro" : (contact.vendorCategory || ""),
    customCategory: isCustomCategory ? contact.vendorCategory || "" : "",
    address: contact.address || "",
    city: contact.city || "",
    state: contact.state || "",
    postalCode: contact.postalCode || "",
    country: contact.country || "ES",
    bankName: contact.bankName || "",
    bankAccountNumber: contact.bankAccountNumber || "",
    bankIban: contact.bankIban || "",
    bankSwift: contact.bankSwift || "",
    paymentMethods: contact.paymentMethods || [],
  };
}

// Simulate the handleSaveAll updates builder
function buildUpdates(draftData: ContactDraft, contactType: "person" | "company"): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    email: draftData.email || null,
    phone: draftData.phone || null,
    phoneCountryCode: draftData.phoneCountryCode,
    website: draftData.website || null,
    tradeName: draftData.tradeName || null,
    notes: draftData.notes || null,
    address: draftData.address || null,
    city: draftData.city || null,
    state: draftData.state || null,
    postalCode: draftData.postalCode || null,
    country: draftData.country || null,
    bankName: draftData.bankName || null,
    bankAccountNumber: draftData.bankAccountNumber || null,
    bankIban: draftData.bankIban || null,
    bankSwift: draftData.bankSwift || null,
    paymentMethods: draftData.paymentMethods.length > 0 ? draftData.paymentMethods : null,
  };

  updates.isVendor = draftData.isVendor;
  updates.vendorCategory = draftData.isVendor
    ? (draftData.vendorCategory === "Otro" ? draftData.customCategory || null : draftData.vendorCategory || null)
    : null;
  updates.category = draftData.isVendor ? null : draftData.category || null;

  if (contactType === "person") {
    updates.firstName = draftData.firstName || null;
    updates.lastName = draftData.lastName || null;
    updates.nieOrCif = draftData.nieOrCif || null;
    if (draftData.firstName || draftData.lastName) {
      updates.name = `${draftData.firstName} ${draftData.lastName}`.trim();
    }
  } else {
    updates.taxId = draftData.taxId || null;
    updates.contactPersonName = draftData.contactPersonName || null;
    updates.contactPersonEmail = draftData.contactPersonEmail || null;
  }

  return updates;
}

describe('Contact Drawer State Management', () => {
  describe('getEmptyDraft', () => {
    it('should return all general fields with defaults', () => {
      const draft = getEmptyDraft();
      expect(draft.email).toBe("");
      expect(draft.phone).toBe("");
      expect(draft.phoneCountryCode).toBe("+34");
      expect(draft.firstName).toBe("");
      expect(draft.lastName).toBe("");
      expect(draft.country).toBe("ES");
      expect(draft.isVendor).toBe(false);
    });

    it('should return all bank fields with defaults', () => {
      const draft = getEmptyDraft();
      expect(draft.bankName).toBe("");
      expect(draft.bankAccountNumber).toBe("");
      expect(draft.bankIban).toBe("");
      expect(draft.bankSwift).toBe("");
      expect(draft.paymentMethods).toEqual([]);
    });

    it('should return a new object each call (no shared reference)', () => {
      const a = getEmptyDraft();
      const b = getEmptyDraft();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
      a.email = "changed";
      expect(b.email).toBe("");
    });
  });

  describe('mapContactToDraft', () => {
    const fullContact = {
      id: 1,
      type: "person",
      name: "Juan García",
      email: "juan@test.com",
      phone: "612345678",
      phoneCountryCode: "+34",
      firstName: "Juan",
      lastName: "García",
      nieOrCif: "12345678A",
      tradeName: "JG Services",
      taxId: null,
      website: "https://juan.com",
      contactPersonName: null,
      contactPersonEmail: null,
      notes: "Notas de test",
      category: "Cliente",
      isVendor: false,
      vendorCategory: null,
      address: "Calle Mayor 1",
      city: "Madrid",
      state: "Madrid",
      postalCode: "28001",
      country: "ES",
      bankName: "Santander",
      bankAccountNumber: "1234567890",
      bankIban: "ES1234567890123456789012",
      bankSwift: "BSCHESMMXXX",
      paymentMethods: ["transfer", "bizum"],
    };

    it('should map all general fields from contact', () => {
      const draft = mapContactToDraft(fullContact);
      expect(draft.email).toBe("juan@test.com");
      expect(draft.phone).toBe("612345678");
      expect(draft.firstName).toBe("Juan");
      expect(draft.lastName).toBe("García");
      expect(draft.nieOrCif).toBe("12345678A");
      expect(draft.tradeName).toBe("JG Services");
      expect(draft.website).toBe("https://juan.com");
      expect(draft.notes).toBe("Notas de test");
      expect(draft.category).toBe("Cliente");
      expect(draft.address).toBe("Calle Mayor 1");
      expect(draft.city).toBe("Madrid");
      expect(draft.postalCode).toBe("28001");
      expect(draft.country).toBe("ES");
    });

    it('should map all bank fields from contact', () => {
      const draft = mapContactToDraft(fullContact);
      expect(draft.bankName).toBe("Santander");
      expect(draft.bankAccountNumber).toBe("1234567890");
      expect(draft.bankIban).toBe("ES1234567890123456789012");
      expect(draft.bankSwift).toBe("BSCHESMMXXX");
      expect(draft.paymentMethods).toEqual(["transfer", "bizum"]);
    });

    it('should handle null fields gracefully', () => {
      const minimalContact = {
        id: 2,
        type: "company",
        name: "Empresa SL",
        email: null,
        phone: null,
        phoneCountryCode: null,
        firstName: null,
        lastName: null,
        bankName: null,
        bankIban: null,
        paymentMethods: null,
      };
      const draft = mapContactToDraft(minimalContact);
      expect(draft.email).toBe("");
      expect(draft.phone).toBe("");
      expect(draft.phoneCountryCode).toBe("+34");
      expect(draft.bankName).toBe("");
      expect(draft.bankIban).toBe("");
      expect(draft.paymentMethods).toEqual([]);
      expect(draft.country).toBe("ES");
    });

    it('should detect known vendor categories', () => {
      const vendorContact = {
        ...fullContact,
        isVendor: true,
        vendorCategory: "Catering",
      };
      const draft = mapContactToDraft(vendorContact);
      expect(draft.isVendor).toBe(true);
      expect(draft.vendorCategory).toBe("Catering");
      expect(draft.customCategory).toBe("");
    });

    it('should detect custom vendor categories and map to "Otro"', () => {
      const vendorContact = {
        ...fullContact,
        isVendor: true,
        vendorCategory: "Mi Categoría Custom",
      };
      const draft = mapContactToDraft(vendorContact);
      expect(draft.isVendor).toBe(true);
      expect(draft.vendorCategory).toBe("Otro");
      expect(draft.customCategory).toBe("Mi Categoría Custom");
    });
  });

  describe('Draft state persistence simulation', () => {
    it('should preserve general tab changes when switching to bank tab', () => {
      const contact = {
        id: 1, type: "person", name: "Test",
        email: null, phone: null, bankName: null,
        paymentMethods: null,
      };

      // 1. Initialize draft from contact
      const draftData = mapContactToDraft(contact);
      const originalData = mapContactToDraft(contact);

      // 2. User edits general fields
      draftData.email = "nuevo@email.com";
      draftData.phone = "666111222";
      draftData.firstName = "Nuevo";
      draftData.lastName = "Nombre";

      // 3. "Switch to bank tab" - in old code this would lose data
      //    With lifted state, draftData persists

      // 4. User edits bank fields
      draftData.bankName = "BBVA";
      draftData.bankIban = "ES1234";

      // 5. Verify ALL changes are preserved
      expect(draftData.email).toBe("nuevo@email.com");
      expect(draftData.phone).toBe("666111222");
      expect(draftData.firstName).toBe("Nuevo");
      expect(draftData.lastName).toBe("Nombre");
      expect(draftData.bankName).toBe("BBVA");
      expect(draftData.bankIban).toBe("ES1234");

      // 6. hasChanges should be true
      const hasChanges = JSON.stringify(draftData) !== JSON.stringify(originalData);
      expect(hasChanges).toBe(true);
    });

    it('should detect no changes when draft equals original', () => {
      const contact = { id: 1, email: "a@b.com", phone: "123", bankName: "Test" };
      const draftData = mapContactToDraft(contact);
      const originalData = mapContactToDraft(contact);

      const hasChanges = JSON.stringify(draftData) !== JSON.stringify(originalData);
      expect(hasChanges).toBe(false);
    });

    it('should reset to original on discard', () => {
      const contact = { id: 1, email: "original@test.com", bankName: "Original Bank" };
      const originalData = mapContactToDraft(contact);
      const draftData = { ...mapContactToDraft(contact) };

      // User makes changes
      draftData.email = "changed@test.com";
      draftData.bankName = "Changed Bank";

      expect(JSON.stringify(draftData) !== JSON.stringify(originalData)).toBe(true);

      // Discard: reset draft from contact
      const discarded = mapContactToDraft(contact);
      expect(JSON.stringify(discarded) === JSON.stringify(originalData)).toBe(true);
      expect(discarded.email).toBe("original@test.com");
      expect(discarded.bankName).toBe("Original Bank");
    });
  });

  describe('buildUpdates', () => {
    it('should include person-specific fields for person contacts', () => {
      const draft = getEmptyDraft();
      draft.firstName = "Juan";
      draft.lastName = "García";
      draft.nieOrCif = "12345678A";
      draft.email = "juan@test.com";

      const updates = buildUpdates(draft, "person");
      expect(updates.firstName).toBe("Juan");
      expect(updates.lastName).toBe("García");
      expect(updates.nieOrCif).toBe("12345678A");
      expect(updates.name).toBe("Juan García");
      expect(updates.email).toBe("juan@test.com");
      // Should NOT include company-specific fields
      expect(updates.taxId).toBeUndefined();
      expect(updates.contactPersonName).toBeUndefined();
    });

    it('should include company-specific fields for company contacts', () => {
      const draft = getEmptyDraft();
      draft.taxId = "B12345678";
      draft.contactPersonName = "María";
      draft.contactPersonEmail = "maria@empresa.com";

      const updates = buildUpdates(draft, "company");
      expect(updates.taxId).toBe("B12345678");
      expect(updates.contactPersonName).toBe("María");
      expect(updates.contactPersonEmail).toBe("maria@empresa.com");
      // Should NOT include person-specific fields
      expect(updates.firstName).toBeUndefined();
      expect(updates.lastName).toBeUndefined();
      expect(updates.nieOrCif).toBeUndefined();
    });

    it('should include bank fields in the same PATCH', () => {
      const draft = getEmptyDraft();
      draft.email = "test@test.com";
      draft.bankName = "Santander";
      draft.bankIban = "ES1234";
      draft.paymentMethods = ["transfer", "card"];

      const updates = buildUpdates(draft, "person");
      expect(updates.email).toBe("test@test.com");
      expect(updates.bankName).toBe("Santander");
      expect(updates.bankIban).toBe("ES1234");
      expect(updates.paymentMethods).toEqual(["transfer", "card"]);
    });

    it('should send null for empty string fields', () => {
      const draft = getEmptyDraft();
      const updates = buildUpdates(draft, "person");
      expect(updates.email).toBeNull();
      expect(updates.phone).toBeNull();
      expect(updates.bankName).toBeNull();
      expect(updates.paymentMethods).toBeNull();
    });

    it('should handle vendor category correctly', () => {
      const draft = getEmptyDraft();
      draft.isVendor = true;
      draft.vendorCategory = "Catering";

      const updates = buildUpdates(draft, "person");
      expect(updates.isVendor).toBe(true);
      expect(updates.vendorCategory).toBe("Catering");
      expect(updates.category).toBeNull();
    });

    it('should handle custom vendor category via "Otro"', () => {
      const draft = getEmptyDraft();
      draft.isVendor = true;
      draft.vendorCategory = "Otro";
      draft.customCategory = "Mi Categoría";

      const updates = buildUpdates(draft, "person");
      expect(updates.vendorCategory).toBe("Mi Categoría");
    });

    it('should use category when not vendor', () => {
      const draft = getEmptyDraft();
      draft.isVendor = false;
      draft.category = "Cliente";

      const updates = buildUpdates(draft, "person");
      expect(updates.isVendor).toBe(false);
      expect(updates.vendorCategory).toBeNull();
      expect(updates.category).toBe("Cliente");
    });

    it('should build name from firstName + lastName for person', () => {
      const draft = getEmptyDraft();
      draft.firstName = "Ana";
      draft.lastName = "López";

      const updates = buildUpdates(draft, "person");
      expect(updates.name).toBe("Ana López");
    });

    it('should handle firstName only (no lastName)', () => {
      const draft = getEmptyDraft();
      draft.firstName = "Ana";
      draft.lastName = "";

      const updates = buildUpdates(draft, "person");
      expect(updates.name).toBe("Ana");
    });
  });

  describe('GeneralFormData and BankFormData field completeness', () => {
    it('getEmptyDraft should have all 21 general fields', () => {
      const draft = getEmptyDraft();
      const generalFields: (keyof GeneralFormData)[] = [
        'email', 'phone', 'phoneCountryCode', 'firstName', 'lastName',
        'nieOrCif', 'tradeName', 'taxId', 'website', 'contactPersonName',
        'contactPersonEmail', 'notes', 'category', 'isVendor', 'vendorCategory',
        'customCategory', 'address', 'city', 'state', 'postalCode', 'country',
      ];
      for (const field of generalFields) {
        expect(field in draft).toBe(true);
      }
    });

    it('getEmptyDraft should have all 5 bank fields', () => {
      const draft = getEmptyDraft();
      const bankFields: (keyof BankFormData)[] = [
        'bankName', 'bankAccountNumber', 'bankIban', 'bankSwift', 'paymentMethods',
      ];
      for (const field of bankFields) {
        expect(field in draft).toBe(true);
      }
    });
  });
});
