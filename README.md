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
- `/demo/complete`

Answers are kept in `localStorage` under `lover-lover.discovery-session.v3`. Older v1 and v2 sessions are migrated in place. In development, the Session control shows the live evidence, the payload sent for clarification, the raw model response, and the questions that were kept.

## Clarification model

The browser posts evidence to `/api/discovery/analyze`. The Vite dev server and `vite preview` handle that route and call the provider. The key is read from the environment on the server. It is not a `VITE_` variable, so it is not included in the client bundle.

Create a `.env` file in the project root (see `.env.example`):

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Restart `npm run dev` after changing it. `gpt-4o-mini` is the default when `OPENAI_MODEL` is unset. The model must support structured JSON schema output.

The interviewer instructions live in `src/agent/discoveryInterviewer.v1.ts`.

If the key is missing, or the provider fails, or the response is not valid structured JSON, clarification shows “We've got enough to work with. Let's keep moving.” and the rest of the session stays intact. Nothing in that failure is shown as a brand conclusion.

```bash
npm test
npm run build
npm run fixtures
```

`npm run fixtures` prints the five discovery fixtures through the evidence builder and the question filter, using the checked-in structured responses. `npm run fixtures:live` sends the same evidence to the configured model. That run varies, so the tests stay on the mocked responses.
