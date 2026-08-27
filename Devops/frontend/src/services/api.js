import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "",
    withCredentials: true
});

function safeBackendMessage(error) {
    const candidate = error.response?.data?.msg || error.response?.data?.message;
    if (typeof candidate !== "string" || candidate.length > 180) return null;
    if (/postgres|sql|stack|routine|password|secret|token| at .*:\d+/i.test(candidate)) return null;
    return candidate;
}

export function apiErrorDetails(error, fallback = "We couldn't complete this request. Please try again.") {
    const status = error.response?.status;
    if (!error.response) return {
        status: null,
        title: "Connection problem",
        message: "We couldn't reach the server. Please check your connection and try again.",
        retryable: true,
    };
    if (status === 400) return {
        status,
        title: "Invalid request",
        message: safeBackendMessage(error) || "Please check the information you entered and try again.",
        retryable: false,
    };
    if (status === 401) return {
        status,
        title: "Session expired",
        message: "Your session has expired. Please sign in again.",
        retryable: false,
    };
    if (status === 403) return {
        status,
        title: "Access denied",
        message: "You don't have permission to perform this action.",
        retryable: false,
    };
    if (status === 404) return {
        status,
        title: "Not found",
        message: fallback,
        retryable: false,
    };
    if (status === 409) return {
        status,
        title: "Already exists",
        message: safeBackendMessage(error) || "This information is already in use. Please check it and try again.",
        retryable: false,
    };
    if (status >= 500) return {
        status,
        title: "Server error",
        message: "We couldn't complete this request because of a server error. Please try again.",
        retryable: true,
    };
    return {
        status,
        title: "Unable to complete request",
        message: safeBackendMessage(error) || fallback,
        retryable: false,
    };
}

export function apiErrorMessage(error, fallback) {
    return apiErrorDetails(error, fallback).message;
}

api.interceptors.response.use(
    response => response,
    error => {
        const path = error.config?.url || "";
        const isPublicRequest = path.startsWith("/login") || path.startsWith("/forgotpassword");
        if (error.response?.status === 401 && !isPublicRequest && window.location.pathname !== "/") {
            window.location.assign("/");
        }
        return Promise.reject(error);
    }
);

export default api;