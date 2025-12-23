# YouTube Content Optimizer - Motia Event-Driven Backend

A powerful, event-driven backend system built with **Motia** that automates YouTube channel analysis, video optimization, and content health monitoring. Uses AI to enhance video titles and descriptions for better SEO and click-through rates.

## 🎯 Project Overview

This application provides a complete workflow for YouTube content creators to:
- **Submit YouTube channels** for analysis via REST API
- **Automatically resolve** channel information from YouTube API
- **Fetch videos** with metadata from subscribed channels
- **Generate AI-enhanced** titles and descriptions using OpenAI
- **Send optimized content** recommendations via email
- **Monitor content health** with weekly automated scans
- **Track job progress** across the entire pipeline

## 🏗️ Architecture

The project is built as an **event-driven system** using [Motia](https://motia.dev) framework with three main workflow patterns:

### Workflow 1: **Title Enhancer** (On-Demand) ✅ COMPLETED
Triggered when a user submits a YouTube channel for optimization:

```
REST API (/submit) 
    ↓ (POST request)
YTSubmitApi (API Step)
    ↓ emit: YTSubmit
ResolveChannel (Event)
    ↓ emit: yt.channel.resolved
fetchVideos (Event)
    ↓ emit: yt.videos.fetched
generateTitles (Event - uses OpenAI)
    ↓ emit: yt.titles.ready
SendTitles (Event - uses Resend)
    ↓ email sent to user with AI suggestions
```

**Status:** ✅ Production-ready. AI-generated suggestions for improved titles, descriptions, and tags are successfully sent to user emails.

### Workflow 2: **Weekly Report** (Scheduled) 🚧 UNDER CONSTRUCTION
Scheduled to run every Monday at 9 AM to monitor content health:

```
contentHealthMonitor (Cron: "0 9 * * 1")
    ↓ emit: content.video.scan
scanVideos (Event) - Fetches video metadata ✅
    ↓ emit: content.video.resolved
analyseVideos (Event) - 🚧 [IN PROGRESS] Analyzing video performance
    ↓ emit: content.video.analysed
Report generation & email 🚧 [PENDING]
```

**Status:** 🚧 In development. Video scanning and metadata collection working. Analysis and email delivery being implemented.

## 📁 Project Structure

```
Motia/
├── steps/                              # All step implementations
│   ├── 01_yt_submit.step.ts           # REST API endpoint - submit channel
│   ├── 02_resolve.step.ts             # Resolve YouTube channel metadata
│   ├── o3_fetchVideo.step.ts          # Fetch videos from resolved channel
│   ├── 04_ai_title_enhance.step.ts    # Generate AI-enhanced titles (OpenAI)
│   ├── 05_resend_mail.step.ts         # Send optimized content via email
│   ├── error_handler.step.ts          # Global error handling
│   └── STEP_2/                        # Weekly monitoring workflow
│       ├── 02_video-scan.step.ts      # Scan channel videos
│       ├── 03_video-analyser.step.ts  # Analyze video performance
│       └── content-health-monitor.step.ts # Cron job - triggers weekly
├── motia.config.ts                    # Motia configuration & plugins
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
├── types.d.ts                         # Auto-generated Motia types
└── README.md                          # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (with npm)
- **YouTube Data API key** (from Google Cloud Console)
- **OpenAI API key** (for AI title generation)
- **Resend API key** (for email sending)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd Motia

# Install dependencies
npm install

# Generate TypeScript types from steps
npx motia generate-types
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# YouTube API (get from Google Cloud Console)
YOUTUBE_API_KEY=your_youtube_api_key_here

# OpenAI API (for AI title generation)
OPEN_AI_API_KEY=your_openai_api_key_here

# Resend API (for email sending)
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=your_verified_email@domain.com
```

### Running the Application

```bash
# Development (with hot reload)
npm run dev

# Production (without hot reload)
npm run start

# Generate types after modifying steps
npx motia generate-types
```

Visit **Workbench** at `http://localhost:3000` to view visual workflow diagram and test endpoints.

Visit **Workbench** at `http://localhost:3000` to view visual workflow diagram and test endpoints.

## 📊 API Endpoints

### POST /submit
**Submit a YouTube channel for optimization**

**Request:**
```json
{
  "channel": "@your_channel_name",
  "email": "creator@example.com"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "job_id": "job_1734234567890"
}
```

**What it does:**
1. Creates a job with unique `job_id`
2. Stores channel configuration in state
3. Emits `YTSubmit` event to start the workflow
4. Returns immediately (async processing)

**Track Progress:**
Monitor the job status in the workflow through the state management system.

## 🔄 Event Flow Details

### Step 1: YTSubmitApi
- **Type:** API (REST endpoint)
- **Path:** `/submit` (POST)
- **Input:** channel name, email
- **Output:** Job ID, 202 status
- **Emits:** `YTSubmit`
- **State:** Stores job metadata and channel config

### Step 2: ResolveChannel
- **Type:** Event (subscribes to `YTSubmit`)
- **Action:** Queries YouTube API to resolve channel name → channel ID
- **Output:** Channel ID, channel name
- **Emits:** `yt.channel.resolved` or `yt.channel.error`
- **State:** Updates job status to "resolved"

### Step 3: fetchVideos
- **Type:** Event (subscribes to `yt.channel.resolved`)
- **Action:** Fetches up to 5 latest videos from the channel
- **Includes:** Title, description, tags, publish date, thumbnail
- **Emits:** `yt.videos.fetched` or `yt.videos.error`
- **State:** Stores video list in job

### Step 4: generateTitles
- **Type:** Event (subscribes to `yt.videos.fetched`)
- **Action:** Uses OpenAI to generate:
  - SEO-optimized video titles
  - Improved descriptions
  - Suggested tags
  - Rationale for changes
- **Emits:** `yt.titles.ready` or `yt.titles.error`
- **State:** Stores AI-generated content in job

### Step 5: SendTitles
- **Type:** Event (subscribes to `yt.titles.ready`)
- **Action:** Formats improved content into HTML email
- **Service:** Sends via Resend email API
- **Recipient:** User's provided email
- **Emits:** `yt.titles.send`
- **State:** Updates job to "completed"

### Step 6: contentHealthMonitor
- **Type:** Cron (scheduled)
- **Schedule:** Every Monday at 9 AM (`"0 9 * * 1"`)
- **Action:** Iterates through all registered channels
- **Config Check:** Respects `monitoringEnabled` flag
- **Limit:** Scans up to `weeklyLimit` videos per channel
- **Emits:** `content.video.scan` for each enabled channel

### Step 7: scanVideos
- **Type:** Event (subscribes to `content.video.scan`)
- **Action:** Fetches recent videos from channel
- **Stores:** Video metadata for analysis
- **Emits:** `content.video.resolved` or `content.video.error`

### Step 8: analyseVideos
- **Type:** Event (subscribes to `content.video.resolved`)
- **Action:** Analyzes video performance metrics
- **Emits:** `content.video.analysed` or `content.video.analysation.error`

## 🔐 State Management

The application uses Motia's **State/Cache** plugin to persist data across async events:

### State Keys:

```typescript
// Job tracking
state.set("job", job_id, {
  job_id,
  channel,
  email,
  status,           // "queued" | "resolving_channel" | "resolved" | "fetching_videos" | "generating_title" | "sending_title_emails" | "completed" | "failed"
  channelId,
  channelName,
  videos,           // Array of video metadata
  createdAt,
  error             // If failed
})

// Channel configuration
state.set("channel_config", channel, {
  channelId,
  channelName,
  email,
  monitoringEnabled,    // Boolean - for weekly monitor
  weeklyLimit,          // Number of videos to scan
  createdAt
})
```

### State Retrieval:
```typescript
const job = await state.get("job", job_id);
const channels = await state.list("channel_config");
```

## 📧 Email Integration

The project uses **Resend** for email delivery:

- **Service:** Resend API (`https://api.resend.com/emails`)
- **Authentication:** Bearer token in Authorization header
- **Sender:** Configured via `FROM_EMAIL` env variable
- **Recipient:** User's email from submission
- **Content:** HTML-formatted improved video titles and descriptions

### Email Template Example:
```
Subject: Your YouTube Videos - AI-Enhanced Titles & Tags

For each video:
- Original Title → Improved SEO Title
- Original Description (2 lines) → Optimized Description
- Suggested Tags (comma-separated)
- Rationale for changes
- Direct YouTube link
```

## 🤖 AI Integration

### OpenAI Integration:
- **Model:** Uses OpenAI API (specify in prompt)
- **Prompt:** SEO optimization expert persona
- **Input:** Video titles, descriptions, existing tags, channel name
- **Output:**
  - Improved YouTube titles (CTR + SEO optimized)
  - Better 2-line descriptions
  - Relevant tag suggestions
  - Brief optimization rationale
- **Constraints:**
  - No clickbait
  - Preserve core topic
  - Non-repetitive, relevant tags
  - Optimized for YouTube recommendations

### Rate Limits:
- Respects OpenAI API rate limits
- Error handling for API failures
- Graceful fallback on API key missing

## 🛠️ Plugins Used

The application leverages Motia plugins configured in `motia.config.ts`:

1. **@motiadev/plugin-endpoint** - HTTP API support
2. **@motiadev/plugin-states** - Persistent state/cache
3. **@motiadev/plugin-logs** - Structured logging
4. **@motiadev/plugin-observability** - Monitoring & metrics
5. **@motiadev/plugin-bullmq** - Event queue (background jobs)

## 🧪 Testing in Workbench

The Motia Workbench provides a visual interface to test your workflows:

1. **Start dev server:** `npm run dev`
2. **Open Workbench:** http://localhost:3000
3. **Test API endpoint:** Use the visual form for `/submit`
4. **Monitor flows:** See event emissions and state changes
5. **Check logs:** View real-time event processing logs

## 📊 Error Handling

Each step includes error handling:

- **YouTube API errors:** Catches missing channel, API limits
- **OpenAI errors:** Handles missing API key, rate limits
- **Email errors:** Resend API failures
- **State errors:** Fallback for missing job data

Errors are:
- Logged via Motia logger
- Stored in job state
- Emitted as error events for downstream handling

## � Current Implementation Status

### ✅ Completed Features
- **Event-Driven Architecture** - Fully async, non-blocking operations
- **Type-Safe** - TypeScript with auto-generated types
- **State Management** - Persistent job tracking across async steps
- **AI-Powered** - OpenAI integration for content optimization
- **Email Delivery** - Resend API integration for sending AI suggestions
- **YouTube API Integration** - Channel & video metadata fetching
- **Visual Workflows** - Workbench UI for monitoring
- **Extensible** - Modular step-based architecture
- **✅ Title Enhancer Workflow** - Complete end-to-end AI title/description/tag suggestions
- **Built-in Observability** - Logging and monitoring with Motia plugins

### 🚧 In Development
- **Weekly Report Workflow** - Video analysis and health monitoring
- **Performance Analytics** - Integration with YouTube Analytics API
- **Report Generation** - Analyzing video performance metrics
- **Weekly Email Reports** - HTML formatted performance reports

## 🚦 Status Tracking

Jobs have the following status lifecycle:

```
queued 
  → resolving_channel 
  → resolved 
  → fetching_videos 
  → generating_title 
  → sending_title_emails 
  → completed (success)
  
  OR → failed (at any step)
```

Check status via state: `state.get("job", job_id)`

## 🔧 Configuration

### motia.config.ts
Configures all plugins and framework settings. Modify here to:
- Add/remove plugins
- Configure plugin options
- Set framework defaults

### .env
Runtime environment variables for API keys and credentials.

### types.d.ts
Auto-generated TypeScript types from all steps. Regenerate after:
- Creating new steps
- Modifying config or emits
- Changing handler signatures

**Command:** `npx motia generate-types`

## 📚 Useful Commands

```bash
npm run dev              # Start dev server with hot reload
npm run start            # Start production server
npm run generate-types   # Regenerate TypeScript types
npm run build            # Build for production
npm run clean            # Remove build artifacts
```

## 🌐 Live Monitoring

Access Motia Workbench at:
- **Local:** http://localhost:3000
- **Features:**
  - Visual workflow diagram
  - Real-time event logs
  - State inspector
  - API endpoint tester
  - Job monitoring

## 📖 Additional Documentation

- **Motia Docs:** https://motia.dev/docs
- **Motia Examples:** https://motia.dev/docs/examples
- **GitHub:** https://github.com/MotiaDev/motia
- **Cursor Rules:** `.cursor/rules/` (detailed implementation guides)

## 🎓 Learning Path

1. **Understanding Motia:** Read [AGENTS.md](./AGENTS.md) and [CLAUDE.md](./CLAUDE.md)
2. **Step Implementation:** Review `steps/` folder to see all patterns
3. **API Integration:** Check `02_resolve.step.ts` for YouTube API patterns
4. **AI Integration:** Study `04_ai_title_enhance.step.ts` for OpenAI usage
5. **Email:** Examine `05_resend_mail.step.ts` for Resend integration
6. **Scheduled Tasks:** Learn from `STEP_2/content-health-monitor.step.ts`

## 🔄 Workflow Patterns

### Request-Response (API Step)
```
REST API → YTSubmitApi → Return 202 → Event emitted → Async processing
```

### Event Chain (Sequential Events)
```
Event A → Event B → Event C → Event D → Event E
```

### Scheduled Execution (Cron)
```
Monday 9 AM → contentHealthMonitor → Multiple events in parallel
```

### Fan-Out Pattern
```
contentHealthMonitor → Multiple "content.video.scan" events (one per channel)
```

## 💡 Future Enhancements

Potential features to add:
- Direct YouTube updates (via YouTube Data API write endpoints)
- Analytics dashboard
- A/B testing for title variations
- Bulk channel management
- Advanced content scheduling
- Integration with social media platforms
- Performance metrics tracking
- User authentication & authorization

## 📞 Support

For issues or questions:
1. Check `.cursor/rules/` for detailed implementation guides
2. Review existing step implementations for patterns
3. Consult Motia documentation at motia.dev/docs
4. Check error logs in Workbench console

---

**Built with Motia** - Event-driven, type-safe backend framework