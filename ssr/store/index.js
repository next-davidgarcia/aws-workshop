export const state = () => ({
    started: false,
    loading: false,
    alert: {
        show: false,
        message: '',
        title: '',
    },
    logged: false,
    user: null,
    token: null,
});

function logout({ commit }, { req, res }) {
    const VueCookies = process.client ? require('vue-cookies') : undefined;
    commit('user', null);
    commit('token', null);
    commit('logged', false);
    if (req !== undefined) {
        // TODO borrar cookiesss
    } else if (VueCookies !== undefined) {
        VueCookies.remove('token');
        VueCookies.remove('user');
    } else {
        console.log('Not init');
    }
}

function init({ commit, state }, { req, res }) {
    if (state.started === false) {
        commit('started', true);
        if (state.forceLogged !== true) {
            try {
                const { user, token } = loadCredentials({ req, res });
                if (user !== null) {
                    commit('user', user);
                }
                if (token !== null) {
                    commit('token', token);
                }
                if (user !== null && token !== null) {
                    commit('logged', true);
                }
            } catch (e) {
                logout({ commit }, req);
            }
        } else {
            commit('logged', true);
            commit('user', {
                name: 'test',
                roles: ['user', 'admin'], // user son los de tienda, admin los admin de la app
            }); // TODO cargar user real
        }
    }
}

function loadCredentials({ req }) {
    const VueCookies = process.client ? require('vue-cookies') : undefined;
    const cookieparser = process.server ? require('cookieparser') : undefined;
    const notLogged = { user: null, token: null };
    console.log('Cargando credenciales');
    if (req !== undefined) {
        if (req.headers !== undefined && req.headers.cookie !== undefined) {
            const parsed = cookieparser.parse(req.headers.cookie);
            if (parsed.user !== undefined && parsed.token !== undefined) {
                try {
                    const user = JSON.parse(parsed.user);
                    const token = parsed.token;
                    console.log('Cargados datos de server', user, token);
                    return { user, token };
                } catch (err) {
                    return notLogged;
                }
            }
        }
    } else if (VueCookies !== undefined) {
        const user = VueCookies.get('user') || null;
        const token = VueCookies.get('token') || null;
        console.log('Cargados datos de cliente');
        return { user, token };
    } else {
        console.log('Not init');
    }
    return notLogged;
}

export const mutations = {
    loading(state, value) {
        state.loading = value;
    },
    alert(state, value) {
        state.alert = value;
    },
    hideAlert(state, hide) {
        state.alert.show = !hide;
    },
    logged(state, value) {
        state.logged = value;
    },
    user(state, value) {
        state.user = value;
    },
    token(state, value) {
        state.token = value;
    },
    started(state, value) {
        state.started = value;
    },
};

export const actions = {
    nuxtServerInit (vuex, server) {
        return init(vuex, server);
    },
    init (vuex, server = {}) {
        return init(vuex, server);
    },
    login({ commit }, { user, token }) {
        const VueCookies = process.client ? require('vue-cookies') : undefined;
        commit('logged', true);
        commit('user', user);
        commit('token', token);
        VueCookies.set('user', JSON.stringify(user), '1h');
        VueCookies.set('token', token, '1h');
    },
    loading({ commit }, value) {
        commit('loading', value);
    },
    alert({ commit }, alert) {
        if (typeof alert === 'string') {
            commit('alert', { message: alert, show: true });
        } else {
            commit('alert', { show: true, ...alert });
        }
    },
    hideAlert({ commit }) {
        commit('hideAlert', true);
    },
    logout,
};

export const getters = {
    loading({ loading }) {
        return loading;
    },
    started({ started }) {
        return started;
    },
    user({ user }) {
        return user;
    },
    logged({ logged }) {
        return logged;
    }
};
