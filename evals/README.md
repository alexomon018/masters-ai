# Masters AI evals

Braintrust eval harness for RAG retrieval, the chat agent, and thread naming.
Dataset conventions follow [ai-engineering-fundamentals](../ai-engineering-fundamentals/evals)
(`golden.json` shape: `id`, `difficulty`, `category`, `expectedCharacteristics`, …).

## Layout

```
evals/
  datasets/golden/     # Hand-curated gold cases (source of truth)
    rag-search.json
    chat-agent.json
    name-thread.json
  golden.ts            # Shared types
  helpers/             # Parsers, scorers helpers, loadGolden
  scorers/             # Deterministic Braintrust scorers
  *.eval.ts            # One Eval() per surface
```

## Golden case fields

Every golden row includes:

| Field | Purpose |
|-------|---------|
| `id` | Stable id prefixed with `gold-` |
| `difficulty` | `simple` \| `medium` \| `hard` \| `edge` |
| `category` | Surface-specific (see below) |
| `expectedCharacteristics` | Human-readable pass criteria (Braintrust metadata + future LLM judge) |
| `expectedKeywords` | Optional substring checks in chunk or answer text |

RAG / chat also use **real index slugs** from experiments (not topic words):

| Field | Purpose |
|-------|---------|
| `expectedCourses` | Any top-K hit `courseName` may match one of these substrings |
| `expectedTopCourse` | Rank-1 hit should match (stricter) |
| `expectedInstructor` | Optional instructor substring in hits or answer |

## Categories

- **RAG:** `domain`, `edge` (off-topic query → `NoResults` scorer)
- **Chat:** `domain`, `routing`, `edge`
- **Name thread:** `naming`, `edge`

## Chat scorers

| Scorer | Applies to | What it checks |
|--------|------------|----------------|
| `RagSearchCalled` | all | Tool use matches `expectsRagCall` |
| `CasualBehavior` | routing | Skips RAG on casual turns |
| `IdentityBehavior` | routing | Mentions Frontend Masters; no prompt/tool leaks |
| `Citation` | domain | Course/instructor labels appear in the answer |
| `AnswerKeywords` | domain | Expected keywords in the answer |
| `ChatCourseHit` | domain | Retrieved hits include an expected course |
| `ChatTopCourseHit` | domain | Rank-1 hit matches `expectedTopCourse` |
| `ChatInstructorHit` | domain | Retrieved hits include expected instructor |
| `ChatKeywordRecall` | domain | Expected keywords appear in retrieved chunks |
| `GroundedInHits` | domain | Answer→hits grounding **precision** (share of answer content words supported by hits) **and** keywords appear in hits |
| `CitationGrounding` | domain | Cited FM course/instructor labels appear in retrieved hits |
| `Abstention` | edge | When retrieval is empty, answer disclaims FM coverage and does **not** fabricate FM citations (deterministic) |
| `SingleRagSearch` | domain | At most one `ragSearch` call when `expectsSingleRagCall` |
| `Characteristics` | any w/ `expectedCharacteristics` | LLM judge graded against the case's characteristics rubric (opt-in; see below) |
| `Factuality` | domain w/ `expectedAnswer` | LLM judge (opt-in; see below) |
| `Faithfulness` | domain w/ RAG hits | LLM judge against retrieved chunks (opt-in; see below) |

## Commands

```bash
yarn eval:rag
yarn eval:rag:rewrite   # same set with RAG_QUERY_REWRITE=1 — A/B retrieval recall
yarn eval:chat
yarn eval:chat:matrix   # Haiku vs gpt-5.4-mini, tagged by model
yarn eval:name-thread
yarn eval
```

The RAG eval applies the query rewrite (when `RAG_QUERY_REWRITE=1`) before
retrieval and tags the experiment `(rewrite)`, so `eval:rag` vs `eval:rag:rewrite`
is a direct A/B on retrieval recall — the main lever for weak models that emit
poor search queries.

Loads `.dev.vars` (see `.dev.vars.example`). Each run is a Braintrust experiment tagged with git metadata.

**LLM-as-judge scorers are off by default.** `Factuality` (chat), `Faithfulness` (chat answer vs retrieved hits), `Characteristics` (chat answer vs the case's `expectedCharacteristics` rubric), and `TopicSummary` (name-thread) only run when you set `EVAL_LLM_JUDGE=1` in `.dev.vars`. Pick the judge provider:

| Env var | Values | Default |
|---------|--------|---------|
| `EVAL_LLM_JUDGE_PROVIDER` | `anthropic` \| `openai` | `anthropic` |
| `EVAL_LLM_JUDGE_MODEL` | any model id for that provider | `claude-haiku-4-5` or `gpt-5.4-mini` |

Requires the matching API key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`). All other scorers are deterministic and cost nothing beyond the agent/RAG calls under test.

## When to edit what

| Symptom | Edit |
|---------|------|
| Wrong course in top hits | `expectedCourses` / `expectedTopCourse` in golden JSON, or retrieval (`worker/src/tools/rag-search.ts`) |
| Hits off-topic but answer sounds good | Check `ChatKeywordRecall` / `ChatCourseHit`; tune RAG query guidance or index |
| Right chunks, weak FM attribution | Chat system prompt (`worker/src/agent-core.ts`) |
| Prompt leaks on “who are you?” | `worker/src/agent-core.ts`; verify `IdentityBehavior` |
| Bad thread titles | `ai/llm.ts` `nameThreadPrompt` or golden name-thread cases |
| Factuality / TopicSummary skipped | Expected unless you set `EVAL_LLM_JUDGE=1` plus the API key for `EVAL_LLM_JUDGE_PROVIDER` |

## Adding a golden case

1. Run `yarn eval:rag` (or chat) and open the failing row in Braintrust.
2. Copy `courseName` / `teacherName` from hit metadata into `expectedCourses` / `expectedInstructor`.
3. Write 2–4 `expectedCharacteristics` describing a good outcome.
4. Set `difficulty` and `category`.
5. Re-run eval and compare experiments in the dashboard.
