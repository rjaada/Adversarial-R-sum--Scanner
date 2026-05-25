"""
Rewrite quality eval fixtures.

Each case defines:
  - inputs to build_rewrite_prompt / parse_variants / rank_variants
  - mock_llm_output: synthetic model responses of varying quality
  - quality_checks: deterministic assertions on the FINAL ranked output

These check structural properties, not exact text.
Running this fixture set after prompt changes catches regressions without a live model.

quality_checks keys:
  no_banned_opening (bool)   — no final variant starts with I/My/The/A/An
  all_start_with_verb (bool) — every final variant starts with a word in STRONG_VERBS
  max_words (int)            — every final variant has ≤ N words
  no_bare_metrics (bool)     — no unwrapped digits/$ (already handled by sanitize)
  no_duplicate_prefix (bool) — no two variants share their first 4 lowercased words
  min_count (int)            — at least this many variants returned
  any_kw_in_any (list[str])  — at least one final variant contains at least one of these kw
"""
from __future__ import annotations

REWRITE_CASES: list[dict] = [

    # ------------------------------------------------------------------
    # WEAK PHRASING — passive verb openings
    # ------------------------------------------------------------------
    {
        "id": "wp_responsible_for",
        "issue_type": "weak_phrasing",
        "original_text": "Responsible for backend API development",
        "evidence": "Passive phrasing: 'responsible for'",
        "fix_pattern": "Start with an active verb: Built / Developed / Delivered",
        "rewrite_starter": "Built and maintained backend REST API",
        "jd_keywords": ["python", "fastapi", "docker"],
        "count": 3,
        "mock_llm_output": (
            "1. Built backend REST API handling [N] req/s with [X%] uptime.\n"
            "2. Developed FastAPI service supporting [N] downstream clients.\n"
            "3. Delivered scalable API layer reducing response time by [X%].\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "all_start_with_verb": True,
            "max_words": 25,
            "no_bare_metrics": True,
            "no_duplicate_prefix": True,
            "min_count": 3,
        },
    },

    {
        "id": "wp_helped_with",
        "issue_type": "weak_phrasing",
        "original_text": "Helped with CI/CD pipeline improvements",
        "evidence": "Weak verb: 'helped with'",
        "fix_pattern": "Replace with: Automated / Designed / Built + what + measurable result",
        "rewrite_starter": "Automated CI/CD pipeline using GitHub Actions",
        "jd_keywords": ["github", "ci/cd", "docker"],
        "count": 3,
        "mock_llm_output": (
            "1. Automated CI/CD pipeline with GitHub Actions, reducing deploy time by [X%].\n"
            "2. Built deployment pipeline supporting [N] daily releases.\n"
            "3. Designed containerised build system cutting rollback time to [Y min].\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "all_start_with_verb": True,
            "max_words": 25,
            "no_duplicate_prefix": True,
            "min_count": 3,
        },
    },

    {
        "id": "wp_worked_on",
        "issue_type": "weak_phrasing",
        "original_text": "Worked on database migrations",
        "evidence": "Weak verb: 'worked on'",
        "fix_pattern": "Start with: Migrated / Designed / Executed",
        "rewrite_starter": "Migrated [N] database tables with zero downtime",
        "jd_keywords": ["postgresql", "sql", "python"],
        "count": 3,
        "mock_llm_output": (
            "1. Migrated [N] PostgreSQL tables with zero downtime using blue-green strategy.\n"
            "2. Designed database migration framework reducing manual effort by [X%].\n"
            "3. Executed schema upgrades across [N] environments with [X%] success rate.\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "all_start_with_verb": True,
            "max_words": 25,
            "no_duplicate_prefix": True,
            "min_count": 3,
        },
    },

    {
        "id": "wp_was_involved",
        "issue_type": "weak_phrasing",
        "original_text": "Was involved in infrastructure setup",
        "evidence": "Passive phrasing: 'was involved in'",
        "fix_pattern": "Start with: Built / Configured / Deployed",
        "rewrite_starter": "",
        "count": 3,
        "jd_keywords": ["terraform", "aws", "kubernetes"],
        "mock_llm_output": (
            "1. Built cloud infrastructure using Terraform across [N] AWS regions.\n"
            "2. Deployed kubernetes clusters supporting [N] microservices.\n"
            "3. Deployed IaC pipeline reducing provisioning time by [X%].\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "all_start_with_verb": True,
            "max_words": 25,
            "no_duplicate_prefix": True,
            "min_count": 3,
        },
    },

    {
        "id": "wp_model_uses_banned_opening",
        "issue_type": "weak_phrasing",
        "original_text": "The team worked on microservice migration",
        "evidence": "Weak phrasing",
        "fix_pattern": "Active verb + what + result",
        "rewrite_starter": "Led migration to microservices",
        "jd_keywords": ["kubernetes", "docker"],
        "count": 3,
        # Model returns some with banned openings — pipeline should filter/rank them down
        "mock_llm_output": (
            "1. I led the migration of the monolith to microservices.\n"
            "2. The migration was completed successfully.\n"
            "3. Led migration of monolith to [N] microservices, reducing deploy time by [X%].\n"
            "4. Designed service decomposition plan cutting blast radius by [X%].\n"
            "5. Migrated [N]-service monolith improving deployment frequency by [X%].\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,  # I and The variants should be ranked out
            "max_words": 25,
            "no_duplicate_prefix": True,
            "min_count": 2,  # at least 2 good variants available
        },
    },

    {
        "id": "wp_all_banned_openings_fallback",
        "issue_type": "weak_phrasing",
        "original_text": "Assisted in monitoring setup",
        "evidence": "Weak verb",
        "fix_pattern": "Active verb",
        "rewrite_starter": "",
        "jd_keywords": [],
        "count": 2,
        # Worst case: model only returns banned-opening variants — fallback must still return something
        "mock_llm_output": (
            "1. I helped set up monitoring dashboards.\n"
            "2. My contribution was setting up alerts.\n"
        ),
        "quality_checks": {
            "min_count": 1,  # fallback guarantees at least 1 result
        },
    },

    # ------------------------------------------------------------------
    # LOW QUANTIFICATION — missing numbers/impact
    # ------------------------------------------------------------------
    {
        "id": "lq_vague_bullets",
        "issue_type": "low_quantification",
        "original_text": "Reduced infrastructure costs",
        "evidence": "No metric specified — cost reduction unquantified",
        "fix_pattern": "Add: %, $, or time period",
        "rewrite_starter": "Reduced infrastructure costs by [X%] through [action]",
        "jd_keywords": ["aws", "terraform", "cost"],
        "count": 3,
        "mock_llm_output": (
            "1. Reduced AWS infrastructure costs by [X%] through right-sizing [N] EC2 instances.\n"
            "2. Optimized Terraform configs cutting monthly spend by [$Y].\n"
            "3. Delivered [X%] cost reduction by eliminating idle resources across [N] environments.\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "all_start_with_verb": True,
            "max_words": 25,
            "no_bare_metrics": True,
            "no_duplicate_prefix": True,
            "min_count": 3,
        },
    },

    {
        "id": "lq_team_lead_no_scope",
        "issue_type": "low_quantification",
        "original_text": "Led a team of engineers to deliver the platform",
        "evidence": "Team size and timeline not specified",
        "fix_pattern": "Add team size, timeline, or scale metric",
        "rewrite_starter": "Led [N]-person team delivering platform in [X weeks]",
        "jd_keywords": ["python", "aws", "agile"],
        "count": 3,
        "mock_llm_output": (
            "1. Led [N]-person engineering team delivering platform [X weeks] ahead of schedule.\n"
            "2. Managed [N] engineers to ship platform serving [N] enterprise clients.\n"
            "3. Directed cross-functional team of [N] delivering [N] features per sprint.\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "all_start_with_verb": True,
            "max_words": 25,
            "no_bare_metrics": True,
            "no_duplicate_prefix": True,
            "min_count": 3,
        },
    },

    {
        "id": "lq_latency_improvement",
        "issue_type": "low_quantification",
        "original_text": "Improved API response times",
        "evidence": "No baseline or delta specified",
        "fix_pattern": "Add: ms reduction, percentile, before/after",
        "rewrite_starter": "Reduced API p99 latency from [X ms] to [Y ms]",
        "jd_keywords": ["fastapi", "redis", "postgresql"],
        "count": 3,
        "mock_llm_output": (
            "1. Reduced API p99 latency by [X%] through query optimisation and Redis caching.\n"
            "2. Optimized database queries cutting response time from [X ms] to [Y ms].\n"
            "3. Scaled API to handle [N] req/s with [X ms] median latency.\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "all_start_with_verb": True,
            "max_words": 25,
            "no_bare_metrics": True,
            "no_duplicate_prefix": True,
            "min_count": 3,
        },
    },

    {
        "id": "lq_duplicates_ranked_out",
        "issue_type": "low_quantification",
        "original_text": "Improved system reliability",
        "evidence": "No uptime or incident data",
        "fix_pattern": "Add uptime percentage, incident count, or MTTR",
        "rewrite_starter": "Improved system uptime from [X%] to [Y%]",
        "jd_keywords": ["kubernetes", "monitoring"],
        "count": 3,
        # Model returns near-duplicates — dedup should kick in
        "mock_llm_output": (
            "1. Improved system uptime from [X%] to [Y%] by introducing automated failover.\n"
            "2. Improved system uptime from [X%] to [Y%] using redundant deployments.\n"  # dup prefix
            "3. Reduced incident MTTR by [X%] through improved alerting.\n"
            "4. Achieved [X%] uptime SLA across [N] production services.\n"
        ),
        "quality_checks": {
            "no_duplicate_prefix": True,
            "no_banned_opening": True,
            "min_count": 2,
        },
    },

    {
        "id": "lq_model_invents_metrics",
        "issue_type": "low_quantification",
        "original_text": "Reduced deployment failures",
        "evidence": "Unquantified improvement",
        "fix_pattern": "Add percentage reduction or absolute count",
        "rewrite_starter": "",
        "count": 3,
        "jd_keywords": ["ci/cd", "docker"],
        # Model invents bare numbers — sanitize should bracket them
        "mock_llm_output": (
            "1. Reduced deployment failures by 42%, saving 200 engineer-hours monthly.\n"
            "2. Cut rollback rate from 15% to 3% through improved test coverage.\n"
            "3. Automated [N] deployment checks eliminating [X%] of manual failures.\n"
        ),
        "quality_checks": {
            "no_bare_metrics": True,  # 42%, 200, 15%, 3% should all be bracketed
            "min_count": 3,
        },
    },

    # ------------------------------------------------------------------
    # PIPELINE / QUALITY SCENARIOS
    # ------------------------------------------------------------------
    {
        "id": "pipeline_jd_kw_rewarded",
        "issue_type": "weak_phrasing",
        "original_text": "Managed cloud infrastructure",
        "evidence": "Passive management phrasing",
        "fix_pattern": "Built / Architected / Deployed + specific tool",
        "rewrite_starter": "",
        "jd_keywords": ["terraform", "aws", "kubernetes"],
        "count": 2,
        # One variant has JD keywords, one is generic — keyword variant should rank first
        "mock_llm_output": (
            "1. Architected Terraform-based AWS infrastructure across [N] environments.\n"
            "2. Built cloud systems for the engineering team.\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "min_count": 2,
            "any_kw_in_any": ["terraform", "aws", "kubernetes"],
        },
    },

    {
        "id": "pipeline_too_many_placeholders",
        "issue_type": "low_quantification",
        "original_text": "Managed multiple projects",
        "evidence": "No metrics",
        "fix_pattern": "Add scope and scale",
        "rewrite_starter": "",
        "jd_keywords": [],
        "count": 2,
        # One variant is placeholder-stuffed, one is clean — clean should rank first or both returned
        "mock_llm_output": (
            "1. [Managed] [N] [projects] [using] [tools] at [scope] delivering [X%] [results].\n"
            "2. Delivered [N] concurrent projects on schedule, reducing scope creep by [X%].\n"
        ),
        "quality_checks": {
            "min_count": 1,  # at least clean variant survives or fallback
        },
    },

    {
        "id": "pipeline_parse_robustness",
        "issue_type": "weak_phrasing",
        "original_text": "Helped with monitoring",
        "evidence": "Weak verb",
        "fix_pattern": "Active verb",
        "rewrite_starter": "",
        "count": 3,
        "jd_keywords": ["prometheus", "grafana"],
        # Model output with mixed formatting: preamble, headers, valid bullets
        "mock_llm_output": (
            "Here are some rewrites:\n"
            "Rewrites:\n"
            "1. Built Prometheus alerting stack reducing MTTD by [X%].\n"
            "2. Designed Grafana dashboards improving incident visibility for [N] engineers.\n"
            "3. Implemented monitoring coverage for [N] critical services.\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "min_count": 3,  # preamble stripped, all 3 valid
        },
    },

    {
        "id": "pipeline_empty_after_filter_fallback",
        "issue_type": "weak_phrasing",
        "original_text": "Did the work",
        "evidence": "Vague",
        "fix_pattern": "Be specific",
        "rewrite_starter": "",
        "jd_keywords": [],
        "count": 2,
        # Unusually bad output — everything short or banned — fallback must not crash
        "mock_llm_output": (
            "1. I did work.\n"
            "2. My job.\n"
            "3. ok\n"
        ),
        "quality_checks": {
            "min_count": 1,  # fallback guarantees something
        },
    },

    {
        "id": "pipeline_count_respected",
        "issue_type": "weak_phrasing",
        "original_text": "Assisted with backend tasks",
        "evidence": "Weak verb",
        "fix_pattern": "Active verb + what + outcome",
        "rewrite_starter": "Built backend services",
        "jd_keywords": ["python", "docker"],
        "count": 2,
        # More than count good variants — should return exactly count
        "mock_llm_output": (
            "1. Built backend services in Python serving [N] requests per second.\n"
            "2. Developed containerised API reducing cold start time by [X%].\n"
            "3. Deployed Docker services across [N] environments with zero downtime.\n"
            "4. Shipped Python microservice handling [N] concurrent users.\n"
        ),
        "quality_checks": {
            "no_banned_opening": True,
            "min_count": 2,
            "max_variants": 2,
        },
    },
]
