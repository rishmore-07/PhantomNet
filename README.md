# PHANTOMNET — Cyber Deception & Intrusion Reconstruction

> **ORCA CODER Hackathon — Track 03: Cybersecurity & Blockchain**  
> *"Develop a cyber deception system that creates realistic decoy digital assets to detect intruders and trace their movement through a simulated network."*

---

## 🛡️ Project Overview

**PHANTOMNET** is a high-signal cyber-deception prototype engineered to solve a fundamental security challenge: standard perimeter controls suffer from high false-positive rates and delayed detection. PHANTOMNET deploys high-interaction synthetic decoy digital assets—fake files, synthetic credentials, and monitored fake API endpoints—across a simulated enterprise topology.

When the simulated operator touches a decoy asset, the action is appended to a browser-local event log. PHANTOMNET:
1. **Derives alerts** from those simulated events, with the asset and honeytoken id that was touched.
2. **Reconstructs the simulated session path** on the network graph, and draws attempted or blocked moves separately from session relocations.
3. **Sequences the same event log** into an investigation timeline.
4. **Calculates a deterministic score** that caps repeated low-signal actions and weights decoy interactions more heavily.
5. **Exports the derived incident record** as JSON. The export is a simulation dossier, not tamper-proof evidence.

*Note: In accordance with hackathon guidelines, blockchain is a track category name, not a requirement; this prototype focuses strictly on high-signal cyber deception and intrusion reconstruction.*

---

## ⚡ Quick Start

### Prerequisites
- Node.js `v18+` or `v20+` (tested on Node `v24.18.0`)
- `npm`

### Local Development
```bash
# Clone and enter directory
cd orcathon

# Install dependencies
npm install

# Start development server
npm run dev
```
Open your browser at `http://localhost:5173`.

### Production Build & Test
```bash
# Run unit tests
npm run test

# Compile production bundle
npm run build
```

---

## 🎯 90-Second Judge Demonstration Script

1. **00–15s (Problem & Deception Paradigm):**  
   Introduce PHANTOMNET: Traditional detection relies on noisy anomaly heuristics. PHANTOMNET flips the asymmetric advantage to defenders by deploying high-fidelity decoy assets that legitimate users never touch. Clarify that this is an interactive simulation.
2. **15–30s (Environment & Decoys):**  
   Highlight the 6-node network: Gateway (`192.0.2.10`), Web Server (`192.0.2.20`), Workstation (`192.0.2.30`), Finance Server (`192.0.2.40`), Database (`192.0.2.50`), and Decoy Vault (`192.0.2.60`). Show how defender view reveals decoy badges while attacker view presents convincing decoy files (`payroll_Q3_2026.xlsx`), credentials (`DEMO_ONLY_NOT_VALID`), and endpoints (`/backup`).
3. **30–50s (Interactive Attack):**  
   Use **Demonstrate** or the step-by-step controls. The first action toward Finance, the vault, or the database is an attempt and does not relocate the session. A second action on that same route records a simulated move. Then open the payroll decoy, view the synthetic admin token, and present the synthetic credential.
4. **50–70s (Detection and path):**  
   Show the score, the decoy alerts, and the graph. A solid edge is a session move. An amber dashed edge is an attempt that did not relocate the session. The timeline is the same event log.
5. **70–90s (Incident record and export):**  
   Open **Incidents**, export the JSON record, and use **Reset**. Say plainly that this is an in-browser simulation stored in localStorage.

---

## 🏗️ Architecture & Technical Stack

- **Frontend Core:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS with custom SOC dark navy/charcoal palette
- **Network Topology:** `@xyflow/react` (React Flow) with customized nodes and reactive edge states
- **Iconography:** `lucide-react`
- **Testing:** Vitest for deterministic unit testing of state transitions and detection rules
- **State Management:** Append-only simulated event reducer stored in `localStorage`. The log is editable in the browser and is not forensic storage.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/ROADMAP.md`](./docs/ROADMAP.md) for full technical specifications.

---

## 🔒 Security & Limitations Notice

- **Honest Scope:** All hosts, endpoints, tokens, credentials, and attacks are inert simulations.
- **Reserved IP Range:** All documentation IP addresses utilize RFC 5737 TEST-NET blocks (`192.0.2.0/24`, `198.51.100.0/24`).
- **Client-Side Simulation:** Events are persisted per browser session in `localStorage`. No real network traffic, packet inspection, external scanning, or offensive commands are ever generated or captured.
