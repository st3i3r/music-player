import {API_BASE_URL} from './env.js';

function string_to_slug (str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
    return str;
};


const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        Authorization: getCookie('access_token') ? 'JWT ' + getCookie('access_token') : null,
        'Content-Type': 'application/json',
        accept: 'application/json'
    }
});

axiosInstance.interceptors.response.use(
    response => {
        return response;
    },

    async err => {
        const originalRequest = err.config;
        if (err.response.status === 401 && err.response.statusText === 'Unauthorized') {
            const refreshToken = getCookie('refresh_token');

            if (refreshToken) {
                const now = Math.ceil(Date.now() / 1000);
                const tokenParts = JSON.parse(atob(refreshToken.split('.')[1]));

                if (tokenParts.exp > now) {
                    return axiosInstance.post('account/token/refresh/', {refresh: refreshToken}).then(response => {
                        setCookie('access_token', response.data.access);

                        axiosInstance.defaults.headers['Authorization'] = 'JWT ' + getCookie('access_token');
                        originalRequest.headers['Authorization'] = 'JWT ' + getCookie('access_token');

                        return axiosInstance(originalRequest);
                    })
                } else {
                    // Refresh token is expired, login required.
                    axiosInstance.defaults.headers['Authorization'] = null;
                    originalRequest.headers['Authorization'] = null;

                    deleteCookie('refresh_token');
                    deleteCookie('access_token');

                    return axiosInstance(originalRequest);
                }
            } else {
                axiosInstance.defaults.headers['Authorization'] = null;
                return err.response;
            }

            return false;
        }
        return Promise.reject(err);
    }
)

function setCookie(key, value) {
    document.cookie = `${key}=${value}`;
}

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue
}

function deleteCookie(name) {
    let now = new Date();
    const expiredTime = now - 10000;
    now.setTime(expiredTime);
    document.cookie = `${name}=; expires=${now.toUTCString()}`;
}

export {axiosInstance, setCookie, deleteCookie, getCookie, string_to_slug};