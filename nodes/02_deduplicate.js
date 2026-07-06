const staticData = $getWorkflowStaticData('global');
const config = $('Candidate Config').first().json;
const TTL_MS = config.search.dedup_ttl_days * 24 * 60 * 60 * 1000;
const now = Date.now();

// Initialize store on first run
if (!staticData.seenJobIds) {
  staticData.seenJobIds = {};
}

const seenIds = staticData.seenJobIds;
const allJobs = $input.all().map(item => item.json);

// Filter to only unseen jobs
const newJobs = allJobs.filter(job => !seenIds[job.job_id]);

// Mark new jobs as seen
for (const job of newJobs) {
  seenIds[job.job_id] = now;
}

// Prune entries older than TTL so the store doesn't grow indefinitely
for (const [id, timestamp] of Object.entries(seenIds)) {
  if (now - timestamp > TTL_MS) {
    delete seenIds[id];
  }
}

// Persist back — required for Static Data to actually save
staticData.seenJobIds = seenIds;

const totalSeen = Object.keys(seenIds).length;

if (newJobs.length === 0) {
  // Return a single item signalling nothing new — Format Email handles this gracefully
  return [{ json: { 
    no_new_jobs: true, 
    message: `No new postings today. ${totalSeen} jobs tracked in seen store.` 
  }}];
}

// Attach dedup metadata for transparency
return newJobs.map(job => ({ 
  json: { 
    ...job, 
    dedup_new: true,
    dedup_store_size: totalSeen
  } 
}));