/**
 * n8n Workflow Code Reference — Job Board Agentic AI
 * ===================================================
 * 
 * This file contains the JavaScript code extracted from each Code node
 * in the n8n workflow. It is provided for reference and submission
 * purposes — it is NOT intended to be run as a standalone Node.js script.
 * 
 * n8n-SPECIFIC SYNTAX:
 * 
 *   $input             Refers to the data flowing into the current node
 *                      from the previous node in the workflow.
 * 
 *   $input.first()     Returns the first item in that input data.
 * 
 *   $input.all()       Returns all items in the input data as an array.
 * 
 *   $('Node Name')     References the output of another node in the
 *                      workflow by its display name. For example,
 *                      $('Parse Jobs') accesses the output of the node
 *                      named "Parse Jobs".
 * 
 *   .first().json      Accesses the first output item's JSON payload
 *                      from the referenced node.
 * 
 *   $json              Shorthand for the current item's JSON data,
 *                      used in n8n expression fields (not in Code nodes).
 * 
 *   {{ $json.field }}  n8n expression syntax used inside HTTP Request
 *                      node configuration fields to inject values
 *                      dynamically. These are NOT template literals —
 *                      they are n8n's own expression language.
 * 
 * These are all helper functions injected by the n8n runtime at
 * execution time. They are not part of standard JavaScript and will
 * not work outside of n8n's Code node environment.
 * 
 * WORKFLOW NODE ORDER:
 *   1. Schedule Trigger       (no code)
 *   2. Fetch Jobs             (HTTP Request — no code)
 *   3. Parse Jobs             (Code)
 *   4. Loop Over Items        (Built-in — no code)
 *   5. Score Job with Mistral (HTTP Request — no code)
 *   6. Parse Score            (Code)
 *   7. Sort                   (Built-in — no code)
 *   8. Prepare Digest Prompt  (Code)
 *   9. Prepare Mistral Request(Code)
 *  10. Generate Digest        (HTTP Request — no code)
 *  11. Format Email           (Code)
 *  12. Send Email             (SMTP — no code)
 */

// ======================================================================================================
//  Parse Jobs Node
// ======================================================================================================
function ParseJobs() {
    const jobs = $input.first().json.data;

    if (!jobs || jobs.length === 0) {
    return [{ json: { error: "No jobs found today", jobs: [] } }];
    }

    const parsed = jobs.map((job, index) => {
    // Truncate description to ~500 words so Mistral handles it well
    let desc = (job.description || "No description available")
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/"/g, "'")
        .replace(/\\/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const words = desc.split(/\s+/);
    if (words.length > 500) {
        desc = words.slice(0, 500).join(" ") + "...";
    }

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
        salary_currency: job.job_salary_currency || null,
    };
    });

    // Return each job as a separate item for the loop
    return parsed.map(job => ({ json: job }));
}

// ======================================================================================================
//  Parse Score Node
// ======================================================================================================
function ParseScore() {
    const mistralResponse = $input.first().json.response;
    const originalJob = $('Loop Over Items').first().json;

    let scored;
    try {
        const jsonMatch = mistralResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            scored = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("No JSON found in response");
        }
    } catch (e) {
    scored = {
        score: 5,
        reason: "Could not parse LLM response. Manual review recommended.",
        key_skills: [],
        experience_level: "unknown",
        salary_estimate: "N/A",
        red_flags: ["LLM parsing failed"]
    };
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
        match_score: scored.score,
        match_reason: scored.reason,
        key_skills: scored.key_skills,
        experience_level: scored.experience_level,
        salary_estimate: scored.salary_estimate,
        red_flags: scored.red_flags
    }
    }];
}


// ======================================================================================================
//  Prepare Digest Node
// ======================================================================================================
function PrepareDigestPrompt() {
    const allJobs = $input.all().map(item => item.json);

    const jobSummaries = allJobs.map(job =>
    `- [Score: ${job.match_score}/10] ${job.title} at ${job.company} (${job.location})
    Reason: ${job.match_reason}
    Skills needed: ${(job.key_skills || []).join(", ")}
    Red flags: ${(job.red_flags || []).length > 0 ? job.red_flags.join(", ") : "None"}
    Apply: ${job.apply_link}`
    ).join("\n\n");

    const prompt = `You are a career assistant agent. Below are today's job postings, already scored by 
        relevance to the candidate (Mike).

        Write a concise daily digest email with these sections:
        1. HEADLINE — one sentence on today's overall market (how many jobs, general quality)
        2. TOP PICKS — the top 3 scoring jobs with a sentence each on why they're worth applying to
        3. TRENDS — any patterns you notice (common skills asked for, salary ranges, remote vs on-site)
        4. ACTION ITEMS — specific things the candidate should do today (apply to X, brush up on Y skill)

        Keep the tone professional but friendly. Be specific and actionable.

        TODAY'S SCORED JOBS:
        ${jobSummaries}

        Write the digest now.`;

    return [{ json: { prompt: prompt, jobs: allJobs } }];
}


// ======================================================================================================
//  Prepare Mistral Prompt Node
// ======================================================================================================
function PrepareMistralPrompt() {
    const prompt = $input.first().json.prompt;

    return [{
    json: {
        requestBody: JSON.stringify({
        model: 'mistral:latest',
        stream: false,
        prompt: prompt
        }),
        jobs: $input.first().json.jobs
    }
    }];
}


// ======================================================================================================
//  Format Email Node
// ======================================================================================================
function FormatEmail() {
    const digest = $input.first().json.response;
    const jobs = $('Prepare Digest Prompt').first().json.jobs;

    const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Build an HTML email
    const topJobs = jobs
    .filter(j => j.match_score >= 7)
    .map(j =>
        `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
            <strong>${j.title}</strong><br/>
            ${j.company} — ${j.location}<br/>
            <span style="color:#2d7d46;font-weight:bold;">Score: ${j.match_score}/10</span><br/>
            <em>${j.match_reason}</em><br/>
            <a href="${j.apply_link}" style="color:#1a73e8;">Apply Now →</a>
        </td>
        </tr>`
    ).join("");

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h1 style="color:#1a1a1a;border-bottom:2px solid #1a73e8;padding-bottom:10px;">
            Job Agent Daily Digest
        </h1>
        <p style="color:#666;font-size:14px;">${today} — ${jobs.length} jobs analyzed</p>

        <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0;">
            ${digest.replace(/\n/g, "<br/>")}
        </div>

        ${topJobs ? `
        <h2 style="color:#1a1a1a;">🏆 Top Matches</h2>
        <table style="width:100%;border-collapse:collapse;">${topJobs}</table>
        ` : ""}

        <hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/>
        <p style="color:#999;font-size:12px;">
            Generated by your local Job Board Agent — powered by Mistral 7B + n8n
        </p>
        </div>`;

    return [{
        json: {
            subject: `Job Digest — ${today} — ${jobs.length} jobs, ${jobs.filter(j => j.match_score >= 7).length} strong matches`,
            html: html
        }
    }];
}