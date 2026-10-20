# Tahap build jalan di arsitektur mesin build; Go cross-compile ke arsitektur target (amd64/arm64)
FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /out/notification-service ./cmd/notification-service

FROM alpine:3.21
# Jalan sebagai user non-root
RUN adduser -D -H app
COPY --from=build /out/notification-service /usr/local/bin/notification-service
USER app
EXPOSE 3001
CMD ["notification-service"]
