package com.example.authapp.controller;

import com.example.authapp.dto.AuthResponseDto;
import com.example.authapp.dto.LoginDto;
import com.example.authapp.dto.RegisterDto;
import com.example.authapp.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(
            @Valid @ModelAttribute RegisterDto registerDto, // Use @ModelAttribute for form data + file
            @RequestParam(value = "profilePic", required = false) MultipartFile profilePic) {
        try {
            String message = authService.registerUser(registerDto, profilePic);
            return new ResponseEntity<>(message, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (IOException e) {
            return new ResponseEntity<>("Failed to upload profile picture: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> loginUser(@Valid @RequestBody LoginDto loginDto) {
        AuthResponseDto response = authService.loginUser(loginDto);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
