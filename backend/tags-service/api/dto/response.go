package dto

import (
	"encoding/json"
	"net/http"
	"fmt"
)

// HTTPResponse HTTP Response template used for REST API responses
type HTTPResponse struct {
	Status  int
	Message string
	Content *[]TagResponse
}

// NewHTTPResponse Create a new HTTPResponse object
func NewHTTPResponse(status int, message string, content *[]TagResponse) *HTTPResponse {
	return &HTTPResponse{
		Status:  status,
		Message: message,
		Content: content,
	}
}

// SendResponse prepare and send http json response
func SendResponse(writer http.ResponseWriter, httpResponse *HTTPResponse) {
	responseJSON, _ := json.Marshal(httpResponse)
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(httpResponse.Status)
	writer.Write(responseJSON)
}

func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.WriteHeader(statusCode)
	err := json.NewEncoder(w).Encode(data)
	if err != nil {
		fmt.Fprintf(w, "%s", err.Error())
	}
}

func ERROR(w http.ResponseWriter, statusCode int, err error) {
	if err != nil {
		JSON(w, statusCode, struct {
			Error string `json:"error"`
		}{
			Error: err.Error(),
		})
		return
	}
	JSON(w, http.StatusBadRequest, nil)
}