// IBAN validation (ISO 7064 MOD97-10) + Spanish bank lookup

export function formatIban(raw: string): string {
  const clean = raw.replace(/\s+/g, "").toUpperCase();
  return clean.match(/.{1,4}/g)?.join(" ") ?? clean;
}

export function cleanIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function validateIban(iban: string): boolean {
  const clean = cleanIban(iban);
  if (clean.length < 5) return false;
  // Rearrange: move first 4 to end, then convert letters to numbers
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  // MOD 97
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }
  return remainder === 1;
}

interface BankInfo {
  name: string;
  bic: string;
}

// Spanish entity codes (4 digits at IBAN[4..8])
const ES_BANKS: Record<string, BankInfo> = {
  "0001": { name: "Banco Santander",            bic: "BSCHESMM" },
  "0049": { name: "Banco Santander",            bic: "BSCHESMM" },
  "0030": { name: "Banco Santander (Banesto)",  bic: "BSCHESMM" },
  "0075": { name: "Banco Popular (Santander)",  bic: "POPLESMM" },
  "0182": { name: "BBVA",                        bic: "BBVAESMM" },
  "0081": { name: "CaixaBank",                  bic: "CAIXESBB" },
  "2100": { name: "CaixaBank",                  bic: "CAIXESBB" },
  "2038": { name: "CaixaBank (ex-Bankia)",      bic: "CAHMESMM" },
  "0128": { name: "Bankinter",                  bic: "BKBKESMM" },
  "0073": { name: "Openbank",                   bic: "OPENESMM" },
  "3058": { name: "Cajamar",                    bic: "CCRIES2A" },
  "2085": { name: "Ibercaja",                   bic: "CAZRES2Z" },
  "0061": { name: "Unicaja Banco",              bic: "UCJAES2M" },
  "1465": { name: "ING",                        bic: "INGDESMM" },
  "0186": { name: "Deutsche Bank",              bic: "DEUTESBB" },
  "0487": { name: "Banca March",                bic: "BMARES2M" },
  "2095": { name: "Kutxabank",                  bic: "BASKES2B" },
  "2080": { name: "Abanca",                     bic: "ABNAESMM" },
  "2013": { name: "Abanca (NCG Banco)",         bic: "ABNAESMM" },
  "3035": { name: "Cajasur",                    bic: "CAJSES2C" },
  "0019": { name: "Deutsche Bank",              bic: "DEUTESBB" },
  "0227": { name: "UniCredit",                  bic: "UNCRESMM" },
  "3025": { name: "Caixa Ontinyent",            bic: "COINES2V" },
  "2048": { name: "Caixa Pollença",             bic: "CPOLES2M" },
  "3159": { name: "Caja Rural de Granada",      bic: "CCRIES2A" },
  "0232": { name: "Banco de Sabadell",          bic: "BSABESMM" },
  "1491": { name: "Revolut",                    bic: "REVOGB21" },
  "1000": { name: "ICO",                        bic: "ICOEESMM" },
};

// Portuguese entity codes (4 digits at IBAN[4..8])
const PT_BANKS: Record<string, BankInfo> = {
  "0033": { name: "Millennium BCP",             bic: "BCOMPTPL" },
  "0036": { name: "Novo Banco",                 bic: "BESCPTPL" },
  "0035": { name: "Caixa Geral de Depósitos",   bic: "CGDIPTPL" },
  "0018": { name: "Santander Portugal",         bic: "TOTAPTPL" },
  "0007": { name: "Banco BPI",                  bic: "BBPIPTPL" },
  "0010": { name: "Banco BPI",                  bic: "BBPIPTPL" },
  "0079": { name: "Banco Carregosa",            bic: "BCARPTPL" },
  "0045": { name: "Banco ActivoBank",           bic: "ACTVPTPL" },
};

// French routing codes (5 digits at IBAN[4..9])
const FR_BANKS: Record<string, BankInfo> = {
  "30004": { name: "BNP Paribas",               bic: "BNPAFRPP" },
  "30056": { name: "Société Générale",          bic: "SOGEFRPP" },
  "17569": { name: "Crédit Agricole",           bic: "AGRIFRPP" },
  "30002": { name: "Crédit Lyonnais (LCL)",     bic: "CRLYFRPP" },
  "15589": { name: "La Banque Postale",         bic: "PSSTFRPPPAR" },
};

export interface IbanLookupResult {
  valid: boolean;
  country: string | null;
  bankName: string | null;
  bic: string | null;
}

export function lookupIban(raw: string): IbanLookupResult {
  const iban = cleanIban(raw);
  const valid = validateIban(iban);
  if (iban.length < 4) return { valid: false, country: null, bankName: null, bic: null };

  const country = iban.slice(0, 2);
  let bankInfo: BankInfo | null = null;

  if (country === "ES" && iban.length >= 8) {
    const code = iban.slice(4, 8);
    bankInfo = ES_BANKS[code] ?? null;
  } else if (country === "PT" && iban.length >= 8) {
    const code = iban.slice(4, 8);
    bankInfo = PT_BANKS[code] ?? null;
  } else if (country === "FR" && iban.length >= 9) {
    const code = iban.slice(4, 9);
    bankInfo = FR_BANKS[code] ?? null;
  }

  return {
    valid,
    country,
    bankName: bankInfo?.name ?? null,
    bic: bankInfo?.bic ?? null,
  };
}
