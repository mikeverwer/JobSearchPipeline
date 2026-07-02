// Ollama's /api/chat returns the model's reply at message.content.
// With the schema enforced via "format", this should already be valid JSON,
// but keep the try/catch as a safety net for a malformed or empty response.
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
scored.dimensions = scored.dimensions || {};
scored.dimensions.location_fit = originalJob.location_fit_hint;
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
        red_flags: scored.red_flags,
        dimensions: scored.dimensions || null
    }
}];