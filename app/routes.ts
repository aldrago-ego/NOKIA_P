import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("routes/layout.tsx", [
    index("routes/dashboard.tsx"),
    route("warehouse", "routes/warehouse.tsx"),
    route("smr", "routes/smr.tsx"),
    route("rma", "routes/rma.tsx"),
  ]),
] satisfies RouteConfig;