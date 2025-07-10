# PointFlex Mobile

This folder contains the React Native application for PointFlex.

## Setup

1. Install dependencies in the root of the project (React Native project files are minimal at the moment).
2. Copy `.env.example` to `.env` and update `API_BASE_URL` with the URL of your backend.
   For Android emulators use `http://10.0.2.2:5000/api` if the backend runs on your host machine.

```
cp .env.example .env
# edit .env
```

The value is read in `mobile/src/api/client.ts` to configure Axios.

## Running the app

Create a React Native project (e.g. using `npx react-native init`) or integrate these
sources into your existing one, then run the usual commands:

```
npm install
npx react-native run-android   # or run-ios
```

This repository currently provides only the shared sources and API client
implementation.
