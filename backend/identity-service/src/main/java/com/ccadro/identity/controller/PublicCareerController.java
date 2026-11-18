package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.JobApplicationSubmitRequest;
import com.ccadro.identity.dto.response.CareerOpeningResponse;
import com.ccadro.identity.dto.response.JobApplicationPublicStatusResponse;
import com.ccadro.identity.service.JobApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/careers")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Public Careers & Recruitment Portal", description = "Cổng nộp đơn xin việc công khai & tra cứu tiến độ hồ sơ (không cấp quyền hệ thống trước khi Admin duyệt)")
public class PublicCareerController {

    JobApplicationService jobApplicationService;

    @GetMapping("/openings")
    @Operation(summary = "Danh sách vị trí tuyển dụng nội bộ & chi nhánh đang mở")
    public ApiResponse<List<CareerOpeningResponse>> getOpenings() {
        return ApiResponse.success(jobApplicationService.getPublicOpenings());
    }

    @PostMapping("/apply")
    @Operation(summary = "Nộp đơn xin việc cho Lái xe / Kiểm soát / Điều hành")
    public ApiResponse<Map<String, Object>> submitApplication(
            @Valid @RequestBody JobApplicationSubmitRequest request) {
        return ApiResponse.success(
                "Đã tiếp nhận đơn ứng tuyển",
                jobApplicationService.submitPublicApplication(request)
        );
    }

    @GetMapping("/status")
    @Operation(summary = "Tra cứu tiến độ hồ sơ ứng tuyển theo Mã đơn & Email hoặc PIN")
    public ApiResponse<JobApplicationPublicStatusResponse> lookupStatus(
            @RequestParam String applicationCode,
            @RequestParam String credential) {
        return ApiResponse.success(jobApplicationService.lookupPublicStatus(applicationCode, credential));
    }
}

