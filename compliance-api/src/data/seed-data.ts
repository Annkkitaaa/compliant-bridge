export interface AddressRecord {
  address: string;
  sanctioned: boolean;
  sanctionSource?: string;
  kycStatus: "approved" | "pending" | "expired" | "rejected" | "unknown";
  kycExpiry?: string;
  accreditedInvestor: boolean;
  accreditationType?: string;
  jurisdiction: string;
  jurisdictionRestricted: boolean;
  name?: string;
}

export const seedData: Record<string, AddressRecord> = {
  // --- Pass all checks ---
  "0xAA00000000000000000000000000000000000001": {
    address: "0xAA00000000000000000000000000000000000001",
    sanctioned: false,
    kycStatus: "approved",
    kycExpiry: "2027-12-31",
    accreditedInvestor: true,
    accreditationType: "income",
    jurisdiction: "US",
    jurisdictionRestricted: false,
    name: "Alice Clean",
  },
  "0xAA00000000000000000000000000000000000002": {
    address: "0xAA00000000000000000000000000000000000002",
    sanctioned: false,
    kycStatus: "approved",
    kycExpiry: "2027-06-15",
    accreditedInvestor: true,
    accreditationType: "net-worth",
    jurisdiction: "GB",
    jurisdictionRestricted: false,
    name: "Bob Clean",
  },

  // --- Fail sanctions (OFAC SDN match) ---
  "0xBB00000000000000000000000000000000000001": {
    address: "0xBB00000000000000000000000000000000000001",
    sanctioned: true,
    sanctionSource: "OFAC-SDN",
    kycStatus: "approved",
    kycExpiry: "2027-12-31",
    accreditedInvestor: true,
    accreditationType: "income",
    jurisdiction: "US",
    jurisdictionRestricted: false,
    name: "Charlie Sanctioned",
  },
  "0xBB00000000000000000000000000000000000002": {
    address: "0xBB00000000000000000000000000000000000002",
    sanctioned: true,
    sanctionSource: "OFAC-SDN",
    kycStatus: "approved",
    kycExpiry: "2027-12-31",
    accreditedInvestor: true,
    accreditationType: "net-worth",
    jurisdiction: "RU",
    jurisdictionRestricted: false,
    name: "Diana Sanctioned",
  },

  // --- Expired/pending KYC ---
  "0xCC00000000000000000000000000000000000001": {
    address: "0xCC00000000000000000000000000000000000001",
    sanctioned: false,
    kycStatus: "expired",
    kycExpiry: "2023-01-01",
    accreditedInvestor: true,
    accreditationType: "income",
    jurisdiction: "US",
    jurisdictionRestricted: false,
    name: "Eve Expired",
  },
  "0xCC00000000000000000000000000000000000002": {
    address: "0xCC00000000000000000000000000000000000002",
    sanctioned: false,
    kycStatus: "pending",
    accreditedInvestor: true,
    accreditationType: "net-worth",
    jurisdiction: "DE",
    jurisdictionRestricted: false,
    name: "Frank Pending",
  },

  // --- Not accredited investors ---
  "0xDD00000000000000000000000000000000000001": {
    address: "0xDD00000000000000000000000000000000000001",
    sanctioned: false,
    kycStatus: "approved",
    kycExpiry: "2027-12-31",
    accreditedInvestor: false,
    jurisdiction: "US",
    jurisdictionRestricted: false,
    name: "Grace NotAccredited",
  },
  "0xDD00000000000000000000000000000000000002": {
    address: "0xDD00000000000000000000000000000000000002",
    sanctioned: false,
    kycStatus: "approved",
    kycExpiry: "2027-12-31",
    accreditedInvestor: false,
    jurisdiction: "CA",
    jurisdictionRestricted: false,
    name: "Hank NotAccredited",
  },

  // --- Restricted jurisdictions ---
  "0xEE00000000000000000000000000000000000001": {
    address: "0xEE00000000000000000000000000000000000001",
    sanctioned: false,
    kycStatus: "approved",
    kycExpiry: "2027-12-31",
    accreditedInvestor: true,
    accreditationType: "income",
    jurisdiction: "KP",
    jurisdictionRestricted: true,
    name: "Ivan Restricted",
  },
  "0xEE00000000000000000000000000000000000002": {
    address: "0xEE00000000000000000000000000000000000002",
    sanctioned: false,
    kycStatus: "approved",
    kycExpiry: "2027-12-31",
    accreditedInvestor: true,
    accreditationType: "net-worth",
    jurisdiction: "IR",
    jurisdictionRestricted: true,
    name: "Julia Restricted",
  },
};

export function lookupAddress(address: string): AddressRecord | undefined {
  return seedData[address];
}
