const config = $('Candidate Config').first().json;
const weights = config.scoring.weights;
const gates = config.scoring.gates;

const rawContent = $input.first().json.message.content;
const originalJob = $('Loop Over Items').first().json;

let scored;
try {
  scored = JSON.parse(rawContent);
} catch (e) {
  scored = {
    score: 5,
    reason: "Could not parse LLM response. Manual review recommended.",
    key_skills: [],
    experience_level: "unknown",
    salary_estimate: "N/A",
    red_flags: ["LLM parsing failed"],
    dimensions: null
  };
}

// Always override location_fit with the pre-computed value
scored.dimensions = scored.dimensions || {};
scored.dimensions.location_fit = originalJob.location_fit_hint;

// Apply seniority gate — deterministic, not LLM's call
let gated = false;
let gateReason = null;
if (originalJob.seniority_flag === "senior") {
  scored.dimensions.seniority_fit = gates.senior_role_seniority_fit;
  scored.experience_level = "senior"; // override LLM's independent assessment
  gated = true;
  gateReason = "Senior or lead role — outside target seniority";
  if (!scored.red_flags.some(f => f.toLowerCase().includes("senior"))) {
    scored.red_flags.unshift(gateReason);
  }
}

// Compute weighted score from dimensions
const dims = scored.dimensions;
let weightedScore = Math.round(
  (dims.skill_match   || 0) * weights.skill_match +
  (dims.seniority_fit || 0) * weights.seniority_fit +
  (dims.location_fit  || 0) * weights.location_fit +
  (dims.growth_signal || 0) * weights.growth_signal +
  (dims.comp_fit      || 0) * weights.comp_fit
);

// Apply gate ceiling after weighting
if (gated) {
  weightedScore = Math.min(weightedScore, gates.senior_role_max_score);
}

return [{
  json: {
    title: originalJob.title,
    company: originalJob.company,
    location: originalJob.location,
    is_remote: originalJob.is_remote,
    employment_type: originalJob.employment_type,
    apply_link: originalJob.apply_link,
    posted: originalJob.posted,
    salary_min: originalJob.salary_min,
    salary_max: originalJob.salary_max,
    llm_score: scored.score,        // raw LLM holistic score, kept for comparison
    match_score: weightedScore,     // weighted deterministic score, drives sorting/display
    match_reason: scored.reason,
    key_skills: scored.key_skills,
    experience_level: scored.experience_level,
    salary_estimate: scored.salary_estimate,
    red_flags: scored.red_flags,
    dimensions: dims,
    gated: gated,
    gate_reason: gateReason,
  }
}];