# SmartLens | Multimodal AR Communication System

<p align="center">
  <strong>Bridging language barriers through augmented reality, multimodal interaction, and accessible communication.</strong>
  <br />
  <br />
  <a href="https://ar-smartlens.vercel.app/">
    <img src="https://img.shields.io/badge/Live_Demo-Explore_SmartLens-0A7EA4?style=for-the-badge" alt="Live Demo" />
  </a>
  <a href="https://github.com/vaibhavkumar-h/ar-smartlens">
    <img src="https://img.shields.io/badge/Source_Code-GitHub-181717?style=for-the-badge&logo=github" alt="Source Code" />
  </a>
</p>

## Overview

**SmartLens** is a multimodal augmented-reality (AR) communication software prototype inspired by the concept behind a published Indian patent application for real-time language translation using adaptive sensor fusion.

The project explores how voice interaction, translated text, visual information, and interactive 3D visualization can come together in a unified communication interface. Its long-term vision is to extend this experience to wearable AR glasses, making contextual and multilingual information more accessible in everyday situations.

The current implementation focuses on the software experience, interactive interface, and 3D visualization. Physical AR glasses integration is part of the proposed future development.

**Live application:** https://ar-smartlens.vercel.app/

## The Problem Statement

Communication across languages and accessibility needs remains challenging when people rely on separate tools for translation, speech, text, and contextual information.

Existing digital experiences can require users to switch between applications, read information on a separate screen, or manually translate conversations. These interactions can interrupt the natural flow of communication.

For wearable AR systems, an additional challenge is presenting useful information in a clear, context-aware manner without overwhelming the user.

### The problem SmartLens explores

- **Language barriers:** Helping people understand communication across different languages.
- **Fragmented interactions:** Exploring a unified interface for voice, text, and visual information.
- **Accessible communication:** Investigating alternative ways to present information through text and audio-oriented interaction.
- **Contextual information:** Exploring how digital information could be presented within an AR-inspired visual experience.
- **Wearable integration:** Investigating how a software interface could eventually connect with physical AR hardware.

## The Proposed Solution

SmartLens explores a unified communication interface that brings together multiple interaction modes and an AR-inspired presentation layer.

The software prototype includes an interactive control center, a 3D SmartLens visualization, and interface components representing communication inputs and outputs.

The broader system concept explores how multimodal inputs could be processed and presented as useful information, including translated text and audio-oriented output.

The objective is to develop a foundation for a future wearable communication system while validating the software experience independently.

## Key Features

### Interactive 3D Experience
- Interactive 3D SmartLens model within the web interface.
- Dedicated visualization area integrated into the control center.
- 3D assets loaded from the project's public model directory.

### Multimodal Communication Interface
- Microphone and voice-interaction controls in the dashboard.
- Interface elements for displaying language translation and text output.
- Audio-output-oriented interface elements.
- A structured layout for exploring multiple communication modes.

### AR-Inspired Control Center
- Central 3D visualization area.
- Input controls and communication panels.
- Live-output-inspired information layout.
- Visual styling inspired by futuristic wearable technology.

### Accessibility-Oriented Design
- Explores presenting information through text and audio-oriented interaction.
- Considers multilingual communication and alternative presentation modes.
- Establishes a software foundation for future accessibility-focused workflows.

*Note: The features above describe the prototype's interface and broader design goals. Full real-time translation, adaptive sensor fusion, live device connectivity, and physical AR functionality should not be assumed to be implemented unless verified in the current code.*

## How It Works

The current software experience is organized around an interactive web interface.

```text
User
 |
 v
SmartLens Web Interface
 |
 +----> Communication Input Controls
 |
 +----> Interactive 3D Visualization
 |
 +----> Translation / Text Output Interface
 |
 +----> Audio-Output Interface
```

The broader patent-associated system concept explores a more advanced processing pipeline:

```text
Multimodal Inputs
       |
       v
Input Processing and Recognition
       |
       v
Adaptive Sensor Fusion
       |
       v
Language Processing and Translation
       |
       v
Contextual Text / Audio Output
       |
       v
Potential Wearable AR Presentation
```

The second diagram represents the intended system concept, not a claim that every processing stage is currently implemented in the web application.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Component-based user interface |
| TypeScript | Typed application development |
| Tailwind CSS | Utility-based interface styling |
| Vite | Development server and build tooling |
| GLB | 3D model asset format |
| Reusable React components | Modular interface structure |
| Vercel | Web application deployment |

The repository also contains a `hand_landmarker.task` asset for potential hand-landmark processing workflows. Its presence alone does not imply that a complete hand-tracking feature is active.

## Architecture and Project Structure

```text
ar-smartlens/
├── public/
│   ├── models/
│   │   ├── hand_landmarker.task
│   │   └── smartlens.glb
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── sonar-grid.tsx
│   │   │   └── spotlight.tsx
│   │   ├── SmartLens3D.tsx
│   │   ├── SmartLensControlCenter.tsx
│   │   └── SmartLensScrollReveal.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Run Locally

### Prerequisites

- Node.js with npm
- Git
- A modern web browser

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/vaibhavkumar-h/ar-smartlens.git
```

**2. Enter the project directory**

```bash
cd ar-smartlens
```

**3. Install dependencies**

```bash
npm install
```

**4. Start the development server**

```bash
npm run dev
```

Open the local URL displayed in the terminal, typically `http://localhost:5173`.

### Production Build

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Patent Application and Innovation

SmartLens is associated with the published Indian patent application:

**“Multimodal cross-reality communication system using adaptive sensor fusion for real-time language translation.”**

| Detail | Information |
|---|---|
| Application number | 202611096063 |
| Publication number | IN202611096063 A1 |
| Filing date | 8 August 2026 |
| Publication date | 25 September 2026 |
| Applicant | Chandigarh University |
| Inventors | Vaibhav Kumar, Harshita Kumari, Dr. Ankit Kumar Mittal |

**Official patent record:** [Intellectual Property India — Patent Search](https://iprsearch.ipindia.gov.in/PatentSearch/PatentSearch/ViewApplicationStatus)

Search using application number `202611096063`.

### Relationship Between the Patent and Software

The patent-associated concept explores multimodal communication and adaptive sensor fusion for real-time language translation across physical and digital environments.

The SmartLens software project explores the user-facing side of this vision through an interactive dashboard, 3D visualization, and communication-oriented interface components.

The patent application and the current software implementation are related, but they are not interchangeable: the publication does not establish that all proposed system capabilities have been built or validated.

*The application has been published. This README does not claim that a patent has been granted.*

## Current Status

**Project stage:** Interactive software prototype

| Area | Status |
|---|---|
| Web application | Deployed |
| React and TypeScript interface | Implemented |
| Interactive 3D model | Included in the software project |
| Communication control interface | Present in the prototype |
| End-to-end real-time translation | Requires implementation verification |
| Adaptive sensor-fusion pipeline | Part of the broader system concept |
| Physical AR glasses integration | Future scope |

## Future Roadmap

- Develop and validate end-to-end speech recognition and translation workflows.
- Integrate translation and text-to-speech services where appropriate.
- Investigate computer-vision and contextual recognition capabilities.
- Connect the software to suitable embedded hardware and wearable displays.
- Explore low-latency communication and sensor-fusion architectures.
- Evaluate accessibility, usability, privacy, and reliability in real-world scenarios.

These are proposed development directions, not promises of existing functionality.

## Project Links

- **Live Demo:** https://ar-smartlens.vercel.app/
- **GitHub Repository:** https://github.com/vaibhavkumar-h/ar-smartlens
- **Patent Search:** [Official Indian Patent Office Portal](https://iprsearch.ipindia.gov.in/PatentSearch/PatentSearch/ViewApplicationStatus)

## Author and Acknowledgements

**Vaibhav Kumar**  
Computer Science Engineering | Software Development

This work is associated with a patent application naming Vaibhav Kumar, Harshita Kumari, and Dr. Ankit Kumar Mittal as inventors, with Chandigarh University as the applicant.

## License

No license has been specified for this repository yet. Unless a license is added, do not assume that others have permission to reuse, redistribute, or modify the code.

---

<p align="center">
  <strong>SmartLens — Exploring a more connected, multilingual, and accessible future.</strong>
</p>
