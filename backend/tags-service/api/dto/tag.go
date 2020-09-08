package dto

// TagResponse Tag dto to API response model
type TagResponse struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// TagRequest Tag dto to API request model
type TagRequest struct {
	Name string `json:"name"`
}
