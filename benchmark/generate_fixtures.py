#!/usr/bin/env python3
"""
Writes all 50-pair benchmark .txt fixtures to inputs/resumes/ and inputs/jds/.
Skips files that already exist unless --force is passed.

Usage:
    python generate_fixtures.py
    python generate_fixtures.py --force
"""
from __future__ import annotations

import argparse
from pathlib import Path

BENCH_DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# RESUME CONTENT
# ---------------------------------------------------------------------------

RESUMES: dict[str, str] = {

# ---- P001-P010 baseline files ----

"swe_kaggle_01.txt": """\
SAM CHEN
sam.chen@email.com | Seattle, WA

SUMMARY
Backend engineer with 5 years building distributed systems in Python and Go on AWS.
Focused on service reliability, CI/CD automation, and cross-team API design.

EXPERIENCE

Senior Software Engineer - Cobalt Systems, Seattle WA (2021 - 2024)
- Architected microservices platform in Python and FastAPI handling 3.2 million daily requests
- Migrated 12 services from EC2 to Kubernetes on AWS EKS, reducing infrastructure cost by 38 percent
- Implemented Redis caching layer that cut database query load by 64 percent across 5 services
- Built Datadog dashboards and alerting policies that reduced mean time to detect from 22 to 4 minutes
- Led a team of 4 engineers through 4 consecutive quarterly delivery cycles on schedule

Software Engineer - Horizon Tech, Portland OR (2019 - 2021)
- Built REST APIs in Python FastAPI and PostgreSQL serving 210,000 monthly active users
- Automated deployment pipeline with Jenkins and Docker, cutting release cycle from 4 days to 6 hours
- Wrote 200 plus pytest integration tests achieving 91 percent coverage on critical payment paths
- Collaborated with data team to integrate sklearn model inference into production API

SKILLS
Languages: Python, Go, TypeScript, Bash
Frameworks: FastAPI, Django, React
Cloud and Infrastructure: AWS (ECS, EKS, Lambda, RDS, S3), Docker, Kubernetes, Terraform
Databases: PostgreSQL, Redis, MongoDB
Observability: Datadog, Grafana, Prometheus
Dev Tools: Git, Jenkins, GitHub Actions, Jira, Linux

EDUCATION
B.S. Computer Science - Pacific State University, 2019
""",

"swe_kaggle_02.txt": """\
DANA REYES
dana.reyes@email.com | Denver, CO

SUMMARY
Python developer with 4 years of experience in web APIs and data workflows.
Familiar with cloud deployment on AWS and agile development practices.

EXPERIENCE

Software Engineer - Blueline Analytics, Denver CO (2021 - 2024)
- Developed REST APIs using Python and Flask for internal analytics product
- Worked on data pipeline integrations for reporting and dashboards
- Assisted with deployments to AWS EC2 and S3
- Participated in sprint ceremonies and code reviews with a team of 6

Junior Developer - FastDash Inc, Denver CO (2020 - 2021)
- Built frontend components using React and managed state with Redux
- Wrote SQL queries supporting business intelligence dashboards
- Contributed to bug fixes and minor features across Python codebase

SKILLS
Languages: Python, JavaScript, SQL
Frameworks: Flask, React
Cloud: AWS (EC2, S3)
Databases: MySQL, PostgreSQL
Tools: Git, Jira

EDUCATION
B.S. Information Systems - Mountain State University, 2019
""",

"pm_synthetic_01.txt": """\
PRIYA SUBRAMANIAN
priya.s@email.com | Boston, MA

SUMMARY
Product manager with 7 years delivering B2B SaaS products. Experienced leading
cross-functional teams across engineering, design, and data. Strong background in
user research, roadmap prioritization, and go-to-market execution.

EXPERIENCE

Senior Product Manager - Vertex Platforms, Boston MA (2020 - 2024)
- Owned end-to-end roadmap for core analytics product serving 300 enterprise accounts
- Led cross-functional team of 12 across engineering, design, and customer success for 4 major releases
- Reduced customer churn by 18 percent by redesigning onboarding based on 60-user research study
- Drove go-to-market strategy for 3 product lines generating 2.4M ARR in year one
- Ran weekly sprint reviews and quarterly OKR planning with VP of Product and CTO

Product Manager - InnovateCo, Cambridge MA (2018 - 2020)
- Managed backlog and scrum ceremonies for 2 engineering teams
- Wrote product requirements documents for features used by 40,000 monthly active users
- Collaborated with sales and marketing to define positioning for SMB market segment
- Ran competitive analysis across 8 alternatives and presented findings to leadership

SKILLS
Product: Roadmap planning, user research, A/B testing, OKRs, go-to-market strategy
Collaboration: Cross-functional leadership, agile, scrum, stakeholder management
Tools: Jira, Figma, Tableau, Looker, Notion
Domains: B2B SaaS, analytics, enterprise software

EDUCATION
MBA - Boston University Questrom School, 2017
B.A. Economics - Northeast University, 2014
""",

"ml_kaggle_01.txt": """\
ALEX MORGAN
alex.morgan@email.com | San Francisco, CA

SUMMARY
Machine learning engineer with 5 years building and deploying ML systems in production.
Deep experience with Python, PyTorch, and scalable model serving on AWS.

EXPERIENCE

ML Engineer - Stratus AI, San Francisco CA (2021 - 2024)
- Built model training pipeline in PyTorch and Python supporting 14 experiments per week
- Reduced model inference latency from 380ms to 48ms by implementing batching and quantization
- Deployed sklearn and PyTorch models to production using AWS Lambda and SageMaker
- Built Airflow DAGs orchestrating feature engineering pipelines processing 500GB weekly
- Introduced MLflow experiment tracking, reducing re-training overhead by 42 percent

Data Scientist - Nova Research, San Jose CA (2019 - 2021)
- Built natural language processing pipelines using Python and sklearn to classify 1.2M documents
- Developed deep learning models with TensorFlow for image classification at 94 percent accuracy
- Created Pandas and SQL data preparation workflows for model training and validation

SKILLS
Languages: Python, SQL, Bash
ML Frameworks: PyTorch, TensorFlow, sklearn, XGBoost
Data Tools: Pandas, Spark, Airflow, MLflow, dbt
Cloud: AWS (SageMaker, Lambda, S3), Docker, Kubernetes
Databases: PostgreSQL, MongoDB
Tools: Git, Jupyter, GitHub, Jira

EDUCATION
M.S. Computer Science, Machine Learning - Western Technical University, 2019
B.S. Mathematics - State University, 2017
""",

"swe_github_01.txt": """\
CASEY TORRES
casey.torres@email.com | Austin, TX

SUMMARY
Fullstack engineer with 4 years building consumer and developer-facing products.
Strong in TypeScript, React, and Node.js with experience shipping production web applications.

EXPERIENCE

Software Engineer - Ember Digital, Austin TX (2021 - 2024)
- Built core product UI in React and TypeScript serving 180,000 monthly active users
- Designed and implemented GraphQL API layer on Node.js replacing 3 legacy REST endpoints
- Reduced page load time by 54 percent through code splitting, lazy loading, and CDN optimization
- Led adoption of Jest and Cypress test suite, growing coverage from 22 percent to 78 percent
- Collaborated with design team using Figma to deliver 8 product features per quarter

Junior Engineer - Summit Labs, Austin TX (2020 - 2021)
- Built responsive UI components in React and styled-components
- Implemented WebSocket-based notification system in Node.js with 99.8 percent uptime
- Wrote integration and unit tests using Jest for 3 production services

SKILLS
Languages: TypeScript, JavaScript, HTML, CSS
Frameworks: React, Next.js, Node.js, GraphQL
Cloud: AWS (S3, CloudFront, Lambda), Docker
Databases: PostgreSQL, MongoDB, Redis
Dev Tools: Git, GitHub, Jira, Figma, Webpack, Vite, Jest, Cypress

EDUCATION
B.S. Computer Science - Texas State University, 2020
""",

"data_kaggle_01.txt": """\
MARCUS OKAFOR
marcus.okafor@email.com | Chicago, IL

SUMMARY
Data engineer with 5 years building scalable data infrastructure and analytics pipelines.
Deep experience with Spark, Airflow, dbt, and cloud data warehouses.

EXPERIENCE

Senior Data Engineer - Luminary Financial, Chicago IL (2021 - 2024)
- Built and maintained 14 production Airflow DAGs processing 800GB daily across trading systems
- Redesigned dbt transformation layer, reducing model run time by 55 percent and improving coverage
- Migrated on-premise warehouse to Snowflake, enabling self-service analytics for 200 analysts
- Implemented Kafka-based CDC pipeline ingesting 3 million events per hour from 8 upstream systems
- Reduced data freshness SLA from 4 hours to 22 minutes for critical risk dashboards

Data Engineer - Apex Analytics, Chicago IL (2019 - 2021)
- Developed PySpark ETL jobs on Databricks for e-commerce clickstream processing
- Built data quality framework catching 94 percent of upstream schema breaks before production impact
- Wrote Python ingestion scripts for 12 third-party REST APIs into PostgreSQL and S3

SKILLS
Languages: Python, SQL, Bash, Scala
Frameworks: Apache Spark, dbt, Airflow, Kafka
Platforms: Databricks, Snowflake, AWS (S3, Glue, Redshift, Lambda), GCP (BigQuery)
Databases: PostgreSQL, MySQL, MongoDB
Tools: Git, Docker, Terraform, Tableau, Looker

EDUCATION
B.S. Computer Science - University of Illinois Chicago, 2018
""",

"pm_synthetic_02.txt": """\
JORDAN LEVY
jordan.levy@email.com | New York, NY

SUMMARY
Growth-focused product manager with 5 years building consumer and B2B products.
Track record driving retention, activation, and monetization outcomes through
data-driven experimentation and cross-functional alignment.

EXPERIENCE

Product Manager - Prism Consumer, New York NY (2020 - 2024)
- Owned growth product roadmap for subscription product with 1.2 million paid subscribers
- Launched A/B testing program across onboarding flow, improving 30-day retention by 23 percent
- Partnered with analytics team to build funnel dashboards in Looker used by 4 product teams
- Defined and tracked OKRs for growth squad across acquisition, activation, and retention metrics
- Ran 22 shipped experiments in 18 months in collaboration with engineering and design

Associate PM - Atlas Media, New York NY (2018 - 2020)
- Supported senior PM on backlog grooming, sprint planning, and scrum ceremonies
- Wrote product requirements and user stories for features shipped to 500,000 daily active users
- Conducted 40 user interviews to inform redesign of core discovery feature
- Used Tableau and Jira to track feature rollout metrics and report to stakeholders

SKILLS
Product: Growth loops, retention, A/B testing, funnel optimization, OKRs, roadmaps
Analytics: Tableau, Looker, SQL, Amplitude
Collaboration: Agile, scrum, cross-functional teams, stakeholder management
Tools: Jira, Figma, Notion

EDUCATION
B.A. Business - Columbia University, 2018
""",

"swe_synthetic_01.txt": """\
RILEY ADAMS
riley.adams@email.com | Chicago, IL

SUMMARY
Software engineer with 4 years building web applications and backend services in Python.
Comfortable across the full stack with focus on clean API design and test coverage.

EXPERIENCE

Software Engineer - Ironwood Software, Chicago IL (2021 - 2024)
- Built and maintained Django REST API supporting 85,000 monthly active users
- Designed PostgreSQL schema migrations for 3 major product releases with zero downtime
- Implemented OAuth2 authentication flow reducing support tickets related to login by 41 percent
- Wrote pytest test suite growing coverage from 44 percent to 86 percent across all services
- Participated in agile sprint ceremonies and biweekly code reviews with team of 5

Junior Developer - Beacon Systems, Chicago IL (2020 - 2021)
- Built REST endpoints in Python Django for customer-facing reporting features
- Wrote SQL queries and maintained PostgreSQL indexes for analytics data warehouse
- Implemented frontend features in React and integrated with backend via REST API
- Set up Docker Compose local development environment used by all 8 team members

SKILLS
Languages: Python, JavaScript, SQL, Bash
Frameworks: Django, FastAPI, React
Databases: PostgreSQL, MySQL, Redis
Cloud: AWS (EC2, RDS, S3), Docker
Dev Tools: Git, GitHub, Jira, Linux, agile, scrum

EDUCATION
B.S. Computer Science - Midwest University, 2020
""",

"swe_github_02.txt": """\
Jordan Kim is a software engineer based in New York who has been working
in backend development for about 3 years. At current employer Solaris Tech
work focuses mostly on Python and API development. Before that worked at
a smaller startup doing full stack work. Attended NYU for computer science
and graduated in 2021.

Technical experience includes Python, JavaScript, AWS, Docker, and SQL.
Has worked with PostgreSQL and some NoSQL databases. Comfortable in Linux
environments and uses Git for version control on a daily basis.

At Solaris Tech has built several REST APIs serving internal and external
clients. Also done work with microservices and helped with deployments
using AWS ECS. The team uses Jira and runs two-week agile sprints.

Enjoys working on backend systems and is interested in distributed systems
and cloud infrastructure. A fast learner who picks up new technologies
quickly when projects require them. Has experience with Python and Django
for web development as well as FastAPI for lightweight API services.
Familiar with CI/CD pipelines and has worked with GitHub Actions and
Jenkins to automate testing and deployments.

Education is a B.S. in Computer Science from NYU completed in 2021.
Skills include Python, JavaScript, AWS, Docker, PostgreSQL, Redis, Git,
Linux, and experience with both agile and scrum methodologies. Has also
worked on projects involving monitoring with Grafana and Prometheus.
""",

# ---- Task-listed resume files ----

"swe_kaggle_03.txt": """\
MORGAN LEE
morgan.lee@email.com | San Francisco, CA

SUMMARY
Backend systems engineer with 6 years of experience building large-scale distributed
services in Go. Expert in gRPC, Kubernetes, and Protobuf-based service design.
Strong track record delivering low-latency, high-availability infrastructure.

EXPERIENCE

Staff Software Engineer - Nexus Infrastructure, San Francisco CA (2021 - 2024)
- Designed gRPC service mesh in Go handling 18 million requests per day with p99 latency under 8ms
- Led migration of 22 services to Kubernetes on GCP GKE, improving deployment frequency by 5x
- Built Protobuf schema registry and versioning system used across 40 microservices
- Reduced API gateway response time by 62 percent through connection pooling and caching in Redis
- Mentored 4 engineers in distributed systems design patterns and service reliability engineering

Senior Software Engineer - Frost Systems, Seattle WA (2018 - 2021)
- Implemented distributed rate limiter in Go using Redis and etcd with sub-millisecond overhead
- Designed internal RPC framework on gRPC and Protobuf replacing ad-hoc HTTP integrations
- Built Kubernetes operator in Go automating provisioning of stateful database clusters
- Reduced on-call incidents by 71 percent by introducing structured logging and Prometheus alerting
- Delivered 3 major platform releases on schedule serving 8 million monthly active users

SKILLS
Languages: Go, Python, Bash
Frameworks: gRPC, Protobuf, Kubernetes operator SDK
Infrastructure: Kubernetes, Docker, Terraform, GCP, AWS (EKS)
Databases: PostgreSQL, Redis, etcd, Elasticsearch
Observability: Prometheus, Grafana, Datadog
Dev Tools: Git, GitHub, Jira, Linux

EDUCATION
B.S. Computer Science - California State University, 2018
""",

"swe_kaggle_04.txt": """\
TAYLOR BROOKS
taylor.brooks@email.com | New York, NY

SUMMARY
Fullstack engineer with 4 years delivering consumer-facing and developer-tool products.
Deep expertise in TypeScript, React, Node.js, and GraphQL. Comfortable owning features
from database schema to polished UI.

EXPERIENCE

Software Engineer - Atlas Digital, New York NY (2021 - 2024)
- Built developer-facing product UI in React and TypeScript with 98 percent Lighthouse score
- Designed GraphQL API on Node.js reducing over-fetching by 80 percent vs prior REST endpoints
- Implemented server-side rendering with Next.js cutting time to interactive by 1.4 seconds
- Led adoption of TypeScript across 3 shared component libraries, reducing runtime errors by 45 percent
- Shipped 14 A/B experiments in collaboration with product and design using Figma mockups

Software Engineer - Crest Technologies, Brooklyn NY (2020 - 2021)
- Built real-time chat feature in Node.js and WebSocket serving 28,000 concurrent connections
- Migrated legacy jQuery frontend to React, improving developer velocity by 3x for new features
- Wrote Jest unit tests and Cypress end-to-end tests achieving 84 percent test coverage

SKILLS
Languages: TypeScript, JavaScript, HTML, CSS
Frameworks: React, Next.js, Node.js, GraphQL, Express
Databases: PostgreSQL, MongoDB, Redis
Cloud: AWS (Lambda, S3, CloudFront), Docker
Dev Tools: Git, GitHub, Webpack, Vite, Jest, Cypress, Storybook, Figma, Jira

EDUCATION
B.S. Computer Science - Columbia University, 2020
""",

"swe_kaggle_05.txt": """\
DREW NAKAMURA
drew.nakamura@email.com | Mountain View, CA

SUMMARY
Systems and compiler engineer with 7 years building performance-critical software in
C++ and Rust. Background spanning LLVM passes, memory allocators, and distributed
storage systems. Passionate about correctness, safety, and measurable performance gains.

EXPERIENCE

Senior Systems Engineer - Pinnacle Compute, Mountain View CA (2020 - 2024)
- Implemented custom LLVM optimization passes reducing binary size by 18 percent for embedded targets
- Built Rust memory allocator for high-frequency trading system achieving 99.99th percentile latency under 500ns
- Ported 120,000 line C++ codebase to Rust over 18 months while maintaining full test coverage
- Designed lock-free concurrent data structures in C++ cutting contention under load by 73 percent
- Reviewed and merged 600 plus pull requests across compiler toolchain and runtime teams

Systems Engineer - Ironwood Labs, Palo Alto CA (2017 - 2020)
- Built C++ network stack for embedded sensor devices operating on Linux with 64MB RAM constraint
- Implemented GCC plugin for static analysis catching 340 real bugs in production code before release
- Wrote Rust CLI tool for binary differential analysis used across 3 internal engineering teams
- Reduced compile time of core library by 44 percent through build graph optimization and caching

SKILLS
Languages: C++, Rust, Python, Assembly (x86, ARM), Bash
Compilers and Runtimes: LLVM, GCC, Clang, WASM
Systems: Linux kernel, memory allocators, lock-free data structures, POSIX
Build Tools: CMake, Cargo, Bazel, Make
Dev Tools: Git, GitHub, perf, valgrind, gdb, sanitizers

EDUCATION
M.S. Computer Science, Systems - Stanford University, 2017
B.S. Computer Engineering - State University, 2015
""",

"swe_synthetic_02.txt": """\
AVERY JACKSON
avery.jackson@email.com | Seattle, WA

SUMMARY
Cloud infrastructure engineer with 5 years building and operating AWS environments at scale.
Deep expertise in Terraform, CloudFormation, CDK, and Lambda-based serverless architectures.
Track record reducing cloud spend while improving deployment reliability.

EXPERIENCE

Cloud Engineer - Stratus Cloud, Seattle WA (2021 - 2024)
- Designed multi-account AWS organization structure supporting 18 product teams with automated provisioning
- Built Terraform modules for 40 plus reusable infrastructure patterns used across the organization
- Implemented AWS CDK pipelines enabling self-service deployment for 9 previously ops-dependent teams
- Reduced monthly AWS cloud spend by 34 percent through rightsizing, reserved instances, and Lambda optimization
- Ran incident retrospectives for 6 major production events and drove resolutions adopted company-wide

Infrastructure Engineer - Summit Cloud, Portland OR (2019 - 2021)
- Automated serverless API deployment using AWS Lambda, API Gateway, and CloudFormation
- Built Terraform state management system using S3 and DynamoDB for 25-developer engineering org
- Implemented IAM policy automation reducing time to provision developer access from 4 days to 15 minutes
- Migrated 3 monolith applications to microservices on ECS using Docker and AWS ALB

SKILLS
Cloud: AWS (Lambda, EC2, ECS, EKS, RDS, S3, CloudFormation, CDK, IAM, VPC)
IaC: Terraform, CloudFormation, AWS CDK, Ansible
Languages: Python, Bash, TypeScript
Containers: Docker, Kubernetes
Databases: PostgreSQL, DynamoDB, Redis
Dev Tools: Git, GitHub Actions, Jenkins, Datadog, Linux

EDUCATION
B.S. Computer Science - Pacific University, 2019
""",

"swe_synthetic_03.txt": """\
SAM WASHINGTON
sam.washington@email.com | Austin, TX

SUMMARY
Senior software engineer with 7 years building production systems at scale. Expertise
in Python and Go backend services, distributed systems, and platform engineering.
Consistent track record of shipping high-impact features and mentoring junior engineers.

EXPERIENCE

Staff Engineer - Beacon Platforms, Austin TX (2020 - 2024)
- Led architecture of new API gateway in Go processing 25 million requests per day at p99 under 15ms
- Redesigned data ingestion pipeline in Python reducing customer onboarding time from 72 hours to 90 minutes
- Established engineering standards for service design adopted across 8 teams over 2 years
- Reduced production incidents by 58 percent by introducing chaos engineering and failure mode analysis
- Grew engineering team from 6 to 18 through recruiting, interviewing, and structured onboarding

Senior Software Engineer - Cobalt Engineering, Dallas TX (2019 - 2020)
- Built Python microservices on AWS Lambda and ECS supporting 6 million monthly active users
- Implemented Kubernetes autoscaling strategy saving 22 percent of compute costs annually
- Designed PostgreSQL schema and query optimization reducing dashboard load time by 67 percent

Software Engineer - Horizon Systems, Austin TX (2017 - 2019)
- Built Django REST APIs and React frontend for internal tooling used by 300 operations staff
- Introduced Datadog APM across 4 production services, cutting time to diagnose incidents in half
- Wrote Python CI/CD automation using Jenkins reducing manual release steps from 18 to 2

SKILLS
Languages: Python, Go, TypeScript, SQL, Bash
Frameworks: FastAPI, Django, gRPC, React
Cloud: AWS (ECS, EKS, Lambda, RDS, S3), GCP, Docker, Kubernetes, Terraform
Databases: PostgreSQL, Redis, MongoDB, Elasticsearch
Observability: Datadog, Grafana, Prometheus
Dev Tools: Git, GitHub, Jenkins, Linux, Jira

EDUCATION
B.S. Computer Science - University of Texas Austin, 2017
""",

"swe_synthetic_04.txt": """\
ROBIN CHEN
robin.chen@email.com | Seattle, WA

SUMMARY
ML infrastructure engineer with 5 years building scalable model training and serving
systems. Deep experience with Python, Apache Spark, Airflow, MLflow, and Pandas.
Focused on bridging the gap between research and reliable production ML systems.

EXPERIENCE

ML Infrastructure Engineer - Nova AI, Seattle WA (2021 - 2024)
- Built distributed model training platform using Python and Spark on Databricks, reducing training time by 61 percent
- Designed Airflow DAG library for ML pipeline orchestration used by 12 data science teams
- Implemented MLflow experiment tracking and model registry cutting experiment reproduction time from days to minutes
- Built Pandas-based feature store serving 200 plus features to 8 production models in real time
- Reduced model deployment cycle from 3 weeks to 2 days through automated testing and staging pipelines

Data Engineer - Zenith Analytics, Portland OR (2019 - 2021)
- Built ETL pipelines in Python and Spark processing 1.2TB daily for recommendation system
- Created Airflow workflows for nightly model retraining across 5 ML models
- Wrote Pandas transformations and SQL pipelines supporting data science team of 9 engineers
- Migrated model artifact storage to S3 with MLflow tracking, enabling full model lineage history

SKILLS
Languages: Python, SQL, Bash, Scala
ML and Data: Apache Spark, Airflow, MLflow, Pandas, sklearn, PyTorch, dbt
Cloud: AWS (S3, EMR, SageMaker), Databricks, Docker, Kubernetes
Databases: PostgreSQL, MongoDB, Redis
Dev Tools: Git, Jupyter, Jira, Linux, GitHub Actions

EDUCATION
B.S. Computer Science - University of Washington, 2019
""",

"swe_weak_01.txt": """\
ALEX SMITH
alex.smith@email.com | Phoenix, AZ

SUMMARY
Junior software developer with 1 year of professional experience. Eager to learn and
contribute to a team. Looking for opportunities to grow my skills in web development.

EXPERIENCE

Junior Software Developer - Tech Solutions Inc, Phoenix AZ (2023 - 2024)
- Helped the team with development tasks
- Fixed bugs in the existing codebase
- Participated in daily standup meetings
- Worked on small features for the company website
- Assisted senior developers with testing

SKILLS
Languages: Python, HTML, CSS
Other: Some experience with databases, basic Linux knowledge

EDUCATION
B.S. Computer Science - Arizona State University, 2023
""",

"swe_weak_02.txt": """\
JAMIE BROWN
jamie.brown@email.com | Columbus, OH

SUMMARY
Software developer with experience in several technologies. I enjoy building things
and solving problems. Looking for a new opportunity to continue my career.

EXPERIENCE

Developer - Various Companies
- Worked on web development projects
- Helped build and maintain software applications
- Collaborated with teams to deliver features
- Wrote code and fixed bugs
- Worked with databases and APIs

Developer - Freelance Projects
- Built websites for small businesses
- Helped clients with technology needs
- Developed custom scripts for data processing

SKILLS
Python, JavaScript, HTML, CSS, SQL, some PHP, databases, APIs, web development,
version control, agile methodology, communication, teamwork, problem solving

EDUCATION
Associate Degree in Computer Science - Columbus Community College, 2019
""",

"swe_weak_03.txt": """\
A developer with several years of experience primarily working with PHP and
web-based technologies. Most of the work has been on WordPress sites and
custom PHP applications for small business clients. Also familiar with jQuery
for adding interactivity to websites and some basic CSS and HTML work.

Career has been mostly building marketing websites and small e-commerce stores
using WooCommerce and various WordPress plugins. Occasionally customized themes
and wrote PHP functions to extend plugin behavior. Some experience with MySQL
databases through WordPress administration and writing simple queries.

Recently started learning some JavaScript beyond jQuery. Have done a few
tutorials on React and Node.js but have not used them professionally yet.
Would like to transition into more modern web development work.

Previous work history includes building websites for a real estate agency,
a dental office, and a local restaurant chain. Also did some maintenance
work for a software company on their WordPress blog and documentation site.

Education includes a two-year web development certificate from a community
college with coursework in HTML, CSS, PHP, and basic JavaScript. Also
completed some online courses in Python basics and SQL fundamentals.

Skills include PHP, WordPress, WooCommerce, jQuery, MySQL, HTML, CSS, and
some familiarity with git for version control. Good communication skills
and comfortable working with non-technical clients to understand requirements.
""",

"swe_weak_04.txt": """\
MORGAN DALE
morgan.dale@email.com | Nashville, TN

SUMMARY
Recent coding bootcamp graduate passionate about software development.
Built several projects during training and looking for first professional role.

PROJECTS

Personal Portfolio Site
- Built a personal website using React and basic CSS
- Deployed to GitHub Pages using manual upload process

Todo App
- Created a todo application using Python and SQLite
- Added user authentication and basic CRUD operations
- Wrote a few unit tests

Weather Dashboard
- Built a weather app using a free public API
- Used JavaScript to fetch and display data
- Styled with Bootstrap

Expense Tracker
- Built budget tracking tool using Python and CSV files
- Added basic charts using matplotlib

SKILLS
Languages: Python, JavaScript, HTML, CSS
Frameworks: React (basic), Flask (basic)
Databases: SQLite, basic SQL
Other: Git, GitHub, Bootstrap, some Linux

EDUCATION
Full Stack Web Development Bootcamp - Code Academy Nashville, 2023
B.A. English - Nashville State University, 2020
""",

"swe_weak_05.txt": """\
CASEY MARTIN
casey.martin@email.com | Portland, OR

SUMMARY
Backend web developer with 4 years working primarily in Ruby on Rails.
Comfortable building standard web applications and REST APIs using Ruby.

EXPERIENCE

Backend Developer - Green Web Studio, Portland OR (2020 - 2024)
- Built and maintained Ruby on Rails applications for 5 client projects
- Worked on database design and migrations in MySQL
- Helped with deployments to Heroku and basic server configuration
- Participated in weekly team meetings and code reviews
- Assisted with bug fixes and small feature additions

SKILLS
Languages: Ruby, HTML, CSS, some JavaScript
Frameworks: Ruby on Rails
Databases: MySQL, some PostgreSQL
Deployment: Heroku
Other: Git, basic Linux, agile

EDUCATION
B.S. Computer Science - Portland State University, 2019
""",

"swe_weak_06.txt": """\
RILEY SCOTT
riley.scott@email.com | Kansas City, MO

SUMMARY
Motivated and dedicated professional seeking a position in software development.
Strong communicator with a passion for technology and a collaborative attitude.

EXPERIENCE

Software Team Member - Midwest Solutions, Kansas City MO
- Worked closely with team members to complete projects on time
- Communicated clearly with stakeholders about project status
- Demonstrated strong work ethic and attention to detail
- Supported senior team members with various tasks
- Adapted quickly to changing project requirements

Intern - Local Tech Company, Kansas City MO
- Helped with documentation and testing tasks
- Collaborated with the development team on small assignments
- Attended daily team meetings and contributed ideas

SKILLS
Communication, teamwork, problem solving, time management, adaptability,
leadership, attention to detail, fast learner, collaborative mindset

EDUCATION
B.S. Computer Science - Missouri University, 2021
""",

"pm_synthetic_03.txt": """\
MARCUS HALL
marcus.hall@email.com | San Francisco, CA

SUMMARY
Product manager with 6 years building and scaling B2B SaaS products. Track record
owning full product lifecycle from discovery to go-to-market and iteration. Known for
strong stakeholder alignment and data-driven roadmap decisions.

EXPERIENCE

Senior Product Manager - Cobalt SaaS, San Francisco CA (2020 - 2024)
- Owned roadmap for core workflow product serving 420 enterprise customers
- Led go-to-market strategy for 2 new product lines generating 3.2M combined ARR in year one
- Reduced sales cycle length by 27 percent by restructuring product trial and onboarding flow
- Ran quarterly OKR planning with C-suite stakeholders and aligned 3 engineering squads
- Managed cross-functional team of 14 across product, engineering, design, and GTM
- Launched 6 major features used by over 60 percent of active customers within 90 days

Product Manager - Horizon Platforms, Oakland CA (2018 - 2020)
- Defined product requirements and maintained agile backlog for platform API product
- Shipped 3 self-service onboarding features reducing sales-assisted setup by 44 percent
- Led 20 user research sessions per quarter to inform prioritization decisions
- Collaborated with sales and customer success on account expansion and retention strategies

SKILLS
Product: Roadmap, GTM, OKRs, user research, jobs-to-be-done, stakeholder management
Analytics: Looker, Tableau, Amplitude, SQL
Collaboration: Agile, scrum, cross-functional teams, enterprise sales cycles
Tools: Jira, Figma, Notion, Productboard

EDUCATION
MBA - UC Berkeley Haas School, 2018
B.S. Business Administration - State University, 2014
""",

"pm_synthetic_04.txt": """\
SAM LEVY
sam.levy@email.com | New York, NY

SUMMARY
Growth product manager with 4 years driving user acquisition, retention, and monetization.
Expert in funnel analytics, A/B testing, and OKR-driven roadmap planning.
Strong collaborator across engineering, data, and marketing.

EXPERIENCE

Growth Product Manager - Prism Consumer, New York NY (2021 - 2024)
- Owned acquisition and retention roadmap for subscription product with 800,000 paid users
- Launched 18 A/B tests on signup and onboarding flows, improving 60-day retention by 31 percent
- Partnered with analytics to build funnel dashboards in Looker reducing time to insight by 80 percent
- Defined growth OKRs across 3 squads tracking acquisition cost, LTV, and churn metrics
- Shipped paywall optimization feature increasing monthly conversion rate from 4.2 to 6.8 percent

Associate PM - Atlas Growth, New York NY (2020 - 2021)
- Supported growth team on referral program launch reaching 220,000 participants in 90 days
- Wrote A/B testing briefs and analyzed results using SQL and Amplitude
- Ran 12 user interviews per quarter to inform retention feature development
- Tracked sprint velocity and managed agile backlog for 2-person growth pod

SKILLS
Product: Growth loops, funnel optimization, A/B testing, retention, monetization, OKRs
Analytics: SQL, Amplitude, Looker, Tableau
Collaboration: Agile, scrum, cross-functional alignment
Tools: Jira, Figma, Mixpanel, Notion

EDUCATION
B.A. Economics - Columbia University, 2020
""",

"pm_synthetic_05.txt": """\
ALEX NGUYEN
alex.nguyen@email.com | Los Angeles, CA

SUMMARY
Consumer product manager with 3 years focused on mobile app experiences.
Track record improving core engagement and retention metrics in high-growth environments.
Strong user empathy with hands-on background in user research and mobile design.

EXPERIENCE

Product Manager - Nova Mobile, Los Angeles CA (2022 - 2024)
- Owned core feed experience for iOS and Android app with 2.4 million daily active users
- Led redesign of notifications system, reducing opt-out rate by 18 percent over 6 months
- Shipped 3 personalization features using ML recommendations, increasing session length by 22 percent
- Ran weekly A/B experiments with engineering and data teams using Amplitude for analysis
- Collaborated with design team using Figma to define mobile UX across 4 major app surfaces

Associate PM - Summit Media, Los Angeles CA (2021 - 2022)
- Supported product team on onboarding flow improvements increasing D1 retention by 14 percent
- Coordinated agile sprint ceremonies and maintained backlog for mobile engineering squad
- Conducted 15 user interviews per quarter and synthesized insights for roadmap planning

SKILLS
Product: Mobile product strategy, user research, A/B testing, retention metrics
Analytics: Amplitude, Mixpanel, SQL, Tableau
Collaboration: Agile, scrum, cross-functional teams
Tools: Jira, Figma, Notion, App Store Connect, Android Studio (basic)
Domains: Consumer mobile, social, media apps

EDUCATION
B.A. Cognitive Science - UCLA, 2021
""",

"pm_synthetic_06.txt": """\
JAMIE CHEN
jamie.chen@email.com | Seattle, WA

SUMMARY
Platform product manager with 4 years delivering infrastructure and developer-facing
products. Experience bridging technical teams and business stakeholders to define
scalable platform capabilities with clear adoption metrics.

EXPERIENCE

Platform PM - Beacon Cloud, Seattle WA (2021 - 2024)
- Owned developer platform roadmap supporting 60 internal engineering teams
- Led launch of self-service infrastructure provisioning reducing ops ticket volume by 62 percent
- Defined platform OKRs and SLAs adopted as company-wide engineering standards
- Shipped 4 developer experience features with NPS improvement from 28 to 56 over 2 years
- Collaborated cross-functionally with security, infrastructure, and frontend engineering teams

Product Manager - Vortex Dev Tools, Seattle WA (2020 - 2021)
- Managed backlog for internal CI/CD tooling product used by 120 developers
- Led agile ceremonies including sprint planning, retrospectives, and roadmap reviews
- Ran user research sessions with 25 internal engineers to prioritize developer experience improvements
- Coordinated go-to-market communications for 2 platform migrations

SKILLS
Product: Platform strategy, developer experience, roadmaps, OKRs, stakeholder alignment
Analytics: SQL, Tableau, Looker, Datadog
Collaboration: Agile, scrum, cross-functional leadership
Tools: Jira, Figma, Notion, Confluence
Domains: Developer platforms, cloud infrastructure, internal tooling

EDUCATION
B.S. Computer Science - University of Washington, 2020
""",

"pm_synthetic_07.txt": """\
SAM PATEL
sam.patel@email.com | San Francisco, CA

SUMMARY
Technical product manager with 6 years building API products and developer platforms.
Former software engineer with 2 years of professional coding experience.
Deep understanding of API design, integration complexity, and developer workflows.

EXPERIENCE

Senior Technical PM - Nexus API, San Francisco CA (2020 - 2024)
- Owned public REST API platform used by 3,200 external developers and 180 enterprise accounts
- Led API versioning strategy reducing breaking changes and cutting customer migration effort by 60 percent
- Defined API product roadmap aligned to partner ecosystem and developer adoption OKRs
- Collaborated with engineering to ship GraphQL API layer used by 40 percent of active developers
- Ran quarterly developer advisory council with 12 top API consumers to inform roadmap
- Managed cross-functional squad of 9 across API design, docs, and developer relations

Product Manager - Atlas Developer Tools, San Francisco CA (2018 - 2020)
- Built developer console product with agile team of 6 engineers
- Shipped webhook management feature used by 1,200 integrators within 3 months of launch
- Defined API SLA requirements and collaborated with engineering on reliability improvements

Software Engineer - Cobalt Systems, San Jose CA (2017 - 2018)
- Built backend REST API endpoints in Python and FastAPI serving internal analytics
- Wrote unit tests and participated in code reviews for engineering team of 10

SKILLS
Product: API product strategy, developer experience, roadmaps, OKRs, technical documentation
Engineering Background: Python, REST APIs, GraphQL, JSON, Swagger/OpenAPI
Analytics: SQL, Amplitude, Datadog, Looker
Tools: Jira, Figma, Notion, Postman

EDUCATION
B.S. Computer Science - UC San Diego, 2017
""",

"data_kaggle_02.txt": """\
ALEX FORD
alex.ford@email.com | Chicago, IL

SUMMARY
Senior data engineer with 5 years building production-grade data infrastructure.
Deep expertise in Apache Spark, dbt, Snowflake, and Airflow. Strong track record
delivering reliable, well-tested pipelines for analytics and ML teams.

EXPERIENCE

Senior Data Engineer - Summit Data, Chicago IL (2021 - 2024)
- Built PySpark batch processing jobs on Databricks handling 1.4TB of daily clickstream data
- Redesigned dbt project structure reducing model test failures from 24 per week to under 2
- Migrated legacy Redshift warehouse to Snowflake enabling 3x query performance improvement
- Designed Airflow DAG architecture for 22 production pipelines with SLA monitoring and alerting
- Reduced pipeline compute costs by 41 percent through partition pruning and cluster sizing

Data Engineer - Ironwood Analytics, Chicago IL (2019 - 2021)
- Built Kafka consumer pipelines ingesting 2.5 million events per hour into Snowflake staging
- Created dbt macros and tests reducing transformation code duplication by 55 percent
- Wrote Python ingestion scripts for 8 partner APIs loading data into PostgreSQL and S3
- Implemented Great Expectations data quality checks catching 96 percent of upstream schema issues

SKILLS
Languages: Python, SQL, Scala, Bash
Data Platforms: Apache Spark, dbt, Airflow, Kafka
Warehouses: Snowflake, Databricks, Redshift, BigQuery
Cloud: AWS (S3, EMR, Glue), GCP (Dataflow), Docker
Databases: PostgreSQL, MySQL
Tools: Git, GitHub, Terraform, Tableau, Looker

EDUCATION
B.S. Computer Science - University of Illinois, 2019
""",

"data_kaggle_03.txt": """\
MORGAN PATEL
morgan.patel@email.com | San Francisco, CA

SUMMARY
Analytics engineer with 3 years transforming raw data into trusted analytics assets
using dbt, Looker, and BigQuery. Strong SQL skills with background in data modeling,
documentation, and enabling self-service analytics at scale.

EXPERIENCE

Analytics Engineer - Prism Data, San Francisco CA (2022 - 2024)
- Built and maintained 80 plus dbt models in production serving 150 active analytics users
- Designed Looker data model covering 12 core business domains used in executive dashboards
- Reduced dashboard query time by 68 percent through BigQuery materialization strategy
- Implemented dbt test coverage policy achieving 100 percent not-null and uniqueness checks
- Ran weekly analytics office hours supporting 6 cross-functional business teams

Junior Analytics Engineer - Atlas Metrics, San Francisco CA (2021 - 2022)
- Built dbt transformations for marketing attribution model used in weekly business reviews
- Created Looker Explores and dashboards for customer success and growth teams
- Wrote SQL data quality checks integrated into CI/CD pipeline with dbt Cloud

SKILLS
Languages: SQL, Python, Bash
Data Transformation: dbt (Core and Cloud), Jinja templating, YAML testing
BI and Visualization: Looker, Tableau, Google Data Studio
Warehouses: BigQuery, Snowflake, Redshift
Cloud: GCP, AWS (S3, Glue)
Tools: Git, GitHub, Airflow (basic), Jira

EDUCATION
B.S. Statistics - University of California Davis, 2021
""",

"data_kaggle_04.txt": """\
DREW WASHINGTON
drew.washington@email.com | Seattle, WA

SUMMARY
ML and data engineer with 4 years building feature engineering and model training
infrastructure. Strong in Python, sklearn, MLflow, Pandas, and Spark. Focused on
making model development faster, more reproducible, and production-ready.

EXPERIENCE

ML Engineer - Nova ML, Seattle WA (2021 - 2024)
- Built feature store in Python and Pandas serving 160 features to 6 production models
- Implemented MLflow tracking and model registry cutting experiment overhead by 65 percent
- Built PySpark feature engineering pipelines on Databricks processing 800GB weekly
- Reduced model retraining cycle from 5 days to 18 hours through pipeline automation
- Trained and deployed sklearn classification models achieving 91 percent accuracy on holdout sets

Data Engineer - Beacon Analytics, Seattle WA (2020 - 2021)
- Built Python ETL pipelines integrating 10 external data sources into PostgreSQL warehouse
- Created Pandas preprocessing workflows supporting 3 data science teams
- Set up MLflow experiment tracking for data science team of 8 researchers
- Automated model evaluation reports using Python and Jupyter notebooks

SKILLS
Languages: Python, SQL, Bash
ML: sklearn, XGBoost, PyTorch (basic), MLflow, Pandas, NumPy
Data: Apache Spark, Databricks, Airflow, dbt (basic)
Cloud: AWS (SageMaker, S3, EMR), Docker
Databases: PostgreSQL, MongoDB
Tools: Git, Jupyter, Jira, GitHub Actions

EDUCATION
B.S. Statistics - University of Washington, 2020
""",

"data_synthetic_01.txt": """\
MORGAN LEE
morgan.lee@email.com | Atlanta, GA

SUMMARY
Business intelligence analyst with 3 years creating dashboards, reports, and data
visualizations for executive and operational stakeholders. Expertise in Tableau,
Power BI, SQL, and Excel. Strong communicator bridging data and business teams.

EXPERIENCE

BI Analyst - Summit Retail, Atlanta GA (2022 - 2024)
- Built Tableau dashboards for C-suite weekly business review used by 80 stakeholders
- Automated 12 Excel-based reports using SQL queries and scheduled Tableau extracts
- Created Power BI reporting suite for supply chain team reducing manual reporting by 6 hours per week
- Designed SQL data model in PostgreSQL supporting 14 recurring business reports
- Ran quarterly training sessions for 30 business users on self-service Tableau dashboards

Junior BI Analyst - Ironwood Finance, Atlanta GA (2021 - 2022)
- Wrote SQL queries in PostgreSQL supporting financial reporting for audit and compliance
- Built Excel financial models for monthly budget vs actuals analysis
- Created Tableau dashboards for sales performance tracking used by regional managers
- Documented data dictionary and source-to-target mappings for 5 reporting domains

SKILLS
Visualization: Tableau, Power BI, Google Data Studio, Excel
Languages: SQL, Python (pandas, basic), Excel formulas and macros
Databases: PostgreSQL, MySQL, SQL Server
Reporting: Business intelligence, financial reporting, KPI dashboards
Tools: Git, Jira, Confluence, Google Sheets

EDUCATION
B.B.A. Business Analytics - Georgia State University, 2021
""",

"data_synthetic_02.txt": """\
RILEY JOHNSON
riley.johnson@email.com | Boston, MA

SUMMARY
Data analyst with 4 years of experience using R for statistical analysis, visualization,
and reporting. Strong in tidyverse, ggplot2, dplyr, and statistical modeling. Background
in academic research methods applied to business and product analytics.

EXPERIENCE

Data Analyst - Beacon Research, Boston MA (2021 - 2024)
- Conducted statistical analysis in R using dplyr and tidyverse for 3 major product studies
- Built ggplot2 visualization library used by 5 analysts across the research team
- Performed regression and survival analysis in R supporting customer churn modeling
- Automated weekly reporting pipeline in R Markdown reducing analyst time by 4 hours per week
- Presented findings to product and leadership teams with R-generated slide decks

Research Analyst - Nova Insights, Cambridge MA (2020 - 2021)
- Built R data cleaning and transformation scripts for survey data sets with 50,000 plus respondents
- Created Tableau dashboards summarizing R analysis outputs for non-technical stakeholders
- Wrote SQL queries to extract cohorts from PostgreSQL for longitudinal retention studies

SKILLS
Languages: R (tidyverse, dplyr, ggplot2, purrr, lubridate, caret), SQL, Python (basic)
Statistical Methods: Linear regression, logistic regression, survival analysis, hypothesis testing
Visualization: ggplot2, R Markdown, Tableau (basic)
Databases: PostgreSQL, MySQL
Tools: Git, RStudio, Excel, Jira

EDUCATION
M.S. Statistics - Boston University, 2020
B.S. Mathematics - Northeastern University, 2018
""",

}

# ---------------------------------------------------------------------------
# JD CONTENT
# ---------------------------------------------------------------------------

JDS: dict[str, str] = {

# ---- P001-P010 baseline JDs ----

"jd_swe_greenhouse_01.txt": """\
Senior Backend Engineer

We are hiring a Senior Backend Engineer to join our core platform team.
You will design, build, and operate high-throughput services in a cloud-native environment.

Requirements:
3 plus years of professional software engineering experience.
Strong proficiency in Python. Experience with Go or TypeScript is a plus.
Experience building and operating REST APIs or microservices in production.
Hands-on experience with AWS including ECS, EKS, Lambda, S3, or RDS.
Comfortable with Docker and Kubernetes for containerization and orchestration.
Experience with relational databases, preferably PostgreSQL.
Familiarity with Redis or other caching technologies.
Experience with CI/CD pipelines including GitHub Actions, Jenkins, or similar.
Comfortable with Linux and Bash scripting.

Preferred:
Experience with Terraform for infrastructure as code.
Familiarity with Datadog, Grafana, or Prometheus for observability.
Exposure to Elasticsearch or other search technologies.
Contributions to open source projects.

Responsibilities:
Design and implement backend services handling millions of requests daily.
Own reliability, scalability, and observability of your services.
Collaborate with product, data, and ML teams.
Mentor junior engineers and participate in code review.
""",

"jd_swe_greenhouse_02.txt": """\
Backend Software Engineer

We are hiring a Backend Software Engineer to work on our core platform.
The ideal candidate has strong Java experience and is comfortable in microservices.

Requirements:
4 plus years of software engineering experience.
Strong Java proficiency. Experience with Spring Boot is required.
Experience building and maintaining REST APIs at scale.
Familiarity with microservices patterns and distributed systems.
Experience with AWS including EC2, RDS, SQS, or similar.
Relational database experience, preferably MySQL or PostgreSQL.
Experience with Docker for containerization.
Comfortable with Git and CI/CD workflows.

Preferred:
Experience with Kafka or other message queues.
Kubernetes or EKS experience.
Exposure to Terraform or CloudFormation.
Knowledge of Gradle or Maven build tools.
Experience with Elasticsearch or Redis.

Responsibilities:
Build and maintain high-reliability Java microservices.
Collaborate with senior engineers on system design.
Participate in on-call rotation and incident response.
Write and maintain integration and unit tests.
""",

"jd_pm_greenhouse_01.txt": """\
Senior Product Manager

We are looking for a Senior Product Manager to lead one of our core product areas.
You will work closely with engineering, design, and go-to-market teams.

Requirements:
5 plus years of product management experience, preferably in B2B SaaS.
Proven experience owning a product roadmap end to end.
Strong background in user research and translating insights into requirements.
Experience working cross-functionally with engineering, design, and sales.
Comfortable running agile ceremonies including sprint planning and retrospectives.
Data-driven mindset with experience in analytics tools such as Tableau or Looker.
Familiarity with Jira or similar project management tools.

Preferred:
Experience with go-to-market strategy and product launches.
Exposure to enterprise sales cycles and customer success workflows.
MBA or equivalent experience.

Responsibilities:
Own the roadmap for a major product surface.
Collaborate with stakeholders to align on priorities and OKRs.
Partner with engineering to ship features on time and at quality.
Define success metrics and track outcomes post-launch.
Conduct user interviews and synthesize feedback into actionable insights.
""",

"jd_ml_greenhouse_01.txt": """\
Machine Learning Engineer

We are looking for an ML Engineer to help build our model training and serving infrastructure.

Requirements:
3 plus years of machine learning engineering or data science experience.
Strong Python proficiency required.
Experience with PyTorch or TensorFlow for model development and training.
Hands-on experience with sklearn for classical ML pipelines.
Familiarity with data processing tools such as Pandas or Spark.
Experience with Airflow or similar workflow orchestration tools.
Understanding of ML lifecycle management including MLflow or similar.
Comfortable with cloud environments, preferably AWS.

Preferred:
Experience with distributed training on Databricks or SageMaker.
Familiarity with feature stores and ML platform tooling.
Background in natural language processing or computer vision.
Experience with Docker and Kubernetes for model deployment.

Responsibilities:
Build and maintain ML training and inference pipelines.
Collaborate with data scientists to productionize models.
Monitor model performance and retrain as needed.
Improve tooling and infrastructure for the ML platform.
""",

"jd_swe_greenhouse_03.txt": """\
Fullstack Software Engineer

We are looking for a Fullstack Software Engineer to join our product team.
You will work across frontend and backend to deliver user-facing features.

Requirements:
3 plus years of professional software engineering experience.
Strong proficiency in TypeScript and React.
Experience with Node.js for backend services.
Familiarity with GraphQL API design and implementation.
Experience with PostgreSQL or similar relational databases.
Comfortable with Git, CI/CD, and modern development workflows.
Exposure to cloud deployment on AWS or similar.

Preferred:
Experience with Next.js for server-side rendering.
Familiarity with Jest and Cypress for testing.
GraphQL schema design experience.
Experience with Docker for local and production environments.

Responsibilities:
Build and maintain product features across frontend and backend.
Collaborate with product and design to ship high-quality user experiences.
Write tests and maintain code quality through code review.
Help define technical direction for frontend architecture.
""",

"jd_data_greenhouse_01.txt": """\
Senior Data Engineer

We are looking for a Senior Data Engineer to build and scale our data infrastructure.

Requirements:
3 plus years of data engineering experience.
Strong Python skills. SQL proficiency required.
Experience with Apache Spark for large-scale data processing.
Hands-on experience with Apache Airflow for workflow orchestration.
Familiarity with dbt for data transformation.
Experience with a cloud data warehouse such as Snowflake, Databricks, or BigQuery.
Comfortable with AWS or GCP data services including S3, Glue, and Lambda.
Experience with streaming data pipelines using Kafka or similar.

Preferred:
Experience with Terraform or infrastructure as code tooling.
Background with data catalog or governance tooling.
Exposure to machine learning pipelines or feature stores.
Experience with Tableau or Looker for analytics enablement.

Responsibilities:
Design and maintain production data pipelines processing hundreds of GBs daily.
Own reliability and observability of the data platform.
Partner with data science and analytics teams to support their data needs.
Define standards for data quality testing and documentation.
""",

"jd_pm_greenhouse_02.txt": """\
Product Manager, Growth

We are hiring a Product Manager to lead growth initiatives across acquisition and retention.

Requirements:
3 plus years of product management experience with a growth focus.
Track record owning and shipping growth features end to end.
Strong analytical mindset with experience using A/B testing and funnel analysis.
Comfortable defining and tracking OKRs and growth metrics.
Experience working cross-functionally with engineering, data, and marketing.
Familiarity with analytics tools such as Amplitude, Looker, or Tableau.
Excellent communication and stakeholder management skills.

Preferred:
Background in consumer subscription products.
Experience with Jira and agile methodologies.
Exposure to SQL for self-service data analysis.
MBA or equivalent analytical background.

Responsibilities:
Own growth roadmap across acquisition, activation, and retention.
Define experiments and work with engineering to ship them.
Analyze results and translate findings into next actions.
Collaborate with data team to build measurement frameworks.
Present growth findings to leadership on a regular cadence.
""",

# ---- Task-listed JD files ----

"jd_swe_greenhouse_04.txt": """\
Senior Backend Engineer, Go and Distributed Systems

We are hiring a Senior Backend Engineer specializing in Go and distributed systems.
You will build and operate the infrastructure powering our core platform services.

Requirements:
4 plus years of professional software engineering experience.
Strong Go proficiency required. gRPC and Protobuf experience strongly preferred.
Experience building distributed systems at scale.
Hands-on experience with Kubernetes for container orchestration.
Familiarity with service mesh patterns and inter-service communication.
Experience with Redis, PostgreSQL, or other production databases.
Comfortable with Prometheus, Grafana, or Datadog for observability.
Strong Linux and Git fundamentals.

Preferred:
Experience with etcd or other distributed coordination systems.
Background in compiler design or systems programming.
Contributions to open source distributed systems projects.

Responsibilities:
Design and build Go microservices handling millions of daily requests.
Lead technical design reviews for new distributed systems components.
Own service reliability and participate in on-call rotation.
Mentor junior engineers in distributed systems best practices.
""",

"jd_swe_greenhouse_05.txt": """\
Fullstack Software Engineer

We are looking for a Fullstack Software Engineer with strong React and Node.js experience.

Requirements:
3 plus years of software engineering experience.
Strong TypeScript proficiency. React expertise required.
Experience building and maintaining Node.js backend services.
Familiarity with GraphQL API design.
Experience with PostgreSQL or MongoDB.
Comfortable with testing frameworks such as Jest and Cypress.
Experience with Git and modern CI/CD practices.
Familiarity with AWS or similar cloud environments.

Preferred:
Experience with Next.js for server-side rendering.
Familiarity with Storybook for component documentation.
Background in design systems or component libraries.
GraphQL schema federation experience.

Responsibilities:
Build new product features across React frontend and Node.js backend.
Maintain and improve existing fullstack codebase.
Collaborate with product and design teams on feature development.
Write tests and participate in code review.
Contribute to frontend architecture decisions.
""",

"jd_swe_greenhouse_06.txt": """\
ML Infrastructure Engineer

We are hiring an ML Infrastructure Engineer to build our model training and serving platform.

Requirements:
4 plus years of engineering experience with at least 2 in ML infrastructure.
Strong Python proficiency required.
Experience with Apache Spark or similar distributed data processing frameworks.
Hands-on experience with Apache Airflow for pipeline orchestration.
Experience with MLflow or similar experiment tracking and model registry tools.
Familiarity with Pandas and sklearn for data preparation and model training.
Comfortable with cloud ML services on AWS or GCP.
Experience with Docker and container-based deployment.

Preferred:
Experience with Databricks or similar unified ML platform.
Familiarity with feature stores and online serving infrastructure.
Background in deep learning frameworks such as PyTorch.
Kubernetes experience for model serving.

Responsibilities:
Build and maintain ML training pipeline infrastructure.
Design and operate model serving and monitoring systems.
Collaborate with data scientists to improve experiment workflows.
Improve developer tooling for the ML platform team.
""",

"jd_swe_greenhouse_07.txt": """\
Systems Engineer, C++

We are hiring a Systems Engineer with deep C++ expertise to join our performance team.

Requirements:
5 plus years of professional C++ development experience.
Expert-level C++ including modern C++17 and C++20 features.
Experience with performance optimization and profiling on Linux.
Comfortable with memory management, lock-free programming, and concurrency.
Familiarity with build systems such as CMake or Bazel.
Strong Linux systems programming fundamentals.
Experience with debugging tools such as gdb, valgrind, and sanitizers.

Preferred:
Experience with Rust for systems programming.
Background in compiler toolchains such as LLVM or GCC.
Embedded systems or real-time systems experience.
Contributions to open source systems projects.

Responsibilities:
Build and optimize performance-critical C++ components.
Conduct code reviews and enforce systems engineering best practices.
Profile and tune production systems for latency and throughput.
Collaborate with research team to implement algorithmic improvements.
""",

"jd_swe_greenhouse_08.txt": """\
Staff Software Engineer

We are looking for a Staff Software Engineer to provide technical leadership across our platform.

Requirements:
7 plus years of professional software engineering experience.
Proven track record leading technical architecture across large systems.
Strong Python proficiency. Go experience preferred.
Experience designing distributed systems at significant scale.
Excellent communication and cross-functional collaboration skills.
Experience mentoring senior engineers and influencing engineering culture.
Comfortable with AWS or similar cloud infrastructure.
Strong background in observability and reliability engineering.

Preferred:
Experience as a technical lead on multi-team projects.
Background in platform engineering or developer tooling.
Open source contributions or public technical writing.

Responsibilities:
Define technical direction for platform engineering across 3 or more teams.
Lead architecture reviews and provide design guidance.
Drive adoption of engineering best practices and standards.
Partner with product leadership on technical strategy.
Mentor and grow senior engineers across the organization.
""",

"jd_swe_greenhouse_09.txt": """\
ML Platform Engineer

We are hiring an ML Platform Engineer to build tools and infrastructure for our data science team.

Requirements:
4 plus years of data or ML engineering experience.
Strong Python proficiency required.
Hands-on experience with Apache Spark for large-scale feature engineering.
Experience with MLflow for experiment tracking and model management.
Familiarity with Apache Airflow for workflow orchestration.
Experience with Pandas and sklearn for data preparation.
Comfortable with AWS or Databricks for ML workloads.
Experience with Docker for containerized ML environments.

Preferred:
Experience building or operating feature stores.
Background with Kubernetes for ML workload scheduling.
Familiarity with deep learning frameworks such as PyTorch.
Experience with streaming data pipelines.

Responsibilities:
Build and maintain the ML platform serving internal data science teams.
Design feature engineering infrastructure and feature store.
Improve model training and evaluation workflows.
Partner with data scientists on pipeline development and debugging.
""",

"jd_swe_greenhouse_10.txt": """\
Backend Software Engineer, Python and Django

We are hiring a Backend Software Engineer to build and maintain our core web application.

Requirements:
3 plus years of backend software engineering experience.
Strong Python proficiency required.
Experience with Django for web application development.
Hands-on experience with PostgreSQL for data modeling and query optimization.
Familiarity with REST API design principles.
Experience with Docker and basic AWS or cloud deployment.
Comfortable with Git and CI/CD workflows.
Strong testing practices with pytest or similar.

Preferred:
Experience with Redis for caching.
Familiarity with Celery for async task processing.
Background with GraphQL APIs.
Experience with Elasticsearch for search features.

Responsibilities:
Build and maintain Django REST APIs serving our core product.
Design and optimize PostgreSQL schemas and queries.
Write tests and maintain high code quality.
Participate in agile sprint ceremonies and code reviews.
Collaborate with frontend engineers on API contract design.
""",

"jd_swe_greenhouse_11.txt": """\
Systems Engineer, Rust

We are hiring a Systems Engineer with strong Rust experience to join our infrastructure team.

Requirements:
4 plus years of professional software engineering experience.
Strong Rust proficiency required. Experience with memory safety and ownership model.
Background in systems programming including networking, storage, or runtime development.
Comfortable with Linux systems programming and POSIX APIs.
Experience with concurrent and asynchronous programming in Rust.
Strong debugging skills using tools such as gdb and sanitizers.
Familiarity with performance profiling and optimization.

Preferred:
Experience with C++ systems programming.
Background in distributed systems or high-performance computing.
Contributions to the Rust ecosystem or open source projects.
Familiarity with WebAssembly.

Responsibilities:
Build and maintain performance-critical Rust systems components.
Review code and enforce safety and performance standards.
Profile and optimize production workloads.
Contribute to internal Rust tooling and libraries.
""",

"jd_swe_sparse_02.txt": """\
Software Developer

We are a small but growing team looking for a software developer to help us build
and maintain our product. We value people who are self-motivated and enjoy working
in a collaborative environment.

What we are looking for:
Someone who is comfortable working on a software product in a fast-paced setting.
Good communication skills and a willingness to contribute across the team.
Ability to adapt and learn as the product evolves.
A collaborative mindset and a habit of sharing knowledge with teammates.
Comfort working independently on ambiguous problems.

Nice to have:
Some experience with databases and APIs.
Previous work at a startup or small technology company.

We offer:
A chance to make a real impact on the product direction.
A flexible and supportive work environment.
Opportunity for growth as the team scales.
""",

"jd_swe_senior_01.txt": """\
Staff Software Engineer, Python Platform

We are hiring an experienced Staff Software Engineer to lead platform development.
This is a senior individual contributor role with broad technical scope.

Requirements:
8 plus years of professional software engineering experience.
Expert-level Python required. Experience at senior IC or staff level preferred.
Deep experience designing and operating distributed systems at scale.
Proven ability to lead technical initiatives across multiple teams.
Strong communication skills and experience influencing engineering decisions.
Experience with AWS cloud infrastructure and container-based deployments.
Background in platform engineering, developer tooling, or infrastructure.

Preferred:
Experience with Go or another compiled systems language.
Background mentoring senior engineers and running technical design reviews.
Open source contributions or technical blog or conference speaking experience.
Experience with Kubernetes and Terraform for infrastructure management.

Responsibilities:
Define technical strategy for Python platform across 4 or more engineering teams.
Lead complex architecture decisions with long-term impact.
Drive adoption of platform capabilities and engineering standards.
Partner with engineering leadership on hiring and team development.
Represent engineering in cross-functional planning and strategy sessions.
""",

"jd_pm_greenhouse_03.txt": """\
Senior Product Manager, B2B SaaS

We are looking for a Senior PM to own our core B2B product roadmap.

Requirements:
4 plus years of product management experience, preferably in B2B SaaS.
Proven experience owning product strategy and roadmap from discovery to launch.
Strong background in user research and customer development.
Experience running go-to-market launches for B2B product features.
Comfortable working cross-functionally with sales, customer success, and engineering.
Data-driven decision making using Looker, Tableau, or similar analytics tools.
Experience with OKRs and roadmap prioritization frameworks.
Familiarity with Jira and agile development processes.

Preferred:
Background in enterprise software or workflow automation products.
Experience with a product-led growth motion.
MBA or equivalent analytical experience.

Responsibilities:
Own product roadmap for a core B2B product surface.
Lead quarterly planning and OKR-setting process.
Collaborate with sales and customer success on customer feedback and retention.
Define go-to-market strategy for new features with marketing and sales teams.
Track adoption metrics and drive usage through product improvements.
""",

"jd_pm_greenhouse_04.txt": """\
Product Manager, Growth and Retention

We are hiring a PM to own our growth and retention product area.

Requirements:
3 plus years of product management experience with growth or lifecycle focus.
Demonstrated experience improving retention, activation, or monetization metrics.
Comfortable running A/B tests and interpreting results with statistical rigor.
Experience defining and tracking OKRs with engineering and data teams.
Analytical background with experience in tools like Amplitude, Looker, or SQL.
Strong cross-functional collaboration skills across engineering, data, and marketing.
Familiarity with agile development and scrum ceremonies.

Preferred:
Background in consumer subscription or mobile products.
Experience with Jira for backlog management.
Familiarity with funnel analysis and cohort retention modeling.

Responsibilities:
Own growth roadmap for acquisition, activation, and retention.
Define experiments and partner with engineering to ship them quickly.
Analyze experiment results and synthesize learnings into next actions.
Build dashboards and reporting to keep stakeholders aligned.
""",

"jd_pm_greenhouse_05.txt": """\
Product Manager, Consumer Mobile

We are looking for a PM to lead our consumer mobile product experience.

Requirements:
2 plus years of product management experience, ideally in mobile apps.
Strong user empathy and experience conducting user research.
Comfortable working with engineering and design to ship mobile features.
Data-driven approach to decision making using mobile analytics tools.
Familiarity with iOS and Android product development constraints.
Collaborative style with experience managing agile sprints.

Preferred:
Experience with Amplitude or Mixpanel for mobile analytics.
Background in social, media, or consumer subscription apps.
Familiarity with App Store and Google Play release processes.
Experience with A/B testing on mobile.

Responsibilities:
Define and own roadmap for core mobile product surfaces.
Partner with design on mobile UX and interaction patterns.
Collaborate with engineering on technical feasibility and scoping.
Track engagement and retention metrics and run experiments to improve them.
Run regular user research to validate product decisions.
""",

"jd_pm_greenhouse_06.txt": """\
Platform Product Manager

We are hiring a Platform PM to lead the product strategy for our developer-facing platform.

Requirements:
4 plus years of product management experience, preferably in platform or infrastructure.
Experience building products for technical users including engineers or developers.
Comfortable defining platform roadmaps with long-term architectural implications.
Strong cross-functional skills working with platform engineering, security, and DevOps teams.
Familiar with developer experience concepts including APIs, SDKs, and CI/CD tooling.
Data-driven with experience using Datadog, Looker, or similar for platform health metrics.
Experience with agile and OKR frameworks.

Preferred:
Technical background or hands-on coding experience.
Experience with internal developer platforms or cloud infrastructure products.
Familiarity with Kubernetes, Terraform, or similar platform tooling.

Responsibilities:
Define and own the platform product roadmap.
Collaborate with engineering to prioritize platform capabilities.
Drive developer adoption metrics and platform NPS.
Conduct research with internal engineering stakeholders.
Present platform strategy to leadership and cross-functional partners.
""",

"jd_pm_greenhouse_07.txt": """\
Technical Product Manager, APIs and Integrations

We are looking for a Technical PM to own our external API product and developer ecosystem.

Requirements:
4 plus years of product management experience with a technical or API focus.
Strong understanding of REST APIs and API design principles.
Experience building products for external developer audiences.
Comfortable collaborating with engineering on API versioning, schema design, and reliability.
Familiar with GraphQL or similar API technologies.
Track record managing API-first product roadmaps and developer adoption OKRs.
Comfortable with agile ceremonies and technical roadmap communication.

Preferred:
Previous software engineering background preferred.
Experience with OpenAPI or Swagger documentation tooling.
Background in developer relations or technical partnerships.
Familiarity with Jira and Notion for product management.

Responsibilities:
Own roadmap for external REST API and developer console.
Define API versioning strategy and deprecation policies.
Collaborate with engineering on API design and reliability SLAs.
Engage developer community to gather product feedback.
Partner with partnerships team on third-party integration priorities.
""",

"jd_data_greenhouse_02.txt": """\
Senior Data Engineer, Spark and dbt

We are hiring a Senior Data Engineer to build and scale our analytics data platform.

Requirements:
4 plus years of data engineering experience.
Strong Python and SQL skills required.
Hands-on experience with Apache Spark for large-scale batch processing.
Experience with dbt for data transformation and testing.
Familiarity with Snowflake or Databricks as a cloud data warehouse.
Experience with Airflow for pipeline orchestration.
Comfortable with AWS or GCP data services.
Strong understanding of data quality practices and pipeline observability.

Preferred:
Experience with Kafka for streaming data ingestion.
Familiarity with Terraform for infrastructure management.
Background with data governance or cataloging tools.
Experience with Looker or Tableau for analytics enablement.

Responsibilities:
Design and maintain production Spark and dbt pipelines.
Partner with analytics and data science teams on data requirements.
Improve pipeline reliability, testing, and documentation standards.
Lead data modeling and warehouse design for new product domains.
""",

"jd_data_greenhouse_03.txt": """\
Analytics Engineer

We are hiring an Analytics Engineer to own our dbt and Looker data layer.

Requirements:
3 plus years of analytics engineering or data analysis experience.
Expert-level SQL required. dbt proficiency strongly preferred.
Experience with Looker for data modeling and dashboard development.
Hands-on experience with BigQuery, Snowflake, or similar cloud warehouse.
Strong data modeling skills including dimensional modeling and star schemas.
Comfortable working with business stakeholders to define metric requirements.
Familiarity with version control using Git.

Preferred:
Python scripting experience for data automation tasks.
Experience with Airflow or dbt Cloud for workflow orchestration.
Background with data documentation and data quality frameworks.
Tableau or similar BI tool experience.

Responsibilities:
Build and maintain dbt model layer serving all business analytics.
Design Looker data models and dashboards for executive and operational reporting.
Partner with business teams to define metrics and standardize reporting.
Establish data testing and documentation standards across the analytics stack.
""",

"jd_data_greenhouse_04.txt": """\
Data and ML Engineer

We are hiring a Data and ML Engineer to build feature engineering and model training infrastructure.

Requirements:
3 plus years of data engineering or ML engineering experience.
Strong Python proficiency required.
Experience with sklearn for classical ML model development and evaluation.
Hands-on experience with MLflow for experiment tracking and model registry.
Familiarity with Pandas and SQL for data preparation pipelines.
Comfortable with cloud environments such as AWS or GCP.
Experience with Docker for reproducible ML environments.

Preferred:
Experience with Apache Spark for large-scale feature computation.
Familiarity with Databricks or SageMaker.
Background with feature stores or ML platform tooling.
Exposure to Airflow for ML pipeline orchestration.

Responsibilities:
Build feature engineering pipelines supporting production ML models.
Manage model training workflows and evaluation frameworks.
Collaborate with data scientists on experiment design and productionization.
Maintain and improve MLflow tracking and model deployment infrastructure.
""",

"jd_data_greenhouse_05.txt": """\
Data Engineer, Airflow and Spark

We are looking for a Data Engineer to own pipeline development and orchestration.

Requirements:
4 plus years of data engineering experience.
Strong Python and SQL proficiency required.
Hands-on production experience with Apache Airflow for orchestration.
Experience with Apache Spark or PySpark for large-scale data processing.
Familiarity with AWS data services including S3, Glue, EMR, or similar.
Experience with PostgreSQL or a cloud data warehouse.
Comfortable with Docker for pipeline environment management.
Strong understanding of data pipeline reliability and monitoring practices.

Preferred:
Experience with dbt for transformation layer development.
Familiarity with Kafka or other streaming data technologies.
Background with data quality frameworks.
Experience with Databricks or similar unified data platform.

Responsibilities:
Build and maintain Airflow DAGs for production data workflows.
Develop PySpark jobs for large-scale data transformation.
Partner with analytics and business intelligence teams on data requirements.
Improve pipeline reliability, monitoring, and documentation.
""",

"jd_data_greenhouse_06.txt": """\
Data Engineer, dbt and BigQuery

We are hiring a Data Engineer to build and maintain our GCP-based data warehouse.

Requirements:
3 plus years of data engineering experience.
Strong Python and SQL proficiency required.
Hands-on experience with dbt for data transformation and testing.
Experience with BigQuery as a cloud data warehouse.
Familiarity with GCP data services including Dataflow, Cloud Storage, and Pub/Sub.
Understanding of data modeling and warehouse design best practices.
Comfortable with Git for version control and collaborative development.
Experience with Airflow or similar orchestration tools.

Preferred:
Experience with Looker or other BI tools for analytics delivery.
Background with Terraform for GCP infrastructure management.
Familiarity with Kafka or streaming ingestion pipelines.
Experience with dbt Cloud for CI/CD and job scheduling.

Responsibilities:
Design and maintain dbt models and BigQuery warehouse.
Build data ingestion pipelines from internal and external sources.
Partner with analytics engineers and data scientists on data needs.
Define data quality standards and documentation practices.
""",

}

# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Write benchmark fixture files")
    parser.add_argument(
        "--force", action="store_true",
        help="Overwrite existing files",
    )
    args = parser.parse_args()

    res_dir = BENCH_DIR / "inputs" / "resumes"
    jd_dir = BENCH_DIR / "inputs" / "jds"
    res_dir.mkdir(parents=True, exist_ok=True)
    jd_dir.mkdir(parents=True, exist_ok=True)

    created = 0
    skipped = 0

    for fname, content in RESUMES.items():
        path = res_dir / fname
        if path.exists() and not args.force:
            print(f"  skip   resumes/{fname}")
            skipped += 1
        else:
            path.write_text(content.strip() + "\n", encoding="utf-8")
            print(f"  write  resumes/{fname}")
            created += 1

    for fname, content in JDS.items():
        path = jd_dir / fname
        if path.exists() and not args.force:
            print(f"  skip   jds/{fname}")
            skipped += 1
        else:
            path.write_text(content.strip() + "\n", encoding="utf-8")
            print(f"  write  jds/{fname}")
            created += 1

    total = created + skipped
    print(f"\nDone: {created} written, {skipped} skipped  ({total} total fixture files)")


if __name__ == "__main__":
    main()
