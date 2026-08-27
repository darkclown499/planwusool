import axios from "axios";
import { getCsrfToken, getXsrfToken } from "@/utils/csrf";
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
axios.defaults.withCredentials = true;
// @ts-ignore
if ("withXSRFToken" in axios.defaults) {
  // @ts-ignore
  axios.defaults.withXSRFToken = true;
}
axios.defaults.xsrfCookieName = "XSRF-TOKEN";
axios.defaults.xsrfHeaderName = "X-XSRF-TOKEN";
axios.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers["X-CSRF-TOKEN"] = csrfToken;
  }
  const xsrf = getXsrfToken();
  if (xsrf) {
    config.headers["X-XSRF-TOKEN"] = xsrf;
  }
  return config;
});
export default axios;
