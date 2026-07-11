# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Install goose migration tool in builder
RUN go install github.com/pressly/goose/v3/cmd/goose@v3.24.3

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Migration stage - minimal alpine with only goose binary
FROM alpine:latest AS migrator

WORKDIR /migrations

# Add ca-certificates for database SSL connections
RUN apk --no-cache add ca-certificates

# Copy goose binary and migrations from builder
COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY --from=builder /app/migrations ./

# Set entrypoint to goose
ENTRYPOINT ["goose"]

# Runtime stage - optimized image without goose (~20MB)
FROM alpine:latest

# Add ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy only the binary
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
