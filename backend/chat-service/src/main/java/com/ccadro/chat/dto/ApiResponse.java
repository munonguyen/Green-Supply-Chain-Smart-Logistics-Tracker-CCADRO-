package com.ccadro.chat.dto;

/** Existing chat wire contract: successful responses contain code and result only. */
public record ApiResponse<T>(int code, T result) {
    public static <T> ApiResponse<T> success(T result) {
        return new ApiResponse<>(1000, result);
    }
}
