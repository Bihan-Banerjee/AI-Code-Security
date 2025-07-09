package com.example.authapp.dto;

import lombok.Data;

import java.util.Set;

@Data
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String profilePicPath;
    private String bio;
    private String phoneNumber;
    private Set<String> roles; // To show user roles
}
