package com.example.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponse {
    private String email;
    private String bio;
    private String phone;
    private String profileImage;
}
