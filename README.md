# Local Job Board Pipeline

This project is a daily job-search pipeline that fetches, scores, and summarizes job postings automatically, finishing 
with a ranked digest to my inbox. It runs entirely on local infrastructure. The workflow is orchestrated by n8n, running 
inside Docker, and all LLM inferences are handled by local models via Ollama, so there are no per-token API costs and
no data leaves the machine.

The pipeline is deliberately split between deterministic logic and LLM judgment. Location fit and seniority classification
are computed from a centralized candidate profile before any model calls are made. It was found that the models performed 
poorly at these tasks, particularly location fit, and the detrministic approach is simple. The models are responsible for 
tasks they are well suited for: reading job descriptions, assessing skill match against a rubric, and writing concrete
reasonings based on the postings actual requirements. Final scores are computed as a weighted average of five dimensions:
skill match, seniority fit, location fit, growth signal, and compensation fit. There are hard gates in place for 
disqualifing roles that are independant of score.

The candidate profile, scoring weights, city tier lists, seniority markers, and model names all live in a single 
`candidate_profile.json` config file. In this way, fine-tuning requires only a single change in one place.

## Architecture



## Design Decisions

## Configuration

## Setup

