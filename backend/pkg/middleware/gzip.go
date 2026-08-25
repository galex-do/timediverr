package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
)

// gzipResponseWriter wraps http.ResponseWriter to transparently gzip the body.
type gzipResponseWriter struct {
	http.ResponseWriter
	writer io.Writer
}

func (w *gzipResponseWriter) Write(b []byte) (int, error) {
	return w.writer.Write(b)
}

// Gzip middleware compresses JSON/text responses when the client advertises
// support via Accept-Encoding. Large list endpoints (e.g. /api/events) embed
// a lot of repeated tag data across events, which gzip's dictionary handles
// very efficiently — typically shrinking multi-MB JSON payloads by 80%+.
func Gzip() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("Content-Encoding", "gzip")
			w.Header().Add("Vary", "Accept-Encoding")

			gz := gzip.NewWriter(w)
			defer gz.Close()

			next.ServeHTTP(&gzipResponseWriter{ResponseWriter: w, writer: gz}, r)
		})
	}
}
