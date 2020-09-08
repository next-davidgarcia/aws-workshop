package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/joho/godotenv"
	"github.com/gorilla/mux"
	"github.com/next-diegotavera/aws-workshop/backend/tags-service/api/route"
	constant "github.com/next-diegotavera/aws-workshop/backend/tags-service/util"
)

func main() {
	router := mux.NewRouter()
	route.SetTagRoutes(router)

	/*
		router.HandleFunc("/api", func(writer http.ResponseWriter, r *http.Request) {
			writer.Header().Set("Content-Type", "application/json")
			writer.WriteHeader(200)

		})
	*/
	var err error
	err = godotenv.Load()
	if err != nil {
		log.Fatalf("Error getting env, not comming through %v", err)
	} else {
		fmt.Println("We are getting the env values")
	}

	server := http.Server{
		Addr:    fmt.Sprintf(":%d", constant.SERVER_PORT),
		Handler: router,
	}

	log.Printf("Running http server on port %d", constant.SERVER_PORT)
	defer server.ListenAndServe()
}
