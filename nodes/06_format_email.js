const config = $('Candidate Config').first().json;
const threshold = config.scoring.display_threshold;

const digest = $input.first().json.message.content;
const jobs = $('Prepare Digest Prompt').first().json.jobs;

// If dedup filtered everything, send a short no-new-jobs notice
if (!jobs || jobs.length === 0 || jobs[0]?.no_new_jobs) {
  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  return [{
    json: {
      subject: `Job Digest — ${today} — No new postings`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a1a1a;">No New Postings Today</h2>
        <p style="color:#666;">All jobs from today's search have already been seen and scored. 
        Check back tomorrow.</p>
      </div>`
    }
  }];
}

const today = new Date().toLocaleDateString('en-CA', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

const rankedJobs = [...jobs].sort((a, b) => b.match_score - a.match_score);
const strongMatches = rankedJobs.filter(j => j.match_score >= threshold);
const topJobs = (strongMatches.length >= 3 ? strongMatches : rankedJobs.slice(0, 3))
  .map(j => {
    const gateLabel = j.gated
      ? `<br/><span style="color:#cc0000;font-size:12px;">⛔ ${j.gate_reason}</span>`
      : "";
    const dimBar = j.dimensions
      ? `<br/><span style="font-size:11px;color:#888;">
          Skill: ${j.dimensions.skill_match}/10 &nbsp;|&nbsp;
          Seniority: ${j.dimensions.seniority_fit}/10 &nbsp;|&nbsp;
          Location: ${j.dimensions.location_fit}/10 &nbsp;|&nbsp;
          Growth: ${j.dimensions.growth_signal}/10
         </span>`
      : "";
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>${j.title}</strong><br/>
        ${j.company} — ${j.location}<br/>
        <span style="color:#2d7d46;font-weight:bold;">Score: ${j.match_score}/10</span>
        ${gateLabel}
        ${dimBar}<br/>
        <em>${j.match_reason}</em><br/>
        <a href="${j.apply_link}" style="color:#1a73e8;">Apply Now →</a>
      </td>
    </tr>`;
  }).join("");

const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <h1 style="color:#1a1a1a;border-bottom:2px solid #1a73e8;padding-bottom:10px;">
      Job Search Pipeline — Daily Digest
    </h1>
    <p style="color:#666;font-size:14px;">${today} — ${jobs.length} jobs analyzed</p>

    <div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:16px 0;">
      ${digest.replace(/\n/g, "<br/>")}
    </div>

    ${topJobs ? `
    <h2 style="color:#1a1a1a;">Top Matches</h2>
    <table style="width:100%;border-collapse:collapse;">${topJobs}</table>
    ` : "<p>No postings met the display threshold today.</p>"}

    <hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/>
    <p style="color:#999;font-size:12px;">
      Powered by Qwen 2.5 7B (Ollama) + n8n &nbsp;|&nbsp;
      Weighted scoring: Skill ${config.scoring.weights.skill_match * 100}% /
      Seniority ${config.scoring.weights.seniority_fit * 100}% /
      Location ${config.scoring.weights.location_fit * 100}% /
      Growth ${config.scoring.weights.growth_signal * 100}% /
      Comp ${config.scoring.weights.comp_fit * 100}%
    </p>
  </div>`;

return [{
  json: {
    subject: `Job Digest — ${today} — ${jobs.length} jobs, ${strongMatches.length} above threshold`,
    html: html
  }
}];