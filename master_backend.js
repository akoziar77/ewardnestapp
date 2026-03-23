
///////////////////////////////////////////////////////////
// MASTER SCRIPT — PART 1: CORE COLLECTIONS
///////////////////////////////////////////////////////////

collection("users", {
  fields: {
    email: { type: "string", required: true },
    password_hash: { type: "string", required: true },
    first_name: { type: "string" },
    last_name: { type: "string" },
    phone: { type: "string" },
    created_at: { type: "datetime", default: now() },
    updated_at: { type: "datetime", default: now() },
    role: { type: "string", default: "user" },
    brand_id: { type: "string" },
    engage_points: { type: "number", default: 0 },
    engage_streak: { type: "number", default: 0 },
    last_engage_date: { type: "datetime" }
  }
});

collection("brands", {
  fields: {
    name: { type: "string", required: true },
    logo_url: { type: "string" },
    description: { type: "string" },
    created_at: { type: "datetime", default: now() },
    updated_at: { type: "datetime", default: now() },
    status: { type: "string", default: "active" },
    api_key: { type: "string" },
    api_secret: { type: "string" },
    callback_url: { type: "string" }
  }
});

collection("boosters", {
  fields: {
    brand_id: { type: "string", required: true },
    name: { type: "string", required: true },
    description: { type: "string" },
    type: { type: "string", required: true },
    start_date: { type: "datetime" },
    end_date: { type: "datetime" },
    is_active: { type: "boolean", default: true },
    created_at: { type: "datetime", default: now() },
    updated_at: { type: "datetime", default: now() }
  }
});

collection("booster_tier_rules", {
  fields: {
    booster_id: { type: "string", required: true },
    tier_name: { type: "string", required: true },
    min_spend: { type: "number", required: true },
    multiplier: { type: "number", required: true },
    created_at: { type: "datetime", default: now() }
  }
});

collection("booster_action_rules", {
  fields: {
    booster_id: { type: "string", required: true },
    action_type: { type: "string", required: true },
    points: { type: "number", required: true },
    limit_per_day: { type: "number" },
    created_at: { type: "datetime", default: now() }
  }
});

collection("booster_user_targets", {
  fields: {
    booster_id: { type: "string", required: true },
    user_id: { type: "string", required: true },
    created_at: { type: "datetime", default: now() }
  }
});

collection("booster_activity_log", {
  fields: {
    booster_id: { type: "string", required: true },
    user_id: { type: "string", required: true },
    action_type: { type: "string" },
    points_awarded: { type: "number" },
    metadata: { type: "object" },
    created_at: { type: "datetime", default: now() }
  }
});

collection("transactions", {
  fields: {
    user_id: { type: "string", required: true },
    brand_id: { type: "string", required: true },
    amount: { type: "number", required: true },
    points_earned: { type: "number", default: 0 },
    source: { type: "string", default: "purchase" },
    created_at: { type: "datetime", default: now() }
  }
});

collection("engage_streaks", {
  fields: {
    user_id: { type: "string", required: true },
    streak_count: { type: "number", default: 0 },
    last_engage_date: { type: "datetime" },
    created_at: { type: "datetime", default: now() }
  }
});

collection("tier_progression", {
  fields: {
    user_id: { type: "string", required: true },
    brand_id: { type: "string", required: true },
    current_tier: { type: "string", default: "Bronze" },
    lifetime_spend: { type: "number", default: 0 },
    updated_at: { type: "datetime", default: now() }
  }
});

collection("brand_settings", {
  fields: {
    brand_id: { type: "string", required: true },
    earn_rate: { type: "number", default: 1 },
    redemption_rate: { type: "number", default: 0.01 },
    tier_thresholds: { type: "object" },
    updated_at: { type: "datetime", default: now() }
  }
});

collection("admin_settings", {
  fields: {
    maintenance_mode: { type: "boolean", default: false },
    global_multiplier: { type: "number", default: 1 },
    updated_at: { type: "datetime", default: now() }
  }
});

collection("system_logs", {
  fields: {
    level: { type: "string", required: true },
    message: { type: "string", required: true },
    metadata: { type: "object" },
    created_at: { type: "datetime", default: now() }
  }
});



///////////////////////////////////////////////////////////
// MASTER SCRIPT — PART 2: UTILITY FUNCTIONS
///////////////////////////////////////////////////////////

function nowTimestamp() {
  return new Date().toISOString();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

function requireFields(obj, fields) {
  for (const field of fields) {
    if (!obj[field] && obj[field] !== 0) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

async function logInfo(message, metadata = {}) {
  await insert("system_logs", {
    level: "info",
    message,
    metadata,
    created_at: nowTimestamp()
  });
}

async function logWarn(message, metadata = {}) {
  await insert("system_logs", {
    level: "warn",
    message,
    metadata,
    created_at: nowTimestamp()
  });
}

async function logError(message, metadata = {}) {
  await insert("system_logs", {
    level: "error",
    message,
    metadata,
    created_at: nowTimestamp()
  });
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function daysBetween(date1, date2) {
  const diff = Math.abs(new Date(date1) - new Date(date2));
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function getActiveBoosters(brand_id) {
  return await find("boosters", {
    brand_id,
    is_active: true
  });
}

async function getBoosterTierRules(booster_id) {
  return await find("booster_tier_rules", { booster_id });
}

async function getBoosterActionRules(booster_id) {
  return await find("booster_action_rules", { booster_id });
}

async function isUserTargeted(booster_id, user_id) {
  const result = await findOne("booster_user_targets", {
    booster_id,
    user_id
  });
  return !!result;
}

async function getBrandEarnRate(brand_id) {
  const settings = await findOne("brand_settings", { brand_id });
  return settings?.earn_rate || 1;
}

async function getGlobalMultiplier() {
  const settings = await findOne("admin_settings", {});
  return settings?.global_multiplier || 1;
}

async function calculateBasePoints(amount, brand_id) {
  const earnRate = await getBrandEarnRate(brand_id);
  const globalMultiplier = await getGlobalMultiplier();
  return amount * earnRate * globalMultiplier;
}

async function getOrCreateStreak(user_id) {
  let streak = await findOne("engage_streaks", { user_id });
  if (!streak) {
    streak = await insert("engage_streaks", {
      user_id,
      streak_count: 0,
      last_engage_date: null,
      created_at: nowTimestamp()
    });
  }
  return streak;
}

async function updateStreak(user_id) {
  const streak = await getOrCreateStreak(user_id);
  const today = nowTimestamp();

  if (!streak.last_engage_date) {
    streak.streak_count = 1;
  } else if (isSameDay(streak.last_engage_date, today)) {
  } else if (daysBetween(streak.last_engage_date, today) === 1) {
    streak.streak_count += 1;
  } else {
    streak.streak_count = 1;
  }

  streak.last_engage_date = today;
  await update("engage_streaks", streak.id, streak);
  return streak.streak_count;
}

async function getOrCreateTier(user_id, brand_id) {
  let tier = await findOne("tier_progression", { user_id, brand_id });
  if (!tier) {
    tier = await insert("tier_progression", {
      user_id,
      brand_id,
      current_tier: "Bronze",
      lifetime_spend: 0,
      updated_at: nowTimestamp()
    });
  }
  return tier;
}

async function updateTier(user_id, brand_id, amount) {
  const tier = await getOrCreateTier(user_id, brand_id);
  const settings = await findOne("brand_settings", { brand_id });

  tier.lifetime_spend += amount;

  if (settings?.tier_thresholds) {
    const thresholds = settings.tier_thresholds;
    if (tier.lifetime_spend >= thresholds.Platinum) {
      tier.current_tier = "Platinum";
    } else if (tier.lifetime_spend >= thresholds.Gold) {
      tier.current_tier = "Gold";
    } else if (tier.lifetime_spend >= thresholds.Silver) {
      tier.current_tier = "Silver";
    } else {
      tier.current_tier = "Bronze";
    }
  }

  tier.updated_at = nowTimestamp();
  await update("tier_progression", tier.id, tier);
  return tier.current_tier;
}

function requireRole(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Unauthorized");
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  const clone = { ...user };
  delete clone.password_hash;
  delete clone.api_key;
  delete clone.api_secret;
  return clone;
}



///////////////////////////////////////////////////////////
// MASTER SCRIPT — PART 3: BOOSTER ENGINE
///////////////////////////////////////////////////////////

async function applyBoosters({ user_id, brand_id, amount, action_type }) {
  const boosters = await getActiveBoosters(brand_id);
  let totalBonus = 0;

  for (const booster of boosters) {
    if (booster.type === "tiered") {
      const tierBonus = await applyTieredBooster(booster, user_id, amount);
      totalBonus += tierBonus;
    }

    if (booster.type === "action") {
      const actionBonus = await applyActionBooster(booster, user_id, action_type);
      totalBonus += actionBonus;
    }

    if (booster.type === "multiplier") {
      const multiplierBonus = await applyMultiplierBooster(booster, amount);
      totalBonus += multiplierBonus;
    }

    if (booster.type === "streak") {
      const streakBonus = await applyStreakBooster(booster, user_id);
      totalBonus += streakBonus;
    }
  }

  return totalBonus;
}

async function applyTieredBooster(booster, user_id, amount) {
  const tier = await getOrCreateTier(user_id, booster.brand_id);
  const rules = await getBoosterTierRules(booster.id);
  const rule = rules.find(r => r.tier_name === tier.current_tier);
  if (!rule) return 0;

  const bonus = amount * rule.multiplier;

  await insert("booster_activity_log", {
    booster_id: booster.id,
    user_id,
    action_type: "tiered",
    points_awarded: bonus,
    metadata: { tier: tier.current_tier },
    created_at: nowTimestamp()
  });

  return bonus;
}

async function applyActionBooster(booster, user_id, action_type) {
  const rules = await getBoosterActionRules(booster.id);
  const rule = rules.find(r => r.action_type === action_type);
  if (!rule) return 0;

  if (rule.limit_per_day) {
    const today = new Date().toISOString().split("T")[0];
    const logs = await find("booster_activity_log", {
      booster_id: booster.id,
      user_id,
      action_type
    });
    const countToday = logs.filter(log =>
      log.created_at.startsWith(today)
    ).length;
    if (countToday >= rule.limit_per_day) return 0;
  }

  await insert("booster_activity_log", {
    booster_id: booster.id,
    user_id,
    action_type,
    points_awarded: rule.points,
    created_at: nowTimestamp()
  });

  return rule.points;
}

async function applyMultiplierBooster(booster, amount) {
  const multiplier = booster.multiplier || 1;
  return amount * (multiplier - 1);
}

async function applyStreakBooster(booster, user_id) {
  const streak = await getOrCreateStreak(user_id);
  const pointsPerStreak = booster.points_per_streak || 1;
  return streak.streak_count * pointsPerStreak;
}



///////////////////////////////////////////////////////////
// MASTER SCRIPT — PART 4: ENGAGE+ ENGINE
///////////////////////////////////////////////////////////

async function engagePlusCheckIn(user_id) {
  const streak = await getOrCreateStreak(user_id);
  const today = nowTimestamp();
  let pointsAwarded = 0;

  if (!streak.last_engage_date) {
    streak.streak_count = 1;
    pointsAwarded = 5;
  } else if (isSameDay(streak.last_engage_date, today)) {
    pointsAwarded = 0;
  } else if (daysBetween(streak.last_engage_date, today) === 1) {
    streak.streak_count += 1;
    pointsAwarded = 5 + streak.streak_count;
  } else {
    streak.streak_count = 1;
    pointsAwarded = 5;
  }

  streak.last_engage_date = today;
  await update("engage_streaks", streak.id, streak);

  const user = await findOne("users", { id: user_id });
  user.engage_points = (user.engage_points || 0) + pointsAwarded;
  user.engage_streak = streak.streak_count;
  user.last_engage_date = today;
  await update("users", user_id, user);

  return {
    streak_count: streak.streak_count,
    points_awarded: pointsAwarded
  };
}

async function getEngagePlusSummary(user_id) {
  const user = await findOne("users", { id: user_id });
  const streak = await getOrCreateStreak(user_id);

  return {
    engage_points: user.engage_points || 0,
    streak_count: streak.streak_count,
    last_engage_date: streak.last_engage_date
  };
}



///////////////////////////////////////////////////////////
// MASTER SCRIPT — PART 5: ADMIN ENDPOINTS
///////////////////////////////////////////////////////////

async function requireAdmin(request) {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");
  requireRole(user, ["admin"]);
  return user;
}

// =======================================================
// ADMIN: GET ALL BRANDS
// =======================================================
endpoint.get("/admin/brands", async (request) => {
  await requireAdmin(request);
  const brands = await find("brands", {});
  return { brands };
});

// =======================================================
// ADMIN: CREATE BRAND
// =======================================================
endpoint.post("/admin/brands/create", async (request) => {
  await requireAdmin(request);
  requireFields(request.body, ["name"]);

  const brand = await insert("brands", {
    name: request.body.name,
    logo_url: request.body.logo_url,
    description: request.body.description,
    api_key: request.body.api_key,
    api_secret: request.body.api_secret,
    callback_url: request.body.callback_url,
    created_at: nowTimestamp(),
    updated_at: nowTimestamp()
  });

  await logInfo("Brand created", { brand_id: brand.id });
  return { success: true, brand };
});

// =======================================================
// ADMIN: UPDATE BRAND
// =======================================================
endpoint.post("/admin/brands/update/:id", async (request) => {
  await requireAdmin(request);

  const brand = await findOne("brands", { id: request.params.id });
  if (!brand) throw new Error("Brand not found");

  const updated = {
    ...brand,
    ...request.body,
    updated_at: nowTimestamp()
  };

  await update("brands", brand.id, updated);
  await logInfo("Brand updated", { brand_id: brand.id });
  return { success: true, brand: updated };
});

// =======================================================
// ADMIN: DELETE BRAND
// =======================================================
endpoint.post("/admin/brands/delete/:id", async (request) => {
  await requireAdmin(request);

  const brand = await findOne("brands", { id: request.params.id });
  if (!brand) throw new Error("Brand not found");

  await remove("brands", brand.id);
  await logWarn("Brand deleted", { brand_id: brand.id });
  return { success: true };
});

// =======================================================
// ADMIN: GET ALL USERS
// =======================================================
endpoint.get("/admin/users", async (request) => {
  await requireAdmin(request);
  const users = await find("users", {});
  const sanitized = users.map(u => sanitizeUser(u));
  return { users: sanitized };
});

// =======================================================
// ADMIN: UPDATE USER ROLE
// =======================================================
endpoint.post("/admin/users/role/:id", async (request) => {
  await requireAdmin(request);

  const user = await findOne("users", { id: request.params.id });
  if (!user) throw new Error("User not found");

  requireFields(request.body, ["role"]);

  user.role = request.body.role;
  user.updated_at = nowTimestamp();
  await update("users", user.id, user);

  await logInfo("User role updated", {
    user_id: user.id,
    new_role: user.role
  });

  return { success: true, user: sanitizeUser(user) };
});

// =======================================================
// ADMIN: GLOBAL SETTINGS
// =======================================================
endpoint.get("/admin/settings", async (request) => {
  await requireAdmin(request);
  const settings = await findOne("admin_settings", {}) || {
    maintenance_mode: false,
    global_multiplier: 1
  };
  return { settings };
});

endpoint.post("/admin/settings/update", async (request) => {
  await requireAdmin(request);

  const existing = await findOne("admin_settings", {});
  const updated = {
    ...existing,
    ...request.body,
    updated_at: nowTimestamp()
  };

  if (existing) {
    await update("admin_settings", existing.id, updated);
  } else {
    await insert("admin_settings", updated);
  }

  await logInfo("Admin settings updated", updated);
  return { success: true, settings: updated };
});

// =======================================================
// ADMIN: SYSTEM LOGS
// =======================================================
endpoint.get("/admin/logs", async (request) => {
  await requireAdmin(request);
  const logs = await find(
    "system_logs",
    {},
    { limit: 200, sort: { created_at: "desc" } }
  );
  return { logs };
});



///////////////////////////////////////////////////////////
// MASTER SCRIPT — PART 6: USER ENDPOINTS
///////////////////////////////////////////////////////////

// =======================================================
// USER: GET PROFILE
// =======================================================
endpoint.get("/user/profile", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");
  const sanitized = sanitizeUser(user);
  return { user: sanitized };
});

// =======================================================
// USER: UPDATE PROFILE
// =======================================================
endpoint.post("/user/profile/update", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");

  const updated = {
    ...user,
    ...request.body,
    updated_at: nowTimestamp()
  };

  await update("users", user.id, updated);
  return { success: true, user: sanitizeUser(updated) };
});

// =======================================================
// USER: GET BRAND DASHBOARD
// =======================================================
endpoint.get("/user/brand/:brand_id/dashboard", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");

  const brand_id = request.params.brand_id;
  const brand = await findOne("brands", { id: brand_id });
  if (!brand) throw new Error("Brand not found");

  const tier = await getOrCreateTier(user.id, brand_id);
  const streak = await getOrCreateStreak(user.id);
  const transactions = await find(
    "transactions",
    { user_id: user.id, brand_id },
    { limit: 50, sort: { created_at: "desc" } }
  );

  return {
    brand,
    tier,
    streak,
    transactions
  };
});

// =======================================================
// USER: SUBMIT PURCHASE
// =======================================================
endpoint.post("/user/purchase", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");

  requireFields(request.body, ["brand_id", "amount"]);

  const { brand_id, amount } = request.body;
  const brand = await findOne("brands", { id: brand_id });
  if (!brand) throw new Error("Brand not found");

  const basePoints = await calculateBasePoints(amount, brand_id);
  const boosterPoints = await applyBoosters({
    user_id: user.id,
    brand_id,
    amount,
    action_type: "purchase"
  });

  const totalPoints = basePoints + boosterPoints;

  await insert("transactions", {
    user_id: user.id,
    brand_id,
    amount,
    points_earned: totalPoints,
    source: "purchase",
    created_at: nowTimestamp()
  });

  await updateTier(user.id, brand_id, amount);

  return {
    success: true,
    base_points: basePoints,
    booster_points: boosterPoints,
    total_points: totalPoints
  };
});

// =======================================================
// USER: ACTION BOOST (e.g., review, share, etc.)
// =======================================================
endpoint.post("/user/action", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");

  requireFields(request.body, ["brand_id", "action_type"]);

  const { brand_id, action_type } = request.body;
  const brand = await findOne("brands", { id: brand_id });
  if (!brand) throw new Error("Brand not found");

  const boosterPoints = await applyBoosters({
    user_id: user.id,
    brand_id,
    amount: 0,
    action_type
  });

  return {
    success: true,
    booster_points: boosterPoints
  };
});

// =======================================================
// USER: ENGAGE+ CHECK-IN
// =======================================================
endpoint.post("/user/engage/checkin", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");

  const result = await engagePlusCheckIn(user.id);
  return {
    success: true,
    ...result
  };
});

// =======================================================
// USER: ENGAGE+ SUMMARY
// =======================================================
endpoint.get("/user/engage/summary", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");

  const summary = await getEngagePlusSummary(user.id);
  return { summary };
});



///////////////////////////////////////////////////////////
// MASTER SCRIPT — PART 7: BRAND PORTAL ENDPOINTS
///////////////////////////////////////////////////////////

// =======================================================
// BRAND AUTH MIDDLEWARE
// =======================================================
async function requireBrand(request) {
  const user = request.user;
  if (!user) throw new Error("Unauthorized");
  requireRole(user, ["brand", "admin"]);
  return user;
}

// =======================================================
// BRAND: GET BRAND DASHBOARD
// =======================================================
endpoint.get("/brand/dashboard", async (request) => {
  const user = await requireBrand(request);
  const brand = await findOne("brands", { id: user.brand_id });
  if (!brand) throw new Error("Brand not found");

  const boosters = await find("boosters", { brand_id: brand.id });
  const transactions = await find(
    "transactions",
    { brand_id: brand.id },
    { limit: 50, sort: { created_at: "desc" } }
  );

  return {
    brand,
    boosters,
    transactions
  };
});

// =======================================================
// BRAND: CREATE BOOSTER
// =======================================================
endpoint.post("/brand/boosters/create", async (request) => {
  const user = await requireBrand(request);
  requireFields(request.body, ["name", "type"]);

  const booster = await insert("boosters", {
    brand_id: user.brand_id,
    name: request.body.name,
    description: request.body.description,
    type: request.body.type,
    start_date: request.body.start_date,
    end_date: request.body.end_date,
    is_active: true,
    created_at: nowTimestamp(),
    updated_at: nowTimestamp()
  });

  await logInfo("Booster created", { booster_id: booster.id });
  return { success: true, booster };
});

// =======================================================
// BRAND: UPDATE BOOSTER
// =======================================================
endpoint.post("/brand/boosters/update/:id", async (request) => {
  const user = await requireBrand(request);
  const booster = await findOne("boosters", {
    id: request.params.id,
    brand_id: user.brand_id
  });
  if (!booster) throw new Error("Booster not found");

  const updated = {
    ...booster,
    ...request.body,
    updated_at: nowTimestamp()
  };

  await update("boosters", booster.id, updated);
  await logInfo("Booster updated", { booster_id: booster.id });
  return { success: true, booster: updated };
});

// =======================================================
// BRAND: DELETE BOOSTER
// =======================================================
endpoint.post("/brand/boosters/delete/:id", async (request) => {
  const user = await requireBrand(request);
  const booster = await findOne("boosters", {
    id: request.params.id,
    brand_id: user.brand_id
  });
  if (!booster) throw new Error("Booster not found");

  await remove("boosters", booster.id);
  await logWarn("Booster deleted", { booster_id: booster.id });
  return { success: true };
});

// =======================================================
// BRAND: GET BOOSTER RULES
// =======================================================
endpoint.get("/brand/boosters/:id/rules", async (request) => {
  const user = await requireBrand(request);
  const booster = await findOne("boosters", {
    id: request.params.id,
    brand_id: user.brand_id
  });
  if (!booster) throw new Error("Booster not found");

  const tierRules = await find("booster_tier_rules", { booster_id: booster.id });
  const actionRules = await find("booster_action_rules", { booster_id: booster.id });

  return {
    booster,
    tier_rules: tierRules,
    action_rules: actionRules
  };
});

// =======================================================
// BRAND: ADD TIER RULE
// =======================================================
endpoint.post("/brand/boosters/:id/rules/tier/add", async (request) => {
  const user = await requireBrand(request);
  requireFields(request.body, ["tier_name", "min_spend", "multiplier"]);

  const booster = await findOne("boosters", {
    id: request.params.id,
    brand_id: user.brand_id
  });
  if (!booster) throw new Error("Booster not found");

  const rule = await insert("booster_tier_rules", {
    booster_id: booster.id,
    tier_name: request.body.tier_name,
    min_spend: request.body.min_spend,
    multiplier: request.body.multiplier,
    created_at: nowTimestamp()
  });

  return { success: true, rule };
});

// =======================================================
// BRAND: ADD ACTION RULE
// =======================================================
endpoint.post("/brand/boosters/:id/rules/action/add", async (request) => {
  const user = await requireBrand(request);
  requireFields(request.body, ["action_type", "points"]);

  const booster = await findOne("boosters", {
    id: request.params.id,
    brand_id: user.brand_id
  });
  if (!booster) throw new Error("Booster not found");

  const rule = await insert("booster_action_rules", {
    booster_id: booster.id,
    action_type: request.body.action_type,
    points: request.body.points,
    limit_per_day: request.body.limit_per_day,
    created_at: nowTimestamp()
  });

  return { success: true, rule };
});

// =======================================================
// BRAND: TARGET USERS FOR BOOSTER
// =======================================================
endpoint.post("/brand/boosters/:id/target", async (request) => {
  const user = await requireBrand(request);
  requireFields(request.body, ["user_ids"]);

  const booster = await findOne("boosters", {
    id: request.params.id,
    brand_id: user.brand_id
  });
  if (!booster) throw new Error("Booster not found");

  const userIds = request.body.user_ids;
  for (const uid of userIds) {
    await insert("booster_user_targets", {
      booster_id: booster.id,
      user_id: uid,
      created_at: nowTimestamp()
    });
  }

  return { success: true, count: userIds.length };
});

// =======================================================
// BRAND: VIEW BOOSTER ACTIVITY LOG
// =======================================================
endpoint.get("/brand/boosters/:id/logs", async (request) => {
  const user = await requireBrand(request);
  const booster = await findOne("boosters", {
    id: request.params.id,
    brand_id: user.brand_id
  });
  if (!booster) throw new Error("Booster not found");

  const logs = await find(
    "booster_activity_log",
    { booster_id: booster.id },
    { limit: 200, sort: { created_at: "desc" } }
  );

  return { logs };
});



///////////////////////////////////////////////////////////
// MASTER SCRIPT — PART 8: SAMPLE DATA SEEDING
///////////////////////////////////////////////////////////

async function seedSampleData() {
  // Create default admin
  const admin = await insert("users", {
    email: "admin@rewardsnest.com",
    password_hash: "hashed_password_here",
    first_name: "Admin",
    last_name: "User",
    role: "admin",
    created_at: nowTimestamp(),
    updated_at: nowTimestamp()
  });

  // Create sample brand
  const brand = await insert("brands", {
    name: "Sample Brand",
    description: "Demo brand for testing",
    logo_url: "",
    status: "active",
    created_at: nowTimestamp(),
    updated_at: nowTimestamp()
  });

  // Create sample boosters
  const tierBooster = await insert("boosters", {
    brand_id: brand.id,
    name: "Tiered Booster",
    description: "Earn more based on tier",
    type: "tiered",
    is_active: true,
    created_at: nowTimestamp(),
    updated_at: nowTimestamp()
  });

  await insert("booster_tier_rules", {
    booster_id: tierBooster.id,
    tier_name: "Bronze",
    min_spend: 0,
    multiplier: 1.1,
    created_at: nowTimestamp()
  });

  await insert("booster_tier_rules", {
    booster_id: tierBooster.id,
    tier_name: "Silver",
    min_spend: 100,
    multiplier: 1.25,
    created_at: nowTimestamp()
  });

  await insert("booster_tier_rules", {
    booster_id: tierBooster.id,
    tier_name: "Gold",
    min_spend: 250,
    multiplier: 1.5,
    created_at: nowTimestamp()
  });

  await insert("booster_tier_rules", {
    booster_id: tierBooster.id,
    tier_name: "Platinum",
    min_spend: 500,
    multiplier: 2.0,
    created_at: nowTimestamp()
  });

  // Action booster
  const actionBooster = await insert("boosters", {
    brand_id: brand.id,
    name: "Review Bonus",
    description: "Earn points for leaving reviews",
    type: "action",
    is_active: true,
    created_at: nowTimestamp(),
    updated_at: nowTimestamp()
  });

  await insert("booster_action_rules", {
    booster_id: actionBooster.id,
    action_type: "review",
    points: 20,
    limit_per_day: 3,
    created_at: nowTimestamp()
  });

  // Streak booster
  const streakBooster = await insert("boosters", {
    brand_id: brand.id,
    name: "Streak Bonus",
    description: "Daily streak bonus",
    type: "streak",
    points_per_streak: 5,
    is_active: true,
    created_at: nowTimestamp(),
    updated_at: nowTimestamp()
  });

  return {
    admin_id: admin.id,
    brand_id: brand.id
  };
}
