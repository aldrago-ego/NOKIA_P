import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("routes/layout.tsx", [
    index("routes/Dashboard.tsx"),
    route("warehouse", "routes/warehouse.tsx"),
    route("smr", "routes/smr.tsx"),
    route("rma", "routes/Rma.tsx"),
    route("loans", "routes/loans.tsx"),
    route("traceability", "routes/traceability.tsx"),
    route("clients", "routes/client.tsx"),
  ]),
] satisfies RouteConfig;