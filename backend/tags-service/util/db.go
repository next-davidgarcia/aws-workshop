package util

import (
	"fmt"
	"log"
	"os"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
	"github.com/joho/godotenv"
)

// GetConnection gives you a DB connection
func GetConnection() *gorm.DB {
	var err error
	err = godotenv.Load()
	if err != nil {
		log.Fatalf("Error getting env, not comming through %v", err)
	} else {
		fmt.Println("We are getting the env values")
	}

	dataSource := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8&parseTime=True&loc=Local",
		os.Getenv("APP_DB_USR"),
		os.Getenv("APP_DB_PASSWD"),
		os.Getenv("APP_DB_HOST"),
		os.Getenv("APP_DB_PORT"),
	)
	connection, err := gorm.Open("mysql", dataSource)
	connection.Exec(fmt.Sprintf("USE `%s`", os.Getenv("APP_DB_SCHEME")))
	connection.Exec("SET FOREIGN_KEY_CHECKS=0;")

	if err != nil {
		log.Fatal(err)
	}

	return connection
}
