# Lover Lover — Discovery

A guided discovery session for a boutique agency's clients. It collects evidence, preferences, goals, and uncertainties so a media manager can start a better creative conversation. It does not define the client's brand.

## Run

```bash
npm install
npm run dev
```

Open `/demo/start`.

## Routes

- `/demo` redirects to `/demo/start`
- `/demo/start`
- `/demo/business`
- `/demo/audience`
- `/demo/goals`
- `/demo/personality`
- `/demo/spectrum`
- `/demo/visual`
- `/demo/colour`
- `/demo/type`
- `/demo/imagery`
- `/demo/voice`
- `/demo/inspiration`
- `/demo/clarify`
- `/demo/profile`
- `/demo/handover`
- `/demo/complete`

Answers are kept in `localStorage` under `lover-lover.discovery-session.v3`. Older v1 and v2 sessions are migrated in place. In development, the Session control has sections for the session, the evidence, clarification, the profile, and profile versions.

## Clarification model

The browser posts evidence to `/api/discovery/analyze`. The Vite dev server and `vite preview` handle that route and call the provider. The key is read from the environment on the server. It is not a `VITE_` variable, so it is not included in the client bundle.

## Local API setup

1. Copy `.env.example` to `.env.local`
2. Add your OpenAI API key
3. Add your EnsembleData API token
4. Start the development server

```bash
npm run dev
```

The dev server prints `OpenAI: configured` or `OpenAI: not configured`, and the same for EnsembleData. It does not print the values. Both stay on the server. A missing OpenAI key keeps the existing local fallback. A missing EnsembleData token is `not_configured` and does not turn demo social into live data.

Restart `npm run dev` after changing `.env.local`. Model choice lives in `src/config/aiModels.ts`. `OPENAI_MODEL` overrides only the client strategist, which defaults to `gpt-5.6-sol` with high reasoning on the Responses API. Clarification, the profile, and the creative reading default to `gpt-4o-mini` through their own variables, so a strategist change leaves them on the cheaper model. Website research extracts HTML locally and does not call a model.

The interviewer instructions live in `src/agent/discoveryInterviewer.v1.ts`. The profile prompt lives in `src/agent/discoveryProfile.v1.ts`. The browser posts that work to `/api/discovery/profile`.

If the key is missing, or the provider fails, or the response is not valid structured JSON, clarification shows “We've got enough to work with. Let's keep moving.” and the rest of the session stays intact. Nothing in that failure is shown as a brand conclusion.

```bash
npm test
npm run build
npm run fixtures
npm run profiles
```

`npm run fixtures` prints the five discovery fixtures through the evidence builder and the question filter, using the checked-in structured responses. The filter rejects brand-fact and prescriptive wording, drops questions below a usefulness threshold, and keeps at most one question per observation. Five remains a hard cap. `npm run fixtures:live` sends the same evidence to the configured model. That run varies, so the tests stay on the mocked responses.

`npm run profiles` prints a discovery profile for each of those fixtures. The profile is a handover for the media manager. It does not define the brand. If the provider is unavailable, the same screen is assembled directly from the answers. `/demo/handover` is the media-manager view, and it is laid out for browser print.
