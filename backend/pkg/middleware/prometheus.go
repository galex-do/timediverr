package middleware

import (
	"historical-events-backend/pkg/metrics"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{w, http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func normalizePath(path string) string {
	parts := strings.Split(path, "/")
	for i, part := range parts {
		if isNumericOrUUID(part) {
			parts[i] = "{id}"
		}
	}
	return strings.Join(parts, "/")
}

func isNumericOrUUID(s string) bool {
	if _, err := strconv.Atoi(s); err == nil {
		return true
	}
	if len(s) == 36 && strings.Count(s, "-") == 4 {
		return true
	}
	return false
}

func Prometheus(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		metrics.HttpRequestsInFlight.Inc()
		defer metrics.HttpRequestsInFlight.Dec()

		start := time.Now()
		rw := newResponseWriter(w)

		next.ServeHTTP(rw, r)

		duration := time.Since(start).Seconds()
		normalizedPath := normalizePath(r.URL.Path)
		status := strconv.Itoa(rw.statusCode)

		metrics.HttpRequestsTotal.WithLabelValues(r.Method, normalizedPath, status).Inc()
		metrics.HttpRequestDuration.WithLabelValues(r.Method, normalizedPath).Observe(duration)

		if rw.statusCode >= 400 {
			errorType := "client_error"
			if rw.statusCode >= 500 {
				errorType = "server_error"
			}
			metrics.ApiErrorsTotal.WithLabelValues(errorType, normalizedPath).Inc()
		}
	})
}
