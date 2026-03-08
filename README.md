# ConstructA2A

Peer-to-peer AI agents for construction procurement. A General Contractor runs one agent on their laptop, a Subcontractor runs another on theirs. The agents negotiate autonomously — scope detection, bid generation, price negotiation, contract award — with the human approving every major decision.

Built on [OpenClaw](https://github.com/openclaw/openclaw) skills + a Next.js dashboard backed by Supabase and Google Gemini.

## How It Works

```
GC's Laptop                              Sub's Laptop
┌─────────────────────┐                  ┌─────────────────────┐
│  OpenClaw Agent     │  sessions_send   │  OpenClaw Agent     │
│  ┌───────────────┐  │ ──────────────>  │  ┌───────────────┐  │
│  │ builder-agent │  │                  │  │  trade-agent  │  │
│  │    skill      │  │ <──────────────  │  │    skill      │  │
│  └───────────────┘  │  sessions_send   │  └───────────────┘  │
│                     │                  │                     │
│  Project files      │                  │  Cost data          │
│  Budgets            │                  │  Labor rates        │
│  Specs & drawings   │                  │  Past bids          │
│                     │                  │                     │
│  Human reviews      │                  │  Human reviews      │
│  & approves         │                  │  & approves         │
└─────────────────────┘                  └─────────────────────┘
```

**The GC agent:**
1. Reads the GC's local project files (specs, budgets, drawings)
2. Detects which CSI trade divisions the project needs
3. Sends Invitations to Bid to sub agents via `sessions_send`
4. Receives bids, levels and ranks them, presents comparison to the human
5. Negotiates price with the sub's agent
6. Awards the contract

**The Sub agent:**
1. Receives ITBs from GC agents
2. Evaluates fit using the sub's local data (capacity, backlog, rates)
3. Builds a competitive bid from the sub's actual cost data
4. Shows the bid to the human for approval before sending
5. Negotiates with hard guardrails protecting profitability (max 15% discount, 8% min margin)

**Human-in-the-loop at every major decision:** sending ITBs, submitting bids, every negotiation response, awarding contracts.

## Project Structure

```
construction-procurement/
├── skills/                          # OpenClaw skills (the agent system)
│   ├── builder-agent/               # GC agent skill
│   │   ├── SKILL.md                 # Agent instructions & workflows
│   │   ├── references/
│   │   │   └── trade-definitions.md # CSI MasterFormat divisions
│   │   └── scripts/
│   │       └── score-bids.ts        # Bid scoring calculator
│   ├── trade-agent/                 # Sub agent skill
│   │   ├── SKILL.md                 # Agent instructions & workflows
│   │   ├── references/
│   │   │   └── negotiation-guardrails.md
│   │   └── scripts/
│   │       └── calculate-negotiation.ts
│   ├── shared/
│   │   ├── message-protocol.md      # A2A message format spec
│   │   └── identity-template.yaml   # Agent identity config template
│   ├── setup.sh                     # Creates ~/.construct-agent/ directory
│   └── openclaw-config-example.json # OpenClaw config for A2A
│
├── src/                             # Next.js web dashboard
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── gc/page.tsx              # GC dashboard
│   │   ├── sub/page.tsx             # Sub dashboard
│   │   └── api/                     # REST API routes
│   └── lib/
│       ├── agents/                  # In-process agent classes (dashboard mode)
│       ├── ai/                      # Gemini AI integration
│       ├── a2a/                     # A2A protocol helpers
│       ├── store.ts                 # Supabase data layer
│       └── supabase/                # Supabase client setup
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # 10 tables, enums, RLS policies
│   └── seed.sql                     # Demo data (1 GC + 6 subs)
│
└── package.json
```

## Quick Start: OpenClaw Agents (Peer-to-Peer)

This is the primary mode. Each person runs their own agent.

### Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed
- Node.js 18+

### 1. Set Up Your Agent

```bash
# Create the local data directory
./skills/setup.sh
```

This creates `~/.construct-agent/` with the directory structure your agent uses for persistent state.

### 2. Install the Skill

If you are a **General Contractor**:
```
# In OpenClaw, add the builder-agent skill
# Point it to skills/builder-agent/
```

If you are a **Subcontractor**:
```
# In OpenClaw, add the trade-agent skill
# Point it to skills/trade-agent/
```

### 3. Enable Agent-to-Agent Communication

Add to your OpenClaw config (see `skills/openclaw-config-example.json`):

```json
{
  "tools": {
    "agentToAgent": {
      "enabled": true,
      "allow": ["main"]
    }
  }
}
```

### 4. First Run

Start your OpenClaw agent. On first interaction it will:
- Ask for your company details (name, trades, service area, etc.)
- Create your identity at `~/.construct-agent/identity.yaml`
- Set up your contacts list

### 5. Connect with Other Agents

Exchange OpenClaw session keys with your counterparts (GCs and Subs) and add them as contacts:

```
> add contact MechPro Systems session:abc123 trades:HVAC,Plumbing
```

### 6. Start Procuring

**As a GC:**
```
> I have a new project. Riverside Medical Center in Houston, TX.
> $25M, 4-story medical office building.
```

The agent detects trade scopes, sends ITBs to your sub contacts, collects bids, and walks you through leveling, negotiation, and award.

**As a Sub:**

Your agent automatically receives ITBs, evaluates them, and asks you whether to bid. Point it to your cost data for more accurate pricing:

```
> Use my rates from ~/Documents/labor-rates-2026.xlsx
```

## Quick Start: Web Dashboard (Standalone Demo)

The Next.js dashboard runs both agents in-process with Supabase for data and Gemini for AI. Useful for demos and testing without OpenClaw.

### Prerequisites

- Node.js 18+
- Supabase project (or local Supabase via `npx supabase start`)
- Google Gemini API key (optional, falls back to deterministic logic)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key          # Optional
```

### 3. Set Up Database

Run the migration in your Supabase SQL editor:

```sql
-- Copy and run supabase/migrations/001_initial_schema.sql
-- Then run supabase/seed.sql for demo data
```

### 4. Run

```bash
npm run dev
```

| Page | URL |
|------|-----|
| Landing page | http://localhost:3000 |
| GC Dashboard | http://localhost:3000/gc |
| Sub Dashboard | http://localhost:3000/sub |

## Procurement Pipeline

```
Scope Detection --> Sub Discovery --> ITB Broadcast --> Bid Collection
       |                                                     |
  Trade Packages                                        Bid Leveling
  (CSI divisions)                                      (score & rank)
                                                             |
                                                        Negotiation
                                                     (multi-round A2A)
                                                             |
                                                          Award
```

### CSI Trade Divisions

| Division | Trade | Budget % |
|----------|-------|----------|
| 3 | Concrete | 12% |
| 5 | Structural Steel | 8% |
| 7 | Roofing & Waterproofing | 4% |
| 8 | Doors & Windows | 5% |
| 9 | Finishes | 10% |
| 22 | Plumbing | 6% |
| 23 | HVAC | 15% |
| 26 | Electrical | 14% |
| 31 | Earthwork | 5% |
| 32 | Site Improvements | 4% |

Trade selection scales with project value: <$5M gets 3 trades, $5-10M gets 5, $10-50M gets 7, >$50M gets all 10.

### Negotiation Guardrails

The Sub agent enforces hard limits protecting the subcontractor's profitability:

| Rule | Value |
|------|-------|
| Max discount from original bid | 15% |
| Minimum acceptable margin | 8% (accept if offer >= 92% of bid) |
| Escalation threshold | After 4 rounds, requires human review |
| Counter split ratio | 60/40 toward original bid |

These are non-negotiable. The GC agent cannot talk the Sub agent below these floors.

## A2A Message Protocol

Agents communicate using structured JSON messages wrapped in markers:

```
---CONSTRUCT_A2A---
{
  "type": "ITB_BROADCAST",
  "from": {
    "company": "Turner Construction",
    "role": "gc",
    "session_key": "..."
  },
  "timestamp": "2026-03-08T10:00:00Z",
  "project": {
    "name": "Riverside Medical Center",
    "location": "Houston, TX",
    "value": 25000000
  },
  "payload": {
    "trade_name": "Division 23 - HVAC",
    "estimated_budget": 3750000,
    "scope_items": [
      "HVAC ductwork",
      "Air handling units",
      "Chilled water piping"
    ],
    "bid_due_date": "2026-03-22"
  }
}
---END_A2A---
```

**Message types:**

| Type | Direction | Purpose |
|------|-----------|---------|
| `ITB_BROADCAST` | GC -> Sub | Invitation to bid on a trade package |
| `BID_SUBMISSION` | Sub -> GC | Completed bid with pricing, scope, schedule |
| `BID_DECLINE` | Sub -> GC | Declining to bid with reason |
| `NEGOTIATION_OPEN` | GC -> Sub | Opening price negotiation |
| `NEGOTIATION_COUNTER` | Either | Counter-offer with new price |
| `NEGOTIATION_ACCEPT` | Either | Accepting the current price |
| `NEGOTIATION_ESCALATE` | Sub -> GC | Escalating to human review |
| `INTENT_TO_AWARD` | GC -> Sub | Notifying the winning sub |
| `AWARD_REJECTION` | GC -> Sub | Notifying subs not selected |

Full spec: [skills/shared/message-protocol.md](skills/shared/message-protocol.md)

## Local Data Directory

Each agent stores persistent state at `~/.construct-agent/`:

```
~/.construct-agent/
├── identity.yaml              # Company profile
├── contacts.yaml              # Known agent contacts
├── cost-data/                 # Your rates (Sub agents)
│   ├── labor-rates.json
│   └── material-rates.json
├── projects/                  # Project files (GC agents)
│   └── <project>/
│       ├── project.json
│       ├── trade-packages.json
│       ├── bids/
│       │   └── <company>.json
│       ├── negotiations/
│       │   └── <company>.json
│       └── leveling/
│           └── <trade>.json
├── opportunities/             # Received ITBs (Sub agents)
│   └── <project>/
│       ├── itb.json
│       └── evaluation.json
└── bids/                      # Submitted bids (Sub agents)
    └── <project>/
        └── <trade>/
            ├── bid.json
            └── negotiation.json
```

## Database Schema (Dashboard Mode)

The web dashboard uses 10 Supabase tables:

| Table | Purpose |
|-------|---------|
| `companies` | GCs and Subs with prequalification data |
| `projects` | Construction projects with status tracking |
| `trade_packages` | CSI division scopes per project |
| `bids` | Submitted bids with pricing and compliance |
| `bid_line_items` | Labor/material/equipment breakdown per scope item |
| `lead_time_items` | Long-lead procurement items |
| `negotiation_sessions` | Price negotiation tracking |
| `negotiation_rounds` | Individual rounds with proposals and messages |
| `a2a_messages` | Full audit log of agent-to-agent communication |
| `agent_cards` | Agent identity and capabilities registry |

Full schema: [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent runtime | [OpenClaw](https://github.com/openclaw/openclaw) |
| Agent communication | OpenClaw `sessions_send` |
| Web dashboard | Next.js 16, React 19, Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| AI | Google Gemini (`gemini-2.5-flash-preview-05-20`) |
| Validation | Zod |
| Language | TypeScript |

## License

MIT
