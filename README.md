# 🎓 SIE Math & Exam Tutor

A comprehensive AI-powered study app for passing the **Securities Industry Essentials (SIE)** exam with flying colors.

## 🌟 Features

### 📚 Complete SIE Coverage
- **30+ Math Equations** - Bond pricing, NPV/IRR, yields, options, duration, convexity
- **Regulatory Content** - SEC rules, insider trading, fiduciary duties, AML/KYC
- **Ethics & Compliance** - Advertising rules, customer suitability, conflict of interest
- **Market Knowledge** - Products, structures, derivatives, tax considerations

### 🤖 AI-Powered Tutor
- **Claude Opus 4.7** with 200K context window for deep explanations
- **Streaming responses** for real-time feedback
- **Smart context management** to optimize token usage
- Ask anything about SIE exam topics and get detailed, step-by-step explanations

### 📖 Study Resources
- **Tough Spots** - Common misconceptions and how to avoid them
- **Equation Cheatsheet** - Searchable, categorized, with variables and examples
- **Learning Progress** - Track topics studied, identify weak areas
- **Suggested Practice** - AI recommends topics to focus on

### 🎨 Responsive UI
- **3-Column Grid Layout** - Cheatsheet | Chat | Resources
- **Dark Mode Support** - Easy on the eyes for long study sessions
- **Mobile Responsive** - Study anywhere
- **Fast & Smooth** - Optimized React + TypeScript build

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Anthropic API key (for Claude access)

### Installation

```bash
# Clone and install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your VITE_ANTHROPIC_API_KEY
```

### Development

```bash
npm run dev
# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
npm run build
npm run preview
```

## 📋 Project Structure

```
src/
├── components/           # React UI components
│   ├── Layout/          # Main 3-column layout
│   ├── Cheatsheet/      # Equation search & display
│   ├── Chat/            # AI chat interface
│   └── Resources/       # Study resources panel
├── lib/
│   ├── api/            # Claude API integration
│   └── content/        # SIE equations & concepts
├── types/              # TypeScript interfaces
└── App.tsx             # Root component
```

## 🔑 Key Components

### MainLayout (3-Column Grid)
- **Left Panel**: Searchable equation cheatsheet with categories
- **Center Panel**: AI chat with streaming responses
- **Right Panel**: Tough spots, tips, and progress tracking

### Equation Database
- **30+ equations** covering all SIE math topics
- **Variables explained** with units
- **Real examples** with step-by-step solutions
- **Common mistakes** for each equation
- **Mnemonics & tips** to remember concepts

### Claude Integration
- **System prompt** includes all SIE content for context
- **Token-aware** message handling (200K context window)
- **Streaming** for real-time responses
- **Error handling** with user-friendly messages

### Tough Spots
- **Common misconceptions** (e.g., YTM vs coupon rate)
- **Detailed explanations** with related equations
- **Frequency indicators** (very common, common, occasional)
- **Quick reference** for exam prep

## 💻 Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **TailwindCSS** - Styling
- **Claude SDK** - AI integration
- **PostCSS** - CSS processing

## 🎯 SIE Exam Topics Covered

### Mathematical Concepts
- Bond pricing and YTM
- Current yield and yield calculations
- Duration (Macaulay & Modified)
- NPV and IRR
- Annuities and perpetuities
- Options (calls & puts)
- Put-call parity

### Regulations & Compliance
- Securities Act of 1933 & 1934
- Insider trading rules
- Fiduciary duties
- Suitability requirements
- AML and KYC procedures
- Advertising compliance
- Disclosure requirements

### Ethics & Professional Standards
- Conflict of interest management
- Customer protection
- Fair dealing
- Communications rules
- Disciplinary process

### Market Knowledge
- Securities types
- Pricing mechanisms
- Derivatives
- Investment vehicles
- Market participants

## 📊 Chat Examples

**Ask about tough concepts:**
```
"Explain the difference between YTM and coupon rate"
"Why does modified duration matter for bond pricing?"
"What's the difference between fiduciary and suitability duty?"
```

**Get help with calculations:**
```
"How do I calculate accrued interest on a bond?"
"Walk me through the NPV calculation"
"Explain put-call parity with an example"
```

**Study guidance:**
```
"What are the most common misconceptions about options?"
"Help me understand insider trading rules"
"Summarize the key differences between these concepts"
```

## 🔐 Security

- API keys stored in `.env` (not committed)
- No sensitive data stored locally
- Input validation on all user messages
- Type-safe API integration

## 📈 Performance

- **Build size**: ~225KB (gzipped: ~69KB)
- **Streaming responses** for fast feedback
- **Lazy loading** of equation database
- **Optimized renders** with React best practices

## 🛠️ Development

### Add New Equations
Edit `src/lib/content/sieContent.ts` and add to the `equations` array.

### Add New Concepts
Add to the `concepts` array with difficulty level and related topics.

### Add Tough Spots
Add to the `toughSpots` array with detailed explanations.

### Extend Chat Features
Modify `src/lib/api/claudeClient.ts` system prompt or enhance message handling in `ChatPanel`.

## 📝 Environment Variables

```
VITE_ANTHROPIC_API_KEY=your-api-key-here
```

Get your API key from [Anthropic Console](https://console.anthropic.com/)

## 🤝 Support

For issues or feature requests, check the documentation or ask the AI tutor in the app!

## 📄 License

This project is provided as-is for educational purposes.

---

**Ready to pass the SIE? Start studying now! 🎓**
