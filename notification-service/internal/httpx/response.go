// Package httpx berisi helper response HTTP dengan format yang sama dengan API Services.
package httpx

import (
	"encoding/json"
	"net/http"
)

type errorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// WriteError menulis { "error": { "code", "message" } }. Pesan selalu teks standar HTTP,
// sama seperti API Services untuk 401/403/500/503.
func WriteError(w http.ResponseWriter, status int, code string) {
	var body errorBody
	body.Error.Code = code
	body.Error.Message = http.StatusText(status)
	WriteJSON(w, status, body)
}

func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
