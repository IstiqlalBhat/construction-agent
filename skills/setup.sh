#!/bin/bash
# ConstructA2A — Agent Setup Script
# Run this to initialize your local agent data directory.
# The skill will also do this on first run, but this pre-creates the structure.

set -e

AGENT_DIR="$HOME/.construct-agent"

echo "🏗️  ConstructA2A Agent Setup"
echo "=========================="
echo ""

# Create directory structure
mkdir -p "$AGENT_DIR/cost-data"
mkdir -p "$AGENT_DIR/projects"
mkdir -p "$AGENT_DIR/opportunities"
mkdir -p "$AGENT_DIR/bids"

# Check if identity already exists
if [ -f "$AGENT_DIR/identity.yaml" ]; then
  echo "✅ Identity already configured at $AGENT_DIR/identity.yaml"
  echo "   (Your agent will read this on startup)"
  echo ""
else
  echo "📝 No identity found. Your agent will ask you to set up on first run."
  echo "   Or copy and fill out the template:"
  echo "   cp skills/shared/identity-template.yaml $AGENT_DIR/identity.yaml"
  echo ""
fi

# Create contacts file if missing
if [ ! -f "$AGENT_DIR/contacts.yaml" ]; then
  cat > "$AGENT_DIR/contacts.yaml" << 'EOF'
# Known agent contacts.
# Add other agents you want to communicate with.
#
# For GCs: add your subcontractor contacts
# For Subs: add GC contacts you work with
#
# Example:
# - name: "MechPro Systems"
#   session_key: "their-openclaw-session-key"
#   trades: ["HVAC", "Plumbing"]
#   csi_divisions: [22, 23]
#   role: "sub"

contacts: []
EOF
  echo "✅ Created contacts.yaml (add your agent contacts here)"
else
  echo "✅ Contacts file exists"
fi

# Create starter cost data if missing
if [ ! -f "$AGENT_DIR/cost-data/labor-rates.json" ]; then
  cat > "$AGENT_DIR/cost-data/labor-rates.json" << 'EOF'
{
  "note": "Add your actual labor rates. The agent uses these for bid pricing.",
  "rates": {
    "journeyman": 85,
    "apprentice": 55,
    "foreman": 105,
    "superintendent": 125
  },
  "burden_multiplier": 1.35,
  "overtime_multiplier": 1.5
}
EOF
  echo "✅ Created starter labor-rates.json (update with your actual rates)"
fi

if [ ! -f "$AGENT_DIR/cost-data/material-rates.json" ]; then
  cat > "$AGENT_DIR/cost-data/material-rates.json" << 'EOF'
{
  "note": "Add your material costs. The agent uses these for bid pricing.",
  "pricing_date": "",
  "items": {}
}
EOF
  echo "✅ Created starter material-rates.json (update with your actual costs)"
fi

echo ""
echo "📂 Agent data directory: $AGENT_DIR"
echo ""
echo "Next steps:"
echo "  1. Install the skill in OpenClaw:"
echo "     - For GCs:  Add the builder-agent skill"
echo "     - For Subs: Add the trade-agent skill"
echo ""
echo "  2. Enable agent-to-agent communication in your OpenClaw config:"
echo "     Set tools.agentToAgent.enabled = true"
echo ""
echo "  3. Start your agent and it will guide you through identity setup."
echo ""
echo "  4. Exchange session keys with other agents to start communicating."
echo "     Your session key is shown when you start your OpenClaw agent."
echo ""
