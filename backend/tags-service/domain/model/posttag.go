package model

import "time"

// PostTag model for Tag´s post
type PostTag struct {
	//gorm.Model
	ID        int       `gorm:"column:id;primaryKey;autoIncrement"`
	TagID     int       `gorm:"column:TagID"`
	PostID    int       `gorm:"column:PostId"`
	CreatedAt time.Time `gorm:"column:createdAt;type:datetime"`
	UpdatedAt time.Time `gorm:"column:updatedAt;type:datetime"`
}

// TableName Gorm function to modify model name convention to Solve issue with MySQL RDS that use table name case sensitive
func (PostTag) TableName() string {
	return "PostTags"
}
