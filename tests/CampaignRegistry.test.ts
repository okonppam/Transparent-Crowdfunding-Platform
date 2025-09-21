import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_GOAL = 101;
const ERR_INVALID_DEADLINE = 102;
const ERR_INVALID_DESCRIPTION = 103;
const ERR_INVALID_TITLE = 104;
const ERR_INVALID_CATEGORY = 105;
const ERR_CAMPAIGN_ALREADY_EXISTS = 106;
const ERR_CAMPAIGN_NOT_FOUND = 107;
const ERR_INVALID_CAMPAIGN_TYPE = 115;
const ERR_INVALID_REWARD_TIERS = 116;
const ERR_INVALID_LOCATION = 117;
const ERR_INVALID_CURRENCY = 118;
const ERR_INVALID_MIN_CONTRIB = 110;
const ERR_INVALID_MAX_CONTRIB = 111;
const ERR_MAX_CAMPAIGNS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
const ERR_INVALID_START_TIME = 121;
const ERR_INVALID_END_TIME = 122;
const ERR_INVALID_FUNDING_THRESHOLD = 123;
const ERR_INVALID_VOTING_PERIOD = 125;
const ERR_INVALID_STATUS = 119;

interface Campaign {
  title: string;
  description: string;
  goal: number;
  deadline: number;
  raised: number;
  timestamp: number;
  creator: string;
  category: string;
  rewardTiers: number;
  location: string;
  currency: string;
  status: boolean;
  minContrib: number;
  maxContrib: number;
  campaignType: string;
  startTime: number;
  endTime: number;
  fundingThreshold: number;
  refundPolicy: boolean;
  votingPeriod: number;
}

interface CampaignUpdate {
  updateTitle: string;
  updateGoal: number;
  updateDeadline: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class CampaignRegistryMock {
  state: {
    nextCampaignId: number;
    maxCampaigns: number;
    creationFee: number;
    authorityContract: string | null;
    campaigns: Map<number, Campaign>;
    campaignUpdates: Map<number, CampaignUpdate>;
    campaignsByTitle: Map<string, number>;
  } = {
    nextCampaignId: 0,
    maxCampaigns: 10000,
    creationFee: 500,
    authorityContract: null,
    campaigns: new Map(),
    campaignUpdates: new Map(),
    campaignsByTitle: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextCampaignId: 0,
      maxCampaigns: 10000,
      creationFee: 500,
      authorityContract: null,
      campaigns: new Map(),
      campaignUpdates: new Map(),
      campaignsByTitle: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createCampaign(
    title: string,
    description: string,
    goal: number,
    deadline: number,
    category: string,
    rewardTiers: number,
    location: string,
    currency: string,
    minContrib: number,
    maxContrib: number,
    campaignType: string,
    startTime: number,
    endTime: number,
    fundingThreshold: number,
    refundPolicy: boolean,
    votingPeriod: number
  ): Result<number> {
    if (this.state.nextCampaignId >= this.state.maxCampaigns) return { ok: false, value: ERR_MAX_CAMPAIGNS_EXCEEDED };
    if (!title || title.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (!description || description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (goal <= 0) return { ok: false, value: ERR_INVALID_GOAL };
    if (deadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (!category || category.length > 50) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (!["equity", "reward", "donation"].includes(campaignType)) return { ok: false, value: ERR_INVALID_CAMPAIGN_TYPE };
    if (rewardTiers > 10) return { ok: false, value: ERR_INVALID_REWARD_TIERS };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (minContrib <= 0) return { ok: false, value: ERR_INVALID_MIN_CONTRIB };
    if (maxContrib <= 0) return { ok: false, value: ERR_INVALID_MAX_CONTRIB };
    if (startTime < this.blockHeight) return { ok: false, value: ERR_INVALID_START_TIME };
    if (endTime <= startTime) return { ok: false, value: ERR_INVALID_END_TIME };
    if (fundingThreshold > goal) return { ok: false, value: ERR_INVALID_FUNDING_THRESHOLD };
    if (votingPeriod <= 0) return { ok: false, value: ERR_INVALID_VOTING_PERIOD };
    if (this.state.campaignsByTitle.has(title)) return { ok: false, value: ERR_CAMPAIGN_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextCampaignId;
    const campaign: Campaign = {
      title,
      description,
      goal,
      deadline,
      raised: 0,
      timestamp: this.blockHeight,
      creator: this.caller,
      category,
      rewardTiers,
      location,
      currency,
      status: true,
      minContrib,
      maxContrib,
      campaignType,
      startTime,
      endTime,
      fundingThreshold,
      refundPolicy,
      votingPeriod,
    };
    this.state.campaigns.set(id, campaign);
    this.state.campaignsByTitle.set(title, id);
    this.state.nextCampaignId++;
    return { ok: true, value: id };
  }

  getCampaign(id: number): Campaign | null {
    return this.state.campaigns.get(id) || null;
  }

  updateCampaign(id: number, updateTitle: string, updateGoal: number, updateDeadline: number): Result<boolean> {
    const campaign = this.state.campaigns.get(id);
    if (!campaign) return { ok: false, value: false };
    if (campaign.creator !== this.caller) return { ok: false, value: false };
    if (!updateTitle || updateTitle.length > 100) return { ok: false, value: false };
    if (updateGoal <= 0) return { ok: false, value: false };
    if (updateDeadline <= this.blockHeight) return { ok: false, value: false };
    if (this.state.campaignsByTitle.has(updateTitle) && this.state.campaignsByTitle.get(updateTitle) !== id) {
      return { ok: false, value: false };
    }

    const updated: Campaign = {
      ...campaign,
      title: updateTitle,
      goal: updateGoal,
      deadline: updateDeadline,
      timestamp: this.blockHeight,
    };
    this.state.campaigns.set(id, updated);
    this.state.campaignsByTitle.delete(campaign.title);
    this.state.campaignsByTitle.set(updateTitle, id);
    this.state.campaignUpdates.set(id, {
      updateTitle,
      updateGoal,
      updateDeadline,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  closeCampaign(id: number): Result<boolean> {
    const campaign = this.state.campaigns.get(id);
    if (!campaign) return { ok: false, value: false };
    if (campaign.creator !== this.caller) return { ok: false, value: false };
    if (!campaign.status) return { ok: false, value: ERR_INVALID_STATUS };
    const updated: Campaign = {
      ...campaign,
      status: false,
    };
    this.state.campaigns.set(id, updated);
    return { ok: true, value: true };
  }

  getCampaignCount(): Result<number> {
    return { ok: true, value: this.state.nextCampaignId };
  }

  checkCampaignExistence(title: string): Result<boolean> {
    return { ok: true, value: this.state.campaignsByTitle.has(title) };
  }

  getCampaignRaised(id: number): Result<number> {
    const campaign = this.state.campaigns.get(id);
    if (!campaign) return { ok: false, value: 0 };
    return { ok: true, value: campaign.raised };
  }

  updateCampaignRaised(id: number, amount: number): Result<boolean> {
    const campaign = this.state.campaigns.get(id);
    if (!campaign) return { ok: false, value: false };
    if (campaign.creator !== this.caller) return { ok: false, value: false };
    const updated: Campaign = {
      ...campaign,
      raised: campaign.raised + amount,
    };
    this.state.campaigns.set(id, updated);
    return { ok: true, value: true };
  }
}

describe("CampaignRegistry", () => {
  let contract: CampaignRegistryMock;

  beforeEach(() => {
    contract = new CampaignRegistryMock();
    contract.reset();
  });

  it("creates a campaign successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign(
      "Project Alpha",
      "Description of project",
      1000,
      100,
      "Tech",
      3,
      "City A",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const campaign = contract.getCampaign(0);
    expect(campaign?.title).toBe("Project Alpha");
    expect(campaign?.goal).toBe(1000);
    expect(campaign?.deadline).toBe(100);
    expect(campaign?.raised).toBe(0);
    expect(campaign?.category).toBe("Tech");
    expect(campaign?.rewardTiers).toBe(3);
    expect(campaign?.location).toBe("City A");
    expect(campaign?.currency).toBe("STX");
    expect(campaign?.minContrib).toBe(10);
    expect(campaign?.maxContrib).toBe(500);
    expect(campaign?.campaignType).toBe("reward");
    expect(campaign?.startTime).toBe(10);
    expect(campaign?.endTime).toBe(20);
    expect(campaign?.fundingThreshold).toBe(500);
    expect(campaign?.refundPolicy).toBe(true);
    expect(campaign?.votingPeriod).toBe(7);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate campaign titles", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Project Alpha",
      "Description",
      1000,
      100,
      "Tech",
      3,
      "City A",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    const result = contract.createCampaign(
      "Project Alpha",
      "New Description",
      2000,
      200,
      "Art",
      5,
      "City B",
      "USD",
      20,
      1000,
      "equity",
      15,
      25,
      1000,
      false,
      14
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CAMPAIGN_ALREADY_EXISTS);
  });

  it("rejects campaign creation without authority contract", () => {
    const result = contract.createCampaign(
      "NoAuth",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid goal", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign(
      "InvalidGoal",
      "Desc",
      0,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GOAL);
  });

  it("rejects invalid deadline", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign(
      "InvalidDeadline",
      "Desc",
      1000,
      0,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DEADLINE);
  });

  it("rejects invalid campaign type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign(
      "InvalidType",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "invalid",
      10,
      20,
      500,
      true,
      7
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CAMPAIGN_TYPE);
  });

  it("updates a campaign successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "OldCampaign",
      "Old Desc",
      1000,
      100,
      "Tech",
      3,
      "City A",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    const result = contract.updateCampaign(0, "NewCampaign", 2000, 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const campaign = contract.getCampaign(0);
    expect(campaign?.title).toBe("NewCampaign");
    expect(campaign?.goal).toBe(2000);
    expect(campaign?.deadline).toBe(200);
    const update = contract.state.campaignUpdates.get(0);
    expect(update?.updateTitle).toBe("NewCampaign");
    expect(update?.updateGoal).toBe(2000);
    expect(update?.updateDeadline).toBe(200);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent campaign", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateCampaign(99, "NewCampaign", 2000, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "TestCampaign",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateCampaign(0, "NewCampaign", 2000, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(1000);
    contract.createCampaign(
      "TestCampaign",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects creation fee change without authority contract", () => {
    const result = contract.setCreationFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct campaign count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Campaign1",
      "Desc1",
      1000,
      100,
      "Tech",
      3,
      "City A",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    contract.createCampaign(
      "Campaign2",
      "Desc2",
      2000,
      200,
      "Art",
      5,
      "City B",
      "USD",
      20,
      1000,
      "equity",
      15,
      25,
      1000,
      false,
      14
    );
    const result = contract.getCampaignCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks campaign existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "TestCampaign",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    const result = contract.checkCampaignExistence("TestCampaign");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkCampaignExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("closes a campaign successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "ToClose",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    const result = contract.closeCampaign(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const campaign = contract.getCampaign(0);
    expect(campaign?.status).toBe(false);
  });

  it("rejects closing non-existent campaign", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.closeCampaign(99);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects closing by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    contract.caller = "ST3FAKE";
    const result = contract.closeCampaign(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects closing already closed campaign", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    contract.closeCampaign(0);
    const result = contract.closeCampaign(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_STATUS);
  });

  it("gets campaign raised amount", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    const result = contract.getCampaignRaised(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
  });

  it("updates campaign raised amount", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    const updateResult = contract.updateCampaignRaised(0, 300);
    expect(updateResult.ok).toBe(true);
    expect(updateResult.value).toBe(true);
    const result = contract.getCampaignRaised(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(300);
  });

  it("rejects update raised by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Test",
      "Desc",
      1000,
      100,
      "Tech",
      3,
      "City",
      "STX",
      10,
      500,
      "reward",
      10,
      20,
      500,
      true,
      7
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateCampaignRaised(0, 300);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("parses campaign title with Clarity", () => {
    const cv = stringUtf8CV("Project Beta");
    expect(cv.value).toBe("Project Beta");
  });

  it("parses goal with Clarity", () => {
    const cv = uintCV(1500);
    expect(cv.value).toEqual(BigInt(1500));
  });
});