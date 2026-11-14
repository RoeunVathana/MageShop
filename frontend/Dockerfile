FROM node:20-alpine AS build

WORKDIR /app

COPY . /app/

RUN if [ -d "/app/frontend" ]; then cp -r /app/frontend/* /app/ && rm -rf /app/frontend /app/backend; fi

RUN npm install

ARG VITE_API_BASE_URL="https://nestjs-api-production-b0523d97.up.railway.app/api/v1"
ARG VITE_APP_URL="https://tyushop.blog"
ARG FRONTEND_BUILD_ID="20261115-nest-api-cutover"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_URL=$VITE_APP_URL

RUN echo "Building frontend bundle ${FRONTEND_BUILD_ID}" && rm -rf /app/dist
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist /app/dist

ENV PORT=3000
EXPOSE 3000

CMD sh -c "serve -s /app/dist -l ${PORT:-3000}"

