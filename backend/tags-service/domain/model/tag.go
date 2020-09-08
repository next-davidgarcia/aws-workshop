package model

import "time"

// Tag model for Tags table
type Tag struct {
	//gorm.Model
	ID        int       `gorm:"column:id;primaryKey;autoIncrement"`
	Name      string    `gorm:"column:name;unique;type:varchar(250)"`
	CreatedAt time.Time `gorm:"column:createdAt;type:datetime"`
	UpdatedAt time.Time `gorm:"column:updatedAt;type:datetime"`
}

// TableName Gorm function to modify model name convention to Solve issue with MySQL RDS that use table name case sensitive
func (Tag) TableName() string {
	return "Tags"
}
