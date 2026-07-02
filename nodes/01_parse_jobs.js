const jobs = $input.first().json.data.jobs;

if (!jobs || jobs.length === 0) {
  return [{ json: { error: "No jobs found today", jobs: [] } }];
}

const parsed = jobs.map((job, index) => {
  // Truncate description to ~500 words so Mistral handles it well
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

  // Pre-compute location fit so the LLM doesn't have to judge geography itself
  const corridor = ["london", "kitchener", "waterloo", "cambridge", "hamilton", "woodstock", "brantford", "guelph", "chatham", "st. thomas"];
  const gta = [
    "toronto", "oakville", "mississauga", "vaughan", "richmond hill",
    "markham", "scarborough", "brampton", "milton"];
  const outer_gta = [
    "etobicoke",    // shows up separately in some postings
    "north york",   // same
    "pickering",
    "ajax",
    "whitby",
    "oshawa",       // Durham region;
    "newmarket",
    "aurora",
    "barrie", 
  ];
  const cityLower = (job.job_city || "").toLowerCase();
  const countryLower = (job.job_country || "").toLowerCase();
  const isCanada = countryLower === "ca" || countryLower === "canada";
  let locationFitHint;
  if (corridor.includes(cityLower)) locationFitHint = 9;
  else if (gta.includes(cityLower)) locationFitHint = 8;
  else if (outer_gta.includes(cityLower)) locationFitHint = 7;
  else if (job.job_is_remote && isCanada) locationFitHint = 8;
  else if (cityLower === "vancouver") locationFitHint = 6;
  else if (isCanada) locationFitHint = 4;
  else if (!cityLower && !countryLower) locationFitHint = 5;
  else locationFitHint = 1;

  return {
    id: index + 1,
    title: job.job_title || "Unknown Title",
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
  };
});

// Return each job as a separate item for the loop
return parsed.map(job => ({ json: job }));