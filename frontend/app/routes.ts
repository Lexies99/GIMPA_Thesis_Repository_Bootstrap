import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("editor", "routes/editor.tsx"),
  route("paper/:id", "routes/paper.$id.tsx"),
  route("submit-proposal", "routes/submit-proposal.tsx"),
] satisfies RouteConfig;
