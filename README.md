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

Answers are kept in `localStorage` under `lover-lover.discovery-session.v2`. A v1 session is migrated in place. In development, the Session control shows the live evidence, including spectrum, visual, colour, type, and imagery. A derived visual signal is computed for inspection only and is not stored.
