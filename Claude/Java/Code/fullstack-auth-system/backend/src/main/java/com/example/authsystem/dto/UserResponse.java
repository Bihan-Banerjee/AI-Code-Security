package com.example.authsystem.dto;

import lombok.Data;
import lombok.AllArgsConstructor;

@Data
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String phoneNumber;
    private String bio;
    private String profileImage;
}