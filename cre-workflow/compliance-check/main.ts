import {
  CronCapability,
  ConfidentialHTTPClient,
  consensusIdenticalAggregation,
  handler,
  Runner,
  ok,
  json,
  type ConfidentialHTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Config schema (validated via Zod / StandardSchemaV1)
// ---------------------------------------------------------------------------
const configSchema = z.object({
  schedule: z.string(),
  complianceApiBaseUrl: z.string(),
  owner: z.string(),
  subjectAddress: z.string(),
  evms: z.array(
    z.object({
      chainSelectorName: z.string(),
      gatewayContractAddress: z.string(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

// ---------------------------------------------------------------------------
// API response types (matching our mock compliance API)
// CRE WASM runtime cannot serialize null values — use empty strings instead
// ---------------------------------------------------------------------------
type SanctionsCheckResponse = {
  address: string;
  sanctioned: boolean;
  source: string;
  riskScore: number;
  checkedAt: string;
  note: string;
};

type KycStatusResponse = {
  address: string;
  kycStatus: string;
  kycExpiry: string;
  checkedAt: string;
  note: string;
};

type AccreditedInvestorResponse = {
  address: string;
  accreditedInvestor: boolean;
  accreditationType: string;
  checkedAt: string;
  note: string;
};

type JurisdictionCheckResponse = {
  address: string;
  jurisdiction: string;
  restricted: boolean;
  checkedAt: string;
  note: string;
};

type FullComplianceResult = {
  overallResult: string;
  tier: number;
  maxTransferValue: number;
  validUntil: number;
  failureReason: string;
  checkId: string;
  sanctions: { sanctioned: boolean; source: string };
  kyc: { status: string; expiry: string };
  accreditation: { accredited: boolean; type: string };
  jurisdiction: { jurisdiction: string; restricted: boolean };
};

// Replace null/undefined values with empty strings for WASM compatibility
function sanitize<T>(obj: unknown): T {
  const raw = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    result[key] = raw[key] === null || raw[key] === undefined ? "" : raw[key];
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Confidential HTTP fetch functions
// Each executes inside a secure enclave with secret injection via templates.
// API key is NEVER in node memory — only decrypted inside the enclave.
// ---------------------------------------------------------------------------

const fetchSanctionsCheck = (
  sendRequester: ConfidentialHTTPSendRequester,
  config: Config
): SanctionsCheckResponse => {
  const response = sendRequester
    .sendRequest({
      request: {
        url: `${config.complianceApiBaseUrl}/sanctions-check`,
        method: "POST",
        bodyString: '{"address": "{{.subjectAddress}}"}',
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
          "x-api-key": { values: ["{{.complianceApiKey}}"] },
        },
        templatePublicValues: {
          subjectAddress: config.subjectAddress,
        },
      },
      vaultDonSecrets: [
        { key: "complianceApiKey", namespace: "compliance", owner: config.owner },
      ],
      encryptOutput: false,
    })
    .result();

  if (!ok(response)) {
    throw new Error(`Sanctions check failed with status ${response.statusCode}`);
  }
  return sanitize<SanctionsCheckResponse>(json(response));
};

const fetchKycStatus = (
  sendRequester: ConfidentialHTTPSendRequester,
  config: Config
): KycStatusResponse => {
  const response = sendRequester
    .sendRequest({
      request: {
        url: `${config.complianceApiBaseUrl}/kyc-status`,
        method: "POST",
        bodyString: '{"address": "{{.subjectAddress}}"}',
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
          "x-api-key": { values: ["{{.complianceApiKey}}"] },
        },
        templatePublicValues: {
          subjectAddress: config.subjectAddress,
        },
      },
      vaultDonSecrets: [
        { key: "complianceApiKey", namespace: "compliance", owner: config.owner },
      ],
      encryptOutput: false,
    })
    .result();

  if (!ok(response)) {
    throw new Error(`KYC status check failed with status ${response.statusCode}`);
  }
  return sanitize<KycStatusResponse>(json(response));
};

const fetchAccreditedInvestor = (
  sendRequester: ConfidentialHTTPSendRequester,
  config: Config
): AccreditedInvestorResponse => {
  const response = sendRequester
    .sendRequest({
      request: {
        url: `${config.complianceApiBaseUrl}/accredited-investor`,
        method: "POST",
        bodyString: '{"address": "{{.subjectAddress}}"}',
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
          "x-api-key": { values: ["{{.complianceApiKey}}"] },
        },
        templatePublicValues: {
          subjectAddress: config.subjectAddress,
        },
      },
      vaultDonSecrets: [
        { key: "complianceApiKey", namespace: "compliance", owner: config.owner },
      ],
      encryptOutput: false,
    })
    .result();

  if (!ok(response)) {
    throw new Error(`Accreditation check failed with status ${response.statusCode}`);
  }
  return sanitize<AccreditedInvestorResponse>(json(response));
};

const fetchJurisdictionCheck = (
  sendRequester: ConfidentialHTTPSendRequester,
  config: Config
): JurisdictionCheckResponse => {
  const response = sendRequester
    .sendRequest({
      request: {
        url: `${config.complianceApiBaseUrl}/jurisdiction-check`,
        method: "POST",
        bodyString: '{"address": "{{.subjectAddress}}"}',
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
          "x-api-key": { values: ["{{.complianceApiKey}}"] },
        },
        templatePublicValues: {
          subjectAddress: config.subjectAddress,
        },
      },
      vaultDonSecrets: [
        { key: "complianceApiKey", namespace: "compliance", owner: config.owner },
      ],
      encryptOutput: false,
    })
    .result();

  if (!ok(response)) {
    throw new Error(`Jurisdiction check failed with status ${response.statusCode}`);
  }
  return sanitize<JurisdictionCheckResponse>(json(response));
};

// ---------------------------------------------------------------------------
// Compliance decision logic
// ---------------------------------------------------------------------------

function evaluateCompliance(
  sanctions: SanctionsCheckResponse,
  kyc: KycStatusResponse,
  accredited: AccreditedInvestorResponse,
  jurisdiction: JurisdictionCheckResponse,
  nowMs: number
): FullComplianceResult {
  const baseResult = {
    sanctions: { sanctioned: sanctions.sanctioned, source: sanctions.source },
    kyc: { status: kyc.kycStatus, expiry: kyc.kycExpiry },
    accreditation: {
      accredited: accredited.accreditedInvestor,
      type: accredited.accreditationType,
    },
    jurisdiction: {
      jurisdiction: jurisdiction.jurisdiction,
      restricted: jurisdiction.restricted,
    },
  };

  // Generate a deterministic checkId from address + timestamp
  const checkId = `chk_${sanctions.address.slice(2, 10)}_${nowMs}`;

  // FAIL: sanctioned address
  if (sanctions.sanctioned) {
    return {
      ...baseResult,
      overallResult: "FAIL",
      tier: 0,
      maxTransferValue: 0,
      validUntil: 0,
      failureReason: "Address is sanctioned",
      checkId,
    };
  }

  // FAIL: KYC not approved
  if (kyc.kycStatus !== "approved") {
    return {
      ...baseResult,
      overallResult: "FAIL",
      tier: 0,
      maxTransferValue: 0,
      validUntil: 0,
      failureReason: `KYC not verified (status: ${kyc.kycStatus})`,
      checkId,
    };
  }

  // FAIL: KYC expired
  if (kyc.kycExpiry) {
    const expiryMs = new Date(kyc.kycExpiry).getTime();
    if (expiryMs < nowMs) {
      return {
        ...baseResult,
        overallResult: "FAIL",
        tier: 0,
        maxTransferValue: 0,
        validUntil: 0,
        failureReason: "KYC expired",
        checkId,
      };
    }
  }

  // FAIL: restricted jurisdiction
  if (jurisdiction.restricted) {
    return {
      ...baseResult,
      overallResult: "FAIL",
      tier: 0,
      maxTransferValue: 0,
      validUntil: 0,
      failureReason: `Jurisdiction restricted (${jurisdiction.jurisdiction})`,
      checkId,
    };
  }

  // PASS: determine tier based on accreditation
  let tier: number;
  let maxTransferValue: number;

  if (
    accredited.accreditedInvestor &&
    accredited.accreditationType === "net-worth"
  ) {
    // Institutional-grade accreditation
    tier = 3;
    maxTransferValue = 10_000_000; // $10M
  } else if (accredited.accreditedInvestor) {
    // Individual accredited investor
    tier = 2;
    maxTransferValue = 1_000_000; // $1M
  } else {
    // Basic retail
    tier = 1;
    maxTransferValue = 10_000; // $10K
  }

  // Attestation valid for 24 hours
  const validUntil = Math.floor(nowMs / 1000) + 24 * 60 * 60;

  return {
    ...baseResult,
    overallResult: "PASS",
    tier,
    maxTransferValue,
    validUntil,
    failureReason: "",
    checkId,
  };
}

// ---------------------------------------------------------------------------
// Main workflow trigger handler
// ---------------------------------------------------------------------------

const onComplianceCheck = (runtime: Runtime<Config>): string => {
  runtime.log("Compliance Check Workflow triggered");
  runtime.log(`Subject: ${runtime.config.subjectAddress}`);

  const confClient = new ConfidentialHTTPClient();

  // Execute all 4 compliance checks via Confidential HTTP
  // Each runs inside a secure enclave — API key injected via template, never in node memory
  const sanctions = confClient
    .sendRequest(
      runtime,
      fetchSanctionsCheck,
      consensusIdenticalAggregation<SanctionsCheckResponse>()
    )(runtime.config)
    .result();

  runtime.log(`Sanctions check: sanctioned=${sanctions.sanctioned}`);

  const kyc = confClient
    .sendRequest(
      runtime,
      fetchKycStatus,
      consensusIdenticalAggregation<KycStatusResponse>()
    )(runtime.config)
    .result();

  runtime.log(`KYC check: status=${kyc.kycStatus}`);

  const accredited = confClient
    .sendRequest(
      runtime,
      fetchAccreditedInvestor,
      consensusIdenticalAggregation<AccreditedInvestorResponse>()
    )(runtime.config)
    .result();

  runtime.log(`Accreditation check: accredited=${accredited.accreditedInvestor}`);

  const jurisdiction = confClient
    .sendRequest(
      runtime,
      fetchJurisdictionCheck,
      consensusIdenticalAggregation<JurisdictionCheckResponse>()
    )(runtime.config)
    .result();

  runtime.log(`Jurisdiction check: restricted=${jurisdiction.restricted}`);

  // Apply compliance decision logic
  const nowMs = runtime.now().getTime();
  const result = evaluateCompliance(sanctions, kyc, accredited, jurisdiction, nowMs);

  runtime.log(`Result: ${result.overallResult} | Tier: ${result.tier} | Max: ${result.maxTransferValue}`);
  if (result.failureReason) {
    runtime.log(`Failure reason: ${result.failureReason}`);
  }

  return JSON.stringify(result);
};

// ---------------------------------------------------------------------------
// Workflow initialization
// ---------------------------------------------------------------------------

const initWorkflow = (config: Config) => {
  return [
    handler(
      new CronCapability().trigger({ schedule: config.schedule }),
      onComplianceCheck
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

main();
