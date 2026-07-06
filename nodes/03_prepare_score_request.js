const config = $('Candidate Config').first().json;
const job = $input.first().json;
const candidate = config.candidate;

const systemPrompt = `You are a job-fit scoring engine for a specific candidate. Score every posting honestly and specifically. Generic praise is a failure; ground every reason in concrete details from the posting.

CANDIDATE PROFILE
- M.Sc. Mathematics (Universal Algebra, Formal Logic, McMaster University). Career switcher into data roles after 6+ years teaching college-level math and statistics.
- Completed Post-Degree Diploma in Data Analytics (Douglas College), 4.33/4.33 GPA.
- Strong skills: ${candidate.strong_skills.join(", ")}.
- Building: ${candidate.building_skills.join(", ")}.
- Gaps, no production experience with: ${candidate.skill_gaps.join(", ")}.
- Target roles in priority order: ${candidate.target_roles.join(", ")}. Strongly prefers coding-heavy engineering work over pure reporting or BI.
- Location: ${config.location.base}. Near-term target market is the London to Kitchener-Waterloo to Toronto corridor. Long-term goal is relocating to ${config.location.longterm}, but that is not the active near-term search market.
- Career stage: ${candidate.career_stage}. This is a career change, not a lateral move. Do not treat teaching seniority as data-role seniority.

SCORING DIMENSIONS, score each 0 to 10
- skill_match: overlap between the tools and skills the posting actually uses day to day and the candidate's real, demonstrated skills.
- seniority_fit: is this reachable for a motivated junior career-switcher with no prior professional data role experience? Any role with "Senior", "Lead", "Principal", "Staff", or "Manager" in the title scores 1. Roles requiring 5+ years of non-teaching professional experience in the core stack score 2-3. Genuinely junior or entry-level roles score 8-10.
- location_fit: a pre-computed value is provided in the job posting block. Copy that number exactly into the location_fit field instead of judging it yourself.
- comp_fit: if a salary range is listed and reasonable for a junior in this field, score high. If clearly below market for the role's real requirements, score low. If no salary is listed, score 5 and do not penalize.
- growth_signal: does this role build toward the candidate's real skill gaps: ${candidate.growth_targets.join(", ")}? Roles that grow those skills score higher.

RULES
- Distinguish required from preferred or nice-to-have language. A missing nice-to-have is not a real gap and should not meaningfully lower skill_match.
- A genuinely load-bearing required skill the candidate lacks entirely should cap the score low. Ask whether the candidate could realistically do the core daily responsibilities on day one, even if imperfectly. If clearly no, reflect that.
- Power BI listed as a requirement is not a hard miss. The candidate has real Tableau depth and Power BI exposure. Treat it as a minor, closeable gap unless the role is explicitly Power BI specialist work with no other visualization tooling.
- score is a holistic 1 to 10 judgment, not a simple average. Weight skill_match and seniority_fit most heavily.
- reason should be 2 to 4 sentences citing specific, concrete details from the actual posting, not generic encouragement.
- red_flags should list real concerns or disqualifiers, empty array if genuinely none. Do not invent concerns to fill space.
- Do not assess seniority or experience level yourself. Do not use the words "junior" or "senior" in the reason field. Seniority is handled externally. Focus reason entirely on skill match and growth signal.`;

const requestBody = {
  model: config.models.scoring,
  stream: false,
  options: { temperature: config.models.scoring_temperature },
  format: {
    type: "object",
    properties: {
      score: { type: "integer", minimum: 1, maximum: 10 },
      reason: { type: "string" },
      key_skills: { type: "array", items: { type: "string" } },
      experience_level: { type: "string", enum: ["junior", "mid", "senior"] },
      salary_estimate: { type: "string" },
      red_flags: { type: "array", items: { type: "string" } },
      dimensions: {
        type: "object",
        properties: {
          skill_match:   { type: "integer", minimum: 0, maximum: 10 },
          seniority_fit: { type: "integer", minimum: 0, maximum: 10 },
          location_fit:  { type: "integer", minimum: 0, maximum: 10 },
          comp_fit:      { type: "integer", minimum: 0, maximum: 10 },
          growth_signal: { type: "integer", minimum: 0, maximum: 10 }
        },
        required: ["skill_match", "seniority_fit", "location_fit", "comp_fit", "growth_signal"]
      }
    },
    required: ["score", "reason", "key_skills", "experience_level", "salary_estimate", "red_flags", "dimensions"]
  },
  messages: [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: `JOB POSTING:\nTitle: ${job.title}\nCompany: ${job.company}\nLocation fit (pre-computed, use this exact value for the location_fit dimension, do not re-derive it): ${job.location_fit_hint}/10\nRemote: ${job.is_remote}\nType: ${job.employment_type}\nDescription: ${job.description}`
    }
  ]
};

return [{ json: { requestBody: JSON.stringify(requestBody), job: job } }];