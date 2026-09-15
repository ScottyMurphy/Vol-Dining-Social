# Hello Sprint Demo

A small React "Hello World+" app. It greets you based on the time of day, takes your
name through a text input, and hands out a dev-history fun fact each time you click
a button — tracking the click count with `useState` and syncing the page title with
`useEffect`.

## How to run it

1. Create a React app (e.g. `npx create-react-app my-app` or a Vite project: `npm create vite@latest my-app -- --template react`).
2. Replace the contents of `src/App.jsx` with `hello-sprint-demo.jsx`.
3. Run `npm install` then `npm start` (or `npm run dev` for Vite) and open the app in your browser.

## Relevance to the group project

React is a strong fit if our project needs an interactive front end backed by
changing data — component state and effects like the ones here would let us build
dynamic views (dashboards, forms, live-updating pages) that respond to user input
and API calls without reloading the page.
