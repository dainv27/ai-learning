package com.phase0demo.approve.adapter.rest;

public record ErrorResponse(ErrorDetail error) {
    public record ErrorDetail(String code, String message) {}
}
