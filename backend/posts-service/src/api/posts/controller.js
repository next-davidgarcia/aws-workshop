const { loadModel } = require(__dirname + '/../../models');
const Post = loadModel('Post');
const http = require('http');

function getTags(id,authorization) {
    
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: `/blognext/api/v1/post/${ id }/tags`,
        method: 'GET',
        headers:{
            Authorization: authorization
        }
      }
      
	return new Promise((resolve, reject) => {
		http.get(options, response => {
            let chunks_of_data = [];
            
			response.on('data', (fragments) => {
				chunks_of_data.push(fragments);
			});

			response.on('end', () => {
                let response_body = Buffer.concat(chunks_of_data);
				resolve(JSON.parse(response_body));
			});

			response.on('error', (error) => {
				reject(error);
			});
		});
	});
}

async function makeSynchronousRequest(request,authorization) {
	try {
        let http_promise = getTags(request,authorization);
        let response_body = await http_promise;

		// holds response from server that is passed when Promise is resolved
        return response_body
	}
	catch(error) {
		// Promise rejected
		console.log(error);
	}
}

module.exports.get = async (req) => {
    try {
        const id = req.params.postId;
        const { headers } = req;
        const { authorization } = headers;

        const post = await Post.getBySlugOrId({ IdOrSlug: id });
        const tags = await makeSynchronousRequest(post.id,authorization)
        tags.Content.forEach(function(v){ delete v.id })
        const postTagsValues = tags.Content.map(({ name }) => name)
        post.tags = postTagsValues

        req.response({ data: post });
    } catch (error) {
        req.error({ error });
    }
};

module.exports.del = async (req) => {
    try {
        const id = parseInt(req.params.postId);
        await Post.deletePost({ id });
        req.response({ code: 202 });
    } catch (error) {
        req.error({ error });
    }
};

module.exports.list = async (req) => {
    try {
        const data = await Post.listPost({ query: req.query });
        req.response(data);
    } catch (error) {
        req.error({ error });
    }
};

module.exports.put = async (req) => {
    try {
        const id = parseInt(req.params.postId);
        const data = req.body;
        const post = await Post.updatePost({ data, id });
        req.response({ data: post, code: 202 });
    } catch (error) {
        req.error({ error });
    }
};

module.exports.post = async (req) => {
    try {
        const data = req.body;
        data.UserId = req.user.id;
        const post = await Post.addPost({ data });
        req.response({ data: post, code: 201 });
    } catch (error) {
        console.log(error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            req.response({ code: 412, message: 'Duplicated Slug' });
        } else {
            req.error({ error });
        }
    }
};
