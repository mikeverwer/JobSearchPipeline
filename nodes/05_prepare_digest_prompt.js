const config = $('Candidate Config').first().json;
const allJobs = $input.all().map(item => item.json);

const jobSummaries = allJobs.map(job =>
  `- [Score: ${job.match_score}/10] ${job.title} at ${job.company} (${job.location})
  Reason: ${job.match_reason}
  Skills needed: ${(job.key_skills || []).join(", ")}
  Red flags: ${(job.red_flags || []).length > 0 ? job.red_flags.join(", ") : "None"}`
).join("\n\n");

const requestBody = {
  model: config.models.digest,
  stream: false,
  options: { temperature: config.models.digest_temperature },
  messages: [
    {
      role: "system",
      content: "You are a career assistant agent helping a specific candidate track the job market. Write clearly and directly. Be specific and actionable. Do not pad responses."
    },
    {
      role: "user",
      content: `Below are today's job postings, already scored by relevance to the candidate.

Write a concise daily market summary with these three sections:
1. HEADLINE — one sentence on today's overall market (how many jobs, general quality)
2. TRENDS — patterns across postings (common tools required, seniority mix, remote vs on-site)
3. ACTION ITEMS — two or three specific things the candidate should do today

Do not list, name, or describe individual job postings. A separate ranked table is already included in the email below your summary.

TODAY'S SCORED JOBS:
${jobSummaries}`
    }
  ]
};

return [{ json: { requestBody: JSON.stringify(requestBody), jobs: allJobs } }];