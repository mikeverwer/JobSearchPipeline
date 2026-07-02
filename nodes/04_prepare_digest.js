const allJobs = $input.all().map(item => item.json);

const jobSummaries = allJobs.map(job =>
`- [Score: ${job.match_score}/10] ${job.title} at ${job.company} (${job.location})
Reason: ${job.match_reason}
Skills needed: ${(job.key_skills || []).join(", ")}
Red flags: ${(job.red_flags || []).length > 0 ? job.red_flags.join(", ") : "None"}`
).join("\n\n");

const prompt = `You are a career assistant agent. Below are today's job postings, already scored by
    relevance to the candidate (Mike).

    Write a concise daily market summary with these sections:
    1. HEADLINE — one sentence on today's overall market (how many jobs, general quality)
    2. TRENDS — patterns you notice across postings (common skills asked for, salary ranges, remote vs on-site, seniority mix)
    3. ACTION ITEMS — specific things the candidate should do today (skills to brush up, search adjustments)

    Do not list, name, or describe individual job postings. A separate, exact table of the top-ranked
    postings is already included below your summary, so do not restate job titles, companies, or
    scores; your job is only the high-level read on today's market.

    Keep the tone professional but direct. Be specific and actionable.

    TODAY'S SCORED JOBS:
    ${jobSummaries}

    Write the summary now.`;

return [{ json: { prompt: prompt, jobs: allJobs } }];