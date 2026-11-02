# SpriteCut AI web (Next.js standalone) for Cloud Run.
# Build from the repo root:
#   docker build -f apps/web/gcp/Dockerfile \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain -t spritecut-web .
# Runtime secrets (Cloud Run env / Secret Manager): SUPABASE_SERVICE_ROLE_KEY, AI_ENGINE_URL.

FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/intro-video/package.json packages/intro-video/
COPY apps/web/package.json apps/web/
COPY apps/desktop/package.json apps/desktop/
RUN npm ci --workspace @spritecut/web --include-workspace-root
COPY packages/shared packages/shared
COPY apps/web apps/web

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_UI_PREVIEW=0 \
    NEXT_STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @spritecut/web

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=8080
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 8080
CMD ["node", "apps/web/server.js"]
