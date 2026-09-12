<!-- AI: This README documents the implemented static detector. Keep the creator banner and section order. -->
![Samuel Asher Rivello](documentation/samuel-asher-rivello-banner.png)

# Blockchain Arkade Signet Down Detector

A browser-only React diagnostic that checks Arkade Signet directly, derives a public Signet Arkade address without storing a recovery phrase, and exposes safe public operator reads with their raw response.

## Images

<a href="documentation/screenshot01.png"><img src="documentation/screenshot01.png" width="400" alt="Arkade Signet detector interface" /></a>

## Demo

* [Arkade Signet detector](https://samuelasherrivello.github.io/blockchain-arkade-signet-down-detector/)

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Overview](#project-overview)
3. [Project Details](#project-details)
4. [Resources](#resources)
5. [Credits](#credits)

## Getting Started

Requires Node.js 24 or newer.

### 🛠 Build Project

1. Run `npm ci` from the repository root.
2. Run `npm run build`.

### 🛠 Run Project

1. Run `npm run dev` from the repository root.
2. Open the localhost URL printed by Vite.

### 🛠 Release Version

1. Run `npm test` and `npm run build`.
2. Push `main`; the GitHub Pages workflow deploys the `dist` folder.
3. Create a GitHub release from the verified version tag.

## Project Overview

The React interface is arranged as three `StepComponent` stages: verify the public operator, attach a temporary read-only wallet, then run typical public Arkade operator reads. Each operation displays its returned output and the explicit verdict **Backend reachable: yes** or **Backend reachable: no**. A `yes` requires a reachable response that identifies itself as Signet.

Use **Check Arkade Signet** to call `https://signet.arkade.sh/v1/info` from the current browser. The result distinguishes an unavailable browser request from evidence of an operator-wide outage.

Use **Add wallet & call operation** to enter a recovery phrase with spaces between each word. The phrase is normalized in memory, used to derive a read-only Signet Arkade address, then cleared from the form. It is never persisted, logged, or added to a server request by this project.

### 📝 Documentation

- `README.md`: Setup, deployment, and wallet-handling behavior.

### 📝 Structure

- `src`: React UI, reusable step components, public operator probes, and the read-only wallet operation.
- `test`: Focused Node tests for phrase normalization, operator results, and the three-step React flow.
- `.github/workflows`: GitHub Pages deployment workflow.

## Project Details

The Vite application uses React and the Arkade SDK only in the browser. It first probes the public Signet `/v1/info` endpoint with a 15-second timeout. The third step uses the same verified public response to inspect operator information, Signet identity, fee policy, and session metadata without performing wallet-changing operations. A supplied phrase is not written to local storage or a backend; a temporary read-only SDK wallet derives the public `tark1…` address and is then disposed.

### 📦 AI

- [Codex](https://openai.com/codex/): Assisted implementation and verification.

### 📦 Packages

- [Arkade SDK](https://github.com/arkade-os/sdk): Derives a read-only Signet wallet address in the browser.
- [React](https://react.dev/): Renders the three-step diagnostic interface.
- [Vite](https://vite.dev/): Builds the static GitHub Pages site.

## Resources

- [Arkade documentation](https://docs.arkadeos.com/) - Operator and wallet documentation.
- [Arkade Signet info endpoint](https://signet.arkade.sh/v1/info) - The public operation this detector checks.
- [Best Practices](https://www.SamuelAsherRivello.com/best-practices/) - Procedures prescribed as the most effective.

## Credits

### 💡 Contributors

- Samuel Asher Rivello - Over 25 years of game development XP (2026)

### 💡 Contact

- [LinkedIn.com/in/SamuelAsherRivello](https://Linkedin.com/in/SamuelAsherRivello) ⭐
- [GitHub.com/SamuelAsherRivello](https://github.com/SamuelAsherRivello/)
- [Twitter.com/srivello](https://twitter.com/srivello/)
- Resume / Portfolio: [SamuelAsherRivello.com](http://www.SamuelAsherRivello.com)

### 💡 License

- Provided as-is under the [MIT License](LICENSE).
- Copyright © 2026 Rivello Multimedia Consulting, LLC.
