import axios from 'axios';
const baseURL = process.env.API_URL;

function getHeaders() {

}

async function request({
  method = 'GET', data = false, url, headers = {},
}) {
    const VueCookies = process.client ? require('vue-cookies') : undefined;
    let token = null;
    if (VueCookies !== undefined) {
        token = VueCookies.get('token') || null;
    }
    const config = {
        url,
        method,
        baseURL,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };
    if (token !== null) {
        config.headers.Authorization = `Bearer ${ token }`;
    }
    if (data !== false) {
        config.data = data;
    }
    try {
        const result = await axios.request(config);
        return result.data;
    } catch (e) {
        if (e.response !== undefined && e.response.status === 401) {
            const error = new Error('Unauthorized');
            error.code = 401;
            throw error;
        }
        if (e.response && e.response.data) {
            const error = new Error(e.response.data.message);
            error.code = e.response.data.code;
            throw error;
        }
        throw e;
    }
}

export default {
    getPosts: async (page = 1, size = 10) => {
        const url = `/posts?page=${ page }&size=${ size }`;
        const { data, total, pages } = await request({ url });
        return { posts: data, pages, total };
    },
    getPost: async (slug) => {
        const url = `/posts/${ slug }`;
        const { data } = await request({ url });
        return data;
    },
    readPost: async (slug) => {
        const url = `/posts/${ slug }/read`;
        const { data } = await request({ url });
        return data;
    },
    analyzePost: async (slug) => {
        const url = `/posts/${ slug }/analyze`;
        const { data } = await request({ url });
        return data;
    },
    createPost: async ({ post }) => {
        const url = `/posts`;
        const { data } = await request({ url, method: 'POST', data: post });
        return data;
    },
    updatePost: async ({ post }) => {
        const url = `/posts/${ post.slug }`;
        const { data } = await request({ url, method: 'PUT', data: post });
        return data;
    },
    deletePost: async ({ id }) => {
        const url = `/posts/${ id }`;
        const { data } = await request({ url, method: 'DELETE' });
        return data;
    },
    login: async ({ email, password }) => {
        const url = `/auth/login`;
        const { data } = await request({ url, method: 'POST', data: { email, password } });
        return data;
    },
    register: async ({ email, password, name, surname }) => {
        const url = `/auth/`;
        const { data } = await request({ url, method: 'POST', data: { email, password, name, middle_name: surname } });
        return data;
    },
};
