# ARK - Multi-Agent Repository

Dieses Repository folgt einem strukturierten Multi-Agent/Multi-Tool Workflow.

## Repository-Struktur

```
├── agents.md              # Verbindliche Workflow-Regeln
├── tools/                 # Tool-spezifische Bereiche
│   ├── antigravity/       # Antigravity Tool
│   ├── chatgpt/          # ChatGPT Tool  
│   ├── kiro/             # KIRO Tool
│   └── code-agent/       # Code-Agent Tool
├── core/                 # Kern-Logik und gemeinsame Libraries
├── docs/                 # Zentrale Dokumentation
└── .github/workflows/    # CI/CD Workflows
```

## Wichtige Regeln

- **Kein direkter Push nach `main`** - nur via Pull Request
- **Tool-Isolation** - jedes Tool arbeitet nur in seinem eigenen Ordner
- **Branch-Namespaces** - `tool/<agent_name>/<topic>`
- **Path-Policy** - automatische Durchsetzung via GitHub Actions

Siehe `agents.md` für vollständige Regeln und Workflows.
