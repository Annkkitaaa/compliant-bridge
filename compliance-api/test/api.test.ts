import request from "supertest";
import { app } from "../src/index";

const API_KEY = "test-api-key-123";

const CLEAN_ADDRESS = "0xAA00000000000000000000000000000000000001";
const CLEAN_ADDRESS_2 = "0xAA00000000000000000000000000000000000002";
const SANCTIONED_ADDRESS = "0xBB00000000000000000000000000000000000001";
const EXPIRED_KYC_ADDRESS = "0xCC00000000000000000000000000000000000001";
const PENDING_KYC_ADDRESS = "0xCC00000000000000000000000000000000000002";
const NOT_ACCREDITED_ADDRESS = "0xDD00000000000000000000000000000000000001";
const RESTRICTED_JURISDICTION_ADDRESS = "0xEE00000000000000000000000000000000000001";
const UNKNOWN_ADDRESS = "0xFF00000000000000000000000000000000000099";

describe("Health endpoint", () => {
  it("GET /api/v1/health returns ok without API key", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("compliance-api");
  });
});

describe("API Key middleware", () => {
  it("rejects requests without API key", async () => {
    const res = await request(app)
      .post("/api/v1/sanctions-check")
      .send({ address: CLEAN_ADDRESS });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Missing");
  });

  it("rejects requests with wrong API key", async () => {
    const res = await request(app)
      .post("/api/v1/sanctions-check")
      .set("x-api-key", "wrong-key")
      .send({ address: CLEAN_ADDRESS });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Invalid");
  });

  it("accepts requests with valid API key", async () => {
    const res = await request(app)
      .post("/api/v1/kyc-status")
      .set("x-api-key", API_KEY)
      .send({ address: CLEAN_ADDRESS });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/sanctions-check", () => {
  it("returns not sanctioned for clean address", async () => {
    const res = await request(app)
      .post("/api/v1/sanctions-check")
      .set("x-api-key", API_KEY)
      .send({ address: CLEAN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.sanctioned).toBe(false);
    expect(res.body.riskScore).toBe(0);
  });

  it("returns sanctioned for OFAC-listed address", async () => {
    const res = await request(app)
      .post("/api/v1/sanctions-check")
      .set("x-api-key", API_KEY)
      .send({ address: SANCTIONED_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.sanctioned).toBe(true);
    expect(res.body.source).toBe("OFAC-SDN");
    expect(res.body.riskScore).toBe(100);
  });

  it("returns not sanctioned for unknown address", async () => {
    const res = await request(app)
      .post("/api/v1/sanctions-check")
      .set("x-api-key", API_KEY)
      .send({ address: UNKNOWN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.sanctioned).toBe(false);
  });

  it("returns 400 when address is missing", async () => {
    const res = await request(app)
      .post("/api/v1/sanctions-check")
      .set("x-api-key", API_KEY)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/kyc-status", () => {
  it("returns approved for clean address", async () => {
    const res = await request(app)
      .post("/api/v1/kyc-status")
      .set("x-api-key", API_KEY)
      .send({ address: CLEAN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe("approved");
  });

  it("returns expired for expired KYC address", async () => {
    const res = await request(app)
      .post("/api/v1/kyc-status")
      .set("x-api-key", API_KEY)
      .send({ address: EXPIRED_KYC_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe("expired");
  });

  it("returns pending for pending KYC address", async () => {
    const res = await request(app)
      .post("/api/v1/kyc-status")
      .set("x-api-key", API_KEY)
      .send({ address: PENDING_KYC_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe("pending");
  });

  it("returns unknown for unrecognized address", async () => {
    const res = await request(app)
      .post("/api/v1/kyc-status")
      .set("x-api-key", API_KEY)
      .send({ address: UNKNOWN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe("unknown");
  });

  it("returns 400 when address is missing", async () => {
    const res = await request(app)
      .post("/api/v1/kyc-status")
      .set("x-api-key", API_KEY)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/accredited-investor", () => {
  it("returns accredited for clean address", async () => {
    const res = await request(app)
      .post("/api/v1/accredited-investor")
      .set("x-api-key", API_KEY)
      .send({ address: CLEAN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.accreditedInvestor).toBe(true);
    expect(res.body.accreditationType).toBe("income");
  });

  it("returns not accredited for non-accredited address", async () => {
    const res = await request(app)
      .post("/api/v1/accredited-investor")
      .set("x-api-key", API_KEY)
      .send({ address: NOT_ACCREDITED_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.accreditedInvestor).toBe(false);
  });

  it("returns not accredited for unknown address", async () => {
    const res = await request(app)
      .post("/api/v1/accredited-investor")
      .set("x-api-key", API_KEY)
      .send({ address: UNKNOWN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.accreditedInvestor).toBe(false);
  });

  it("returns 400 when address is missing", async () => {
    const res = await request(app)
      .post("/api/v1/accredited-investor")
      .set("x-api-key", API_KEY)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/jurisdiction-check", () => {
  it("returns not restricted for clean address", async () => {
    const res = await request(app)
      .post("/api/v1/jurisdiction-check")
      .set("x-api-key", API_KEY)
      .send({ address: CLEAN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.restricted).toBe(false);
    expect(res.body.jurisdiction).toBe("US");
  });

  it("returns restricted for restricted jurisdiction", async () => {
    const res = await request(app)
      .post("/api/v1/jurisdiction-check")
      .set("x-api-key", API_KEY)
      .send({ address: RESTRICTED_JURISDICTION_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.restricted).toBe(true);
    expect(res.body.jurisdiction).toBe("KP");
  });

  it("returns unknown for unrecognized address", async () => {
    const res = await request(app)
      .post("/api/v1/jurisdiction-check")
      .set("x-api-key", API_KEY)
      .send({ address: UNKNOWN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.jurisdiction).toBe("unknown");
    expect(res.body.restricted).toBe(false);
  });

  it("returns 400 when address is missing", async () => {
    const res = await request(app)
      .post("/api/v1/jurisdiction-check")
      .set("x-api-key", API_KEY)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/full-compliance-check", () => {
  it("returns PASS for fully compliant address", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({ address: CLEAN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.overallResult).toBe("PASS");
    expect(res.body.checks.sanctions.sanctioned).toBe(false);
    expect(res.body.checks.kyc.kycStatus).toBe("approved");
    expect(res.body.checks.accredited.accreditedInvestor).toBe(true);
    expect(res.body.checks.jurisdiction.restricted).toBe(false);
  });

  it("returns PASS for second clean address", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({ address: CLEAN_ADDRESS_2 });
    expect(res.status).toBe(200);
    expect(res.body.overallResult).toBe("PASS");
  });

  it("returns FAIL for sanctioned address", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({ address: SANCTIONED_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.overallResult).toBe("FAIL");
    expect(res.body.checks.sanctions.sanctioned).toBe(true);
  });

  it("returns REVIEW for expired KYC", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({ address: EXPIRED_KYC_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.overallResult).toBe("REVIEW");
  });

  it("returns REVIEW for pending KYC", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({ address: PENDING_KYC_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.overallResult).toBe("REVIEW");
  });

  it("returns REVIEW for non-accredited investor", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({ address: NOT_ACCREDITED_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.overallResult).toBe("REVIEW");
  });

  it("returns REVIEW for restricted jurisdiction", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({ address: RESTRICTED_JURISDICTION_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.overallResult).toBe("REVIEW");
  });

  it("returns REVIEW for unknown address", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({ address: UNKNOWN_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.overallResult).toBe("REVIEW");
  });

  it("returns 400 when address is missing", async () => {
    const res = await request(app)
      .post("/api/v1/full-compliance-check")
      .set("x-api-key", API_KEY)
      .send({});
    expect(res.status).toBe(400);
  });
});
