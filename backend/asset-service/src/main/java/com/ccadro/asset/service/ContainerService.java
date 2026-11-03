package com.ccadro.asset.service;

import com.ccadro.asset.dto.request.ContainerCreateRequest;
import com.ccadro.asset.dto.response.ContainerResponse;
import com.ccadro.asset.entity.Container;
import com.ccadro.asset.exception.AppException;
import com.ccadro.asset.exception.ErrorCode;
import com.ccadro.asset.mapper.ContainerMapper;
import com.ccadro.asset.repository.ContainerRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Quản trị thùng hàng và container chuyên dụng (Container Domain Service - UC01).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ContainerService {

    ContainerRepository containerRepository;
    ContainerMapper containerMapper;

    public List<ContainerResponse> getAllContainersResponse() {
        return containerMapper.toResponseList(containerRepository.findAll());
    }

    @Transactional
    public ContainerResponse createContainer(ContainerCreateRequest request) {
        if (containerRepository.findByContainerCode(request.getContainerCode()).isPresent()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mã container đã tồn tại: " + request.getContainerCode());
        }
        Container container = containerMapper.toEntity(request);
        return containerMapper.toResponse(containerRepository.save(container));
    }
}

