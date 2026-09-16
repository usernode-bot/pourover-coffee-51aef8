# Stage 1 — compile this app's Tailwind stylesheet.
#
# Runs on every image build (production deploys AND staging previews), so
# public/tailwind.css is always generated from the markup in THIS commit.
# That is why there is no committed CSS artifact to keep in sync and no
# rebuild step for you to remember: add a class, push, it is in the next
# build. tailwindcss lives only in this stage, so the runtime image below
# stays exactly as small as it was.
FROM node:22-alpine AS css
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY tailwind.config.js ./
COPY styles ./styles
COPY public ./public
RUN npm run build

# Stage 2 — the app itself (unchanged apart from the one COPY at the end).
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=1000:1000 . .
# After the source copy so the compiled stylesheet is not overwritten by the
# source tree (which deliberately does not contain one).
COPY --chown=1000:1000 --from=css /build/public/tailwind.css ./public/tailwind.css
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
# Kubernetes enforces runAsNonRoot without supplying a UID. Keep this numeric:
# unlike a symbolic USER, it lets the kubelet verify the image before startup.
USER 1000:1000
CMD ["node", "server.js"]
