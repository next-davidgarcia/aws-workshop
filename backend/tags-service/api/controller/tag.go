package controller

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/next-diegotavera/aws-workshop/backend/tags-service/api/dto"
	"github.com/next-diegotavera/aws-workshop/backend/tags-service/domain/service"
	constant "github.com/next-diegotavera/aws-workshop/backend/tags-service/util"
)

// GetTag GET HTTP Method to get tags
func GetTag(writer http.ResponseWriter, request *http.Request) {
	params := mux.Vars(request)
	log.Printf("HTTP Request to get Tag %s for Post %s", params["tagId"], params["postId"])

	postID, err := parsePostID(params, writer, request)
	tagID, err := parseTagID(params, writer, request)
	if err == nil {
		httpResponse := service.FindPostTag(postID, tagID)
		dto.SendResponse(writer, httpResponse)
	}
}

// GetTags GET HTTP Method to list tags
func GetTags(writer http.ResponseWriter, request *http.Request) {
	params := mux.Vars(request)
	log.Printf("HTTP Request to list all tags for Post %s", params["postId"])

	postID, err := parsePostID(params, writer, request)
	if err == nil {
		httpResponse := service.FindPostTags(postID)
		dto.SendResponse(writer, httpResponse)
	}
}

// PostTag POST HTTP Method to create tag
func PostTag(writer http.ResponseWriter, request *http.Request) {
	params := mux.Vars(request)
	log.Printf("HTTP Request to create tag for Post %s", params["postId"])

	postID, err := parsePostID(params, writer, request)
	tagRequest := dto.TagRequest{}
	err = parseRequestBody(&tagRequest, writer, request)
	if err == nil {
		httpResponse := service.SavePostTag(postID, &tagRequest)
		dto.SendResponse(writer, httpResponse)
	}
}

// DeleteTag DELETE HTTP Method to remove tag
func DeleteTag(writer http.ResponseWriter, request *http.Request) {
	params := mux.Vars(request)
	log.Printf("HTTP Request to remove Tag %s for Post %s", params["tagId"], params["postId"])

	postID, err := parsePostID(params, writer, request)
	tagID, err := parseTagID(params, writer, request)

	if err == nil {
		httpResponse := service.RemovePostTag(postID, tagID)
		dto.SendResponse(writer, httpResponse)
	}
}

func parsePostID(params map[string]string, writer http.ResponseWriter, request *http.Request) (int, error) {
	postID, err := strconv.Atoi(params["postId"])
	if err != nil {
		log.Fatalln(err)
		dto.SendResponse(writer, dto.NewHTTPResponse(http.StatusBadRequest, constant.POST_BR_ID, &[]dto.TagResponse{}))
		return postID, err
	}
	return postID, nil
}

func parseTagID(params map[string]string, writer http.ResponseWriter, request *http.Request) (int, error) {
	tagID, err := strconv.Atoi(params["tagId"])
	if err != nil {
		log.Fatalln(err)
		dto.SendResponse(writer, dto.NewHTTPResponse(http.StatusBadRequest, constant.TAG_BR_ID, &[]dto.TagResponse{}))
		return tagID, err
	}
	return tagID, nil
}

func parseRequestBody(tagRequest *dto.TagRequest, writer http.ResponseWriter, request *http.Request) error {
	err := json.NewDecoder(request.Body).Decode(&tagRequest)
	if err != nil {
		log.Fatal(err)
		dto.SendResponse(writer, dto.NewHTTPResponse(http.StatusBadRequest, constant.TAG_BR_BODY, &[]dto.TagResponse{}))
		return err
	}

	return nil
}
