> Tag Microservice written in Go to expose tags operations
> REST EndPoints exposeds:
> - GET /blognext/api/v1/posts/{postId}/tags            # List all tag´s post
> - POST /blognext/api/v1/posts/{postId}/tags           # Save or update tag´s post
> - GET /blognext/api/v1/posts/{postId}/tags/{tatId}    # Get a tag´s post
> - DELETE /blognext/api/v1/posts/{postId}/tags/{tatId} # Delete a tag´s post

# PRE-REQUISITES
* Go compiler equals or greater than 1.14 version

* Internet conecction to access and download labraries/dependencies:
    - go mod vendor
* Setup DB connection environment variables in .env file:
    ```.env
    GO_APP_DB_USR=
    GO_APP_DB_PASSWD=
    GO_APP_DB_HOST=
    GO_APP_DB_PORT=
    GO_APP_DB_SCHEME=
    ```

# CREATE PROJECT
* Create tags-service folder in aws-workshop/backend and move to it

* Create the following project structure:
    tags-service
    |
    -- api 
    |   |
    |   -- controller
    |   |
    |   -- dto
    |   |
    |   -- route
    |
    -- domain
    |   |
    |   -- model
    |  |
    |  -- service
    |
    -- util

* Create tag.go and posttag.go in domain/models/ directory
* Write Tags struct to map Tags DB table inside previous go file
* Create db.go and constant.go in util/ directory and code it
* Create response.go and tag.go in api/dto/ directory and code it
* Create tag.go in domain/services/ directory and code it
* Create tag.go in api/controllers/ directory and code it
* Create tag.go in api/routes/ directory and code it
* Create main.go file and write the code to run the app


# RUN Microservice
#### Compile
    ```bash
    go build .
    ```

#### Run with Go
    ```bash
    go run .
    ```