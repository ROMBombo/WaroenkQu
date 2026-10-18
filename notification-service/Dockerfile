FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/notification-service ./cmd/notification-service

FROM alpine:3.20
# Jalan sebagai user non-root
RUN adduser -D -H app
COPY --from=build /out/notification-service /usr/local/bin/notification-service
USER app
EXPOSE 3001
CMD ["notification-service"]
