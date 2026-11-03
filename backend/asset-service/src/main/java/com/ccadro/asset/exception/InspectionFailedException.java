package com.ccadro.asset.exception;

public class InspectionFailedException extends AppException {

    public InspectionFailedException(ErrorCode errorCode) {
        super(errorCode);
    }

    public InspectionFailedException(ErrorCode errorCode, String customMessage) {
        super(errorCode, customMessage);
    }
}

