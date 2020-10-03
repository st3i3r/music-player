const baseURL = 'http://127.0.0.1:8000/api/';

const axiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        Authorization: localStorage.getItem('access_token') ? 'JWT ' + localStorage.getItem('access_token') : null,
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
        console.log(err);
        if (err.response.status === 401 && err.response.statusText === 'Unauthorized') {
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                const now = Math.ceil(Date.now() / 1000);
                const tokenParts = JSON.parse(atob(refreshToken.split('.')[1]));

                if (tokenParts.exp > now) {
                    return axiosInstance.post('account/token/refresh/', {refresh: refreshToken}).then(response => {
                        localStorage.setItem('access_token', response.data.access);

                        axiosInstance.defaults.headers['Authorization'] = 'JWT ' + localStorage.getItem('access_token');
                        originalRequest.headers['Authorization'] = 'JWT ' + localStorage.getItem('access_token');

                        return axiosInstance(originalRequest);
                    })
                } else {
                    // Refresh token is expired, login required.
                    axiosInstance.defaults.headers['Authorization'] = null;
                    originalRequest.headers['Authorization'] = null;

                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('access_token');

                    return axiosInstance(originalRequest);
                }
            } else {
                axiosInstance.defaults.headers['Authorization'] = null;
                return err.response;
            }

            return false;
        }
        console.log('Unknown errors', err);
        return Promise.reject(err);
    }
)

export default axiosInstance;