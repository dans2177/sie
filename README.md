# 🎓 SIE Master

A **premium AI-powered study dashboard** for passing the **Securities Industry Essentials (SIE)** exam with flying colors.

> Built with React + TypeScript + Claude Opus 4.7 | Deployed on Vercel with Blob Storage | Dark Mode | Quiz Mode | Progress Tracking

## ✨ Features

### 📚 Complete SIE Coverage
- **30+ Math Equations** - Bond pricing, NPV/IRR, yields, options, duration, convexity
- **Regulatory Content** - SEC rules, insider trading, fiduciary duties, AML/KYC
- **Ethics & Compliance** - Advertising rules, customer suitability, conflict of interest
- **Market Knowledge** - Products, structures, derivatives, tax considerations

### 🤖 AI-Powered Tutor
- **Claude Opus 4.7** with 200K context window for deep, expert explanations
- **Streaming responses** for real-time feedback
- **Smart context management** to optimize token usage
- Ask anything about SIE exam topics and get detailed, step-by-step solutions

### 🎯 Interactive Quiz Mode
- **AI-Generated Quizzes** - 10 questions per quiz across all topics
- **3 Difficulty Levels** - Basic, Intermediate, Advanced
- **Instant Scoring** - Get results with detailed feedback
- **Mistake Review** - Learn from wrong answers with explanations
- **Progress Analytics** - Track performance over time

### 📊 Progress Tracking & Storage
- **Vercel Blob Storage** - Cloud sync with localStorage fallback
- **Quiz History** - Track all quiz attempts and scores
- **Performance Analytics** - See mastered topics and weak areas
- **Offline Mode** - Study without internet (localStorage)

### 📖 Study Resources
- **Tough Spots** - Common misconceptions and how to avoid them
- **Equation Cheatsheet** - Searchable, categorized, with examples
- **Learning Dashboard** - Real-time progress metrics
- **Dark Mode** - Easy on the eyes for marathon study sessions

### 🎨 Premium UI/UX
- **Modern Dashboard** - Gradient headers, smooth animations
- **3-Column Grid Layout** - Cheatsheet | Chat | Resources
- **Dark/Light Mode** - Toggle with localStorage persistence
- **Mobile Responsive** - Study on any device
- **Fast & Smooth** - Optimized performance (350KB bundle)

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

- **React 18** - Modern UI framework
- **TypeScript** - Full type safety
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Beautiful styling
- **Claude SDK** - AI integration with Opus 4.7
- **Vercel Blob** - Serverless file storage
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization

## 🚀 Deploy to Vercel (1-Click)

### Option 1: Vercel CLI
```bash
npm install -g vercel
vercel
# Follow prompts, add VITE_ANTHROPIC_API_KEY in Vercel dashboard
```

### Option 2: GitHub Integration
1. Push code to GitHub
2. Connect repo to Vercel (vercel.com)
3. Add `VITE_ANTHROPIC_API_KEY` environment variable
4. Deploy! 🚀

### Option 3: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import GitHub repository
4. Add environment variables
5. Deploy

**That's it!** Your app is live on `your-app.vercel.app`

### Environment Setup on Vercel
1. Go to Project Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY` with your Claude API key
3. Add `VITE_ANTHROPIC_API_KEY` with the same value (allowed and supported)
4. Set `VITE_ENABLE_BROWSER_AI_FALLBACK=false` for server-only AI in production
5. Redeploy

### Data Persistence with Vercel Blob
- Quiz results, notes, and progress auto-sync to Vercel Blob
- Data is private and encrypted
- Works offline with localStorage fallback
- Set up Vercel Blob tokens in dashboard (optional for advanced use)

## 🎯 Quiz Mode Features

### How It Works
1. **Click "Quiz Mode"** in the header
2. **Select Topic** (bonds, NPV/IRR, yields, options, regulations, ethics, etc.)
3. **Choose Difficulty** (basic, intermediate, advanced)
4. **Answer 10 AI-Generated Questions**
5. **Get Instant Feedback** with detailed explanations
6. **Track Progress** - results saved automatically

### Scoring & Analytics
- Real-time accuracy tracking
- Identify weak topics automatically
- Performance trends over time
- Suggested review topics based on mistakes

## 📱 Data & Storage

### Where Your Data Lives
- **Quiz Results**: Vercel Blob + localStorage
- **Progress Data**: Vercel Blob + localStorage  
- **Study Notes**: Vercel Blob + localStorage
- **Preferences**: localStorage (theme, layout)

### Offline Support
- Full quiz functionality without internet
- Chat buffers questions while offline
- Auto-syncs when connection returns
- No data loss

### Privacy & Security
- Data stored as private Blob files
- No tracking or analytics on personal data
- Can delete all data anytime
- Encrypted in transit

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
