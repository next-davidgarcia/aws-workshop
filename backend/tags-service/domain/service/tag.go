package service

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/next-diegotavera/aws-workshop/backend/tags-service/api/dto"
	"github.com/next-diegotavera/aws-workshop/backend/tags-service/domain/model"
	"github.com/next-diegotavera/aws-workshop/backend/tags-service/util"
	constant "github.com/next-diegotavera/aws-workshop/backend/tags-service/util"
)

// FindPostTags Get post tag list from DB
func FindPostTags(postID int) *dto.HTTPResponse {
	log.Printf("Getting all Tags from DB for Post %d", postID)
	tagsResponse := []dto.TagResponse{}
	db := util.GetConnection()
	defer db.Close()

	db.Model(&model.Tag{}).Select("Tags.id, Tags.name").Joins("inner join PostTags on Tags.id = PostTags.TagId AND PostTags.PostId = ?", postID).Scan(&tagsResponse)
	if len(tagsResponse) == 0 {
		return dto.NewHTTPResponse(http.StatusNotFound, constant.POST_NF_TAG, &[]dto.TagResponse{})
	}
	return dto.NewHTTPResponse(http.StatusOK, constant.API_OK_REQUEST, &tagsResponse)
}

// FindPostTag  Get post tag from DB
func FindPostTag(postID int, tagID int) *dto.HTTPResponse {
	log.Printf("Getting Tag %d from DB of Post %d", tagID, postID)
	tagResponse := dto.TagResponse{}
	db := util.GetConnection()
	defer db.Close()

	tag := &model.Tag{}
	db.Find(&tag, tagID)
	if tag.ID <= 0 {
		return dto.NewHTTPResponse(http.StatusNotFound, constant.TAG_NF_DB, &[]dto.TagResponse{})
	}

	db.Model(&model.Tag{}).Select("Tags.id, Tags.name").Joins("inner join PostTags on Tags.id = PostTags.TagId AND Tags.id = ? AND PostTags.PostId = ?", tagID, postID).Scan(&tagResponse)
	if tagResponse.ID <= 0 {
		return dto.NewHTTPResponse(http.StatusNotFound, constant.POST_NF_TAG, &[]dto.TagResponse{})
	}
	return dto.NewHTTPResponse(http.StatusOK, constant.API_OK_REQUEST, &[]dto.TagResponse{tagResponse})
}

// SavePostTag Save post tag into DB
func SavePostTag(postID int, tagRequest *dto.TagRequest) *dto.HTTPResponse {
	log.Printf("Saving tag into DB for Post %d", postID)
	tagResponse := dto.TagResponse{}
	db := util.GetConnection()
	defer db.Close()

	tagRequest.Name = strings.ToLower(strings.TrimSpace(tagRequest.Name))
	if len(tagRequest.Name) == 0 {
		return dto.NewHTTPResponse(http.StatusBadRequest, constant.TAG_BR_NAME, &[]dto.TagResponse{})
	}
	tag := &model.Tag{}
	db.Where("name = ?", tagRequest.Name).First(&tag)
	if tag.ID <= 0 {
		tag = &model.Tag{
			Name:      tagRequest.Name,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		err := db.Save(&tag).Error
		if err != nil {
			log.Fatal(err)
			return dto.NewHTTPResponse(http.StatusInternalServerError, constant.API_SE_DB, &[]dto.TagResponse{})
		}
	}

	postTag := &model.PostTag{}
	db.Where("PostID = ? AND TagID = ?", postID, tag.ID).First(&postTag)
	if postTag.ID <= 0 {
		postTag := &model.PostTag{
			PostID:    postID,
			TagID:     tag.ID,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		err := db.Save(&postTag).Error
		if err != nil {
			log.Fatal(err)
			db.Delete(&tag)
			return dto.NewHTTPResponse(http.StatusInternalServerError, constant.API_SE_DB, &[]dto.TagResponse{})
		}
	}

	tagResponse.ID = tag.ID
	tagResponse.Name = tag.Name
	return dto.NewHTTPResponse(http.StatusCreated, constant.API_OK_REQUEST, &[]dto.TagResponse{tagResponse})
}

// RemovePostTag Remove post tag from DB
func RemovePostTag(postID int, tagID int) *dto.HTTPResponse {
	log.Printf("Removing Tag %d from DB for Post %d", tagID, postID)

	db := util.GetConnection()
	defer db.Close()

	tag := &model.Tag{}
	db.Find(&tag, tagID)
	if tag.ID <= 0 {
		return dto.NewHTTPResponse(http.StatusNotFound, constant.TAG_NF_DB, &[]dto.TagResponse{})
	}

	postTag := &model.PostTag{}
	db.Where("PostID = ? AND TagID = ?", postID, tagID).First(&postTag)
	if postTag.ID > 0 {
		err := db.Delete(postTag).Error
		if err != nil {
			log.Fatal(err)
			return dto.NewHTTPResponse(http.StatusInternalServerError, constant.API_SE_DB, &[]dto.TagResponse{})
		}
		return dto.NewHTTPResponse(http.StatusOK, constant.API_OK_REQUEST, &[]dto.TagResponse{})
	}
	return dto.NewHTTPResponse(http.StatusNotFound, constant.POST_NF_TAG, &[]dto.TagResponse{})
}
