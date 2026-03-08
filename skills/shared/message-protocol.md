# ConstructA2A — Inter-Agent Message Protocol

This document defines the message format that builder-agent (GC) and trade-agent (Sub) use when communicating via `sessions_send`. Both agents MUST follow this protocol.

## Message Format

Every message sent between agents is a JSON block wrapped in a marker:

```
---CONSTRUCT_A2A---
{ ...json payload... }
---END_A2A---
```

The JSON payload always includes:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | Message type (see below) |
| `from` | object | yes | `{ company, role, session_key }` |
| `timestamp` | string | yes | ISO 8601 |
| `project` | object | varies | Project context |
| `payload` | object | yes | Type-specific data |
| `reply_to` | string | no | Session key to reply to (if different from sender) |

## Message Types

### ITB_BROADCAST (GC → Sub)

Invitation to Bid. Sent when a GC wants a sub to bid on a trade package.

```json
{
  "type": "ITB_BROADCAST",
  "from": { "company": "Turner Construction", "role": "gc", "session_key": "gc-session-123" },
  "timestamp": "2026-03-08T10:00:00Z",
  "project": {
    "name": "Riverside Medical Center",
    "location": "Houston, TX",
    "value": 25000000,
    "description": "4-story medical office building"
  },
  "payload": {
    "trade_package_id": "tp-001",
    "trade_name": "Division 23 - HVAC",
    "csi_division": 23,
    "estimated_budget": 3750000,
    "scope_items": ["HVAC ductwork", "Air handling units", "Chilled water piping", "Controls & automation", "Testing & balancing"],
    "drawings": ["M-101", "M-201", "M-301"],
    "specs": ["Section 23 00 00 - HVAC"],
    "bid_due_date": "2026-03-22"
  }
}
```

Expected responses: `BID_SUBMISSION` or `BID_DECLINE`

### BID_SUBMISSION (Sub → GC)

A sub submitting their bid in response to an ITB.

```json
{
  "type": "BID_SUBMISSION",
  "from": { "company": "MechPro Systems", "role": "sub", "session_key": "sub-session-456" },
  "timestamp": "2026-03-15T14:30:00Z",
  "project": { "name": "Riverside Medical Center" },
  "payload": {
    "trade_package_id": "tp-001",
    "trade_name": "Division 23 - HVAC",
    "base_bid": 3580000,
    "line_items": [
      { "description": "HVAC ductwork", "labor": 450000, "material": 520000, "equipment": 130000, "subtotal": 1100000 }
    ],
    "inclusions": ["All HVAC ductwork per plans", "AHU installation and startup", "Controls wiring"],
    "exclusions": ["Electrical power to units", "Insulation by others", "Permits"],
    "qualifications": ["Based on 5-day work week", "Pricing held for 30 days"],
    "schedule": {
      "mobilization_date": "2026-04-15",
      "completion_date": "2026-10-15",
      "lead_time_items": [{ "item": "Air handling units", "weeks": 16 }]
    },
    "bond_provided": true,
    "insurance_meets_requirements": true,
    "emr": 0.82
  }
}
```

### BID_DECLINE (Sub → GC)

Sub declining to bid.

```json
{
  "type": "BID_DECLINE",
  "from": { "company": "MechPro Systems", "role": "sub", "session_key": "sub-session-456" },
  "timestamp": "2026-03-10T09:00:00Z",
  "project": { "name": "Riverside Medical Center" },
  "payload": {
    "trade_package_id": "tp-001",
    "reason": "Current backlog does not allow us to commit to this timeline."
  }
}
```

### NEGOTIATION_OPEN (GC → Sub)

GC opening price negotiation on a submitted bid.

```json
{
  "type": "NEGOTIATION_OPEN",
  "from": { "company": "Turner Construction", "role": "gc", "session_key": "gc-session-123" },
  "timestamp": "2026-03-20T10:00:00Z",
  "project": { "name": "Riverside Medical Center" },
  "payload": {
    "negotiation_id": "neg-001",
    "trade_name": "Division 23 - HVAC",
    "original_bid": 3580000,
    "target_price": 3350000,
    "round": 1,
    "message": "We appreciate your competitive bid. Based on our leveling analysis, we'd like to discuss a target of $3,350,000."
  }
}
```

Expected responses: `NEGOTIATION_COUNTER`, `NEGOTIATION_ACCEPT`, `NEGOTIATION_ESCALATE`

### NEGOTIATION_COUNTER (Sub → GC or GC → Sub)

A counter-offer in an ongoing negotiation.

```json
{
  "type": "NEGOTIATION_COUNTER",
  "from": { "company": "MechPro Systems", "role": "sub", "session_key": "sub-session-456" },
  "timestamp": "2026-03-20T14:00:00Z",
  "project": { "name": "Riverside Medical Center" },
  "payload": {
    "negotiation_id": "neg-001",
    "round": 2,
    "proposed_price": 3488000,
    "message": "Considering current material costs, we can adjust to $3,488,000.",
    "ve_proposal": "Prefabricate assemblies off-site to reduce field labor hours (est. savings: $25,000)"
  }
}
```

### NEGOTIATION_ACCEPT (Either → Either)

Accepting the current price.

```json
{
  "type": "NEGOTIATION_ACCEPT",
  "from": { "company": "MechPro Systems", "role": "sub", "session_key": "sub-session-456" },
  "timestamp": "2026-03-21T09:00:00Z",
  "project": { "name": "Riverside Medical Center" },
  "payload": {
    "negotiation_id": "neg-001",
    "round": 3,
    "accepted_price": 3400000,
    "message": "We accept $3,400,000. Looking forward to working together."
  }
}
```

### NEGOTIATION_ESCALATE (Sub → GC)

Sub escalating to human review (gap too large or too many rounds).

```json
{
  "type": "NEGOTIATION_ESCALATE",
  "from": { "company": "MechPro Systems", "role": "sub", "session_key": "sub-session-456" },
  "timestamp": "2026-03-21T09:00:00Z",
  "project": { "name": "Riverside Medical Center" },
  "payload": {
    "negotiation_id": "neg-001",
    "round": 4,
    "counter_price": 3450000,
    "message": "This gap requires management approval. Our counter of $3,450,000 reflects our minimum."
  }
}
```

### INTENT_TO_AWARD (GC → Sub)

GC notifying sub they've been selected.

```json
{
  "type": "INTENT_TO_AWARD",
  "from": { "company": "Turner Construction", "role": "gc", "session_key": "gc-session-123" },
  "timestamp": "2026-03-25T10:00:00Z",
  "project": { "name": "Riverside Medical Center" },
  "payload": {
    "trade_name": "Division 23 - HVAC",
    "awarded_price": 3400000,
    "message": "Congratulations! Your bid has been selected for award."
  }
}
```

### AWARD_REJECTION (GC → Sub)

GC notifying sub they were not selected.

```json
{
  "type": "AWARD_REJECTION",
  "from": { "company": "Turner Construction", "role": "gc", "session_key": "gc-session-123" },
  "timestamp": "2026-03-25T10:00:00Z",
  "project": { "name": "Riverside Medical Center" },
  "payload": {
    "trade_name": "Division 23 - HVAC",
    "message": "Thank you for your submission. We have selected another subcontractor for this trade package."
  }
}
```

## Parsing Rules

When receiving a message via session:
1. Look for `---CONSTRUCT_A2A---` and `---END_A2A---` markers
2. Parse the JSON between them
3. Route based on `type` field
4. Always validate that `from.session_key` is present for replies

If the message doesn't match this format, treat it as a free-form conversation (the human may be typing directly).
