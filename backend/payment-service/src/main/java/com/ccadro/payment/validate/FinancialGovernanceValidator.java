package com.ccadro.payment.validate;

import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.exception.AppException;
import com.ccadro.payment.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Shared validator for B2B contract lifecycle, Net-30 credit guard, and payment gateway transitions.
 */
@Component
public class FinancialGovernanceValidator {

    public static final Set<String> SUPPORTED_METHODS = Set.of(
            "VIETQR_NAPAS", "VNPAY_QR", "MOMO_WALLET", "CORPORATE_CARD", "GREEN_CREDIT_NET30"
    );

    public void requireContractDraftForSign(B2bContract contract) {
        if (!"DRAFT".equals(contract.getContractStatus())) {
            throw new AppException(
                    ErrorCode.CONTRACT_INVALID_STATE,
                    "Chỉ hợp đồng ở trạng thái Dự thảo (DRAFT) mới được ký số."
            );
        }
    }

    public void requireContractMutableForSla(B2bContract contract) {
        if ("SETTLED".equals(contract.getContractStatus()) || "CANCELLED".equals(contract.getContractStatus())) {
            throw new AppException(
                    ErrorCode.CONTRACT_INVALID_STATE,
                    "Hợp đồng đã tất toán hoặc hủy, không thể ghi nhận SLA mới"
            );
        }
    }

    public String normalizeAndValidatePaymentMethod(String method) {
        String normalized = method == null ? "" : method.trim().toUpperCase();
        if (!SUPPORTED_METHODS.contains(normalized)) {
            throw new AppException(
                    ErrorCode.INVALID_PAYMENT_METHOD,
                    "Phương thức thanh toán không hợp lệ: " + method
            );
        }
        return normalized;
    }

    public String normalizePowertrain(String powertrainType) {
        if (powertrainType == null || powertrainType.isBlank()) {
            return "EV";
        }
        return powertrainType.trim().toUpperCase();
    }

    public void validateInstantConfirmAllowed(boolean instantPaid, boolean allowInstantConfirm) {
        if (instantPaid && !allowInstantConfirm) {
            throw new AppException(
                    ErrorCode.PAYMENT_INVALID_STATE,
                    "Tự xác nhận chỉ được bật trong môi trường demo; chờ webhook đối soát hoặc ADMIN xác nhận thủ công"
            );
        }
    }

    public void requireConfirmablePayment(PaymentTransaction tx) {
        if ("PAID".equals(tx.getPaymentStatus())) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_PAID);
        }
        if ("REFUNDED".equals(tx.getPaymentStatus())) {
            throw new AppException(
                    ErrorCode.PAYMENT_INVALID_STATE,
                    "Giao dịch đã hoàn tiền, không thể xác nhận thanh toán"
            );
        }
    }

    public void validateMsaCreditCapacity(B2bContract msa, long amountVnd) {
        long limit = msa.getCreditLimitVnd() != null ? msa.getCreditLimitVnd() : 0L;
        long used = msa.getUsedCreditVnd() != null ? msa.getUsedCreditVnd() : 0L;
        if (limit > 0 && used + amountVnd > limit) {
            throw new AppException(
                    ErrorCode.CREDIT_LIMIT_EXCEEDED,
                    "Hạn mức Net-30 còn lại (" + (limit - used) + " ₫) không đủ cho hóa đơn " + amountVnd + " ₫"
            );
        }
    }
}
