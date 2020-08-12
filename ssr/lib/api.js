import axios from 'axios';
const apiUrl = process.env.API_URL;

export default {
    getPosts: async (page = 1, size = 10) => {
        try {
            const url = `${ apiUrl }/posts?page=${ page }&size=${ size }`;
            const { data } = await axios.get(url);
            if (data.code === 200) {
                const { pages, total } = data;
                return { posts: data.data, pages, total };
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            throw new Error('Error de comunicación');
        }
    },
    getPost: async (slug) => {
        try {
            const url = `${ apiUrl }/posts/${ slug }`;
            const { data } = await axios.get(url);
            if (data.code === 200) {
                return data.data;
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            throw new Error('Error de comunicación');
        }
    },
    createPost: async ({ post }) => {
        try {
            const url = `${ apiUrl }/posts`;
            const { data } = await axios.post(url, post);
            if (data.code === 201) {
                return data.data;
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            console.log(e);
            throw new Error('Error de comunicación');
        }
    },
    updatePost: async ({ post }) => {
        try {
            const url = `${ apiUrl }/posts/${ post.id }`;
            const { data } = await axios.put(url, post);
            if (data.code === 202) {
                return data.data;
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            throw new Error('Error de comunicación');
        }
    },
    deletePost: async ({ id }) => {
        try {
            const url = `${ apiUrl }/posts/${ id }`;
            const { data } = await axios.delete(url);
            if (data.code === 202) {
                return data.data;
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            throw new Error('Error de comunicación');
        }
    }
};
