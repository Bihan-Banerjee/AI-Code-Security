package com.example.auth.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String bio;
    private String phone;
    private MultipartFile profileImage;
}
