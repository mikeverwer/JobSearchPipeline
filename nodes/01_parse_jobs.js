const config = $('Candidate Config').first().json;
const jobs = $input.first().json.data.jobs;

if (!jobs || jobs.length === 0) {
  return [{ json: { error: "No jobs found today", jobs: [] } }];
}

const corridor = config.location.corridor;
const gta = config.location.gta;
const outer_gta = config.location.outer_gta
const locationScores = config.location.scores;
const hardDisqualifiers = config.seniority.hard_disqualifiers;
const juniorSignals = config.seniority.junior_signals;
const expThreshold = config.seniority.experience_threshold_years;

const parsed = jobs.map((job, index) => {
  let desc = (job.job_description || "No description available")
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/"/g, "'")
    .replace(/\\/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = desc.split(/\s+/);
  if (words.length > 1200) {
    desc = words.slice(0, 1200).join(" ") + "...";
  }

  // Location fit — deterministic lookup from config
  const cityLower = (job.job_city || "").toLowerCase();
  const countryLower = (job.job_country || "").toLowerCase();
  const isCanada = countryLower === "ca" || countryLower === "canada";
  let locationFitHint;
  if (corridor.includes(cityLower)) locationFitHint = locationScores.corridor;
  else if (gta.includes(cityLower)) locationFitHint = locationScores.gta;
  else if (outer_gta.includes(cityLower)) locationFitHint = locationScores.outer_gta;
  else if (job.job_is_remote && isCanada) locationFitHint = locationScores.remote_canada;
  else if (cityLower === config.location.longterm.toLowerCase()) locationFitHint = locationScores.longterm;
  else if (isCanada) locationFitHint = locationScores.canada_other;
  else if (!cityLower && !countryLower) locationFitHint = locationScores.unknown;
  else locationFitHint = locationScores.outside_canada;

  // Seniority flag — deterministic lookup from config
  const titleLower = (job.job_title || "").toLowerCase();
  let seniorityFlag;
  if (hardDisqualifiers.some(t => titleLower.includes(t))) seniorityFlag = "senior";
  else if (juniorSignals.some(t => titleLower.includes(t))) seniorityFlag = "junior";
  else seniorityFlag = "unknown";

  // Override with description-level experience scan if title looked neutral
  const yearsMatch = desc.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  if (yearsMatch && parseInt(yearsMatch[1]) >= expThreshold && seniorityFlag !== "senior") {
    seniorityFlag = "senior";
  }

  return {
    id: index + 1,
    title: job.job_title || "Unknown Title",
    job_id: job.job_id || `fallback-${job.employer_name}-${job.job_title}`.replace(/\s+/g, '-').toLowerCase(),
    company: job.employer_name || "Unknown Company",
    location: job.job_city
      ? `${job.job_city}, ${job.job_state || ""} ${job.job_country || ""}`
      : (job.job_is_remote ? "Remote" : "Not specified"),
    is_remote: job.job_is_remote || false,
    employment_type: job.job_employment_type || "Not specified",
    description: desc,
    apply_link: job.job_apply_link || "#",
    posted: job.job_posted_at_datetime_utc || "Unknown",
    salary_min: job.job_min_salary || null,
    salary_max: job.job_max_salary || null,
    location_fit_hint: locationFitHint,
    seniority_flag: seniorityFlag,
  };
});

return parsed.map(job => ({ json: job }));